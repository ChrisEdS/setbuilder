# SETFORM

Spotify-gestützter DJ-Set-Builder nach dem [DJ.Studio Prep-Workflow](https://dj.studio/blog/dj-set-preparation#crafting-a-dj-set-that-feels-right-advanced-tips): Brief → Crate → Energiekurve → Transitions → Export.

## Features

- **Playlist → Set**: eigene Spotify-Playlist laden und entlang Open → Lift → Rise → Peak → Release extrahieren
- **Crate-Rollen-Board**: Anchor / Bridge / Groove / Safety mit Why-Infos, Phase, Key, Transition
- **Dramaturgie**: Slot-Arten (Warm-up / Support / Peak / Closing), Wellen statt Rampe
- **Key Library**: rekordbox XML/DB, **Tidal Keys** (Catalog Key/BPM per ISRC), CSV/Paste, Spotify-Features-Status
- **Harmonic Path**: Camelot-Kompatibilität, Mix-Score, „Harmonisch sortieren“
- **Preview**: Spotify-Embed-Player pro Track
- **Export**: PDF + Text inkl. Safety-Crate

## Setup

1. Spotify Developer App anlegen und **Web API** aktivieren
2. Redirect URI **exakt** eintragen:
   `http://127.0.0.1:4317/api/auth/callback`
   Tidal-Login zusätzlich: `http://127.0.0.1:4317/api/auth/tidal/callback`
3. Dich selbst als User der App hinzufügen (Development Mode)
4. `.env.local` anlegen:

```bash
SPOTIFY_CLIENT_ID=…
SPOTIFY_CLIENT_SECRET=…
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4317/api/auth/callback

# Optional — Keys/BPM aus dem Tidal Catalog (developer.tidal.com)
TIDAL_CLIENT_ID=…
TIDAL_CLIENT_SECRET=…
```

5. Install & run:

```bash
npm install
npm run dev
```

App: [http://127.0.0.1:4317](http://127.0.0.1:4317)

## Hosting bei UD Media

Normale Webhosting-Tarife können SETFORM nicht ausliefern. UD Media erlaubt dort kein Node.js, und die App braucht einen dauerhaften Node-Prozess für Login, Playlist-Import und den Player.

Auf einem **Managed-Server** geht es. UD Media richtet Node.js oder rootless Docker (Podman) einmalig ein: [Node.js](https://hilfe.udmedia.de/server/managed-server/kann-ich-nodejs-auf-meinen-managed-server-benutzen/), [Docker](https://hilfe.udmedia.de/server/managed-server/unterstuetzt-der-managed-server-docker/). Anfrage an info@udmedia.de.

Danach:

1. In der Spotify-App die Redirect-URI auf die echte Adresse setzen, zum Beispiel `https://sets.example.de/api/auth/callback`. Dieselbe URI kommt in `.env` als `SPOTIFY_REDIRECT_URI`.
2. `.env` auf dem Server anlegen (nicht ins Repo): `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, optional `TIDAL_CLIENT_ID` und `TIDAL_CLIENT_SECRET`.
3. Mit Docker: `docker compose up -d --build`. Ohne Docker: Node 22, `npm ci`, `npm run build`, `npm start`. Next hört auf `PORT` (Standard 3000) und auf allen Interfaces.
4. Den Webserver der Domain auf diesen Port weiterleiten und HTTPS einschalten. Das Verzeichnis `.data` muss erhalten bleiben, dort liegt die Spotify-Sitzung.

### Playlist-Flow

1. In SETFORM auf **Mit Spotify verbinden**
2. Playlist-URL einfügen (`open.spotify.com/playlist/…`)
3. **Set extrahieren** — Tracks werden nach Dauer gepackt und auf die Energiekurve gelegt


## Optional: Spotify MCP in Cursor

Siehe `.cursor/mcp.json.example`. Lokale Secrets gehören in `.cursor/mcp.json` (gitignored).
