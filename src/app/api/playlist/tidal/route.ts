import { NextResponse } from "next/server";
import { extractSetFromPlaylist } from "@/lib/extract-set";
import { fetchTidalPlaylist, parseTidalPlaylistId } from "@/lib/tidal-playlist";

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
      slotKind?: string;
    };
    const playlistId = parseTidalPlaylistId(body.url || "");
    if (!playlistId) {
      return NextResponse.json(
        { error: "Ungültiger Tidal-Link. Erwarte tidal.com/browse/playlist/…" },
        { status: 400 },
      );
    }
    const playlist = await fetchTidalPlaylist(playlistId);
    const draft = extractSetFromPlaylist(playlist.tracks, playlist.name, {
      durationMinutes: body.durationMinutes || 60,
      title: body.title,
      vibe: body.vibe,
      venue: body.venue,
      slot: body.slot,
      audience: body.audience,
      gear: body.gear,
    });
    if (
      body.slotKind === "warmup" ||
      body.slotKind === "support" ||
      body.slotKind === "peaktime" ||
      body.slotKind === "closing"
    ) {
      draft.slotKind = body.slotKind;
    }
    const performanceCount = draft.tracks.filter((track) => track.role !== "safety").length;
    return NextResponse.json({
      playlist: {
        name: playlist.name,
        imported: playlist.tracks.length,
        tidalMatched: playlist.tracks.filter((track) => track.catalogPopularity != null).length,
        tidalKeyed: playlist.tracks.filter((track) => track.catalogKey || track.catalogBpm).length,
      },
      draft,
      performanceCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tidal Playlist failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
