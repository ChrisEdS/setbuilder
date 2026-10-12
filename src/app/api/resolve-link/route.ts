import { NextResponse } from "next/server";
import { spotifyRouteError } from "@/lib/api-errors";
import { requestT } from "@/lib/i18n/server";
import { parseMusicLink } from "@/lib/music-link";
import { fetchPlaylist } from "@/lib/playlist";
import {
  fetchAlbumTracks,
  fetchTrackById,
  type SpotifyTrack,
} from "@/lib/spotify";
import { getTidalAccessToken, tidalConfigured } from "@/lib/tidal";
import type { TrackSource } from "@/lib/set";

export type ResolvedTrack = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
  uri: string;
  externalUrl: string;
  imageUrl: string | null;
  source: TrackSource;
  bpm?: string;
  keyCamelot?: string;
};

function mapSpotify(track: SpotifyTrack): ResolvedTrack {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    durationMs: track.durationMs,
    uri: track.uri,
    externalUrl: track.externalUrl,
    imageUrl: track.imageUrl,
    source: "spotify",
  };
}

async function resolveSoundCloud(url: string): Promise<ResolvedTrack | null> {
  try {
    const endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    const title = data.title || "SoundCloud Track";
    const artist = data.author_name || "SoundCloud";
    const id = `sc:${Buffer.from(url).toString("base64url").slice(0, 22)}`;
    return {
      id,
      name: title,
      artists: [artist],
      album: "SoundCloud",
      durationMs: 0,
      uri: url,
      externalUrl: url,
      imageUrl: data.thumbnail_url ?? null,
      source: "soundcloud",
    };
  } catch {
    return null;
  }
}

async function resolveTidalTrack(id: string, url: string): Promise<ResolvedTrack | null> {
  if (!tidalConfigured()) return null;
  try {
    const token = await getTidalAccessToken();
    const response = await fetch(
      `https://openapi.tidal.com/v2/tracks/${id}?countryCode=DE&include=artists`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.api+json",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      data?: {
        id: string;
        attributes?: {
          title?: string;
          duration?: number;
          bpm?: number;
          key?: string;
          keyScale?: string;
          isrc?: string;
        };
      };
      included?: Array<{
        type: string;
        attributes?: { name?: string };
      }>;
    };
    const attrs = data.data?.attributes;
    if (!attrs?.title) return null;
    const artists = (data.included ?? [])
      .filter((item) => item.type === "artists")
      .map((item) => item.attributes?.name)
      .filter(Boolean) as string[];

    return {
      id: `tidal:${data.data!.id}`,
      name: attrs.title,
      artists: artists.length ? artists : ["Tidal"],
      album: "Tidal",
      durationMs: attrs.duration ? Math.round(attrs.duration * 1000) : 0,
      uri: `tidal:track:${data.data!.id}`,
      externalUrl: url,
      imageUrl: null,
      source: "tidal",
      bpm: attrs.bpm != null ? String(Math.round(attrs.bpm)) : undefined,
    };
  } catch {
    return null;
  }
}

function fallbackFromHint(
  source: TrackSource,
  url: string,
  id: string,
  hintTitle?: string,
): ResolvedTrack {
  return {
    id: `${source}:${id}`.slice(0, 64),
    name: hintTitle || `${source} track`,
    artists: [source === "beatport" ? "Beatport" : source],
    album: source,
    durationMs: 0,
    uri: url,
    externalUrl: url,
    imageUrl: null,
    source,
  };
}

export async function POST(request: Request) {
  const t = requestT(request);
  try {
    const body = (await request.json()) as { url?: string };
    const parsed = parseMusicLink(body.url || "");
    if (!parsed) {
      return NextResponse.json(
        { error: t("api.invalid.musicLink") },
        { status: 400 },
      );
    }

    if (parsed.source === "spotify") {
      if (parsed.kind === "track") {
        const track = await fetchTrackById(parsed.id);
        return NextResponse.json({
          kind: "track",
          label: track.name,
          tracks: [mapSpotify(track)],
        });
      }
      if (parsed.kind === "album") {
        const album = await fetchAlbumTracks(parsed.id);
        return NextResponse.json({
          kind: "album",
          label: album.albumName,
          tracks: album.tracks.map(mapSpotify),
        });
      }
      const playlist = await fetchPlaylist(parsed.id);
      return NextResponse.json({
        kind: "playlist",
        label: playlist.name,
        tracks: playlist.tracks.map(mapSpotify),
      });
    }

    if (parsed.source === "soundcloud") {
      const track =
        (await resolveSoundCloud(parsed.url)) ||
        fallbackFromHint("soundcloud", parsed.url, parsed.id, parsed.hintTitle);
      return NextResponse.json({
        kind: "track",
        label: track.name,
        tracks: [track],
      });
    }

    if (parsed.source === "tidal") {
      if (parsed.kind === "track") {
        const track =
          (await resolveTidalTrack(parsed.id, parsed.url)) ||
          fallbackFromHint("tidal", parsed.url, parsed.id, parsed.hintTitle);
        return NextResponse.json({
          kind: "track",
          label: track.name,
          tracks: [track],
        });
      }
      return NextResponse.json({
        kind: parsed.kind,
        label: parsed.hintTitle || "Tidal",
        tracks: [
          fallbackFromHint("tidal", parsed.url, parsed.id, parsed.hintTitle),
        ],
        message: t("api.resolve.tidalCollection"),
      });
    }

    // beatport
    const track = fallbackFromHint(
      "beatport",
      parsed.url,
      parsed.id,
      parsed.hintTitle,
    );
    return NextResponse.json({
      kind: parsed.kind === "release" ? "release" : "track",
      label: track.name,
      tracks: [track],
      message: t("api.resolve.beatportLimited"),
    });
  } catch (error) {
    return spotifyRouteError(error, t, "api.auth.resolveLink");
  }
}
