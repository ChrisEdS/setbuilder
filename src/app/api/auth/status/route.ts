import { NextResponse } from "next/server";
import { getRedirectUri, getUserAccessToken } from "@/lib/spotify-auth";

export async function GET() {
  const token = await getUserAccessToken();
  return NextResponse.json({
    connected: Boolean(token),
    redirectUri: getRedirectUri(),
  });
}
