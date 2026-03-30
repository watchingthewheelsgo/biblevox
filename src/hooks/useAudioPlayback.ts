import { useCallback, useEffect, useRef, useState } from "react";
import type { BibleChapter, ChapterAlignment, VerseAlignment, WordAlignment } from "@/types";

export interface PlaybackCallbacks {
  onVerseChange: (verse: number | null) => void;
  onWordChange: (wordIndex: number | null, verse: number | null) => void;
  onTimeUpdate: (time: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded?: () => void;
}

interface VerseTimingInfo {
  verse: number;
  startTime: number;
  endTime: number;
  wordTimings: WordAlignment[];
}

export function useAudioPlayback(
  chapter: BibleChapter | null,
  alignment: ChapterAlignment | null,
  audioUrl: string | null,
  callbacks: PlaybackCallbacks,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const versesRef = useRef<VerseTimingInfo[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasAudio, setHasAudio] = useState(false);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const buildTimings = useCallback(
    (align: ChapterAlignment): VerseTimingInfo[] => {
      return align.verses.map((va: VerseAlignment) => ({
        verse: va.verse,
        startTime: va.startTime / 1000,
        endTime: va.endTime / 1000,
        wordTimings: va.words.map((w: WordAlignment) => ({
          text: w.text,
          start: w.start / 1000,
          end: w.end / 1000,
        })),
      }));
    },
    [],
  );

  const estimateTimings = useCallback(
    (ch: BibleChapter, totalDuration: number): VerseTimingInfo[] => {
      const totalChars = ch.verses.reduce((s, v) => s + v.text.length, 0);
      let offset = 0;
      return ch.verses.map((v) => {
        const start = (offset / totalChars) * totalDuration;
        const end = ((offset + v.text.length) / totalChars) * totalDuration;
        const words: WordAlignment[] = [];
        const matches = v.text.match(/\S+/g) ?? [v.text];
        let charOff = 0;
        for (const w of matches) {
          const ws = start + (charOff / v.text.length) * (end - start);
          const we = start + ((charOff + w.length) / v.text.length) * (end - start);
          words.push({ text: w, start: ws, end: we });
          charOff = v.text.indexOf(w, charOff) + w.length;
        }
        offset += v.text.length;
        return { verse: v.verse, startTime: start, endTime: end, wordTimings: words };
      });
    },
    [],
  );

  useEffect(() => {
    if (!audioUrl) {
      setHasAudio(false);
      return;
    }

    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      setHasAudio(true);

      if (alignment) {
        versesRef.current = buildTimings(alignment);
      } else if (chapter) {
        versesRef.current = estimateTimings(chapter, audio.duration);
      }
    });

    audio.addEventListener("error", () => {
      setHasAudio(false);
    });

    audio.addEventListener("ended", () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
      callbacksRef.current.onPlayingChange(false);
      callbacksRef.current.onVerseChange(null);
      callbacksRef.current.onWordChange(null, null);
      callbacksRef.current.onTimeUpdate(0);
      callbacksRef.current.onEnded?.();
    });

    audioRef.current = audio;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [audioUrl, alignment, chapter, buildTimings, estimateTimings]);

  const updateLoop = useCallback(() => {
    if (!isPlayingRef.current || !audioRef.current) return;
    const t = audioRef.current.currentTime;
    callbacksRef.current.onTimeUpdate(t);

    for (const vt of versesRef.current) {
      if (t >= vt.startTime && t < vt.endTime) {
        callbacksRef.current.onVerseChange(vt.verse);
        let wordFound = false;
        for (let i = 0; i < vt.wordTimings.length; i++) {
          const w = vt.wordTimings[i]!;
          if (t >= w.start && t < w.end) {
            callbacksRef.current.onWordChange(i, vt.verse);
            wordFound = true;
            break;
          }
        }
        if (!wordFound) callbacksRef.current.onWordChange(null, vt.verse);
        break;
      }
    }

    rafRef.current = requestAnimationFrame(updateLoop);
  }, []);

  const play = useCallback(
    (fromVerse?: number) => {
      const audio = audioRef.current;
      if (!audio || !hasAudio) return;

      if (fromVerse !== undefined) {
        const vt = versesRef.current.find((v) => v.verse === fromVerse);
        if (vt) audio.currentTime = vt.startTime;
      }

      audio.play().then(() => {
        isPlayingRef.current = true;
        setIsPlaying(true);
        callbacksRef.current.onPlayingChange(true);
        rafRef.current = requestAnimationFrame(updateLoop);
      });
    },
    [hasAudio, updateLoop],
  );

  const pause = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioRef.current?.pause();
    isPlayingRef.current = false;
    setIsPlaying(false);
    callbacksRef.current.onPlayingChange(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) pause();
    else play();
  }, [play, pause]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      callbacksRef.current.onTimeUpdate(time);
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, []);

  return {
    isPlaying,
    hasAudio,
    duration,
    play,
    pause,
    togglePlay,
    seekTo,
    setSpeed,
  };
}
