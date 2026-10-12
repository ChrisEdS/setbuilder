import { NextResponse } from "next/server";
import { errorText } from "@/lib/i18n/error";
import { requestT } from "@/lib/i18n/server";
import type { TrackSource } from "@/lib/set";
import { fetchTidalPlaylist, parseTidalPlaylistId } from "@/lib/tidal-playlist";

export async function POST(request: Request) {
  const t = requestT(request);
  try {
    const body = (await request.json()) as { playlistId?: string; url?: string };
    const playlistId =
      body.playlistId || parseTidalPlaylistId(body.url || "") || "";
    if (!playlistId) {
      return NextResponse.json(
        { error: t("api.invalid.tidalPlaylist") },
        { status: 400 },
      );
    }
    const playlist = await fetchTidalPlaylist(playlistId);
    return NextResponse.json({
      label: playlist.name,
      tracks: playlist.tracks.map((track) => ({
        ...track,
        source: "tidal" as TrackSource,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: errorText(error, t, "api.genericError") },
      { status: 502 },
    );
  }
}
