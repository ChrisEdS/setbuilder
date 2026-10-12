"use client";

import { LANGS } from "@/lib/i18n/core";
import { useI18n } from "@/lib/i18n/react";

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t("common.language")}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          className={lang === code ? "is-active" : undefined}
          aria-pressed={lang === code}
          title={t(`common.languageName.${code}`)}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
