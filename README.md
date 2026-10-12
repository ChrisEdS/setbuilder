# SETFORM

**Version 2.0.1** · Dramaturgie statt Playlist.

SETFORM bereitet DJ-Sets vor. Du lädst einen Rekordbox-Stick, eine Collection-XML oder eine Playlist, legst den Bogen nach Slot und Dauer, prüfst Energie, Key und BPM und nimmst das Set als PDF, rekordbox-XML, M3U oder Text mit. Der Ablauf folgt dem [DJ.Studio Prep-Workflow](https://dj.studio/blog/dj-set-preparation#crafting-a-dj-set-that-feels-right-advanced-tips): Brief → Set bauen (mit Bogen) → Transitions → Export. Die Logik dahinter folgt den Regeln von Mixed In Key: erst Energie, dann Key, dann BPM.

## So läuft ein Set

1. **Brief:** Titel, Vibe, Venue, Slot-Art und Dauer.
2. **Set laden & Keys:** Stick (`export.pdb`), Collection-XML, Tidal-Keys oder CSV öffnen. Die Bibliothek bleibt für Ersatz und Plan B griffbereit.
3. **Set bauen:** Musik per Link, Suche, von Hand oder automatisch aus einer Playlist hinzufügen. Drei Ansichten: **Setliste**, **Rollen**, **Bogen**.
4. **Set bearbeiten:** „Harmonisch sortieren“, „Auf Slot kürzen“, „Rollen verteilen“, „Links suchen“.
5. **Mitnehmen:** PDF, rekordbox-XML, M3U oder Text, jeweils mit Alternativen.

## Features

**Laden und Quellen**
- **Rekordbox-Stick:** `export.pdb` lesen, Playlists und History als Set übernehmen, Dateien vom Stick abspielen, Spotify-Links dazu suchen
- **Weitere Quellen:** rekordbox XML/DB, Tidal Keys (Catalog Key/BPM per ISRC), CSV/Paste, eigene Spotify-Playlist
- **Bibliothek:** alle Tracks durchsuchen, abspielen, nach „Passt zu“ filtern und mit Phase und Rolle ins Set legen

**Set bauen**
- **Bogen:** Open → Lift → Rise → Peak → Release, Slot-Arten (Warm-up / Support / Peak / Closing), Wellen statt Rampe
- **Rollen:** Anchor / Bridge / Groove / Alternativen mit Begründung, Phase, Key und Übergang; per Ziehen oder Auswahl umsortieren
- **Setliste:** Reihenfolge von Hand ändern, Kommentar, BPM, Key, Energie und Übergang pro Track, Details einklappbar
- **Ersatz:** aus den Alternativen oder der ganzen Bibliothek einsetzen, sortiert nach Energie, Key und BPM zu Vorgänger und Nachfolger, mit Vorhören
- **Preview:** Spotify-Embed-Player pro Track, Stick-Dateien direkt

**Logik**
- **Energie:** Energy Level 1–10 aus Mixed In Key (Kommentar „7A - Energy 6“, Collection-XML, CSV-Spalte `Energy` oder von Hand). Zielband pro Phase, Sprünge ab 3 Stufen werden markiert
- **Harmonic Path:** Camelot-Regeln (gleich, ±1, A↔B sicher; +2 als Energy Boost), Mix-Score aus Key und Energie, Clashes sichtbar
- **Auf Slot kürzen:** behält pro Phase die Tracks, deren Energie ins Band passt; der Rest wandert unter Alternativen
- **Plan B:** mindestens zwei passende Alternativen pro Phase, mit Vorschlägen aus der Bibliothek

**Mitnehmen und Sichern**
- **Export:** Menü „Mitnehmen“ mit PDF, rekordbox-XML, M3U und Text; Alternativen sind eine zweite Playlist
- **Verbindungen & Setups:** Spotify und Tidal verbinden, Brief und Set als Setup speichern und wieder laden

## Neu in Version 2

- **Energie statt nur Key und BPM:** Energy Level 1–10 und die Camelot-Regeln nach Mixed In Key bestimmen Sortierung, Rollen, „Passt zu“ und Ersatz. Ein Key-Clash lässt sich nicht durch gleiche Energie und BPM ausgleichen.
- **Bogen-Ansicht:** Phasen im Slot, Energie-Verlauf gegen das Zielband und Key-Verlauf.
- **Plan B:** Die Phase, die du bei einer Alternative setzt („Ersatz für“), zählt. Liegt die Energie außerhalb des Phasenbands, steht der Grund auf der Karte und der Titel zählt nicht. Vorschläge kommen pro Phase aus der Bibliothek, „Lücken füllen“ setzt alle auf einmal. Bei einem fokussierten Track stehen die passenden Alternativen oben.
- **Neue Leiste:** Tabs, „Set bearbeiten“ als Gruppe, Menüs „Mitnehmen“ und „…“ (mit Pfeiltasten und Esc bedienbar).
- **Setliste:** Details pro Track einklappbar.
- **Tests:** `npm test` läuft im Repo.

## Setup

1. Spotify Developer App anlegen und **Web API** aktivieren
2. Redirect URI **exakt** eintragen:
   `http://127.0.0.1:4317/api/auth/callback`
   Tidal-Login zusätzlich: `http://127.0.0.1:4317/api/auth/tidal/callback`
3. Dich selbst als User der App hinzufügen (Development Mode)
4. Zugangsdaten unter **Einstellungen** in der App eintragen (die App schreibt sie nach `.env.local`) oder die Datei selbst anlegen:

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

Entwicklung: [http://127.0.0.1:4327](http://127.0.0.1:4327). Die Desktop-App bleibt auf Port 4317.

## Tests

```bash
npm test
```

Läuft mit dem eingebauten Node-Testrunner. Die Hooks in [`scripts/test-hooks.mjs`](scripts/test-hooks.mjs) lösen den `@/`-Alias und Imports ohne Endung auf. Getestet sind Energie, Camelot-Regeln, Slot-Kürzen, Ersatz-Ranking, Plan B, Export und der Stick-Import.

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
3. **Set extrahieren** — Tracks werden nach Dauer gepackt und auf die Phasen des Bogens gelegt


## Optional: Spotify MCP in Cursor

Siehe `.cursor/mcp.json.example`. Lokale Secrets gehören in `.cursor/mcp.json` (gitignored).
