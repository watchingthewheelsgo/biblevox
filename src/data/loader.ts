import type { BibleChapter, ChapterAlignment } from "@/types";
import { getSampleChapter } from "./sample-chapters";

export async function loadChapter(
  bookId: string,
  chapter: number,
): Promise<BibleChapter | null> {
  try {
    const resp = await fetch(`/data/books/${bookId}/${chapter}.json`);
    if (resp.ok) return (await resp.json()) as BibleChapter;
  } catch {
    // static file not found
  }
  return getSampleChapter(bookId, chapter) ?? null;
}

export async function loadAlignment(
  bookId: string,
  chapter: number,
): Promise<ChapterAlignment | null> {
  try {
    const resp = await fetch(`/alignment/${bookId}/${chapter}.json`);
    if (resp.ok) return (await resp.json()) as ChapterAlignment;
  } catch {
    // alignment not generated yet
  }
  return null;
}

export function getAudioUrl(bookId: string, chapter: number): string {
  return `/audio/${bookId}/${chapter}.mp3`;
}

export async function checkAudioExists(
  bookId: string,
  chapter: number,
): Promise<boolean> {
  try {
    const resp = await fetch(getAudioUrl(bookId, chapter), { method: "HEAD" });
    return resp.ok;
  } catch {
    return false;
  }
}
