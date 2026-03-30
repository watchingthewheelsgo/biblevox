/**
 * Download the complete KJV Bible from GitHub and save as structured JSON.
 *
 * Usage: npx tsx scripts/download-bible.ts
 *
 * Output: public/data/books/{bookId}/{chapter}.json
 *
 * Source: https://github.com/aruljohn/Bible-kjv
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

interface RawVerse {
  verse: string;
  text: string;
}

interface RawChapter {
  chapter: string;
  verses: RawVerse[];
}

interface RawBook {
  book: string;
  chapters: RawChapter[];
}

// `file` is the actual filename on GitHub (no spaces)
const BOOKS: { id: string; name: string; file: string }[] = [
  { id: "genesis", name: "Genesis", file: "Genesis" },
  { id: "exodus", name: "Exodus", file: "Exodus" },
  { id: "leviticus", name: "Leviticus", file: "Leviticus" },
  { id: "numbers", name: "Numbers", file: "Numbers" },
  { id: "deuteronomy", name: "Deuteronomy", file: "Deuteronomy" },
  { id: "joshua", name: "Joshua", file: "Joshua" },
  { id: "judges", name: "Judges", file: "Judges" },
  { id: "ruth", name: "Ruth", file: "Ruth" },
  { id: "1samuel", name: "1 Samuel", file: "1Samuel" },
  { id: "2samuel", name: "2 Samuel", file: "2Samuel" },
  { id: "1kings", name: "1 Kings", file: "1Kings" },
  { id: "2kings", name: "2 Kings", file: "2Kings" },
  { id: "1chronicles", name: "1 Chronicles", file: "1Chronicles" },
  { id: "2chronicles", name: "2 Chronicles", file: "2Chronicles" },
  { id: "ezra", name: "Ezra", file: "Ezra" },
  { id: "nehemiah", name: "Nehemiah", file: "Nehemiah" },
  { id: "esther", name: "Esther", file: "Esther" },
  { id: "job", name: "Job", file: "Job" },
  { id: "psalms", name: "Psalms", file: "Psalms" },
  { id: "proverbs", name: "Proverbs", file: "Proverbs" },
  { id: "ecclesiastes", name: "Ecclesiastes", file: "Ecclesiastes" },
  { id: "songofsolomon", name: "Song of Solomon", file: "SongofSolomon" },
  { id: "isaiah", name: "Isaiah", file: "Isaiah" },
  { id: "jeremiah", name: "Jeremiah", file: "Jeremiah" },
  { id: "lamentations", name: "Lamentations", file: "Lamentations" },
  { id: "ezekiel", name: "Ezekiel", file: "Ezekiel" },
  { id: "daniel", name: "Daniel", file: "Daniel" },
  { id: "hosea", name: "Hosea", file: "Hosea" },
  { id: "joel", name: "Joel", file: "Joel" },
  { id: "amos", name: "Amos", file: "Amos" },
  { id: "obadiah", name: "Obadiah", file: "Obadiah" },
  { id: "jonah", name: "Jonah", file: "Jonah" },
  { id: "micah", name: "Micah", file: "Micah" },
  { id: "nahum", name: "Nahum", file: "Nahum" },
  { id: "habakkuk", name: "Habakkuk", file: "Habakkuk" },
  { id: "zephaniah", name: "Zephaniah", file: "Zephaniah" },
  { id: "haggai", name: "Haggai", file: "Haggai" },
  { id: "zechariah", name: "Zechariah", file: "Zechariah" },
  { id: "malachi", name: "Malachi", file: "Malachi" },
  { id: "matthew", name: "Matthew", file: "Matthew" },
  { id: "mark", name: "Mark", file: "Mark" },
  { id: "luke", name: "Luke", file: "Luke" },
  { id: "john", name: "John", file: "John" },
  { id: "acts", name: "Acts", file: "Acts" },
  { id: "romans", name: "Romans", file: "Romans" },
  { id: "1corinthians", name: "1 Corinthians", file: "1Corinthians" },
  { id: "2corinthians", name: "2 Corinthians", file: "2Corinthians" },
  { id: "galatians", name: "Galatians", file: "Galatians" },
  { id: "ephesians", name: "Ephesians", file: "Ephesians" },
  { id: "philippians", name: "Philippians", file: "Philippians" },
  { id: "colossians", name: "Colossians", file: "Colossians" },
  { id: "1thessalonians", name: "1 Thessalonians", file: "1Thessalonians" },
  { id: "2thessalonians", name: "2 Thessalonians", file: "2Thessalonians" },
  { id: "1timothy", name: "1 Timothy", file: "1Timothy" },
  { id: "2timothy", name: "2 Timothy", file: "2Timothy" },
  { id: "titus", name: "Titus", file: "Titus" },
  { id: "philemon", name: "Philemon", file: "Philemon" },
  { id: "hebrews", name: "Hebrews", file: "Hebrews" },
  { id: "james", name: "James", file: "James" },
  { id: "1peter", name: "1 Peter", file: "1Peter" },
  { id: "2peter", name: "2 Peter", file: "2Peter" },
  { id: "1john", name: "1 John", file: "1John" },
  { id: "2john", name: "2 John", file: "2John" },
  { id: "3john", name: "3 John", file: "3John" },
  { id: "jude", name: "Jude", file: "Jude" },
  { id: "revelation", name: "Revelation", file: "Revelation" },
];

const BASE_URL =
  "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master";
const OUT_DIR = join(import.meta.dirname, "..", "public", "data", "books");

async function downloadBook(book: { id: string; name: string; file: string }) {
  const url = `${BASE_URL}/${book.file}.json`;
  console.log(`  Downloading ${book.name}...`);

  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`  ✗ Failed to download ${book.name}: ${resp.status}`);
    return;
  }

  const raw: RawBook = (await resp.json()) as RawBook;
  const bookDir = join(OUT_DIR, book.id);
  if (!existsSync(bookDir)) mkdirSync(bookDir, { recursive: true });

  for (const ch of raw.chapters) {
    const chapterNum = Number(ch.chapter);
    const verses = ch.verses.map((v) => ({
      verse: Number(v.verse),
      text: v.text,
    }));

    const chapterData = {
      book: book.name,
      bookId: book.id,
      chapter: chapterNum,
      verses,
    };

    writeFileSync(
      join(bookDir, `${chapterNum}.json`),
      JSON.stringify(chapterData),
    );
  }

  console.log(`  ✓ ${book.name}: ${raw.chapters.length} chapters saved`);
}

async function main() {
  console.log("📖 Downloading KJV Bible...\n");

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  let success = 0;
  let fail = 0;
  for (const book of BOOKS) {
    try {
      await downloadBook(book);
      success++;
    } catch (err) {
      console.error(`  ✗ ${book.name}: ${err}`);
      fail++;
    }
  }

  console.log(`\n✅ Done! ${success} books downloaded, ${fail} failed.`);
  console.log(`   Data saved to public/data/books/`);
}

main().catch(console.error);
