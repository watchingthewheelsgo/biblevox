export interface BibleBook {
  id: string;
  name: string;
  abbrev: string;
  testament: "old" | "new";
  chapters: number;
}

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  book: string;
  bookId: string;
  chapter: number;
  verses: BibleVerse[];
}

export interface WordAlignment {
  text: string;
  start: number;
  end: number;
}

export interface VerseAlignment {
  verse: number;
  startTime: number;
  endTime: number;
  words: WordAlignment[];
}

export interface ChapterAlignment {
  bookId: string;
  chapter: number;
  duration: number;
  verses: VerseAlignment[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  activeVerse: number | null;
  activeWordIndex: number | null;
  speed: number;
}
