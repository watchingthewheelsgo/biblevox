import { Link } from "react-router-dom";
import { BookOpenIcon, ChevronRightIcon, HeadphonesIcon, CrossIcon, StarIcon } from "@/components/Icons";
import { useI18n } from "@/i18n/provider";

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "home.greeting.night";
  if (hour < 12) return "home.greeting.morning";
  if (hour < 17) return "home.greeting.afternoon";
  if (hour < 21) return "home.greeting.evening";
  return "home.greeting.night";
}

const DAILY_VERSES = [
  { text: "Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth.", ref: "Psalm 46:10", link: "/read/psalms/46" },
  { text: "In the beginning God created the heaven and the earth.", ref: "Genesis 1:1", link: "/read/genesis/1" },
  { text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", ref: "John 3:16", link: "/read/john/3" },
  { text: "The LORD is my shepherd; I shall not want.", ref: "Psalm 23:1", link: "/read/psalms/23" },
  { text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.", ref: "Proverbs 3:5", link: "/read/proverbs/3" },
];

const COLLECTIONS = [
  { titleKey: "home.collection.bible.title", subtitleKey: "home.collection.bible.subtitle", statKey: "home.collection.bible.stat", icon: BookOpenIcon, link: "/books", gradient: "from-amber-900/30 via-amber-800/15 to-transparent" },
  { titleKey: "home.collection.psalms.title", subtitleKey: "home.collection.psalms.subtitle", statKey: "home.collection.psalms.stat", icon: StarIcon, link: "/read/psalms/1", gradient: "from-indigo-900/30 via-indigo-800/15 to-transparent" },
  { titleKey: "home.collection.proverbs.title", subtitleKey: "home.collection.proverbs.subtitle", statKey: "home.collection.proverbs.stat", icon: CrossIcon, link: "/read/proverbs/1", gradient: "from-emerald-900/30 via-emerald-800/15 to-transparent" },
];

const RECENT_LISTENS = [
  { titleKey: "home.recent.ps23.title", subtitleKey: "home.recent.ps23.subtitle", verses: 6, link: "/read/psalms/23" },
  { titleKey: "home.recent.gen1.title", subtitleKey: "home.recent.gen1.subtitle", verses: 31, link: "/read/genesis/1" },
  { titleKey: "home.recent.john1.title", subtitleKey: "home.recent.john1.subtitle", verses: 51, link: "/read/john/1" },
  { titleKey: "home.recent.rom8.title", subtitleKey: "home.recent.rom8.subtitle", verses: 39, link: "/read/romans/8" },
];

export function HomePage() {
  const { t, formatDate } = useI18n();
  const today = new Date();
  const dailyVerse = DAILY_VERSES[today.getDate() % DAILY_VERSES.length]!;

  return (
    <div className="max-w-2xl mx-auto px-5 pt-14 pb-8 space-y-10">
      {/* Header */}
      <header className="animate-fade-in-up">
        <p className="text-text-secondary text-sm font-medium mb-2">{t(greetingKey())}</p>
        <h1 className="text-[28px] font-bold tracking-tight leading-tight">
          {t("home.title")}{" "}
          <span className="gradient-text">{t("home.seeker")}</span>
        </h1>
      </header>

      {/* Daily Verse */}
      <section className="animate-fade-in-up delay-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">
            {t("home.todayVerse")}
          </h2>
          <span className="text-[10px] text-text-muted/60">
            {formatDate(today, { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
        <Link to={dailyVerse.link} className="block group">
          <div className="relative overflow-hidden rounded-2xl glass p-6 hover:border-border-accent transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
            <div className="relative">
              <blockquote className="font-serif text-[17px] leading-[1.75] text-text-primary/85 mb-5 italic">
                &ldquo;{dailyVerse.text}&rdquo;
              </blockquote>
              <div className="flex items-center justify-between">
                <cite className="text-accent text-sm font-semibold not-italic tracking-wide">
                  — {dailyVerse.ref}
                </cite>
                <span className="flex items-center gap-1 text-text-muted text-xs group-hover:text-accent transition-colors">
                  {t("home.read")} <ChevronRightIcon className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Scripture Collections */}
      <section className="animate-fade-in-up delay-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">
            {t("home.collections")}
          </h2>
          <Link to="/books" className="text-xs text-accent hover:text-accent-hover transition-colors font-medium">
            {t("home.viewAll")}
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {COLLECTIONS.map((item) => (
            <Link key={item.titleKey} to={item.link} className="group">
              <div className={`relative overflow-hidden rounded-xl glass p-4 h-full hover:border-border-accent transition-all duration-300 bg-gradient-to-br ${item.gradient}`}>
                <item.icon className="w-7 h-7 text-accent/40 mb-3 group-hover:text-accent/60 transition-colors" />
                <h3 className="text-[13px] font-semibold text-text-primary mb-0.5 leading-tight">
                  {t(item.titleKey)}
                </h3>
                <p className="text-[10px] text-text-secondary mb-2">{t(item.subtitleKey)}</p>
                <p className="text-[10px] text-text-muted font-medium">{t(item.statKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Continue Listening */}
      <section className="animate-fade-in-up delay-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">
            {t("home.continue")}
          </h2>
          <Link to="/listen" className="text-xs text-accent hover:text-accent-hover transition-colors font-medium">
            {t("home.seeAll")}
          </Link>
        </div>

        <div className="space-y-2">
          {RECENT_LISTENS.map((item) => (
            <Link key={item.link} to={item.link} className="group block">
              <div className="flex items-center gap-4 glass rounded-xl px-4 py-3.5 hover:border-border-accent transition-all duration-300">
                <div className="w-11 h-11 rounded-lg bg-accent/8 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/15 transition-colors">
                  <HeadphonesIcon className="w-5 h-5 text-accent/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">
                    {t(item.titleKey)} — {t(item.subtitleKey)}
                  </p>
                  <p className="text-[11px] text-text-muted">{t("home.verses", { count: item.verses })}</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-text-muted/40 group-hover:text-accent/60 transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Speak to Wisdom CTA */}
      <section className="animate-fade-in-up delay-400">
        <Link to="/read/proverbs/1" className="block group">
          <div className="relative overflow-hidden rounded-2xl glass p-5 text-center hover:border-border-accent transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <CrossIcon className="w-8 h-8 text-accent/40 mx-auto mb-2 animate-float" />
              <p className="text-sm font-semibold text-text-primary mb-1">{t("home.speakWisdom")}</p>
              <p className="text-[11px] text-text-secondary">{t("home.beginProverbs")}</p>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
