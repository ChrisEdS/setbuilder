"use client";

import { Tip } from "@/components/Hint";
import { LANGS } from "@/lib/i18n/core";
import { useI18n } from "@/lib/i18n/react";

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t("common.language")}>
      {LANGS.map((code, index) => (
        <Tip
          key={code}
          text={`${t(`common.languageName.${code}`)} — ${t("common.languageTip")}`}
          end={index === LANGS.length - 1}
        >
          <button
            type="button"
            lang={code}
            className={lang === code ? "is-active" : undefined}
            aria-pressed={lang === code}
            onClick={() => setLang(code)}
          >
            {code.toUpperCase()}
          </button>
        </Tip>
      ))}
    </div>
  );
}
