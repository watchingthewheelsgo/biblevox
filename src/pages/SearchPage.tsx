import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { SearchIcon, ChevronRightIcon } from "@/components/Icons";
import { BIBLE_BOOKS } from "@/data/books";

const POPULAR_VERSES = [
  { ref: "John 3:16", link: "/read/john/3" },
  { ref: "Psalm 23", link: "/read/psalms/23" },
  { ref: "Romans 8:28", link: "/read/romans/8" },
  { ref: "Philippians 4:13", link: "/read/philippians/4" },
  { ref: "Jeremiah 29:11", link: "/read/jeremiah/29" },
  { ref: "Proverbs 3:5-6", link: "/read/proverbs/3" },
  { ref: "Isaiah 40:31", link: "/read/isaiah/40" },
  { ref: "Matthew 6:33", link: "/read/matthew/6" },
];

export function SearchPage() {
  const [query, setQuery] = useState("");

  const filteredBooks = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return BIBLE_BOOKS.filter(
      (b) => b.name.toLowerCase().includes(q) || b.abbrev.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-8 space-y-8">
      {/* Header */}
      <header className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Search</h1>

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, chapters..."
            className="w-full pl-11 pr-4 py-3 glass rounded-xl text-[14px] text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>
      </header>

      {/* Search Results */}
      {query.trim() && (
        <section className="animate-fade-in">
          {filteredBooks.length > 0 ? (
            <div className="space-y-1.5">
              {filteredBooks.map((book) => (
                <Link
                  key={book.id}
                  to={`/read/${book.id}/1`}
                  className="flex items-center gap-3 glass rounded-xl px-4 py-3 hover:border-border-accent transition-all group"
                >
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-text-primary">{book.name}</p>
                    <p className="text-[11px] text-text-muted">
                      {book.chapters} chapters · {book.testament === "old" ? "Old" : "New"} Testament
                    </p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-text-muted/40 group-hover:text-accent transition-colors" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">
              No books found for &ldquo;{query}&rdquo;
            </p>
          )}
        </section>
      )}

      {/* Popular Verses */}
      {!query.trim() && (
        <section className="animate-fade-in-up delay-100">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            Popular Verses
          </h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_VERSES.map((v) => (
              <Link
                key={v.ref}
                to={v.link}
                className="px-3.5 py-2 glass rounded-xl text-[12px] font-medium text-text-secondary hover:text-accent hover:border-border-accent transition-all"
              >
                {v.ref}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick Access by Testament */}
      {!query.trim() && (
        <section className="animate-fade-in-up delay-200">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/books" className="group">
              <div className="glass rounded-xl p-4 hover:border-border-accent transition-all">
                <p className="text-[13px] font-semibold text-text-primary mb-0.5">Old Testament</p>
                <p className="text-[11px] text-text-secondary">39 books</p>
              </div>
            </Link>
            <Link to="/books" className="group">
              <div className="glass rounded-xl p-4 hover:border-border-accent transition-all">
                <p className="text-[13px] font-semibold text-text-primary mb-0.5">New Testament</p>
                <p className="text-[11px] text-text-secondary">27 books</p>
              </div>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
