/** localStorage / cookie / event keys — new names with legacy SETFORM fallbacks. */

export const LANG_STORAGE_KEY = "setbuilder-lang";
export const LANG_STORAGE_KEY_LEGACY = "setform-lang";
export const LANG_COOKIE = "setbuilder-lang";
export const LANG_COOKIE_LEGACY = "setform-lang";
export const LANG_EVENT = "setbuilder-lang";

export const DRAFT_STORAGE_KEY = "setbuilder-draft-v4";
export const DRAFT_STORAGE_KEY_LEGACY = "setform-draft-v4";
export const DRAFT_STORAGE_KEY_V3_LEGACY = "setform-draft-v3";
export const DRAFT_EVENT = "setbuilder-draft";

export const SETUPS_STORAGE_KEY = "setbuilder-setups-v1";
export const SETUPS_STORAGE_KEY_LEGACY = "setform-setups-v1";
export const SETUPS_EVENT = "setbuilder-setups";

export const CRATE_PREFS_KEY = "setbuilder-crate-prefs-v1";
export const CRATE_PREFS_KEY_LEGACY = "setform-crate-prefs-v1";

export const LIST_DENSITY_KEY = "setbuilder-list-density-v1";
export const LIST_DENSITY_KEY_LEGACY = "setform-list-density-v1";

export const STICK_IDB_NAME = "setbuilder-stick";
export const STICK_IDB_NAME_LEGACY = "setform-stick";

/** Read new key, else legacy; if only legacy exists, copy to new. */
export function readLocal(key: string, legacy: string): string | null {
  if (typeof localStorage === "undefined") return null;
  const current = localStorage.getItem(key);
  if (current != null) return current;
  const old = localStorage.getItem(legacy);
  if (old != null) {
    try {
      localStorage.setItem(key, old);
    } catch {
      /* quota */
    }
    return old;
  }
  return null;
}

export function writeLocal(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, value);
}
