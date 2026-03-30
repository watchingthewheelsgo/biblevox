import { Link } from "react-router-dom";
import { HeadphonesIcon, ChevronRightIcon, BookOpenIcon } from "@/components/Icons";

const FEATURED_READINGS = [
  { title: "Psalm 23", subtitle: "The Lord is My Shepherd", book: "Psalms", link: "/read/psalms/23", color: "from-amber-900/25" },
  { title: "Genesis 1", subtitle: "In the Beginning", book: "Genesis", link: "/read/genesis/1", color: "from-blue-900/25" },
  { title: "John 1", subtitle: "The Word Was God", book: "John", link: "/read/john/1", color: "from-emerald-900/25" },
  { title: "Romans 8", subtitle: "Life in the Spirit", book: "Romans", link: "/read/romans/8", color: "from-purple-900/25" },
  { title: "Isaiah 53", subtitle: "The Suffering Servant", book: "Isaiah", link: "/read/isaiah/53", color: "from-red-900/25" },
  { title: "Revelation 21", subtitle: "A New Heaven", book: "Revelation", link: "/read/revelation/21", color: "from-indigo-900/25" },
];

const PLAYLISTS = [
  {
    title: "The Gospels",
    description: "The life and teachings of Jesus Christ",
    chapters: [
      { label: "Matthew 5", link: "/read/matthew/5" },
      { label: "Mark 1", link: "/read/mark/1" },
      { label: "Luke 15", link: "/read/luke/15" },
      { label: "John 3", link: "/read/john/3" },
    ],
  },
  {
    title: "Psalms of Comfort",
    description: "Finding peace in troubled times",
    chapters: [
      { label: "Psalm 23", link: "/read/psalms/23" },
      { label: "Psalm 46", link: "/read/psalms/46" },
      { label: "Psalm 91", link: "/read/psalms/91" },
      { label: "Psalm 121", link: "/read/psalms/121" },
    ],
  },
  {
    title: "Words of Wisdom",
    description: "Practical wisdom for daily life",
    chapters: [
      { label: "Proverbs 1", link: "/read/proverbs/1" },
      { label: "Proverbs 3", link: "/read/proverbs/3" },
      { label: "Ecclesiastes 3", link: "/read/ecclesiastes/3" },
      { label: "James 1", link: "/read/james/1" },
    ],
  },
];

export function ListenPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-8 space-y-10">
      {/* Header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <HeadphonesIcon className="w-6 h-6 text-accent/60" />
          <h1 className="text-2xl font-bold tracking-tight">Listen</h1>
        </div>
        <p className="text-sm text-text-secondary">
          Audio Bible readings with word-by-word highlighting
        </p>
      </header>

      {/* Featured Readings */}
      <section className="animate-fade-in-up delay-100">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
          Featured Readings
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURED_READINGS.map((item) => (
            <Link key={item.link} to={item.link} className="group">
              <div className={`relative overflow-hidden glass rounded-xl p-4 h-full hover:border-border-accent transition-all duration-300 bg-gradient-to-br ${item.color} to-transparent`}>
                <HeadphonesIcon className="w-5 h-5 text-accent/30 mb-2.5" />
                <h3 className="text-[13px] font-semibold text-text-primary mb-0.5">{item.title}</h3>
                <p className="text-[10px] text-text-secondary">{item.subtitle}</p>
                <p className="text-[10px] text-text-muted mt-1.5">{item.book}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Curated Playlists */}
      <section className="animate-fade-in-up delay-200">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-4">
          Curated Playlists
        </h2>
        <div className="space-y-3">
          {PLAYLISTS.map((playlist) => (
            <div key={playlist.title} className="glass rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <BookOpenIcon className="w-5 h-5 text-accent/40 mt-0.5" />
                <div>
                  <h3 className="text-[13px] font-semibold text-text-primary">{playlist.title}</h3>
                  <p className="text-[11px] text-text-secondary">{playlist.description}</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pl-8">
                {playlist.chapters.map((ch) => (
                  <Link
                    key={ch.link}
                    to={ch.link}
                    className="flex-shrink-0 px-3 py-2 rounded-lg text-[11px] font-medium bg-bg-secondary/60 text-text-secondary hover:bg-accent hover:text-bg-primary transition-all border border-border hover:border-accent"
                  >
                    {ch.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Browse All */}
      <section className="animate-fade-in-up delay-300">
        <Link to="/books" className="group block">
          <div className="glass rounded-xl p-5 text-center hover:border-border-accent transition-all duration-300">
            <BookOpenIcon className="w-6 h-6 text-accent/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-text-primary mb-0.5">Browse All Books</p>
            <p className="text-[11px] text-text-secondary flex items-center justify-center gap-1">
              66 books · 1,189 chapters <ChevronRightIcon className="w-3 h-3" />
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
