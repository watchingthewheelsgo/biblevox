import { Outlet, Link, useLocation } from "react-router-dom";
import { HomeIcon, BookOpenIcon, SpeakerIcon, SearchIcon, HeadphonesIcon } from "./Icons";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useI18n } from "@/i18n/provider";

export function Layout() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-radial-glow fixed inset-0 pointer-events-none" />

      <main className="flex-1 pb-20 relative z-10">
        <div className="max-w-2xl mx-auto px-5 pt-3 flex justify-end">
          <LanguageSwitcher />
        </div>
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-lg mx-auto flex items-center justify-between py-2.5 px-2 gap-0.5">
          <NavItem to="/" icon={<HomeIcon className="w-5 h-5" />} label={t("nav.home")} active={pathname === "/"} />
          <NavItem to="/books" icon={<BookOpenIcon className="w-5 h-5" />} label={t("nav.scripture")} active={pathname.startsWith("/books") || pathname.startsWith("/read")} />
          <NavItem to="/listen" icon={<SpeakerIcon className="w-5 h-5" />} label={t("nav.listen")} active={pathname === "/listen"} />
          <NavItem to="/search" icon={<SearchIcon className="w-5 h-5" />} label={t("nav.search")} active={pathname === "/search"} />
          <NavItem to="/voices" icon={<HeadphonesIcon className="w-5 h-5" />} label={t("nav.voices")} active={pathname === "/voices"} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-1 rounded-xl transition-all ${
        active
          ? "text-accent"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  );
}
