import { NextResponse } from "next/server";
import type { TrackSource } from "@/lib/set";
import { fetchTidalPlaylist, parseTidalPlaylistId } from "@/lib/tidal-playlist";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { playlistId?: string; url?: string };
    const playlistId =
      body.playlistId || parseTidalPlaylistId(body.url || "") || "";
    if (!playlistId) {
      return NextResponse.json(
        { error: "Tidal-Playlist wählen oder tidal.com/browse/playlist/… einfügen." },
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
    const message = error instanceof Error ? error.message : "Tidal Crate failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
