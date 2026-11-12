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
