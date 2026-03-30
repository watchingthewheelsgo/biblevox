import type { BibleVerse } from "@/types";

interface HighlightedVerseProps {
  verse: BibleVerse;
  isActive: boolean;
  activeWordIndex: number | null;
  onClick: () => void;
}

export function HighlightedVerse({
  verse,
  isActive,
  activeWordIndex,
  onClick,
}: HighlightedVerseProps) {
  if (isActive && activeWordIndex !== null) {
    const words = verse.text.match(/\S+\s*/g) ?? [verse.text];
    return (
      <span
        onClick={onClick}
        className="inline rounded-lg px-1.5 py-0.5 transition-all duration-200 cursor-pointer bg-highlight-sentence"
      >
        <sup className="text-accent text-[10px] font-bold mr-1 select-none opacity-70">
          {verse.verse}
        </sup>
        {words.map((word, i) => (
          <span
            key={`${verse.verse}-w-${i}`}
            className={`transition-all duration-100 ${
              i === activeWordIndex
                ? "bg-highlight-word rounded-[3px] px-0.5 text-white font-semibold"
                : ""
            }`}
          >
            {word}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      className={`inline rounded-lg px-1.5 py-0.5 transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-highlight-sentence text-text-primary"
          : "hover:bg-white/[0.03]"
      }`}
    >
      <sup className={`text-[10px] font-bold mr-1 select-none ${isActive ? "text-accent" : "text-accent/50"}`}>
        {verse.verse}
      </sup>
      {verse.text}
    </span>
  );
}
