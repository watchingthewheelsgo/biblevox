import { useI18n } from "@/i18n/provider";
import type { LocaleCode } from "@/i18n/messages";

const LOCALES: LocaleCode[] = ["zh", "en", "ja", "es"];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as LocaleCode)}
      className="px-2 py-1 rounded-md bg-bg-card border border-border text-xs text-text-secondary"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {t(`lang.${l}`)}
        </option>
      ))}
    </select>
  );
}

