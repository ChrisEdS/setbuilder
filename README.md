# SETBUILDER

[Deutsch](README.de.md) · **English**

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 4.3.2** · Out of the playlist.

The stick is the material. You draw the arc, set the join, and hear if it holds.

Before the gig, the room is quiet. SETBUILDER is that room. You arrive with a rekordbox stick and leave with a night you want to play: an arc, keys that find each other, energy that rises and falls, and a Plan B when the floor turns.

## What you take with you

- 🎚️ **A night with a shape.** Open, lift, peak, release. You see where there is still air and where it is already full.
- 🔑 **Keys that talk to each other.** Camelot along the set. A clash shows up while you still have time.
- ⚡ **Energy that belongs to the song.** Read from the file, measured, or set by you. It sits on the track once it is real.
- 📌 **Pins that stay in the set.** Opener and closer hold the ends. Mid pins survive trim and different songs, and still move when you sort.
- 🎛️ **Every join with its own length.** Cut, blend, echo-out. The slot clock follows what you write on the handoff. “—” takes the blend time from the brief.
- 🎲 **Another night from the same crate.** Different songs. Or the playlist, the collection, the history, once they are in the room.
- 🛟 **Plan B in your pocket.** Roles and alternatives for the moment the floor changes its mind.
- 🎧 **Hear the handoff first.** A card you can drag and open up. Previous, this track, next. The same length as the setlist.
- 🔍 **Only what fits.** Key, BPM, and energy pull the library in close. Fits after ranks what can follow a chosen track.
- 📝 **A line for the phase.** On the arc, when you want it. Driving, 128. It travels onto the sheet for the booth.
- 🎒 **Ready when it holds.** The checklist first. Then the stick for the player, the sheet for the booth, the file for the computer. Or the set stays in SETBUILDER.

## Four steps

1. 📝 **Brief** — title, length, how close the joins should sit. The notes for the gig wait under Set info.
2. 🔌 **Load** — connect the stick. A collection can fill in the keys.
3. 🎛️ **Build** — a playlist, your own songs, or both. Draw the crate in close, use Fits after when you need it, and set the phase, the role, and every join.
4. 🎒 **Export** — the stick for the player, the sheet for the booth, a file for home.

📖 **Walkthrough with screenshots:** [docs/GUIDE.md](docs/GUIDE.md)

> Play the stick on the actual player before the gig. SETBUILDER keeps a backup, and the night stays yours.

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
