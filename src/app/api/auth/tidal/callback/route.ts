import { NextResponse } from "next/server";
import { consumeTidalLogin, exchangeTidalCode } from "@/lib/tidal-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      `${origin}/?auth=error&message=${encodeURIComponent(`tidal_${error}`)}`,
    );
  }
  const verifier = await consumeTidalLogin(url.searchParams.get("state"));
  const code = url.searchParams.get("code");
  if (!verifier || !code) {
    return NextResponse.redirect(`${origin}/?auth=error&message=tidal_state`);
  }
  try {
    await exchangeTidalCode(code, verifier);
    return NextResponse.redirect(`${origin}/?auth=ok&provider=tidal`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "tidal_token";
    return NextResponse.redirect(
      `${origin}/?auth=error&message=${encodeURIComponent(message)}`,
    );
  }
}
