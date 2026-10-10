import type { TrackSource } from "@/lib/set";
import { parseSpotifyLink } from "@/lib/spotify-link";

export type ParsedMusicLink = {
  source: TrackSource;
  kind: "track" | "playlist" | "album" | "set" | "release" | "unknown";
  id: string;
  url: string;
  /** Best-effort title hint from the path */
  hintTitle?: string;
};

function titleFromSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMusicLink(input: string): ParsedMusicLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const spotify = parseSpotifyLink(trimmed);
  if (spotify) {
    return {
      source: "spotify",
      kind: spotify.kind,
      id: spotify.id,
      url: trimmed.startsWith("http")
        ? trimmed
        : `https://open.spotify.com/${spotify.kind}/${spotify.id}`,
    };
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    // tidal.com / listen.tidal.com / tidal.com/browse/track/123
    if (host === "tidal.com" || host.endsWith(".tidal.com")) {
      const trackIdx = parts.findIndex((p) => p === "track" || p === "tracks");
      if (trackIdx >= 0 && parts[trackIdx + 1]) {
        return {
          source: "tidal",
          kind: "track",
          id: parts[trackIdx + 1],
          url: trimmed,
          hintTitle: parts[trackIdx + 2]
            ? titleFromSlug(parts[trackIdx + 2])
            : undefined,
        };
      }
      const albumIdx = parts.findIndex((p) => p === "album" || p === "albums");
      if (albumIdx >= 0 && parts[albumIdx + 1]) {
        return {
          source: "tidal",
          kind: "album",
          id: parts[albumIdx + 1],
          url: trimmed,
        };
      }
      const plIdx = parts.findIndex((p) => p === "playlist" || p === "playlists");
      if (plIdx >= 0 && parts[plIdx + 1]) {
        return {
          source: "tidal",
          kind: "playlist",
          id: parts[plIdx + 1],
          url: trimmed,
        };
      }
    }

    // soundcloud.com/artist/track-slug
    if (host === "soundcloud.com" || host.endsWith(".soundcloud.com")) {
      if (parts.length >= 2 && !["you", "discover", "charts"].includes(parts[0])) {
        return {
          source: "soundcloud",
          kind: "track",
          id: parts.slice(0, 2).join("/"),
          url: trimmed,
          hintTitle: titleFromSlug(parts[1] || parts[0]),
        };
      }
    }

    // beatport.com/track/name/123456 or /release/...
    if (host === "beatport.com" || host.endsWith(".beatport.com")) {
      const trackIdx = parts.indexOf("track");
      if (trackIdx >= 0 && parts[trackIdx + 1]) {
        const id = parts[trackIdx + 2] || parts[trackIdx + 1];
        return {
          source: "beatport",
          kind: "track",
          id,
          url: trimmed,
          hintTitle: titleFromSlug(parts[trackIdx + 1]),
        };
      }
      const releaseIdx = parts.indexOf("release");
      if (releaseIdx >= 0 && parts[releaseIdx + 1]) {
        return {
          source: "beatport",
          kind: "release",
          id: parts[releaseIdx + 2] || parts[releaseIdx + 1],
          url: trimmed,
          hintTitle: titleFromSlug(parts[releaseIdx + 1]),
        };
      }
    }
  } catch {
    // not a URL
  }

  return null;
}

export function sourceLabel(source: TrackSource | undefined): string {
  switch (source) {
    case "spotify":
      return "Spotify";
    case "tidal":
      return "Tidal";
    case "soundcloud":
      return "SoundCloud";
    case "beatport":
      return "Beatport";
    default:
      return "Manual";
  }
}

export function looksLikeMusicLink(input: string): boolean {
  const v = input.trim().toLowerCase();
  if (!v) return false;
  return Boolean(
    parseMusicLink(v) ||
      v.includes("spotify.com") ||
      v.includes("tidal.com") ||
      v.includes("soundcloud.com") ||
      v.includes("beatport.com"),
  );
}
