"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { enUS } from "date-fns/locale";
import { id as idLocale } from "date-fns/locale";
import { LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n/locale-types";
import { translate } from "@/lib/i18n/translate";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const localeListeners = new Set<() => void>();

function readStoredLocale(): Locale {
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return saved === "en" || saved === "id" ? saved : "id";
}

function subscribeLocale(onStoreChange: () => void) {
  localeListeners.add(onStoreChange);
  return () => localeListeners.delete(onStoreChange);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, readStoredLocale, () => "id" as Locale);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "id";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.documentElement.lang = next === "en" ? "en" : "id";
    localeListeners.forEach((listener) => listener());
  }, []);

  const t = useCallback(
    (source: string, vars?: Record<string, string | number>) =>
      translate(locale, source, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return ctx;
}

export function useDateFnsLocale() {
  const { locale } = useLocale();
  return locale === "en" ? enUS : idLocale;
}
