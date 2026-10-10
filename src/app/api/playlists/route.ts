import { NextResponse } from "next/server";
import { listMyPlaylists } from "@/lib/playlist";

export async function GET() {
  try {
    const playlists = await listMyPlaylists();
    return NextResponse.json({
      playlists,
      owned: playlists.filter((playlist) => playlist.owned),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playlists failed";
    if (message === "SPOTIFY_AUTH_REQUIRED") {
      return NextResponse.json(
        { error: "Spotify-Login nötig.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
