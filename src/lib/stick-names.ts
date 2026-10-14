/** Playlist SETFORM writes onto a rekordbox stick. */
export function stickPlaylistName(title: string): string {
  return `SETFORM - ${title.trim() || "Set"}`;
}

/** Labels we have used for the alternatives playlist. Older writes stay valid. */
export const STICK_ALT_LABELS = ["Alternativen", "Alternatives"] as const;

/** Playlist next to the set, holding the alternatives. */
export function stickAlternativesPlaylistName(title: string, label = "Alternativen"): string {
  return `${stickPlaylistName(title)} ${label}`;
}

/** Every name this set's alternatives playlist may already have. */
export function stickAlternativesPlaylistNames(title: string): string[] {
  return STICK_ALT_LABELS.map((label) => stickAlternativesPlaylistName(title, label));
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
