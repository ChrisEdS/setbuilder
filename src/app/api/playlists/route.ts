import { NextResponse } from "next/server";
import { spotifyRouteError } from "@/lib/api-errors";
import { requestT } from "@/lib/i18n/server";
import { listMyPlaylists } from "@/lib/playlist";

export async function GET(request: Request) {
  try {
    const playlists = await listMyPlaylists();
    return NextResponse.json({
      playlists,
      owned: playlists.filter((playlist) => playlist.owned),
    });
  } catch (error) {
    return spotifyRouteError(error, requestT(request), "api.auth.playlists");
  }
}
