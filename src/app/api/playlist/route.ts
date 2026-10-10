import { NextResponse } from "next/server";
import { extractSetFromPlaylist } from "@/lib/extract-set";
import { fetchPlaylist, parsePlaylistId } from "@/lib/playlist";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      durationMinutes?: number;
      title?: string;
      vibe?: string;
      venue?: string;
      slot?: string;
      audience?: string;
      gear?: string;
    };

    const playlistId = parsePlaylistId(body.url || "");
    if (!playlistId) {
      return NextResponse.json(
        {
          error:
            "Ungültige Playlist-URL. Erwarte open.spotify.com/playlist/… oder spotify:playlist:…",
        },
        { status: 400 },
      );
    }

    const playlist = await fetchPlaylist(playlistId);
    const draft = extractSetFromPlaylist(playlist.tracks, playlist.name, {
      durationMinutes: body.durationMinutes || 60,
      title: body.title,
      vibe: body.vibe,
      venue: body.venue,
      slot: body.slot,
      audience: body.audience,
      gear: body.gear,
    });

    return NextResponse.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        owner: playlist.owner,
        trackCount: playlist.trackCount,
        imported: playlist.tracks.length,
        selected: draft.tracks.length,
        externalUrl: playlist.externalUrl,
        imageUrl: playlist.imageUrl,
      },
      draft,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playlist failed";
    if (message === "SPOTIFY_AUTH_REQUIRED") {
      return NextResponse.json(
        {
          error:
            "Spotify-Login nötig: Playlist-Tracks sind seit 2026 nur mit User-Auth lesbar.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
