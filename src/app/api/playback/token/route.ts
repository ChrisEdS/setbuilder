import { NextResponse } from "next/server";
import { getUserAccessToken, readUserTokens } from "@/lib/spotify-auth";

export async function GET() {
  const tokens = await readUserTokens();
  const accessToken = await getUserAccessToken();
  if (!accessToken || !tokens) {
    return NextResponse.json({
      canStream: false,
      reason: "AUTH",
      message: "Spotify ist nicht verbunden.",
    });
  }

  const scope = tokens.scope ?? "";
  const hasStreaming = scope.split(" ").includes("streaming");
  if (!hasStreaming) {
    return NextResponse.json({
      canStream: false,
      reason: "SCOPE",
      message:
        "Der Login darf nur Playlists lesen. Einmal neu verbinden, dann spielt Premium in voller Länge.",
    });
  }

  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!meRes.ok) {
    return NextResponse.json({
      canStream: false,
      reason: "PROFILE",
      message: "Spotify-Profil konnte nicht gelesen werden.",
    });
  }

  const me = (await meRes.json()) as { product?: string };
  const premium = me.product === "premium";
  if (!premium) {
    return NextResponse.json({
      canStream: false,
      reason: "PRODUCT",
      product: me.product ?? "free",
      message:
        "Dieses Spotify-Konto ist nicht Premium. Der Embed bleibt bei der Kurzvorschau.",
    });
  }

  return NextResponse.json({
    canStream: true,
    product: me.product,
    accessToken,
  });
}
