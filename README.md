# SETBUILDER

[Deutsch](README.de.md) · **English**

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 3.4.0** · Dramaturgy, not a playlist.

SETBUILDER prepares DJ sets for rekordbox. You load a playlist or history from the export stick (or a collection XML), lay out the arc by slot and duration, check energy, key and BPM, and take the set with you as rekordbox XML, PDF, M3U or text. The logic follows Mixed In Key: energy first, then key, then BPM. The workflow follows the [DJ.Studio prep workflow](https://dj.studio/blog/dj-set-preparation#crafting-a-dj-set-that-feels-right-advanced-tips): brief → build the set → transitions → export.

**Highlights**
- ⚡ **Energy from files** — Analyze stick MP3s, write Energy into ID3 (audio untouched), reload tags in rekordbox
- 🔑 **Key path** — Camelot along the set with mix score, clash badges and Mixed In Key–style sorts
- 🎯 **Perfect sort** — Whole-set Camelot TSP (Held-Karp): kill clashes, max mix score; opener/closer stay pinned
- 🎚️ **Arc & energy** — Phases Open→Release against target bands; jumps called out
- 📌 **Opener & closer** — Pin the first and last performance track; sorts keep them at the ends
- 💾 **Stick round-trip** — Load from `export.pdb`, write the set back, player check before the gig
- 🛟 **Plan B** — Roles and alternatives per phase when the floor turns

## How a set works

1. **Brief** — title, vibe, venue, slot type and duration
2. **Load from rekordbox** — stick (`export.pdb`) or collection XML
3. **Build the set** — phases, roles, opener/closer, sort and trim
4. **Back to rekordbox** — stick write, XML, PDF, M3U or text

📖 **Full walkthrough with screenshots:** [docs/GUIDE.md](docs/GUIDE.md)

> Always test the stick on the actual player before a gig. SETBUILDER keeps copies under `SETBUILDER-Backup/`; you remain responsible for your media.

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
