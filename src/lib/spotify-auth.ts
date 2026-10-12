import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { dataPath } from "@/lib/data-dir";

const TOKEN_COOKIE = "setform_spotify_state";
const TOKEN_FILE = dataPath("spotify-tokens.json");
const STATE_FILE = dataPath("oauth-state.json");

export type SpotifyUserTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getRedirectUri(): string {
  return (
    process.env.SPOTIFY_REDIRECT_URI ||
    `http://127.0.0.1:${process.env.PORT || "4317"}/api/auth/callback`
  );
}

// Only what the app uses: reading the user's own and collaborative playlists.
export const SPOTIFY_SCOPES = ["playlist-read-private", "playlist-read-collaborative"];

export function getAuthorizeUrl(
  state: string,
  options?: { showDialog?: boolean },
): string {
  const params = new URLSearchParams({
    client_id: requireEnv("SPOTIFY_CLIENT_ID"),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SPOTIFY_SCOPES.join(" "),
    state,
    show_dialog: options?.showDialog ? "true" : "false",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function createOAuthState(): Promise<string> {
  const state = randomBytes(16).toString("hex");
  await ensureDataDir();
  await fs.writeFile(
    STATE_FILE,
    JSON.stringify({ state, expiresAt: Date.now() + 10 * 60_000 }),
    "utf8",
  );
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 600,
  });
  return state;
}

export async function consumeOAuthState(expected: string | null): Promise<boolean> {
  const jar = await cookies();
  const stored = jar.get(TOKEN_COOKIE)?.value;
  jar.delete(TOKEN_COOKIE);

  let fileState: string | null = null;
  try {
    const raw = JSON.parse(await fs.readFile(STATE_FILE, "utf8")) as {
      state?: string;
      expiresAt?: number;
    };
    if (raw.expiresAt && raw.expiresAt > Date.now()) fileState = raw.state ?? null;
    await fs.unlink(STATE_FILE);
  } catch {
    fileState = null;
  }

  return Boolean(
    expected && (expected === stored || expected === fileState),
  );
}

async function ensureDataDir() {
  await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
}

export async function saveUserTokens(tokens: SpotifyUserTokens): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
}

export async function readUserTokens(): Promise<SpotifyUserTokens | null> {
  try {
    const raw = await fs.readFile(TOKEN_FILE, "utf8");
    return JSON.parse(raw) as SpotifyUserTokens;
  } catch {
    return null;
  }
}

export async function clearUserTokens(): Promise<void> {
  try {
    await fs.unlink(TOKEN_FILE);
  } catch {
    // ignore
  }
}

export async function exchangeCodeForTokens(code: string): Promise<SpotifyUserTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });

  const credentials = Buffer.from(
    `${requireEnv("SPOTIFY_CLIENT_ID")}:${requireEnv("SPOTIFY_CLIENT_SECRET")}`,
  ).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
  };

  const tokens: SpotifyUserTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
  await saveUserTokens(tokens);
  return tokens;
}

async function refreshAccessToken(
  refreshToken: string,
  previousScope?: string,
): Promise<SpotifyUserTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const credentials = Buffer.from(
    `${requireEnv("SPOTIFY_CLIENT_ID")}:${requireEnv("SPOTIFY_CLIENT_SECRET")}`,
  ).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Refresh failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const tokens: SpotifyUserTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope || previousScope,
  };
  await saveUserTokens(tokens);
  return tokens;
}

export async function getUserAccessToken(): Promise<string | null> {
  const current = await readUserTokens();
  if (!current) return null;
  if (current.expiresAt > Date.now() + 30_000) return current.accessToken;
  try {
    const refreshed = await refreshAccessToken(
      current.refreshToken,
      current.scope,
    );
    return refreshed.accessToken;
  } catch {
    await clearUserTokens();
    return null;
  }
}
