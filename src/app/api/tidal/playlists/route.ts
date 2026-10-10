import { NextResponse } from "next/server";
import { listMyTidalPlaylists } from "@/lib/tidal-playlist";

export async function GET() {
  const playlists = await listMyTidalPlaylists();
  return NextResponse.json({ playlists });
}
