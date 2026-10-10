import { NextResponse } from "next/server";
import { createOAuthState, getAuthorizeUrl } from "@/lib/spotify-auth";

export async function GET() {
  try {
    const state = await createOAuthState();
    return NextResponse.redirect(getAuthorizeUrl(state));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
