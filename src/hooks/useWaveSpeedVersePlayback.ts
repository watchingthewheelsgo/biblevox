import { useCallback, useEffect, useRef, useState } from "react";
import type { BibleChapter } from "@/types";
import type { SavedVoice } from "@/types/voice";
import { base64ToBlob } from "@/lib/audioBase64";

interface Callbacks {
  onVerseChange: (verse: number | null) => void;
  onWordChange: (wordIndex: number | null, verse: number | null) => void;
  onTimeUpdate: (time: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onError?: (msg: string) => void;
}

export function useWaveSpeedVersePlayback(
  chapter: BibleChapter | null,
  voice: SavedVoice | null,
  speed: number,
  callbacks: Callbacks,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const cancelledRef = useRef(false);
  const playChainRef = useRef<Promise<void>>(Promise.resolve());
  const [isPlaying, setIsPlaying] = useState(false);

  const cbsRef = useRef(callbacks);
  cbsRef.current = callbacks;

  const stopInternal = useCallback(() => {
    cancelledRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
    cbsRef.current.onPlayingChange(false);
  }, []);

  const playOneVerse = useCallback(
    (verseText: string, verseNum: number): Promise<void> => {
      if (!voice || cancelledRef.current) return Promise.resolve();
      return fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: verseText,
          mode: voice.kind === "design" ? "design" : "clone",
          voiceDescription: voice.voiceDescription,
          referenceAudioUrl: voice.referenceAudioUrl,
          referenceText: voice.referenceText,
          language: voice.language,
        }),
      })
        .then(async (res) => {
          const data = (await res.json()) as {
            error?: string;
            audioBase64?: string;
            mime?: string;
          };
          if (!res.ok) throw new Error(data.error ?? res.statusText);
          if (!data.audioBase64) throw new Error("No audio returned");
          const blob = base64ToBlob(
            data.audioBase64,
            data.mime ?? "audio/mpeg",
          );
          const url = URL.createObjectURL(blob);
          return new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);
            audio.playbackRate = speed;
            audioRef.current = audio;
            cbsRef.current.onVerseChange(verseNum);

            const words = verseText.match(/\S+/g) ?? [verseText];

            const tick = () => {
              if (cancelledRef.current || !audioRef.current) return;
              const t = audio.currentTime;
              const d = audio.duration;
              if (d && isFinite(d) && d > 0) {
                const ratio = t / d;
                const wi = Math.min(
                  words.length - 1,
                  Math.max(0, Math.floor(ratio * words.length)),
                );
                cbsRef.current.onWordChange(wi, verseNum);
                cbsRef.current.onTimeUpdate(t);
              }
              rafRef.current = requestAnimationFrame(tick);
            };

            audio.onended = () => {
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error("Audio playback error"));
            };
            audio
              .play()
              .then(() => {
                setIsPlaying(true);
                cbsRef.current.onPlayingChange(true);
                rafRef.current = requestAnimationFrame(tick);
              })
              .catch(reject);
          });
        });
    },
    [voice, speed],
  );

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const playFromVerse = useCallback(
    (startVerseNumber: number) => {
      if (!chapter || !voice) return;
      stopInternal();
      cancelledRef.current = false;
      const startIdx = chapter.verses.findIndex((v) => v.verse === startVerseNumber);
      const idx = startIdx >= 0 ? startIdx : 0;

      playChainRef.current = (async () => {
        for (let i = idx; i < chapter.verses.length; i++) {
          if (cancelledRef.current) break;
          const v = chapter.verses[i]!;
          try {
            await playOneVerse(v.text, v.verse);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            cbsRef.current.onError?.(msg);
            break;
          }
        }
        if (!cancelledRef.current) {
          cbsRef.current.onVerseChange(null);
          cbsRef.current.onWordChange(null, null);
          cbsRef.current.onTimeUpdate(0);
        }
        setIsPlaying(false);
        cbsRef.current.onPlayingChange(false);
      })();
    },
    [chapter, voice, playOneVerse, stopInternal],
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopInternal();
      cbsRef.current.onVerseChange(null);
      cbsRef.current.onWordChange(null, null);
      return;
    }
    const first = chapter?.verses[0]?.verse ?? 1;
    playFromVerse(first);
  }, [isPlaying, stopInternal, playFromVerse, chapter]);

  const pause = useCallback(() => {
    stopInternal();
    cbsRef.current.onVerseChange(null);
    cbsRef.current.onWordChange(null, null);
  }, [stopInternal]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopInternal();
    };
  }, [stopInternal]);

  return {
    isPlaying,
    hasAudio: Boolean(voice),
    togglePlay,
    pause,
    playFromVerse,
    stop: stopInternal,
  };
}
