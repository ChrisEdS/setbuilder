import { NextResponse } from "next/server";
import { spotifyRouteError } from "@/lib/api-errors";
import { requestT } from "@/lib/i18n/server";
import { fetchPlaylist } from "@/lib/playlist";
import {
  fetchAlbumTracks,
  fetchTrackById,
  type SpotifyTrack,
} from "@/lib/spotify";
import { parseSpotifyLink } from "@/lib/spotify-link";

export async function POST(request: Request) {
  const t = requestT(request);
  try {
    const body = (await request.json()) as { url?: string };
    const parsed = parseSpotifyLink(body.url || "");
    if (!parsed) {
      return NextResponse.json(
        { error: t("api.invalid.spotifyLink") },
        { status: 400 },
      );
    }

    if (parsed.kind === "track") {
      const track = await fetchTrackById(parsed.id);
      return NextResponse.json({
        kind: "track" as const,
        label: `${track.artists.join(", ")} – ${track.name}`,
        tracks: [track] satisfies SpotifyTrack[],
      });
    }

    if (parsed.kind === "album") {
      const album = await fetchAlbumTracks(parsed.id);
      return NextResponse.json({
        kind: "album" as const,
        label: album.albumName,
        tracks: album.tracks,
      });
    }

    const playlist = await fetchPlaylist(parsed.id);
    return NextResponse.json({
      kind: "playlist" as const,
      label: playlist.name,
      tracks: playlist.tracks,
      owner: playlist.owner,
    });
  } catch (error) {
    return spotifyRouteError(error, t, "api.auth.crate");
  }
}
