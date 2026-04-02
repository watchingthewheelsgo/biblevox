import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getBook } from "@/data/books";
import { loadChapter, loadAlignment, getAudioUrl, checkAudioExists } from "@/data/loader";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useGeminiVersePlayback } from "@/hooks/useGeminiVersePlayback";
import { useWaveSpeedVersePlayback } from "@/hooks/useWaveSpeedVersePlayback";
import { useEntitlements } from "@/hooks/useEntitlements";
import { HighlightedVerse } from "@/components/HighlightedVerse";
import { AudioPlayerBar } from "@/components/AudioPlayerBar";
import { ChevronLeftIcon, ChevronRightIcon, BookOpenIcon } from "@/components/Icons";
import {
  GEMINI_VOICE_LABELS,
  getGeminiVoiceGender,
  setGeminiVoiceGender,
  type GeminiVoiceGender,
} from "@/lib/geminiVoicePreference";
import { getSelectedVoiceId, setSelectedVoiceId } from "@/lib/savedVoices";
import type { BibleChapter, ChapterAlignment } from "@/types";
import type { SavedVoice } from "@/types/voice";
import { useI18n } from "@/i18n/provider";

export function ReaderPage() {
  const { t } = useI18n();
  const { bookId = "", chapter: chapterStr = "1" } = useParams();
  const chapterNum = Number(chapterStr);
  const navigate = useNavigate();
  const book = getBook(bookId);
  const { data: entitlements, loading: entLoading, refresh: refreshEntitlements } = useEntitlements();

  const [chapterData, setChapterData] = useState<BibleChapter | null>(null);
  const [alignment, setAlignment] = useState<ChapterAlignment | null>(null);
  const [audioExists, setAudioExists] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [, setPlaybackPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [voiceListVersion, setVoiceListVersion] = useState(0);
  const [savedVoices, setSavedVoices] = useState<SavedVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceIdState] = useState<string | null>(() =>
    getSelectedVoiceId(),
  );
  const [chapterAllowed, setChapterAllowed] = useState<boolean>(true);
  const [geminiGender, setGeminiGenderState] = useState<GeminiVoiceGender>(() =>
    getGeminiVoiceGender(),
  );

  const setVoiceId = useCallback((id: string | null) => {
    setSelectedVoiceIdState(id);
    setSelectedVoiceId(id);
  }, []);

  const selectedVoice: SavedVoice | null = useMemo(
    () => savedVoices.find((v) => v.id === selectedVoiceId) ?? null,
    [savedVoices, selectedVoiceId],
  );

  useEffect(() => {
    fetch("/api/voice-presets", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: SavedVoice[] }) => setSavedVoices(d.items ?? []))
      .catch(() => setSavedVoices([]));
  }, [voiceListVersion]);

  useEffect(() => {
    if (selectedVoiceId && !savedVoices.some((v) => v.id === selectedVoiceId)) {
      setVoiceId(null);
    }
  }, [savedVoices, selectedVoiceId, setVoiceId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveVerse(null);
    setActiveWordIndex(null);
    setCurrentTime(0);

    Promise.all([
      loadChapter(bookId, chapterNum),
      loadAlignment(bookId, chapterNum),
      checkAudioExists(bookId, chapterNum),
    ]).then(([ch, al, exists]) => {
      if (cancelled) return;
      setChapterData(ch);
      setAlignment(al);
      setAudioExists(exists);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [bookId, chapterNum]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chapter-access?bookId=${bookId}&chapter=${chapterNum}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d: { allowed?: boolean }) => {
        if (!cancelled) setChapterAllowed(Boolean(d.allowed));
      })
      .catch(() => {
        if (!cancelled) setChapterAllowed(chapterNum <= 2);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterNum, entitlements?.signedIn, entitlements?.verified, entitlements?.unlockedAll]);

  const onVerseChange = useCallback((v: number | null) => {
    setActiveVerse(v);
    if (v !== null) {
      const el = document.querySelector(`[data-verse="${v}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const onWordChange = useCallback((idx: number | null, _verse: number | null) => {
    setActiveWordIndex(idx);
  }, []);

  const onTimeUpdate = useCallback((t: number) => setCurrentTime(t), []);
  const onPlayingChange = useCallback((p: boolean) => setPlaybackPlaying(p), []);

  const audioPlayback = useAudioPlayback(
    chapterData,
    alignment,
    audioExists ? getAudioUrl(bookId, chapterNum) : null,
    { onVerseChange, onWordChange, onTimeUpdate, onPlayingChange },
  );

  const useStaticAudio = audioPlayback.hasAudio;
  const useWaveSpeed = !useStaticAudio && Boolean(selectedVoice);
  const useGemini = !useStaticAudio && !useWaveSpeed;

  const geminiPlayback = useGeminiVersePlayback(
    bookId,
    chapterNum,
    chapterData,
    geminiGender,
    playbackSpeed,
    useGemini,
    {
      onVerseChange,
      onWordChange,
      onTimeUpdate,
      onPlayingChange,
      onError: (msg) => console.error("[Gemini TTS]", msg),
    },
  );

  const wsPlayback = useWaveSpeedVersePlayback(
    chapterData,
    useWaveSpeed ? selectedVoice : null,
    playbackSpeed,
    {
      onVerseChange,
      onWordChange,
      onTimeUpdate,
      onPlayingChange,
      onError: (msg) => console.error("[WaveSpeed]", msg),
    },
  );

  const playback = useStaticAudio ? audioPlayback : useWaveSpeed ? wsPlayback : geminiPlayback;

  const handleVerseClick = useCallback(
    (verse: number) => {
      if (useStaticAudio) audioPlayback.play(verse);
      else if (useWaveSpeed) wsPlayback.playFromVerse(verse);
      else geminiPlayback.playFromVerse(verse);
    },
    [useStaticAudio, useWaveSpeed, audioPlayback, wsPlayback, geminiPlayback],
  );

  const goPrev = () => {
    if (chapterNum > 1) navigate(`/read/${bookId}/${chapterNum - 1}`);
  };
  const goNext = () => {
    if (book && chapterNum < book.chapters) navigate(`/read/${bookId}/${chapterNum + 1}`);
  };

  const playerMode = useStaticAudio ? "audio" : useWaveSpeed ? "wavespeed" : "gemini";

  if (!book) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-16 text-center">
        <BookOpenIcon className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
        <p className="text-text-secondary mb-3">{t("reader.bookNotFound")}</p>
        <Link to="/books" className="text-accent text-sm font-medium hover:text-accent-hover transition-colors">
          {t("reader.browseAllBooks")}
        </Link>
      </div>
    );
  }

  const overLimit = !entLoading && !chapterAllowed;
  const canUnlock = Boolean(entitlements?.signedIn);

  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-44">
      {/* Header */}
      <header className="flex items-center gap-2 mb-6 animate-fade-in-up">
        <Link
          to="/books"
          className="p-2 -ml-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-text-primary truncate">{book.name}</h1>
          <p className="text-[11px] text-text-secondary">{t("reader.chapterOf", { chapter: chapterNum, total: book.chapters })}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={chapterNum <= 1}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary disabled:opacity-20 transition-all hover:bg-white/5"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-text-muted font-mono w-12 text-center">
            {chapterNum} / {book.chapters}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={chapterNum >= book.chapters}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary disabled:opacity-20 transition-all hover:bg-white/5"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Voice: Gemini preset (free) + optional WaveSpeed */}
      {!useStaticAudio && chapterData && (
        <div className="mb-6 glass rounded-xl px-4 py-3 flex flex-col gap-3 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="text-[11px] text-text-muted uppercase tracking-wide shrink-0">
              {t("reader.geminiPresetLabel")}
            </span>
            <div
              className={`flex rounded-xl p-0.5 bg-bg-secondary/80 border border-border w-fit ${
                useWaveSpeed ? "opacity-40 pointer-events-none" : ""
              }`}
              title={useWaveSpeed ? t("reader.geminiDisabledWhileCustom") : undefined}
            >
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGeminiGenderState(g);
                    setGeminiVoiceGender(g);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    geminiGender === g
                      ? "bg-accent text-bg-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {g === "male"
                    ? t("reader.geminiMaleLabel", { name: GEMINI_VOICE_LABELS.male.name })
                    : t("reader.geminiFemaleLabel", { name: GEMINI_VOICE_LABELS.female.name })}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label className="text-[11px] text-text-muted uppercase tracking-wide shrink-0">
              {t("reader.voiceLabel")}
            </label>
            <select
              value={selectedVoiceId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setVoiceId(v || null);
              }}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-bg-secondary/80 border border-border text-[13px] text-text-primary focus:outline-none focus:border-accent/40"
            >
              <option value="">{t("reader.geminiPresetOnly")}</option>
              {savedVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.kind === "design" ? "Design" : "Clone"})
                </option>
              ))}
            </select>
            <Link
              to="/voices"
              className="text-xs text-accent hover:text-accent-hover whitespace-nowrap shrink-0"
              onClick={() => setVoiceListVersion((n) => n + 1)}
            >
              {t("reader.manageVoices")} →
            </Link>
          </div>
        </div>
      )}

      {overLimit && (
        <div className="glass rounded-xl border border-accent/25 p-4 mb-6">
          <p className="text-sm text-text-primary mb-2">
            This chapter is locked.
          </p>
          <p className="text-xs text-text-muted mb-3">
            Trial access: unverified 2 chapters, verified 5 chapters. Single chapter unlock: $2, unlock all: $30.
          </p>
          {!canUnlock ? (
            <Link to="/auth" className="text-sm text-accent hover:text-accent-hover">
              Sign in to unlock
            </Link>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/billing/checkout/chapter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      bookId,
                      chapter: chapterNum,
                      returnUrl: window.location.href,
                    }),
                  });
                  const data = (await res.json()) as { checkoutUrl?: string };
                  if (res.ok && data.checkoutUrl) window.location.href = data.checkoutUrl;
                }}
                className="px-4 py-2 rounded-lg bg-bg-elevated text-text-primary text-sm font-semibold border border-border"
              >
                Unlock This Chapter ($2)
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/billing/checkout/unlock-all", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ returnUrl: window.location.href }),
                  });
                  const data = (await res.json()) as { checkoutUrl?: string };
                  if (res.ok && data.checkoutUrl) window.location.href = data.checkoutUrl;
                  else {
                    const fallback = await fetch("/api/purchase/unlock-all", {
                      method: "POST",
                      credentials: "include",
                    });
                    if (fallback.ok) await refreshEntitlements();
                  }
                }}
                className="px-4 py-2 rounded-lg bg-accent text-bg-primary text-sm font-semibold"
              >
                Unlock All ($30)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      ) : !chapterData || overLimit ? (
        <div className="text-center py-24">
          <BookOpenIcon className="w-10 h-10 text-text-muted/20 mx-auto mb-3" />
          <p className="text-text-secondary text-sm mb-2">
            {overLimit ? "Please unlock to continue reading this chapter." : t("reader.dataUnavailable")}
          </p>
          <p className="text-[11px] text-text-muted">
            {overLimit ? "You can still read earlier chapters now." : <>{t("reader.runDownload")} <code className="text-accent/60 bg-accent/5 px-1.5 py-0.5 rounded">npm run bible:download</code> {t("reader.toDownload")}</>}
          </p>
        </div>
      ) : (
        <div className="animate-fade-in-up delay-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 text-text-muted/30">
              <span className="w-8 h-px bg-current" />
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-accent/40">
                {t("reader.chapter", { chapter: chapterNum })}
              </span>
              <span className="w-8 h-px bg-current" />
            </div>
          </div>

          <div className="font-serif text-[17px] leading-[1.85] text-text-primary/85 space-y-0.5">
            {chapterData.verses.map((verse) => (
              <span key={verse.verse} data-verse={verse.verse} className="inline">
                <HighlightedVerse
                  verse={verse}
                  isActive={activeVerse === verse.verse}
                  activeWordIndex={activeVerse === verse.verse ? activeWordIndex : null}
                  onClick={() => handleVerseClick(verse.verse)}
                />{" "}
              </span>
            ))}
          </div>

          <div className="text-center mt-10 mb-6">
            <div className="inline-flex items-center gap-3 text-text-muted/20">
              <span className="w-12 h-px bg-current" />
              <span className="text-accent/20 text-lg">✦</span>
              <span className="w-12 h-px bg-current" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mt-4">
            {chapterNum > 1 ? (
              <Link
                to={`/read/${bookId}/${chapterNum - 1}`}
                className="glass rounded-xl px-4 py-3 text-[12px] font-medium text-text-secondary hover:text-accent hover:border-border-accent transition-all flex items-center gap-1"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
                {t("reader.prevChapter", { chapter: chapterNum - 1 })}
              </Link>
            ) : <div />}
            {chapterNum < book.chapters ? (
              <Link
                to={`/read/${bookId}/${chapterNum + 1}`}
                className="glass rounded-xl px-4 py-3 text-[12px] font-medium text-text-secondary hover:text-accent hover:border-border-accent transition-all flex items-center gap-1"
              >
                {t("reader.nextChapter", { chapter: chapterNum + 1 })}
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            ) : <div />}
          </div>

          {!useStaticAudio && !useWaveSpeed && (
            <p className="text-[11px] text-text-muted/50 mt-8 text-center">
              {t("reader.geminiListenHint")}
            </p>
          )}
          {useWaveSpeed && (
            <p className="text-[11px] text-text-muted/50 mt-8 text-center">
              {t("reader.wavespeedHint")}
            </p>
          )}
        </div>
      )}

      {chapterData && (
        <AudioPlayerBar
          isPlaying={playback.isPlaying}
          currentTime={currentTime}
          duration={useStaticAudio ? audioPlayback.duration : 0}
          hasAudio={
            useStaticAudio
              ? playback.hasAudio
              : useWaveSpeed
                ? Boolean(selectedVoice)
                : useGemini
          }
          onTogglePlay={() => {
            if (useStaticAudio) audioPlayback.togglePlay();
            else if (useWaveSpeed) wsPlayback.togglePlay();
            else geminiPlayback.togglePlay();
          }}
          onSeek={useStaticAudio ? audioPlayback.seekTo : () => {}}
          onPrev={chapterNum > 1 ? goPrev : undefined}
          onNext={book && chapterNum < book.chapters ? goNext : undefined}
          onSpeedChange={(sp) => {
            setPlaybackSpeed(sp);
            if (useStaticAudio) audioPlayback.setSpeed(sp);
          }}
          title={`${book.name} ${chapterNum}`}
          subtitle={
            useWaveSpeed && selectedVoice
              ? t("reader.subtitleWithVoice", { count: chapterData.verses.length, voice: selectedVoice.name })
              : useGemini
                ? t("reader.subtitleGemini", {
                    count: chapterData.verses.length,
                    voice: GEMINI_VOICE_LABELS[geminiGender].name,
                  })
                : t("reader.subtitleDefault", { count: chapterData.verses.length })
          }
          mode={playerMode}
        />
      )}
    </div>
  );
}
