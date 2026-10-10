# SETFORM

Spotify-gestützter DJ-Set-Builder nach dem [DJ.Studio Prep-Workflow](https://dj.studio/blog/dj-set-preparation#crafting-a-dj-set-that-feels-right-advanced-tips): Brief → Crate → Energiekurve → Transitions → Export.

## Features

- **Playlist → Set**: eigene Spotify-Playlist laden und entlang Open → Lift → Rise → Peak → Release extrahieren
- **Crate-Rollen-Board**: Anchor / Bridge / Groove / Safety mit Why-Infos, Phase, Key, Transition
- **Key-Import**: CSV/Paste aus Mixed In Key, rekordbox u. a. (Camelot, Open Key, Am/C…)
- **Harmonic Path**: Camelot-Kompatibilität, Mix-Score, „Harmonisch sortieren“
- **Brief**: Venue, Slot, Audience, Gear, Dauer
- **Spotify-Suche** zum Nachschärfen
- **Export**: PDF (Druckdialog) und Text-Copy inkl. Safety-Crate

## Setup

1. Spotify Developer App anlegen und **Web API** aktivieren
2. Redirect URI **exakt** eintragen:
   `http://127.0.0.1:4317/api/auth/callback`
3. Dich selbst als User der App hinzufügen (Development Mode)
4. `.env.local` anlegen:

```bash
SPOTIFY_CLIENT_ID=…
SPOTIFY_CLIENT_SECRET=…
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4317/api/auth/callback
```

5. Install & run:

```bash
npm install
npm run dev
```

App: [http://127.0.0.1:4317](http://127.0.0.1:4317)

### Playlist-Flow

1. In SETFORM auf **Mit Spotify verbinden**
2. Playlist-URL einfügen (`open.spotify.com/playlist/…`)
3. **Set extrahieren** — Tracks werden nach Dauer gepackt und auf die Energiekurve gelegt


## Optional: Spotify MCP in Cursor

Siehe `.cursor/mcp.json.example`. Lokale Secrets gehören in `.cursor/mcp.json` (gitignored).
