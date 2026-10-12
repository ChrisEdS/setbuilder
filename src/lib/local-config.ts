import fs from "fs";
import path from "path";
import { dataDir } from "@/lib/data-dir";

const SECRET_KEYS = [
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "TIDAL_CLIENT_ID",
  "TIDAL_CLIENT_SECRET",
] as const;

export type SecretKey = (typeof SECRET_KEYS)[number];

export function configFilePath(): string {
  if (process.env.SETFORM_DATA_DIR?.trim()) {
    return path.join(path.dirname(dataDir()), ".env");
  }
  return path.join(process.cwd(), ".env.local");
}

export function spotifyRedirectUri(): string {
  return (
    process.env.SPOTIFY_REDIRECT_URI?.trim() ||
    `http://127.0.0.1:${process.env.PORT || "4317"}/api/auth/callback`
  );
}

export function tidalRedirectUri(): string {
  return (
    process.env.TIDAL_REDIRECT_URI?.trim() ||
    `http://127.0.0.1:${process.env.PORT || "4317"}/api/auth/tidal/callback`
  );
}

function readMap(file: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }
  return map;
}

function render(values: Map<string, string>): string {
  const spotify = spotifyRedirectUri();
  const tidal = tidalRedirectUri();
  return `# SETFORM, nur auf diesem Mac. Nicht ins Repo legen.
# Spotify: https://developer.spotify.com/dashboard
# Redirect URI dort exakt so eintragen wie hier:
#   ${spotify}
# Tidal: https://developer.tidal.com
# Redirect URI exakt:
#   ${tidal}
# Tidal-Scopes: user.read und playlists.read

SPOTIFY_CLIENT_ID=${values.get("SPOTIFY_CLIENT_ID") || ""}
SPOTIFY_CLIENT_SECRET=${values.get("SPOTIFY_CLIENT_SECRET") || ""}
SPOTIFY_REDIRECT_URI=${spotify}

TIDAL_CLIENT_ID=${values.get("TIDAL_CLIENT_ID") || ""}
TIDAL_CLIENT_SECRET=${values.get("TIDAL_CLIENT_SECRET") || ""}
TIDAL_REDIRECT_URI=${tidal}
`;
}

export function connectionStatus() {
  return {
    spotifyConfigured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
    tidalConfigured: Boolean(process.env.TIDAL_CLIENT_ID && process.env.TIDAL_CLIENT_SECRET),
    spotifyRedirectUri: spotifyRedirectUri(),
    tidalRedirectUri: tidalRedirectUri(),
  };
}

export function saveConnectionSecrets(input: Partial<Record<SecretKey, string>>) {
  const file = configFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const values = readMap(file);
  for (const key of SECRET_KEYS) {
    const next = input[key]?.trim();
    if (!next) continue;
    if (next.includes("\n") || next.includes("\r")) {
      throw new Error("Zugangsdaten dürfen keine Zeilenumbrüche enthalten.");
    }
    values.set(key, next);
    process.env[key] = next;
  }
  process.env.SPOTIFY_REDIRECT_URI = spotifyRedirectUri();
  process.env.TIDAL_REDIRECT_URI = tidalRedirectUri();
  fs.writeFileSync(file, render(values), { mode: 0o600 });
  return connectionStatus();
}
