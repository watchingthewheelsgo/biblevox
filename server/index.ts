/**
 * BibleVox API — WaveSpeed Qwen3 TTS (voice design & clone).
 * Run: npm run dev:server  (set WAVESPEED_API_KEY in .env)
 */
import "dotenv/config";
import { serve } from "@hono/node-server";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { CreemService } from "./creem";
import { db } from "./db";
import { ensureDbSchema } from "./db/init";
import { chapterUnlocks, purchases, users, voicePresets } from "./db/schema";
import { resolveChapterAllowed } from "./chapter-access";
import {
  synthesizeGeminiVerse,
  isGeminiTtsConfigured,
  type GeminiReadingGender,
} from "./gemini-tts";
import {
  mapLanguageToQwen,
  uploadMediaToWaveSpeed,
  wavespeedVoiceClone,
  wavespeedVoiceDesign,
} from "./wavespeed-qwen3";

function requireApiKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) {
    throw new Error("WAVESPEED_API_KEY is not set");
  }
  return key;
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5180",
      "http://127.0.0.1:5180",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

async function getSessionUser(c: { req: { raw: Request } }) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

app.get("/api/me", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ user: null });
  return c.json({ user });
});

app.post("/api/auth/verify-token", async (c) => {
  const body = await c.req.json<{ token?: string }>();
  const token = body.token?.trim();
  if (!token) return c.json({ error: "token required" }, 400);
  try {
    await (auth.api as any).verifyEmail({
      body: { token },
      headers: c.req.raw.headers,
    });
    return c.json({ ok: true });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "verify failed" },
      400,
    );
  }
});

app.post("/api/auth/resend-verification", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    await (auth.api as any).sendVerificationEmail({
      body: { email: user.email },
      headers: c.req.raw.headers,
    });
    return c.json({ ok: true });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "resend failed" },
      400,
    );
  }
});

app.get("/api/entitlements", async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({
      signedIn: false,
      verified: false,
      chapterLimit: 2,
      unlockedAll: false,
      unlockedChapters: [],
    });
  }
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  const chapterRows = await db.query.chapterUnlocks.findMany({
    where: eq(chapterUnlocks.userId, user.id),
  });
  const unlockedAll = Boolean(row?.unlockedAll);
  const verified = Boolean(user.emailVerified);
  return c.json({
    signedIn: true,
    verified,
    chapterLimit: unlockedAll ? null : verified ? 5 : 2,
    unlockedAll,
    unlockedChapters: chapterRows.map((r) => `${r.bookId}:${r.chapter}`),
  });
});

app.post("/api/purchase/unlock-all", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await db
    .update(users)
    .set({ unlockedAll: true })
    .where(eq(users.id, user.id));
  await db.insert(purchases).values({
    id: crypto.randomUUID(),
    userId: user.id,
    amountUsd: 30,
    product: "unlock_all",
  });
  return c.json({ ok: true, unlockedAll: true });
});

app.post("/api/billing/checkout/unlock-all", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const body = await c.req.json<{ returnUrl?: string }>();
    const returnUrl =
      body.returnUrl?.trim() ||
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/read/genesis/1`;
    const checkoutUrl = await CreemService.createUnlockAllSession(
      user.id,
      returnUrl,
    );
    return c.json({ checkoutUrl });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "checkout failed" },
      400,
    );
  }
});

app.post("/api/billing/checkout/chapter", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const body = await c.req.json<{
      bookId: string;
      chapter: number;
      returnUrl?: string;
    }>();
    const bookId = body.bookId?.trim();
    const chapter = Number(body.chapter);
    if (!bookId || !Number.isFinite(chapter) || chapter < 1) {
      return c.json({ error: "invalid bookId/chapter" }, 400);
    }
    const userRow = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (userRow?.unlockedAll) {
      return c.json({ error: "Already unlocked all chapters" }, 409);
    }
    const existing = await db.query.chapterUnlocks.findFirst({
      where: and(
        eq(chapterUnlocks.userId, user.id),
        eq(chapterUnlocks.bookId, bookId),
        eq(chapterUnlocks.chapter, String(chapter)),
      ),
    });
    if (existing) return c.json({ error: "Chapter already unlocked" }, 409);
    const returnUrl =
      body.returnUrl?.trim() ||
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/read/${bookId}/${chapter}`;
    const checkoutUrl = await CreemService.createChapterSession({
      userId: user.id,
      bookId,
      chapter,
      returnUrl,
    });
    return c.json({ checkoutUrl });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "checkout failed" },
      400,
    );
  }
});

app.get("/api/chapter-access", async (c) => {
  const bookId = c.req.query("bookId")?.trim();
  const chapterNum = Number(c.req.query("chapter"));
  if (!bookId || !Number.isFinite(chapterNum) || chapterNum < 1) {
    return c.json({ error: "invalid bookId/chapter" }, 400);
  }
  const allowed = await resolveChapterAllowed(c.req.raw, bookId, chapterNum);
  const user = await getSessionUser(c);
  if (!allowed) {
    return c.json({
      allowed: false,
      reason: user ? "pay_required" : "signin_required",
    });
  }
  if (!user) {
    return c.json({ allowed: true, reason: "trial" });
  }
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (row?.unlockedAll) {
    return c.json({ allowed: true, reason: "unlocked_all" });
  }
  const limit = user.emailVerified ? 5 : 2;
  if (chapterNum <= limit) {
    return c.json({ allowed: true, reason: "trial" });
  }
  return c.json({ allowed: true, reason: "paid" });
});

app.post("/api/webhooks/creem", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("creem-signature") ?? "";
  try {
    await CreemService.handleWebhook(rawBody, signature);
    return c.json({ received: true });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "webhook failed" },
      400,
    );
  }
});

app.get("/api/voice-presets", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const rows = await db.query.voicePresets.findMany({
    where: eq(voicePresets.userId, user.id),
  });
  return c.json({ items: rows });
});

app.post("/api/voice-presets", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{
    name: string;
    kind: "design" | "clone";
    voiceDescription?: string;
    referenceAudioUrl?: string;
    referenceText?: string;
    language: string;
  }>();
  const u = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!u?.unlockedAll) {
    return c.json({ error: "Please unlock all chapters ($30) first." }, 402);
  }
  const id = crypto.randomUUID();
  await db.insert(voicePresets).values({
    id,
    userId: user.id,
    name: body.name.trim(),
    kind: body.kind,
    voiceDescription: body.voiceDescription?.trim(),
    referenceAudioUrl: body.referenceAudioUrl?.trim(),
    referenceText: body.referenceText?.trim(),
    language: body.language,
  });
  return c.json({ id });
});

app.delete("/api/voice-presets/:id", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const item = await db.query.voicePresets.findFirst({
    where: eq(voicePresets.id, id),
  });
  if (!item || item.userId !== user.id) {
    return c.json({ error: "Not found" }, 404);
  }
  await db.delete(voicePresets).where(eq(voicePresets.id, id));
  return c.json({ ok: true });
});

app.post("/api/tts/gemini", async (c) => {
  try {
    const body = await c.req.json<{
      bookId?: string;
      chapter?: number;
      text?: string;
      gender?: string;
    }>();
    const bookId = body.bookId?.trim();
    const chapterNum = Number(body.chapter);
    const text = body.text?.trim() ?? "";
    const gender = (body.gender === "female" ? "female" : "male") as GeminiReadingGender;
    if (!bookId || !Number.isFinite(chapterNum) || chapterNum < 1) {
      return c.json({ error: "bookId and chapter required" }, 400);
    }
    if (!text || text.length > 8000) {
      return c.json({ error: "text required (max 8000 chars)" }, 400);
    }
    const ok = await resolveChapterAllowed(c.req.raw, bookId, chapterNum);
    if (!ok) {
      return c.json({ error: "Chapter not accessible" }, 403);
    }
    const audio = await synthesizeGeminiVerse(text, gender);
    if (!audio.length) {
      return c.json({ error: "Nothing to synthesize" }, 400);
    }
    return c.json({
      mime: "audio/mpeg",
      audioBase64: audio.toString("base64"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[gemini tts]", msg);
    return c.json({ error: msg }, 500);
  }
});

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    wavespeed: Boolean(process.env.WAVESPEED_API_KEY),
    gemini: isGeminiTtsConfigured(),
  }),
);

/** Upload reference audio → WaveSpeed-hosted URL (for voice clone) */
app.post("/api/voice/media/upload", async (c) => {
  try {
    const apiKey = requireApiKey();
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "Missing file" }, 400);
    }
    const f = file as File;
    const buf = Buffer.from(await f.arrayBuffer());
    const downloadUrl = await uploadMediaToWaveSpeed({
      apiKey,
      fileBuffer: buf,
      filename: f.name || "reference.webm",
      contentType: f.type || "application/octet-stream",
    });
    return c.json({ download_url: downloadUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

/** Short sample for voice design */
app.post("/api/voice/design/sample", async (c) => {
  try {
    const apiKey = requireApiKey();
    const body = await c.req.json<{
      voiceDescription: string;
      sampleText: string;
      language?: string;
    }>();
    const { voiceDescription, sampleText } = body;
    if (!voiceDescription?.trim() || !sampleText?.trim()) {
      return c.json({ error: "voiceDescription and sampleText required" }, 400);
    }
    const lang = mapLanguageToQwen(body.language ?? "en-US");
    const audio = await wavespeedVoiceDesign({
      apiKey,
      text: sampleText,
      voiceDescription,
      language: lang,
    });
    return c.json({
      mime: "audio/mpeg",
      audioBase64: audio.toString("base64"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

/** Short sample for voice clone (reference must be WaveSpeed URL from /api/voice/media/upload) */
app.post("/api/voice/clone/sample", async (c) => {
  try {
    const apiKey = requireApiKey();
    const body = await c.req.json<{
      referenceAudioUrl: string;
      sampleText: string;
      language?: string;
      referenceText?: string;
    }>();
    const { referenceAudioUrl, sampleText } = body;
    if (!referenceAudioUrl?.trim() || !sampleText?.trim()) {
      return c.json({ error: "referenceAudioUrl and sampleText required" }, 400);
    }
    const lang = mapLanguageToQwen(body.language ?? "en-US");
    const audio = await wavespeedVoiceClone({
      apiKey,
      text: sampleText,
      audioUrl: referenceAudioUrl,
      language: lang,
      referenceText: body.referenceText,
    });
    return c.json({
      mime: "audio/mpeg",
      audioBase64: audio.toString("base64"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

/** TTS for arbitrary text (reading) — design or clone mode */
app.post("/api/voice/tts", async (c) => {
  try {
    const apiKey = requireApiKey();
    const body = await c.req.json<{
      text: string;
      mode: "design" | "clone";
      voiceDescription?: string;
      referenceAudioUrl?: string;
      referenceText?: string;
      language?: string;
    }>();
    const { text, mode } = body;
    if (!text?.trim()) {
      return c.json({ error: "text required" }, 400);
    }
    if (text.length > 4000) {
      return c.json({ error: "text too long (max 4000 chars per request)" }, 400);
    }
    const lang = mapLanguageToQwen(body.language ?? "en-US");
    let audio: Buffer;
    if (mode === "clone") {
      const url = body.referenceAudioUrl;
      if (!url?.trim()) {
        return c.json({ error: "referenceAudioUrl required for clone mode" }, 400);
      }
      audio = await wavespeedVoiceClone({
        apiKey,
        text,
        audioUrl: url,
        language: lang,
        referenceText: body.referenceText,
      });
    } else {
      const desc = body.voiceDescription;
      if (!desc?.trim()) {
        return c.json({ error: "voiceDescription required for design mode" }, 400);
      }
      audio = await wavespeedVoiceDesign({
        apiKey,
        text,
        voiceDescription: desc,
        language: lang,
      });
    }
    return c.json({
      mime: "audio/mpeg",
      audioBase64: audio.toString("base64"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

const port = Number(process.env.PORT ?? 8787);
ensureDbSchema()
  .then(() => {
    console.log(`BibleVox API listening on http://localhost:${port}`);
    serve({ fetch: app.fetch, port });
  })
  .catch((error) => {
    console.error("DB init failed:", error);
    process.exit(1);
  });
