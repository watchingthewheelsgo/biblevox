import { useState } from "react";
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, SpeedIcon } from "./Icons";
import { useI18n } from "@/i18n/provider";

interface AudioPlayerBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  hasAudio: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSpeedChange: (speed: number) => void;
  title: string;
  subtitle: string;
  mode: "audio" | "speech" | "wavespeed";
}

function formatTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AudioPlayerBar({
  isPlaying,
  currentTime,
  duration,
  hasAudio,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  onSpeedChange,
  title,
  subtitle,
  mode,
}: AudioPlayerBarProps) {
  const { t } = useI18n();
  const [speedIdx, setSpeedIdx] = useState(2);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    onSpeedChange(SPEEDS[next]!);
  };

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-40 px-3 animate-slide-up">
      <div className="max-w-2xl mx-auto">
        <div className="glass-strong rounded-2xl shadow-2xl shadow-black/50 p-3.5">
          {/* Progress bar — full timeline only for pre-generated static audio */}
          {mode === "audio" && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-text-muted font-mono w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 h-1 bg-white/8 rounded-full cursor-pointer group relative"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  onSeek(pct * duration);
                }}
              >
                <div
                  className="h-full bg-accent rounded-full relative transition-all"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-accent/30" />
                </div>
              </div>
              <span className="text-[10px] text-text-muted font-mono w-8">
                {formatTime(duration)}
              </span>
            </div>
          )}
          {mode === "wavespeed" && (
            <p className="text-[10px] text-text-muted mb-3 text-center">
              {t("player.wavespeedNote")}
            </p>
          )}

          <div className="flex items-center gap-3">
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-text-primary truncate">{title}</p>
              <p className="text-[11px] text-text-secondary truncate">
                {subtitle}
                {mode === "speech" && (
                  <span className="ml-1.5 text-accent/50 italic">{t("player.browserVoice")}</span>
                )}
                {mode === "wavespeed" && (
                  <span className="ml-1.5 text-accent/50 italic">{t("player.wavespeedVoice")}</span>
                )}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-0.5">
              {(mode === "audio" || mode === "wavespeed") && (
                <button
                  onClick={cycleSpeed}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors flex items-center gap-0.5"
                >
                  <SpeedIcon className="w-3 h-3" />
                  {SPEEDS[speedIdx]}x
                </button>
              )}

              {onPrev && (
                <button
                  onClick={onPrev}
                  className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                >
                  <SkipBackIcon className="w-4.5 h-4.5" />
                </button>
              )}

              <button
                onClick={onTogglePlay}
                disabled={!hasAudio}
                className={`p-3 rounded-full transition-all duration-200 ${
                  hasAudio
                    ? "bg-accent text-bg-primary hover:bg-accent-hover active:scale-95 shadow-lg shadow-accent/25"
                    : "bg-white/8 text-text-muted cursor-not-allowed"
                } ${isPlaying ? "animate-pulse-glow" : ""}`}
              >
                {isPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5" />
                )}
              </button>

              {onNext && (
                <button
                  onClick={onNext}
                  className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                >
                  <SkipForwardIcon className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
