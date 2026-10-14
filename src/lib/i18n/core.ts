import {
  LANG_COOKIE,
  LANG_COOKIE_LEGACY,
  LANG_STORAGE_KEY,
  LANG_STORAGE_KEY_LEGACY,
} from "@/lib/storage-keys";
import { messages, type MessageKey } from "./messages";

export type Lang = "de" | "en";
export type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;
export type { MessageKey };

export const LANGS: readonly Lang[] = ["de", "en"];
export {
  LANG_COOKIE,
  LANG_COOKIE_LEGACY,
  LANG_STORAGE_KEY,
  LANG_STORAGE_KEY_LEGACY,
};

export function isLang(value: unknown): value is Lang {
  return value === "de" || value === "en";
}

/** "de", "de-AT", "de,en;q=0.8" → "de"; everything else → "en". */
export function detectLang(source: string | null | undefined): Lang {
  const first = (source ?? "").trim().toLowerCase().split(/[,;\s]/)[0] ?? "";
  return first.startsWith("de") ? "de" : "en";
}

function langFromCookie(cookie: string | null | undefined): Lang | null {
  for (const name of [LANG_COOKIE, LANG_COOKIE_LEGACY]) {
    const match = (cookie ?? "").match(
      new RegExp(`(?:^|;\\s*)${name}=([a-z]{2})`),
    );
    if (match && isLang(match[1])) return match[1];
  }
  return null;
}

/** Pick the language from a Cookie header, then from Accept-Language. */
export function langFromHeaders(
  cookie: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Lang {
  const fromCookie = langFromCookie(cookie);
  if (fromCookie) return fromCookie;
  return detectLang(acceptLanguage);
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const table = messages[lang] as Record<string, string>;
  const fallback = messages.de as Record<string, string>;
  return fill(table[key] ?? fallback[key] ?? key, vars);
}

export function createTranslate(lang: Lang): Translate {
  return (key, vars) => translate(lang, key, vars);
}

/** German translator: the default for library code and tests. */
export const tDe: Translate = createTranslate("de");
export const tEn: Translate = createTranslate("en");

/** Locale for number/date formatting. */
export function localeFor(lang: Lang): string {
  return lang === "de" ? "de-DE" : "en-GB";
}
