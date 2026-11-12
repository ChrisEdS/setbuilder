# SETBUILDER

[Deutsch](README.de.md) · **English**

**Version 5.2.2**

SETBUILDER helps you plan a DJ set from a rekordbox USB stick, check how the titles flow together, hear the joins at home, and write the finished set back as a playlist on the same stick. The app speaks German and English.

**Who it is for:** DJs who already export music with rekordbox and want to shape a slot—not just a playlist—before the gig.

## In four steps

1. **Load the stick** — read the playlists and library from your rekordbox stick.
2. **Build the set** — start from a playlist, set the slot (the time you have), and order your performance titles.
3. **Shape the night** — roles (Anchor, Bridge, Groove), arc phases (Open, Lift, Rise, Peak, Release), transitions, and alternatives.
4. **Write to the stick** — save the set as a playlist on the stick, eject, and test on your player.

## What you get

- **Stick and playlist** — Plug in your rekordbox USB stick, load a playlist, and its order becomes your set list with keys and BPM as exported.
- **Slot and playing time** — The **slot** is the time you have for the gig; **playing time** adds up title lengths minus the overlap you plan at each join, and the status line tells you when playing time is longer than the slot.
- **Roles** — Each performance title gets a **role** (its job): **Anchor** for a signature moment, **Bridge** when key or energy jumps need care, **Groove** for steady flow between peaks.
- **Alternatives** — **Alternatives** are reserve titles next to the main list; they do not count toward playing time until you drag them into the performance.
- **Energy arc** — The **arc** maps how energy runs across the slot in phases—**Open**, **Lift**, **Rise**, **Peak**, **Release**—so you see whether the build fits your time.
- **Hear the joins** — **Rehearsal** plays the previous title, this one, and the next with the same transition lengths as in the set, so you can check blends at home.
- **Back on the stick** — **Write to stick** saves the set as a playlist on the same USB stick; SETBUILDER makes a backup before it changes anything.
- **German and English** — Switch **DE** / **EN** in the app; the manual is available in both languages.

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
