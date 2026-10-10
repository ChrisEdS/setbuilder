import type { TrackSource } from "@/lib/set";
import { parseSpotifyLink } from "@/lib/spotify-link";

export type PlayableTrack = {
  id: string;
  name: string;
  artists: string[];
  externalUrl: string;
  imageUrl: string | null;
  source?: TrackSource;
};

export type PlayerEmbed = {
  src: string;
  height: number;
  label: string;
};

function tidalId(track: PlayableTrack): string | null {
  const fromId = track.id.replace(/^tidal:/, "");
  if (/^\d+$/.test(fromId)) return fromId;
  const match = track.externalUrl.match(/\/tracks?\/(\d+)/);
  return match?.[1] ?? null;
}

function beatportId(track: PlayableTrack): string | null {
  const fromId = track.id.replace(/^beatport:/, "");
  if (/^\d+$/.test(fromId)) return fromId;
  const match = track.externalUrl.match(/\/(\d+)\/?(?:\?.*)?$/);
  return match?.[1] ?? null;
}

function spotifyId(track: PlayableTrack): string | null {
  if (/^[A-Za-z0-9]{22}$/.test(track.id)) return track.id;
  const parsed = parseSpotifyLink(track.externalUrl);
  return parsed?.kind === "track" ? parsed.id : null;
}

/** Embed players the sources actually expose. Full streams depend on the user's login. */
export function playerEmbed(track: PlayableTrack): PlayerEmbed | null {
  const url = track.externalUrl || "";
  const source = track.source;

  const isSpotify =
    source === "spotify" ||
    url.includes("open.spotify.com") ||
    url.startsWith("spotify:");
  if (isSpotify) {
    const id = spotifyId(track);
    if (!id) return null;
    return {
      src: `https://open.spotify.com/embed/track/${id}?utm_source=setform&theme=0`,
      height: 80,
      label: "Spotify",
    };
  }

  const isSoundCloud =
    source === "soundcloud" || url.includes("soundcloud.com");
  if (isSoundCloud && url.startsWith("http")) {
    const params = new URLSearchParams({
      url,
      auto_play: "true",
      hide_related: "true",
      show_comments: "false",
      show_user: "true",
      show_reposts: "false",
      visual: "false",
    });
    return {
      src: `https://w.soundcloud.com/player/?${params.toString()}`,
      height: 120,
      label: "SoundCloud",
    };
  }

  const isTidal = source === "tidal" || url.includes("tidal.com");
  if (isTidal) {
    const id = tidalId(track);
    if (!id) return null;
    return {
      src: `https://embed.tidal.com/tracks/${id}?disableAnalytics=true`,
      height: 100,
      label: "Tidal",
    };
  }

  const isBeatport = source === "beatport" || url.includes("beatport.com");
  if (isBeatport) {
    const id = beatportId(track);
    if (!id) return null;
    return {
      src: `https://embed.beatport.com/player/?id=${id}&type=track`,
      height: 86,
      label: "Beatport",
    };
  }

  return null;
}
