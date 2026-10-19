import { NextResponse } from "next/server";
import { extractSetFromPlaylist } from "@/lib/extract-set";
import { errorText } from "@/lib/i18n/error";
import { requestT } from "@/lib/i18n/server";
import { fetchTidalPlaylist, parseTidalPlaylistId } from "@/lib/tidal-playlist";

export async function POST(request: Request) {
  const t = requestT(request);
  try {
    const body = (await request.json()) as {
      url?: string;
      durationMinutes?: number;
      blendMs?: number;
      title?: string;
      vibe?: string;
      venue?: string;
      slot?: string;
      audience?: string;
      gear?: string;
      notes?: string;
      slotKind?: string;
    };
    const playlistId = parseTidalPlaylistId(body.url || "");
    if (!playlistId) {
      return NextResponse.json(
        { error: t("api.invalid.tidalLink") },
        { status: 400 },
      );
    }
    const playlist = await fetchTidalPlaylist(playlistId);
    const draft = extractSetFromPlaylist(playlist.tracks, playlist.name, {
      durationMinutes: body.durationMinutes || 60,
      blendMs: body.blendMs,
      title: body.title,
      vibe: body.vibe,
      venue: body.venue,
      slot: body.slot,
      audience: body.audience,
      gear: body.gear,
      notes: body.notes,
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
    return NextResponse.json(
      { error: errorText(error, t, "api.genericError") },
      { status: 502 },
    );
  }
}
