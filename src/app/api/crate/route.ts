import { NextResponse } from "next/server";
import { fetchPlaylist } from "@/lib/playlist";
import {
  fetchAlbumTracks,
  fetchTrackById,
  type SpotifyTrack,
} from "@/lib/spotify";
import { parseSpotifyLink } from "@/lib/spotify-link";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const parsed = parseSpotifyLink(body.url || "");
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Ungültiger Link. Erwarte open.spotify.com/track|playlist|album/… oder spotify:…",
        },
        { status: 400 },
      );
    }

    if (parsed.kind === "track") {
      const track = await fetchTrackById(parsed.id);
      return NextResponse.json({
        kind: "track" as const,
        label: `${track.artists.join(", ")} – ${track.name}`,
        tracks: [track] satisfies SpotifyTrack[],
      });
    }

    if (parsed.kind === "album") {
      const album = await fetchAlbumTracks(parsed.id);
      return NextResponse.json({
        kind: "album" as const,
        label: album.albumName,
        tracks: album.tracks,
      });
    }

    const playlist = await fetchPlaylist(parsed.id);
    return NextResponse.json({
      kind: "playlist" as const,
      label: playlist.name,
      tracks: playlist.tracks,
      owner: playlist.owner,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Crate import failed";
    if (message === "SPOTIFY_AUTH_REQUIRED") {
      return NextResponse.json(
        {
          error:
            "Spotify-Login nötig, um Playlist-Tracks zu lesen. Track-Links gehen ohne Login.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }
    if (message.startsWith("PLAYLIST_FORBIDDEN")) {
      return NextResponse.json(
        {
          error: message.replace(/^PLAYLIST_FORBIDDEN:\s*/, ""),
          code: "PLAYLIST_FORBIDDEN",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
