import { useCallback, useRef, useState } from "react";
import type { BibleChapter } from "@/types";

interface WebSpeechCallbacks {
  onVerseChange: (verse: number | null) => void;
  onWordChange: (wordIndex: number | null, verse: number | null) => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded?: () => void;
}

function getWordPositions(text: string): { start: number; end: number }[] {
  const positions: { start: number; end: number }[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    positions.push({ start: match.index, end: match.index + match[0].length });
  }
  return positions;
}

export function useWebSpeechPlayback(
  chapter: BibleChapter | null,
  callbacks: WebSpeechCallbacks,
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const currentVerseIdx = useRef(0);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const stopRef = useRef(false);

  const speakVerse = useCallback(
    (verseIdx: number) => {
      if (!chapter || verseIdx >= chapter.verses.length || stopRef.current) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        callbacksRef.current.onPlayingChange(false);
        callbacksRef.current.onVerseChange(null);
        callbacksRef.current.onWordChange(null, null);
        callbacksRef.current.onEnded?.();
        return;
      }

      const verse = chapter.verses[verseIdx]!;
      const wordPositions = getWordPositions(verse.text);
      const utterance = new SpeechSynthesisUtterance(verse.text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;

      callbacksRef.current.onVerseChange(verse.verse);

      utterance.onboundary = (ev) => {
        if (ev.name === "word") {
          const charIdx = ev.charIndex;
          const wordIdx = wordPositions.findIndex(
            (wp) => charIdx >= wp.start && charIdx < wp.end,
          );
          callbacksRef.current.onWordChange(
            wordIdx >= 0 ? wordIdx : null,
            verse.verse,
          );
        }
      };

      utterance.onend = () => {
        if (!stopRef.current) {
          currentVerseIdx.current = verseIdx + 1;
          setTimeout(() => speakVerse(verseIdx + 1), 300);
        }
      };

      speechSynthesis.speak(utterance);
    },
    [chapter],
  );

  const play = useCallback(
    (fromVerse?: number) => {
      if (!chapter) return;
      speechSynthesis.cancel();
      stopRef.current = false;

      const startIdx = fromVerse
        ? chapter.verses.findIndex((v) => v.verse === fromVerse)
        : 0;
      currentVerseIdx.current = startIdx >= 0 ? startIdx : 0;

      isPlayingRef.current = true;
      setIsPlaying(true);
      callbacksRef.current.onPlayingChange(true);
      speakVerse(currentVerseIdx.current);
    },
    [chapter, speakVerse],
  );

  const pause = useCallback(() => {
    stopRef.current = true;
    speechSynthesis.cancel();
    isPlayingRef.current = false;
    setIsPlaying(false);
    callbacksRef.current.onPlayingChange(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) pause();
    else play();
  }, [play, pause]);

  return { isPlaying, play, pause, togglePlay, hasAudio: true };
}
