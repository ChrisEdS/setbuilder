import { NextResponse } from "next/server";
import {
  getTidalRedirectUri,
  getTidalUserAccessToken,
} from "@/lib/tidal-auth";

export async function GET() {
  const token = await getTidalUserAccessToken();
  return NextResponse.json({
    connected: Boolean(token),
    redirectUri: getTidalRedirectUri(),
  });
}
