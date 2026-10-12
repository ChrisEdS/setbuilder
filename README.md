# SETFORM

Spotify-gestützter DJ-Set-Builder nach dem [DJ.Studio Prep-Workflow](https://dj.studio/blog/dj-set-preparation#crafting-a-dj-set-that-feels-right-advanced-tips): Brief → Crate → Energiekurve → Transitions → Export.

## Features

- **Playlist → Set**: eigene Spotify-Playlist laden und entlang Open → Lift → Rise → Peak → Release extrahieren
- **Crate-Rollen-Board**: Anchor / Bridge / Groove / Safety mit Why-Infos, Phase, Key, Transition
- **Dramaturgie**: Slot-Arten (Warm-up / Support / Peak / Closing), Wellen statt Rampe
- **Key Library**: rekordbox XML/DB, **Rekordbox-Stick** (`export.pdb`: Playlists und History als Set, Dateien vom Stick abspielbar, Spotify-Links dazu), **Tidal Keys** (Catalog Key/BPM per ISRC), CSV/Paste, Spotify-Features-Status
- **Export zurück**: M3U und rekordbox-XML der Performance-Reihenfolge, Alternativen als zweite Playlist
- **Ersatz**: Alternative aus der Crate einsetzen, mit Key- und BPM-Abstand zu Vorgänger und Nachfolger
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

## Desktop (Mac, Windows, Linux)

Die App liegt in [`desktop`](desktop/README.md). `npm start` öffnet das Fenster. `npm run dist` packt sie für das aktuelle System. Ein Git-Tag `v*` baut auf GitHub Mac (Apple Silicon und Intel), Windows und Linux und legt die Dateien ins [Release](https://github.com/ChrisEdS/setform/releases).

Jede Installation braucht eine eigene Spotify- und optional Tidal-Developer-App. Die Keys stehen in `.env.local` oder, in der gepackten App, in den Anwendungsdaten unter `.env`. Vorlage: [`.env.example`](.env.example).

### Installer öffnen

Die aktuellen Pakete sind noch nicht signiert. macOS markiert einen Browser-Download mit Quarantäne und meldet dann „SETFORM.app is damaged and can’t be opened“. Die Datei ist nicht beschädigt.

Nach dem Entpacken im Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/SETFORM.app
```

Den Pfad an den Ort anpassen, an dem die App liegt. Danach öffnet ein Doppelklick die App. Alternativ: Rechtsklick auf SETFORM → Öffnen, und im Dialog noch einmal Öffnen.

Windows zeigt einen SmartScreen-Hinweis. Über „Trotzdem ausführen“ startet die Installation. Linux startet die AppImage direkt.

Sobald die Apple- und Windows-Zertifikate als GitHub-Secrets liegen, signiert der nächste Release. Auf dem Mac entfällt der Quarantäne-Schritt dann. Die Schritte stehen in [`desktop/README.md`](desktop/README.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).

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
