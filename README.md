# SETFORM

Spotify-gestützter DJ-Set-Builder nach dem [DJ.Studio Prep-Workflow](https://dj.studio/blog/dj-set-preparation#crafting-a-dj-set-that-feels-right-advanced-tips): Brief → Crate → Energiekurve → Transitions → Export.

## Features

- **Brief**: Venue, Slot, Audience, Gear, Dauer
- **Energiekurve**: Open → Lift → Rise → Peak → Release
- **Crate-Rollen**: Anchor, Bridge, Groove, Safety
- **Transition-Verben**: Long blend, EQ swap, Echo-out, Stem overlay, …
- **Spotify-Suche** (Web API, Client Credentials)
- **Export** mit Cue-/Safety-Notizen in die Zwischenablage

## Setup

1. Spotify Developer App anlegen und **Web API** aktivieren
2. Redirect URI: `http://127.0.0.1:3000/callback` (für späteren OAuth/MCP)
3. `.env.local` anlegen:

```bash
SPOTIFY_CLIENT_ID=…
SPOTIFY_CLIENT_SECRET=…
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
```

4. Install & run:

```bash
npm install
npm run dev
```

App: [http://127.0.0.1:4317](http://127.0.0.1:4317)

## Optional: Spotify MCP in Cursor

Siehe `.cursor/mcp.json.example`. Lokale Secrets gehören in `.cursor/mcp.json` (gitignored).
