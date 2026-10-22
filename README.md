# SETBUILDER

[Deutsch](README.de.md) · **English**

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 4.2.0** · Out of the playlist.

The stick is the material. You draw the arc, set each join and its length, and hear if it holds.

SETBUILDER is the quiet room before the gig. You bring a rekordbox stick, shape the night, and leave with a set you can actually play: a clear arc, keys that talk to each other, energy that rises and falls, and a Plan B when the floor turns.

## What you get

- 🎚️ **A set with a shape.** Open, lift, peak, release. You see where the night is thin and where it is already full.
- 🔑 **Keys you can trust.** Camelot along the set, with clashes marked before you are in the booth.
- ⚡ **Energy that belongs to the track.** Read it from your files, measure what is missing, or set it by hand. A finished reading shows on the details line. Unknown energy stays blank.
- 📌 **An opener and a closer that stay put.** Every sort respects the ends you pinned.
- 🎛️ **A mark on every join.** Cut, blend, echo-out, and the rest. Each one has a length, and the slot clock follows it. “—” keeps the average blend from the brief.
- 🎲 **Another night from the same crate.** Different songs, the playlist, the collection, or history — when that pool is actually loaded.
- 🛟 **Plan B.** Roles and alternatives for the moment the floor changes its mind.
- 🎧 **Hear the handoff.** A card you can drag and resize. Previous, this track, next. The same mark and length as the setlist.
- 🔍 **A narrower library.** Under the search: key neighborhood, BPM from and to, energy from and to. Together with artist, title, key, and “Fits after”. No danceability, emotion, or genre score.
- ⏭️ **What fits next.** On the focused track, up to four candidates from the loaded library, ranked like “Fits after”. A click puts the track immediately after, same phase, role groove.
- 📝 **One line for the phase.** Optional, on the arc. An empty line is not stored. The booth PDF prints it on the phase banner.
- 🎒 **Export when it holds.** A checklist first. The stick for the player, a PDF or text for the booth, a file for the computer. Or save the set in SETBUILDER.

## Four steps

1. 📝 **Brief** — title, duration, blend. Gig notes fold under Set info.
2. 🔌 **Load** — connect the stick. A collection file can fill in keys; it does not replace the set.
3. 🎛️ **Build** — start from a playlist, add music, or both. Narrow the library, or take a track that fits next. Then phase, role, order, and each join.
4. 🎒 **Export** — write the stick, print the booth sheet, or export a file.

📖 **Walkthrough with screenshots:** [docs/GUIDE.md](docs/GUIDE.md)

> Play the stick on the actual player before the gig. SETBUILDER keeps a backup, and you still own the night.

## Download

The app ships for Mac, Windows and Linux. Grab it from [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases).

On a Mac, an unsigned download sometimes needs this once:

```bash
xattr -dr com.apple.quarantine /Applications/SETBUILDER.app
```

<a id="setup"></a>

## For developers

rekordbox on its own needs no account. Spotify and Tidal are optional and use a redirect to `http://127.0.0.1:4317/api/auth/callback` (Tidal: `…/api/auth/tidal/callback`). Keys go under **Settings**, or into `.env.local` ([`.env.example`](.env.example)).

```bash
npm install
npm run dev
```

The desktop app uses port **4317**. The dev server uses [port 4327](http://127.0.0.1:4327). Packaging notes live in [`desktop/README.md`](desktop/README.md). The interface is German and English. Tests: `npm test`.

## Donate

SETBUILDER stays free and open. Support via **[GitHub Sponsors @ChrisEdS](https://github.com/sponsors/ChrisEdS)**.

## License

MIT, see [LICENSE](LICENSE). Energy measurement uses essentia.js (AGPL-3.0); see [THIRD_PARTY.md](THIRD_PARTY.md).
