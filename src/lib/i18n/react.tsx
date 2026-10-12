"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createTranslate,
  detectLang,
  isLang,
  LANG_COOKIE,
  LANG_STORAGE_KEY,
  localeFor,
  type Lang,
  type Translate,
} from "./core";

const LANG_EVENT = "setform-lang";

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // storage blocked: fall through to the browser language
  }
  return detectLang(navigator.language);
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANG_EVENT, onChange);
  };
}

type I18nValue = {
  lang: Lang;
  t: Translate;
  /** BCP 47 locale for toLocaleString and friends. */
  locale: string;
  setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // The server and the first client render use German; the stored or browser language follows right after hydration.
  const lang = useSyncExternalStore<Lang>(subscribe, readLang, () => "de");

  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // not persisted, still applied for this session
    }
    window.dispatchEvent(new Event(LANG_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    // The API routes read the language from this cookie to answer in the same language.
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({ lang, t: createTranslate(lang), locale: localeFor(lang), setLang }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n needs <I18nProvider>");
  return value;
}
