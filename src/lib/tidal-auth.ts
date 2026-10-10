import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";

const STATE_COOKIE = "setform_tidal_state";
const VERIFIER_FILE = path.join(process.cwd(), ".data", "tidal-oauth.json");
const TOKEN_FILE = path.join(process.cwd(), ".data", "tidal-tokens.json");

export type TidalUserTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
};

const SCOPES = ["playlists.read", "user.read"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getTidalRedirectUri(): string {
  return (
    process.env.TIDAL_REDIRECT_URI ||
    "http://127.0.0.1:4317/api/auth/tidal/callback"
  );
}

function challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function createTidalAuthorizeUrl(): Promise<string> {
  const state = randomBytes(16).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  await fs.mkdir(path.dirname(VERIFIER_FILE), { recursive: true });
  await fs.writeFile(
    VERIFIER_FILE,
    JSON.stringify({ state, verifier, expiresAt: Date.now() + 10 * 60_000 }),
    "utf8",
  );
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 600,
  });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("TIDAL_CLIENT_ID"),
    redirect_uri: getTidalRedirectUri(),
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge(verifier),
    state,
  });
  return `https://login.tidal.com/authorize?${params.toString()}`;
}

export async function consumeTidalLogin(state: string | null): Promise<string | null> {
  const jar = await cookies();
  const cookieState = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  let file: { state?: string; verifier?: string; expiresAt?: number } | null = null;
  try {
    file = JSON.parse(await fs.readFile(VERIFIER_FILE, "utf8"));
    await fs.unlink(VERIFIER_FILE);
  } catch {
    file = null;
  }
  const matches = Boolean(
    state && (state === cookieState || state === file?.state) && file?.verifier,
  );
  if (!matches || !file?.expiresAt || file.expiresAt < Date.now()) return null;
  return file.verifier ?? null;
}

export async function exchangeTidalCode(code: string, verifier: string): Promise<void> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: requireEnv("TIDAL_CLIENT_ID"),
    code,
    redirect_uri: getTidalRedirectUri(),
    code_verifier: verifier,
  });
  const response = await fetch("https://auth.tidal.com/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Tidal token failed: ${await response.text()}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };
  const tokens: TidalUserTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
  await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
}

export async function getTidalUserAccessToken(): Promise<string | null> {
  try {
    const tokens = JSON.parse(await fs.readFile(TOKEN_FILE, "utf8")) as TidalUserTokens;
    if (tokens.expiresAt > Date.now() + 30_000) return tokens.accessToken;
    if (!tokens.refreshToken) return null;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: requireEnv("TIDAL_CLIENT_ID"),
    });
    const response = await fetch("https://auth.tidal.com/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    };
    const next: TidalUserTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope || tokens.scope,
    };
    await fs.writeFile(TOKEN_FILE, JSON.stringify(next, null, 2), "utf8");
    return next.accessToken;
  } catch {
    return null;
  }
}

export async function clearTidalUserTokens(): Promise<void> {
  await fs.unlink(TOKEN_FILE).catch(() => undefined);
}
