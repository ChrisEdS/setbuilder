// Area "common": language switcher and words used in many places.
const de = {
  "common.language": "Sprache",
  "common.languageName.de": "Deutsch",
  "common.languageName.en": "English",
  "common.close": "Schließen",
  "common.save": "Speichern",
  "common.load": "Laden",
  "common.delete": "Löschen",
  "common.copy": "Kopieren",
  "common.open": "Öffnen",
  "common.unknown": "unbekannt",
} as const;

const en: Record<keyof typeof de, string> = {
  "common.language": "Language",
  "common.languageName.de": "Deutsch",
  "common.languageName.en": "English",
  "common.close": "Close",
  "common.save": "Save",
  "common.load": "Load",
  "common.delete": "Delete",
  "common.copy": "Copy",
  "common.open": "Open",
  "common.unknown": "unknown",
};

export const common = { de, en };
