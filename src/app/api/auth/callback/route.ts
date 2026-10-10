import { NextResponse } from "next/server";
import {
  consumeOAuthState,
  exchangeCodeForTokens,
} from "@/lib/spotify-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const origin = `${url.protocol}//${url.host}`;

  if (error) {
    return NextResponse.redirect(
      `${origin}/?auth=error&message=${encodeURIComponent(error)}`,
    );
  }

  const valid = await consumeOAuthState(state);
  if (!valid || !code) {
    return NextResponse.redirect(`${origin}/?auth=error&message=invalid_state`);
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(`${origin}/?auth=ok`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return NextResponse.redirect(
      `${origin}/?auth=error&message=${encodeURIComponent(message)}`,
    );
  }
}
