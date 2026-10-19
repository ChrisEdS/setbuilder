# SETBUILDER

[Deutsch](README.de.md) · **English**

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 4.0.0** · Dramaturgy, not a playlist.

> A good set does not have to be perfect.  
> Music can be analyzed, sorted and planned — but in the end your ears, your feel and the moment on the dancefloor decide. No score and no algorithm can replace what you perceive as a DJ.
>
> SETBUILDER is not here to take decisions away from you. It is a tool that gives you orientation, makes transitions visible and sparks new ideas. Use it as help and inspiration — but in the end, always trust your ears.

SETBUILDER prepares DJ sets for rekordbox. Build a set from a stick playlist, by adding music, or with both. **Load set & keys** connects the stick and enriches an existing set/library from collection XML, CSV or an unencrypted database; those collection files do not start or replace a set by themselves. Then lay out the arc, check energy, key and BPM, and take the result with you — stick write for the player, PDF/text for the booth, XML/M3U for the computer.

The shipping client is the desktop app on port **4317**. Browser development uses port **4327**. Covers come from `PIONEER/Artwork` on the stick, then from the MP3 ID3 APIC frame when that artwork file is missing; the stick folder has to be in the session. Setlist rows are icon buttons — play, up, down, energy (lightning), replace, opener (flag), closer (checkered flag), remove — and each uses the same hover tip. Replace opens a drawer, so later tracks stay put; the header keeps the track name, focus moves into the drawer, and close or Escape returns focus. Play in that list is the same round button as on the row. **Energy from files** shows its four actions only when stick files are present. Otherwise it shows one prerequisite, and **Choose stick** when no stick is connected. Preview is a compact floating card about 512px wide: drag the title strip, Close sits at the top right, and the card stays above the Replace drawer so play, seek and close remain reachable. Chrome and the installed desktop app have shown a real stick read-only. Stick write, CDJ/XDJ playback, Spotify/Tidal accounts, eject, and energy calibration on real media are not verified.

**Highlights**
- ⚡ **Energy from files** — Separately read tags, measure missing/recalculate, or write Energy to MP3; writes are verified and rolled back on failure, audio unchanged
- 🔑 **Key path** — Camelot along the set with mix score, clash badges and Mixed In Key–style sorts
- 🎯 **Perfect sort** — Whole-set Camelot TSP (Held-Karp): kill clashes, max mix score; opener/closer stay
- 🎲 **Different songs** — Reshuffle a new performance from the playlist pool for the same brief
- 🎚️ **Arc & energy** — Phases Open→Release against target bands; jumps called out
- 📌 **Opener & closer** — Pin ends, or keep the current first/last track; every sort respects them
- 💾 **Stick round-trip** — Targeted, transactional update of an existing SETBUILDER playlist in the current `export.pdb`; unrelated database changes are preserved, with backup, read-back and rollback
- 🎒 **Take with you** — Menu grouped by player / booth / computer; stick write first
- 🛟 **Plan B** — Roles and alternatives per phase when the floor turns

## How a set works

1. **Brief** — title, vibe, venue, slot type and duration
2. **Load set & keys** — connect a stick and optionally enrich the current set/library from XML, CSV or DB
3. **Build the set** — start from a stick playlist, add music, or combine both; then set phases, roles and order
4. **Take with you** — stick write, then PDF / text, or XML / M3U

📖 **Full walkthrough with screenshots:** [docs/GUIDE.md](docs/GUIDE.md)

🧪 **4.0 notes:** [docs/RELEASE-4.0-RC.md](docs/RELEASE-4.0-RC.md). Stick write, players, and streaming accounts are still unverified.

Set timing is an estimate: each performance track contributes its duration minus a fixed two-minute overlap, with a minimum contribution of 30 seconds. It does not model cue points, transition style or live decisions.

> Always test the stick on the actual player before a gig. SETBUILDER keeps copies under `SETBUILDER-Backup/`, but browser permissions, disconnects/full disks, rekordbox tag reload/import, player families and real media remain external verification boundaries.

## Setup

1. Optional (Spotify / Tidal only): create a Spotify Developer app with **Web API**. rekordbox alone needs no credentials.
2. Redirect URI **exactly**: `http://127.0.0.1:4317/api/auth/callback`  
   Tidal: `http://127.0.0.1:4317/api/auth/tidal/callback`
3. Add yourself as a user (Development Mode)
4. Enter keys under **Settings** in the app, or in `.env.local` (template: [`.env.example`](.env.example))
5. Run:

```bash
npm install
npm run dev
```

Dev: [http://127.0.0.1:4327](http://127.0.0.1:4327). Desktop app: port **4317**.

## Desktop

Packaged app for Mac, Windows and Linux: [`desktop/README.md`](desktop/README.md). Releases: [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases).

Unsigned Mac downloads may need quarantine removed once:

```bash
xattr -dr com.apple.quarantine /Applications/SETBUILDER.app
```

## Languages & tests

UI and exports follow **DE / EN** (stored as `setbuilder-lang`). Messages live in [`src/lib/i18n/messages`](src/lib/i18n/messages).

```bash
npm test
```

## Donate

SETBUILDER stays free and open. Support via **[GitHub Sponsors @ChrisEdS](https://github.com/sponsors/ChrisEdS)**.

## License

MIT, see [LICENSE](LICENSE). Client-side energy analysis uses essentia.js (AGPL-3.0); see [THIRD_PARTY.md](THIRD_PARTY.md).
