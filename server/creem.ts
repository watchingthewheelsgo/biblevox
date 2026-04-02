import crypto from "node:crypto";
import { createCreem } from "creem_io";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { chapterUnlocks, purchases, users } from "./db/schema";

const hasCreemConfig = Boolean(process.env.CREEM_API_KEY);
const testMode = process.env.NODE_ENV !== "production";
const creem = hasCreemConfig
  ? createCreem({
      apiKey: process.env.CREEM_API_KEY!,
      testMode,
    })
  : null;

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const computed = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return computed === signature;
}

export const CreemService = {
  isEnabled(): boolean {
    return Boolean(
      creem && process.env.CREEM_UNLOCK_PRODUCT_ID && process.env.CREEM_CHAPTER_PRODUCT_ID,
    );
  },

  async createUnlockAllSession(userId: string, returnUrl: string): Promise<string> {
    if (!creem) throw new Error("CREEM_API_KEY is not configured");
    const productId = process.env.CREEM_UNLOCK_PRODUCT_ID;
    if (!productId) throw new Error("CREEM_UNLOCK_PRODUCT_ID is not configured");

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("User not found");

    const customerPayload: { id?: string; email?: string } = {};
    if (user.creemCustomerId) customerPayload.id = user.creemCustomerId;
    else if (user.email) customerPayload.email = user.email;

    const checkout = await creem.checkouts.create({
      productId,
      units: 1,
      successUrl: returnUrl,
      metadata: {
        userId,
        type: "unlock_all",
      },
      ...(Object.keys(customerPayload).length > 0 && {
        customer: customerPayload,
      }),
    });

    const url =
      (checkout as { checkout_url?: string }).checkout_url ??
      (checkout as { checkoutUrl?: string }).checkoutUrl;
    if (!url) throw new Error("Creem checkout did not return URL");
    return url;
  },

  async createChapterSession(params: {
    userId: string;
    bookId: string;
    chapter: number;
    returnUrl: string;
  }): Promise<string> {
    if (!creem) throw new Error("CREEM_API_KEY is not configured");
    const productId = process.env.CREEM_CHAPTER_PRODUCT_ID;
    if (!productId) throw new Error("CREEM_CHAPTER_PRODUCT_ID is not configured");
    const { userId, bookId, chapter, returnUrl } = params;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("User not found");
    const customerPayload: { id?: string; email?: string } = {};
    if (user.creemCustomerId) customerPayload.id = user.creemCustomerId;
    else if (user.email) customerPayload.email = user.email;
    const checkout = await creem.checkouts.create({
      productId,
      units: 1,
      successUrl: returnUrl,
      metadata: {
        userId,
        type: "chapter_unlock",
        bookId,
        chapter: String(chapter),
      },
      ...(Object.keys(customerPayload).length > 0 && {
        customer: customerPayload,
      }),
    });
    const url =
      (checkout as { checkout_url?: string }).checkout_url ??
      (checkout as { checkoutUrl?: string }).checkoutUrl;
    if (!url) throw new Error("Creem checkout did not return URL");
    return url;
  },

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    if (!verifyWebhookSignature(rawBody, signature)) {
      throw new Error("Invalid webhook signature");
    }
    const body = JSON.parse(rawBody) as {
      eventType?: string;
      object?: {
        id?: string;
        metadata?: Record<string, string>;
        customer?: string | { id?: string };
        order?: { id?: string };
      };
    };
    if (body.eventType !== "checkout.completed" || !body.object) return;

    const metadata = body.object.metadata ?? {};
    if (!metadata.userId) return;

    const userId = metadata.userId;
    const customerId =
      typeof body.object.customer === "string"
        ? body.object.customer
        : body.object.customer?.id;
    const checkoutId = body.object.id ?? body.object.order?.id ?? `ch_${Date.now()}`;

    const existing = await db.query.purchases.findFirst({
      where: eq(purchases.creemCheckoutId, checkoutId),
    });
    if (existing) return;

    if (metadata.type === "unlock_all") {
      await db.transaction(async (tx) => {
        await tx.insert(purchases).values({
          id: crypto.randomUUID(),
          userId,
          amountUsd: 30,
          product: "unlock_all",
          creemCheckoutId: checkoutId,
          creemCustomerId: customerId,
        });
        await tx
          .update(users)
          .set({
            unlockedAll: true,
            ...(customerId ? { creemCustomerId: customerId } : {}),
          })
          .where(eq(users.id, userId));
      });
      return;
    }

    if (metadata.type === "chapter_unlock" && metadata.bookId && metadata.chapter) {
      const existedUnlock = await db.query.chapterUnlocks.findFirst({
        where: and(
          eq(chapterUnlocks.userId, userId),
          eq(chapterUnlocks.bookId, metadata.bookId),
          eq(chapterUnlocks.chapter, metadata.chapter),
        ),
      });
      if (existedUnlock) return;
      const purchaseId = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(purchases).values({
          id: purchaseId,
          userId,
          amountUsd: 2,
          product: `chapter_unlock:${metadata.bookId}:${metadata.chapter}`,
          creemCheckoutId: checkoutId,
          creemCustomerId: customerId,
        });
        await tx.insert(chapterUnlocks).values({
          id: crypto.randomUUID(),
          userId,
          bookId: metadata.bookId,
          chapter: metadata.chapter,
          purchaseId,
        });
        if (customerId) {
          await tx
            .update(users)
            .set({ creemCustomerId: customerId })
            .where(eq(users.id, userId));
        }
      });
    }
  },
};
