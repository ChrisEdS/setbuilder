import { NextResponse } from "next/server";
import { spotifyRouteError } from "@/lib/api-errors";
import { extractSetFromPlaylist } from "@/lib/extract-set";
import { requestT } from "@/lib/i18n/server";
import { fetchPlaylist, parsePlaylistId } from "@/lib/playlist";
import { attachTidalCatalog, tidalConfigured } from "@/lib/tidal";

export async function POST(request: Request) {
  const t = requestT(request);
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
      notes?: string;
    };

    const playlistId = parsePlaylistId(body.url || "");
    if (!playlistId) {
      return NextResponse.json(
        { error: t("api.invalid.playlistUrl") },
        { status: 400 },
      );
    }

    const playlist = await fetchPlaylist(playlistId);
    let tidalMatched = 0;
    let tidalKeyed = 0;
    let tracks = playlist.tracks;
    if (tidalConfigured()) {
      try {
        const tidal = await attachTidalCatalog(tracks);
        tracks = tidal.tracks;
        tidalMatched = tidal.matched;
        tidalKeyed = tidal.keyed;
      } catch {
        tidalMatched = 0;
        tidalKeyed = 0;
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
      notes: body.notes,
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
        tidalKeyed,
        externalUrl: playlist.externalUrl,
        imageUrl: playlist.imageUrl,
      },
      draft,
    });
  } catch (error) {
    return spotifyRouteError(error, t, "api.auth.playlist");
  }
}
