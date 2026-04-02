import { useState } from "react";
import { Link } from "react-router-dom";
import { BIBLE_BOOKS, getBooksByTestament } from "@/data/books";
import type { BibleBook } from "@/types";
import { ChevronRightIcon, BookOpenIcon } from "@/components/Icons";
import { useI18n } from "@/i18n/provider";
import { useEntitlements } from "@/hooks/useEntitlements";

export function BooksPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"old" | "new">("old");
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const books = getBooksByTestament(tab);
  const { data: entitlements } = useEntitlements();

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
            entitlements={entitlements}
          />
        ))}
      </div>
    </div>
  );
}

function BookRow({
  book,
  expanded,
  onToggle,
  index,
  entitlements,
}: {
  book: BibleBook;
  expanded: boolean;
  onToggle: () => void;
  index: number;
  entitlements: {
    signedIn: boolean;
    verified: boolean;
    chapterLimit: number | null;
    unlockedAll: boolean;
    unlockedChapters: string[];
  } | null;
}) {
  const { t } = useI18n();
  const freeLimit = entitlements?.unlockedAll
    ? Number.POSITIVE_INFINITY
    : (entitlements?.chapterLimit ?? (entitlements?.verified ? 5 : 2));
  const unlockedSet = new Set(entitlements?.unlockedChapters ?? []);
  const canOpen = (chapter: number) =>
    Boolean(
      entitlements?.unlockedAll ||
        chapter <= freeLimit ||
        unlockedSet.has(`${book.id}:${chapter}`),
    );

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
              <div key={ch} className="relative">
                <Link
                  to={`/read/${book.id}/${ch}`}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-150 border ${
                    canOpen(ch)
                      ? "bg-emerald-500/10 text-emerald-100 border-emerald-500/35 ring-1 ring-emerald-400/25 hover:bg-accent hover:text-bg-primary hover:border-accent hover:ring-0"
                      : "bg-bg-secondary/80 text-text-secondary border-border hover:bg-accent hover:text-bg-primary hover:border-accent"
                  }`}
                >
                  {ch}
                </Link>
                {!canOpen(ch) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!entitlements?.signedIn) {
                        window.location.href = "/auth";
                        return;
                      }
                      const res = await fetch("/api/billing/checkout/chapter", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          bookId: book.id,
                          chapter: ch,
                          returnUrl: `${window.location.origin}/read/${book.id}/${ch}`,
                        }),
                      });
                      const data = (await res.json()) as { checkoutUrl?: string };
                      if (res.ok && data.checkoutUrl) window.location.href = data.checkoutUrl;
                    }}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0.5 rounded bg-accent text-bg-primary"
                  >
                    $2
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={async () => {
                if (!entitlements?.signedIn) {
                  window.location.href = "/auth";
                  return;
                }
                const res = await fetch("/api/billing/checkout/unlock-all", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    returnUrl: `${window.location.origin}/books`,
                  }),
                });
                const data = (await res.json()) as { checkoutUrl?: string };
                if (res.ok && data.checkoutUrl) window.location.href = data.checkoutUrl;
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent text-bg-primary"
            >
              Unlock All Chapters ($30)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
