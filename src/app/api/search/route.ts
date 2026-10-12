import { NextResponse } from "next/server";
import { searchTracks } from "@/lib/spotify";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const market = searchParams.get("market")?.trim() || "DE";

  if (q.length < 2) {
    return NextResponse.json(
      { error: "Die Suche braucht mindestens 2 Zeichen." },
      { status: 400 },
    );
  }

  try {
    const tracks = await searchTracks(q, market);
    return NextResponse.json({ tracks });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Spotify search failed.";
    const missingCreds = message.includes("Missing SPOTIFY_");
    return NextResponse.json(
      { error: message },
      { status: missingCreds ? 503 : 502 },
    );
  }
}
