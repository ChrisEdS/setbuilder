// Area "common": language switcher and words used in many places.
const de = {
  "common.language": "Sprache",
  "common.languageTip": "Oberfläche auf Deutsch oder Englisch umschalten.",
  "common.languageName.de": "Deutsch",
  "common.languageName.en": "English",
  "common.close": "Schließen",
  "common.closeTip": "Schließen.",
  "common.save": "Speichern",
  "common.load": "Laden",
  "common.delete": "Löschen",
  "common.copy": "Kopieren",
  "common.copyTip": "In die Zwischenablage kopieren.",
  "common.open": "Öffnen",
  "common.unknown": "unbekannt",
} as const;

const en: Record<keyof typeof de, string> = {
  "common.language": "Language",
  "common.languageTip": "Switch the interface to German or English.",
  "common.languageName.de": "Deutsch",
  "common.languageName.en": "English",
  "common.close": "Close",
  "common.closeTip": "Close.",
  "common.save": "Save",
  "common.load": "Load",
  "common.delete": "Delete",
  "common.copy": "Copy",
  "common.copyTip": "Copy to the clipboard.",
  "common.open": "Open",
  "common.unknown": "unknown",
};

export const common = { de, en };
