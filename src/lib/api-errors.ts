import { NextResponse } from "next/server";
import type { MessageKey, Translate } from "@/lib/i18n/core";
import { errorText } from "@/lib/i18n/error";

const FORBIDDEN_PREFIX = /^PLAYLIST_FORBIDDEN:\s*/;

/**
 * Error response of the Spotify-backed routes, in the request language.
 * Keeps the machine codes: 401 AUTH_REQUIRED, 403 PLAYLIST_FORBIDDEN, otherwise 502.
 */
export function spotifyRouteError(
  error: unknown,
  t: Translate,
  authKey: MessageKey,
  fallbackKey: MessageKey = "api.genericError",
): NextResponse {
  const message = error instanceof Error ? error.message : "";
  if (message === "SPOTIFY_AUTH_REQUIRED") {
    return NextResponse.json(
      { error: t(authKey), code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }
  if (message.startsWith("PLAYLIST_FORBIDDEN")) {
    // LocalizedError carries the key; the German message keeps the machine prefix.
    return NextResponse.json(
      {
        error: errorText(error, t, fallbackKey).replace(FORBIDDEN_PREFIX, ""),
        code: "PLAYLIST_FORBIDDEN",
      },
      { status: 403 },
    );
  }
  return NextResponse.json(
    { error: errorText(error, t, fallbackKey) },
    { status: 502 },
  );
}
