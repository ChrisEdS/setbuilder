type SdkPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (
    event: string,
    cb: (payload: { device_id?: string; message?: string }) => void,
  ) => void;
};

type PlaybackAuth = {
  canStream: boolean;
  accessToken?: string;
  reason?: string;
  message?: string;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SdkPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

async function fetchAuth(): Promise<PlaybackAuth> {
  const response = await fetch("/api/playback/token", { cache: "no-store" });
  return (await response.json()) as PlaybackAuth;
}

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Spotify) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-spotify-sdk]",
    );
    const finish = () => {
      if (window.Spotify) resolve();
      else reject(new Error("Spotify SDK fehlt."));
    };
    window.onSpotifyWebPlaybackSDKReady = finish;
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.dataset.spotifySdk = "1";
    script.onerror = () => reject(new Error("Spotify SDK konnte nicht laden."));
    document.body.appendChild(script);
  });
}

let deviceReady: Promise<string> | null = null;

function environmentError(): string | null {
  if (typeof window === "undefined") return "Kein Browser.";
  let embedded = false;
  try {
    embedded = window.top !== window.self;
  } catch {
    embedded = true;
  }
  if (embedded) {
    return "Der Premium-Player startet nicht in dieser eingebetteten Ansicht. Öffne SETFORM in einem eigenen Chrome- oder Safari-Fenster — dort läuft die volle Länge.";
  }
  if (!window.isSecureContext) {
    return "Spotify spielt nur auf https oder localhost ab. Die Vorschau bleibt hier verfügbar.";
  }
  return null;
}

function readablePlayerError(message: string): string {
  if (/failed to initialize player/i.test(message)) {
    return "Dieser Browser blockiert den Spotify-Player. Volle Länge braucht Chrome oder Safari mit DRM, nicht die eingebettete Vorschau. Unten bleibt die Kurzvorschau.";
  }
  return message;
}

function ensureDevice(): Promise<string> {
  const blocked = environmentError();
  if (blocked) return Promise.reject(new Error(blocked));
  if (deviceReady) return deviceReady;
  deviceReady = (async () => {
    await loadSdk();
    if (!window.Spotify) throw new Error("Spotify SDK fehlt.");
    const player = new window.Spotify.Player({
      name: "SETFORM",
      volume: 0.8,
      getOAuthToken: (cb) => {
        void fetchAuth().then((auth) => {
          if (auth.accessToken) cb(auth.accessToken);
        });
      },
    });

    const deviceId = await new Promise<string>((resolve, reject) => {
      player.addListener("ready", ({ device_id }) => {
        if (device_id) resolve(device_id);
      });
      player.addListener("initialization_error", ({ message }) => {
        deviceReady = null;
        reject(new Error(readablePlayerError(message || "Player-Init fehlgeschlagen.")));
      });
      player.addListener("authentication_error", ({ message }) => {
        deviceReady = null;
        reject(new Error(message || "Spotify-Auth für Playback fehlt."));
      });
      player.addListener("account_error", ({ message }) => {
        reject(new Error(message || "Konto erlaubt kein Streaming."));
      });
      void player.connect();
    });
    return deviceId;
  })().catch((error) => {
    deviceReady = null;
    throw error;
  });
  return deviceReady;
}

export async function playSpotifyTrack(trackId: string): Promise<void> {
  const auth = await fetchAuth();
  if (!auth.canStream || !auth.accessToken) {
    throw new Error(auth.message || "Volle Wiedergabe nicht verfügbar.");
  }
  const deviceId = await ensureDevice();
  const response = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    },
  );
  if (!response.ok && response.status !== 204) {
    const detail = await response.text();
    throw new Error(detail || `Playback fehlgeschlagen (${response.status})`);
  }
}

export async function spotifyStreamStatus(): Promise<PlaybackAuth> {
  return fetchAuth();
}
