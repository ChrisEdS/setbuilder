# SETBUILDER

[Deutsch](README.de.md) · **English**

**Version 5.0.6**

SETBUILDER builds a DJ set from a rekordbox USB stick. Load a playlist or a history, fit the night to the slot, and check key, BPM, and energy. Then write the set back and hear the joins before the gig. The interface is German and English.

Walkthrough with screenshots: [docs/GUIDE.md](docs/GUIDE.md)

## What 5.0 changed

The player is a Rekordbox-style deck.

The waveform uses the full width. Zoom follows playback, and the mouse wheel zooms. A click seeks while playback continues. A drag pauses so you can scrub. Space resumes. The arrow keys move one bar and land on a downbeat.

The beatgrid on the wave is the one rekordbox already made. SETBUILDER reads it and does not change it. If a track has no grid, the deck says so.

5.0.1 adds quantize, nudging the beatgrid, and the rekordbox phrase bands, plus a current guide. 5.0.2 makes set cues visible on the wave and adds tooltips on the deck controls. 5.0.3 adds a smaller waveform, structure cues you can undo, room before the first downbeat, and a playhead that keeps up. 5.0.4 finds the beatgrid already stored with the track, draws thinner quieter grid lines you can hide, and a cue click plays without moving the cue. 5.0.5 shows a note while the beatgrid is still loading, draws clearer phrase bands, and keeps the planned transition, length, and set note on one row. 5.0.6 shrinks the player with Light, adds close, minimize, and zoom, shows the full length presets, and keeps a zoomed view at the start of the wave.

Hot cues A–H load with the track. A new cue snaps to the nearest downbeat when a grid is there, and it is written to the stick straight away. Cues already stored as memory cues stay as they are. If the stick has no analysis for that track yet, the cues stay in the set and the player does not see them yet.

## The stick

Connect a rekordbox USB stick (a remembered stick comes back while access still holds). Load a playlist, the history, or the collection for keys. In the brief you set the slot in minutes and the average blend. On the set you place the arc, the joins, pins, and alternatives, and you can fit the night to the slot. **Write to stick** stores the set as a playlist and keeps a backup. **Prepare for player** moves an older player library aside so the player shows those playlists. Eject, then play the stick on the actual player before the gig.

For the booth there is a PDF and copied text. For the computer there is rekordbox XML and M3U.

rekordbox on its own needs no account. Spotify and Tidal are optional. Their redirect is `http://127.0.0.1:4317/api/auth/callback` (Tidal: `…/api/auth/tidal/callback`). Keys go under **Settings**, or into `.env.local` ([`.env.example`](.env.example)).

## Run it

Mac, Windows, and Linux builds are on [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases). A tag `v*` builds them in GitHub Actions with Node 22: macOS arm64 and x64 (`.dmg` and `.zip`), Windows x64 (NSIS), Linux x64 (AppImage and `.deb`). The desktop app listens on port **4317**.

An unsigned Mac download sometimes needs this once:

```bash
xattr -dr com.apple.quarantine /Applications/SETBUILDER.app
```

From the repo, with Node 22:

```bash
npm install
npm run dev
```

The dev server is [http://127.0.0.1:4327](http://127.0.0.1:4327). Tests: `npm test`.

The desktop shell, from the repo:

```bash
npm install
cd desktop
npm install
npm start
```

Packaging notes: [`desktop/README.md`](desktop/README.md).

## License

MIT, see [LICENSE](LICENSE). Energy measurement uses essentia.js (AGPL-3.0); see [THIRD_PARTY.md](THIRD_PARTY.md).

Support: [GitHub Sponsors @ChrisEdS](https://github.com/sponsors/ChrisEdS).
