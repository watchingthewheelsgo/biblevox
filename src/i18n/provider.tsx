import { createContext, useContext, useMemo, useState } from "react";
import { messages, type LocaleCode } from "./messages";

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatDate: (date: Date, opts?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "biblevox-locale";

function detectInitialLocale(): LocaleCode {
  const saved = localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
  if (saved && saved in messages) return saved;
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith("zh")) return "zh";
  if (browser.startsWith("ja")) return "ja";
  if (browser.startsWith("es")) return "es";
  return "en";
}

function formatText(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectInitialLocale);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale: (l) => {
        setLocaleState(l);
        localStorage.setItem(STORAGE_KEY, l);
      },
      t: (key, vars) => {
        const dict = messages[locale] ?? messages.en;
        const text = dict[key] ?? messages.en[key] ?? key;
        return formatText(text, vars);
      },
      formatDate: (date, opts) => {
        const map: Record<LocaleCode, string> = {
          zh: "zh-CN",
          en: "en-US",
          ja: "ja-JP",
          es: "es-ES",
        };
        return date.toLocaleDateString(map[locale], opts);
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within AppI18nProvider");
  return ctx;
}

