import { NextResponse } from "next/server";
import { errorText } from "@/lib/i18n/error";
import { requestT } from "@/lib/i18n/server";
import { searchTracks } from "@/lib/spotify";

export async function GET(request: Request) {
  const t = requestT(request);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const market = searchParams.get("market")?.trim() || "DE";

  if (q.length < 2) {
    return NextResponse.json(
      { error: t("api.invalid.searchTooShort") },
      { status: 400 },
    );
  }

  try {
    const tracks = await searchTracks(q, market);
    return NextResponse.json({ tracks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missingCreds = message.includes("Missing SPOTIFY_");
    return NextResponse.json(
      { error: errorText(error, t, "api.genericError") },
      { status: missingCreds ? 503 : 502 },
    );
  }
}
