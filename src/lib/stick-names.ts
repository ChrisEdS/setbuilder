import {
  BRAND_PLAYLIST_PREFIX,
  BRAND_PLAYLIST_PREFIX_LEGACY,
} from "@/lib/brand";

/** Playlist SETBUILDER writes onto a rekordbox stick. */
export function stickPlaylistName(title: string): string {
  return `${BRAND_PLAYLIST_PREFIX}${title.trim() || "Set"}`;
}

/** Current and legacy names for the same set title (update finds either). */
export function stickPlaylistNames(title: string): string[] {
  const base = title.trim() || "Set";
  return [
    `${BRAND_PLAYLIST_PREFIX}${base}`,
    `${BRAND_PLAYLIST_PREFIX_LEGACY}${base}`,
  ];
}

/** Labels we have used for the alternatives playlist. Older writes stay valid. */
export const STICK_ALT_LABELS = ["Alternativen", "Alternatives"] as const;

/** Playlist next to the set, holding the alternatives. */
export function stickAlternativesPlaylistName(title: string, label = "Alternativen"): string {
  return `${stickPlaylistName(title)} ${label}`;
}

/** Every name this set's alternatives playlist may already have (new + legacy brand). */
export function stickAlternativesPlaylistNames(title: string): string[] {
  const names: string[] = [];
  for (const prefix of [BRAND_PLAYLIST_PREFIX, BRAND_PLAYLIST_PREFIX_LEGACY]) {
    const base = `${prefix}${title.trim() || "Set"}`;
    for (const label of STICK_ALT_LABELS) {
      names.push(`${base} ${label}`);
    }
  }
  return names;
}

export function existingAlternativesPlaylistName(
  playlists: Array<{ name: string }>,
  title: string,
): string | null {
  const names = new Set(playlists.map((item) => item.name));
  for (const name of stickAlternativesPlaylistNames(title)) {
    if (names.has(name)) return name;
  }
  return null;
}

export function existingStickPlaylistName(
  playlists: Array<{ name: string }>,
  title: string,
): string | null {
  const names = new Set(playlists.map((item) => item.name));
  for (const name of stickPlaylistNames(title)) {
    if (names.has(name)) return name;
  }
  return null;
}
