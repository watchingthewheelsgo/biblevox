import { and, eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { chapterUnlocks, users } from "./db/schema";

export async function getSessionUserId(rawReq: Request) {
  const session = await auth.api.getSession({ headers: rawReq.headers });
  return session?.user?.id ?? null;
}

/** Same rules as GET /api/chapter-access */
export async function resolveChapterAllowed(
  rawReq: Request,
  bookId: string,
  chapterNum: number,
): Promise<boolean> {
  const session = await auth.api.getSession({ headers: rawReq.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return chapterNum <= 2;
  }
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (row?.unlockedAll) return true;
  const verified = Boolean(session.user.emailVerified);
  const limit = verified ? 5 : 2;
  if (chapterNum <= limit) return true;
  const unlocked = await db.query.chapterUnlocks.findFirst({
    where: and(
      eq(chapterUnlocks.userId, userId),
      eq(chapterUnlocks.bookId, bookId),
      eq(chapterUnlocks.chapter, String(chapterNum)),
    ),
  });
  return Boolean(unlocked);
}
