# SETBUILDER

[Deutsch](README.de.md) · **English**

**Version 5.2.4**

SETBUILDER helps you plan a DJ set from a rekordbox USB stick, check how the titles flow together, hear the joins at home, and write the finished set back as a playlist on the same stick. The app speaks German and English.

**Who it is for:** DJs who already export music with rekordbox and want to shape a slot—not just a playlist—before the gig.

## In four steps

1. **Load the stick** — read the playlists and library from your rekordbox stick.
2. **Build the set** — start from a playlist, set the slot (the time you have), and order your performance titles.
3. **Shape the night** — roles (Anchor, Bridge, Groove), arc phases (Open, Lift, Rise, Peak, Release), transitions, and alternatives.
4. **Write to the stick** — save the set as a playlist on the stick, eject, and test on your player.

## What you get

- **Playlist becomes the set** — Your rekordbox stick is the library: load a playlist and its order becomes your set list, with key and BPM as exported. You plan inside a **slot** (the time you have), not just playlist length.
- **Playing time vs slot** — On each row, the overlap you plan is taken off that title's length. The status line adds up **playing time** against the slot and tells you when the set runs too long.
- **Roles and alternatives** — Mark each performance title **Anchor**, **Bridge**, or **Groove** so you see its job in the night. **Alternatives** hold reserve titles beside the list; they stay out of playing time until you drag one in.
- **Energy arc** — In the arc view, place titles across **Open**, **Lift**, **Rise**, **Peak**, and **Release** over your slot. You see whether the build and peak land where you want before you play.
- **Rehearsal** — **Before**, **Now**, and **After** play the handoff into the next title using the overlap length from that row. Tweak the transition mark while you listen; it lives in the set, not in the file on the stick.
- **Beatgrid on the waveform** — Nudge the rekordbox beatgrid in the player (**−5**, **+5**, **1**). Hot cues **A–H** sit on the waveform; **Q** snaps new cues to the grid, and you can write cues back to the stick when you export.
- **Safe write to stick** — **Write to stick** saves performance titles and alternatives as a playlist on the same USB stick. SETBUILDER backs up first, re-reads the database to verify the write, and rolls back if the check fails.
- **German and English** — Toggle **DE** / **EN** anytime; the same screens and manual exist in both languages.

Step-by-step manual with screenshots: [docs/GUIDE.md](docs/GUIDE.md)

## Run it

Mac, Windows, and Linux builds are on [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases). The desktop app opens in your browser at port **4317**.

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

Desktop shell from the repo:

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
