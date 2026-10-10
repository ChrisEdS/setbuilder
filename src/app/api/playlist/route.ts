import { NextResponse } from "next/server";
import { extractSetFromPlaylist } from "@/lib/extract-set";
import { fetchPlaylist, parsePlaylistId } from "@/lib/playlist";
import { attachTidalCatalog, tidalConfigured } from "@/lib/tidal";

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
    let tidalMatched = 0;
    let tracks = playlist.tracks;
    if (tidalConfigured()) {
      try {
        const tidal = await attachTidalCatalog(tracks);
        tracks = tidal.tracks;
        tidalMatched = tidal.matched;
      } catch {
        tidalMatched = 0;
      }
    }
    const draft = extractSetFromPlaylist(tracks, playlist.name, {
      durationMinutes: body.durationMinutes || 60,
      title: body.title,
      vibe: body.vibe,
      venue: body.venue,
      slot: body.slot,
      audience: body.audience,
      gear: body.gear,
    });
    // Preserve slot kind from client brief when present
    const bodyWithKind = body as { slotKind?: string };
    if (
      bodyWithKind.slotKind === "warmup" ||
      bodyWithKind.slotKind === "support" ||
      bodyWithKind.slotKind === "peaktime" ||
      bodyWithKind.slotKind === "closing"
    ) {
      draft.slotKind = bodyWithKind.slotKind;
    }

    const performanceCount = draft.tracks.filter(
      (track) => track.role !== "safety",
    ).length;
    const safetyCount = draft.tracks.length - performanceCount;

    return NextResponse.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        owner: playlist.owner,
        trackCount: playlist.trackCount,
        imported: playlist.tracks.length,
        selected: performanceCount,
        safety: safetyCount,
        tidalMatched,
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
