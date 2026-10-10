import { NextResponse } from "next/server";
import { createOAuthState, getAuthorizeUrl } from "@/lib/spotify-auth";

export async function GET(request: Request) {
  try {
    const prompt = new URL(request.url).searchParams.get("prompt") === "1";
    const state = await createOAuthState();
    return NextResponse.redirect(
      getAuthorizeUrl(state, { showDialog: prompt }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
