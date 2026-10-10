export type SpotifyLinkKind = "track" | "playlist" | "album";

export type ParsedSpotifyLink = {
  kind: SpotifyLinkKind;
  id: string;
};

const ID = "([a-zA-Z0-9]{22})";

/**
 * Accepts open.spotify.com links, spotify: URIs, or bare 22-char IDs
 * with an optional kind hint from the surrounding UI.
 */
export function parseSpotifyLink(
  input: string,
  prefer: SpotifyLinkKind | "auto" = "auto",
): ParsedSpotifyLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const uri = trimmed.match(
    new RegExp(`^spotify:(track|playlist|album):${ID}$`),
  );
  if (uri) {
    return { kind: uri[1] as SpotifyLinkKind, id: uri[2] };
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (
      host === "open.spotify.com" ||
      host === "spotify.link" ||
      host.endsWith(".spotify.com")
    ) {
      const parts = url.pathname.split("/").filter(Boolean);
      for (const kind of ["track", "playlist", "album"] as const) {
        const idx = parts.indexOf(kind);
        if (idx >= 0 && parts[idx + 1]) {
          const id = parts[idx + 1].replace(/[^a-zA-Z0-9]/g, "").slice(0, 22);
          if (id.length === 22) return { kind, id };
        }
      }
    }
  } catch {
    // not a URL
  }

  if (/^[a-zA-Z0-9]{22}$/.test(trimmed) && prefer !== "auto") {
    return { kind: prefer, id: trimmed };
  }

  return null;
}

export function looksLikeSpotifyLink(input: string): boolean {
  const value = input.trim().toLowerCase();
  if (!value) return false;
  return (
    value.includes("open.spotify.com/") ||
    value.includes("spotify.link/") ||
    value.startsWith("spotify:track:") ||
    value.startsWith("spotify:playlist:") ||
    value.startsWith("spotify:album:")
  );
}
