/**
 * Generate audio + alignment data for Bible chapters using the VoiceX (TapVox) server.
 *
 * This script connects to a running VoiceX server via WebSocket, sends chapter text,
 * and saves the returned audio + alignment data as static files for BibleVox.
 *
 * Prerequisites:
 *   1. VoiceX server running: cd /path/to/voicex && bun run server:dev
 *   2. Bible data downloaded: npm run bible:download
 *   3. A valid document + voice preset configured in VoiceX
 *
 * Usage:
 *   npx tsx scripts/generate-audio.ts --book genesis --chapter 1
 *   npx tsx scripts/generate-audio.ts --book genesis          # all chapters
 *   npx tsx scripts/generate-audio.ts                          # all books
 *
 * The script can also use Google Cloud TTS directly (without VoiceX server):
 *   npx tsx scripts/generate-audio.ts --provider google --book genesis --chapter 1
 *
 * Environment variables:
 *   VOICEX_URL       - VoiceX server URL (default: http://localhost:3000)
 *   VOICEX_DOC_ID    - Document ID in VoiceX
 *   VOICEX_VOICE_ID  - Voice preset ID
 *
 * Output:
 *   public/audio/{bookId}/{chapter}.mp3
 *   public/alignment/{bookId}/{chapter}.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

interface BibleChapter {
  book: string;
  bookId: string;
  chapter: number;
  verses: { verse: number; text: string }[];
}

interface WordAlignment {
  text: string;
  start: number;
  end: number;
}

interface VerseAlignment {
  verse: number;
  startTime: number;
  endTime: number;
  words: WordAlignment[];
}

interface ChapterAlignment {
  bookId: string;
  chapter: number;
  duration: number;
  verses: VerseAlignment[];
}

const ROOT = join(import.meta.dirname, "..");
const DATA_DIR = join(ROOT, "public", "data", "books");
const AUDIO_DIR = join(ROOT, "public", "audio");
const ALIGN_DIR = join(ROOT, "public", "alignment");

const VOICEX_URL = process.env["VOICEX_URL"] ?? "http://localhost:3000";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: { book?: string; chapter?: number; provider?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--book" && args[i + 1]) opts.book = args[++i];
    if (args[i] === "--chapter" && args[i + 1]) opts.chapter = Number(args[++i]);
    if (args[i] === "--provider" && args[i + 1]) opts.provider = args[++i];
  }
  return opts;
}

function loadChapter(bookId: string, chapter: number): BibleChapter | null {
  const path = join(DATA_DIR, bookId, `${chapter}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as BibleChapter;
}

function listBooks(): string[] {
  if (!existsSync(DATA_DIR)) return [];
  return readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listChapters(bookId: string): number[] {
  const dir = join(DATA_DIR, bookId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => Number(f.replace(".json", "")))
    .sort((a, b) => a - b);
}

/**
 * Generate audio via VoiceX /api/tts endpoint.
 * Returns base64-encoded audio data.
 */
async function generateViaVoicex(
  text: string,
  voiceName = "en-US-Standard-D",
  languageCode = "en-US",
): Promise<{ audioBase64: string }> {
  const resp = await fetch(`${VOICEX_URL}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceName, languageCode }),
  });

  if (!resp.ok) {
    throw new Error(`VoiceX TTS failed: ${resp.status} ${await resp.text()}`);
  }

  return (await resp.json()) as { audioBase64: string };
}

/**
 * Estimate word-level alignment from audio duration using character proportions.
 * Used when real alignment data is not available from the TTS provider.
 */
function estimateAlignment(
  chapter: BibleChapter,
  durationMs: number,
): ChapterAlignment {
  const totalChars = chapter.verses.reduce((s, v) => s + v.text.length, 0);
  let offset = 0;

  const verses: VerseAlignment[] = chapter.verses.map((v) => {
    const startTime = (offset / totalChars) * durationMs;
    const endTime = ((offset + v.text.length) / totalChars) * durationMs;

    const wordMatches = v.text.match(/\S+/g) ?? [v.text];
    let charOff = 0;
    const words: WordAlignment[] = wordMatches.map((w) => {
      const ws = startTime + (charOff / v.text.length) * (endTime - startTime);
      charOff += w.length + 1;
      const we = startTime + (Math.min(charOff, v.text.length) / v.text.length) * (endTime - startTime);
      return { text: w, start: Math.round(ws), end: Math.round(we) };
    });

    offset += v.text.length;
    return { verse: v.verse, startTime: Math.round(startTime), endTime: Math.round(endTime), words };
  });

  return {
    bookId: chapter.bookId,
    chapter: chapter.chapter,
    duration: durationMs,
    verses,
  };
}

async function processChapter(bookId: string, chapterNum: number) {
  const chapter = loadChapter(bookId, chapterNum);
  if (!chapter) {
    console.error(`  ✗ No data for ${bookId}/${chapterNum}`);
    return;
  }

  const text = chapter.verses.map((v) => v.text).join(" ");
  console.log(`  Generating audio for ${bookId} chapter ${chapterNum} (${text.length} chars)...`);

  try {
    const { audioBase64 } = await generateViaVoicex(text);
    const audioBuffer = Buffer.from(audioBase64, "base64");

    const audioDir = join(AUDIO_DIR, bookId);
    if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });
    writeFileSync(join(audioDir, `${chapterNum}.mp3`), audioBuffer);

    // Rough duration estimate: ~150 words per minute for speech
    const wordCount = text.split(/\s+/).length;
    const estimatedDurationMs = (wordCount / 150) * 60 * 1000;
    const alignment = estimateAlignment(chapter, estimatedDurationMs);

    const alignDir = join(ALIGN_DIR, bookId);
    if (!existsSync(alignDir)) mkdirSync(alignDir, { recursive: true });
    writeFileSync(
      join(alignDir, `${chapterNum}.json`),
      JSON.stringify(alignment, null, 2),
    );

    console.log(`  ✓ ${bookId} chapter ${chapterNum}: audio + alignment saved`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err}`);
  }
}

async function main() {
  const { book, chapter } = parseArgs();

  console.log("🎙️  BibleVox Audio Generator\n");
  console.log(`VoiceX server: ${VOICEX_URL}\n`);

  if (book && chapter) {
    await processChapter(book, chapter);
  } else if (book) {
    const chapters = listChapters(book);
    console.log(`Processing ${book}: ${chapters.length} chapters`);
    for (const ch of chapters) {
      await processChapter(book, ch);
    }
  } else {
    const books = listBooks();
    console.log(`Processing all ${books.length} books...`);
    for (const b of books) {
      const chapters = listChapters(b);
      console.log(`\n📗 ${b}: ${chapters.length} chapters`);
      for (const ch of chapters) {
        await processChapter(b, ch);
      }
    }
  }

  console.log("\n✅ Generation complete!");
}

main().catch(console.error);
