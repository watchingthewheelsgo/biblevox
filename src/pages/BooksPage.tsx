import { useState } from "react";
import { Link } from "react-router-dom";
import { BIBLE_BOOKS, getBooksByTestament } from "@/data/books";
import type { BibleBook } from "@/types";
import { ChevronRightIcon, BookOpenIcon } from "@/components/Icons";
import { useI18n } from "@/i18n/provider";

export function BooksPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"old" | "new">("old");
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const books = getBooksByTestament(tab);

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-8">
      {/* Header */}
      <header className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <BookOpenIcon className="w-6 h-6 text-accent/60" />
          <h1 className="text-2xl font-bold tracking-tight">{t("books.title")}</h1>
        </div>
        <p className="text-sm text-text-secondary">
          {t("books.subtitle", { books: BIBLE_BOOKS.length })}
        </p>
      </header>

      {/* Testament Tabs */}
      <div className="flex gap-2 mb-6 animate-fade-in-up delay-100">
        {(["old", "new"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { setTab(tabKey); setExpandedBook(null); }}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
              tab === tabKey
                ? "bg-accent text-bg-primary shadow-lg shadow-accent/20"
                : "glass text-text-secondary hover:text-text-primary"
            }`}
          >
            {tabKey === "old" ? t("books.old") : t("books.new")}
          </button>
        ))}
      </div>

      {/* Book List */}
      <div className="space-y-1.5 animate-fade-in-up delay-200">
        {books.map((book, i) => (
          <BookRow
            key={book.id}
            book={book}
            expanded={expandedBook === book.id}
            onToggle={() => setExpandedBook(expandedBook === book.id ? null : book.id)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

function BookRow({ book, expanded, onToggle, index }: { book: BibleBook; expanded: boolean; onToggle: () => void; index: number }) {
  const { t } = useI18n();
  return (
    <div style={{ animationDelay: `${Math.min(index * 20, 400)}ms` }} className="animate-fade-in-up">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 glass rounded-xl px-4 py-3 transition-all duration-200 ${
          expanded ? "border-border-accent bg-bg-card/80" : "hover:border-border-accent"
        }`}
      >
        <span className="text-[11px] text-text-muted font-mono w-5">{index + 1}</span>
        <div className="flex-1 text-left">
          <p className="text-[13px] font-medium text-text-primary">{book.name}</p>
        </div>
        <span className="text-[11px] text-text-muted mr-1">
          {t("books.ch", { count: book.chapters })}
        </span>
        <ChevronRightIcon className={`w-4 h-4 text-text-muted/40 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-1 glass rounded-xl p-3 animate-fade-in">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
              <Link
                key={ch}
                to={`/read/${book.id}/${ch}`}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium bg-bg-secondary/80 text-text-secondary hover:bg-accent hover:text-bg-primary transition-all duration-150 border border-border hover:border-accent"
              >
                {ch}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
