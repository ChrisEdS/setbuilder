# SETBUILDER

[Deutsch](README.de.md) · **English**

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 4.1.0** · Dramaturgy, not a playlist.

> A good set does not have to be perfect.  
> Music can be analyzed, sorted and planned — but in the end your ears, your feel and the moment on the dancefloor decide. No score and no algorithm can replace what you perceive as a DJ.
>
> SETBUILDER is not here to take decisions away from you. It is a tool that gives you orientation, makes transitions visible and sparks new ideas. Use it as help and inspiration — but in the end, always trust your ears.

SETBUILDER is the quiet prep room before the gig. You bring a rekordbox stick, shape the night, and leave with a set you can actually play: a clear arc, keys that talk to each other, energy that rises and falls, and a Plan B when the floor turns.

## What you get

- 🎚️ **A set with a shape.** Open, lift, peak, release. You see where the night is thin and where it is already full.
- 🔑 **Keys you can trust.** Camelot along the set, with clashes marked before you are in the booth.
- ⚡ **Energy that belongs to the track.** Read it from your files, measure what is missing, or set it by hand.
- 📌 **An opener and a closer that stay put.** Every sort respects the ends you pinned.
- 🎲 **Another night from the same crate.** Roll a different selection for the same brief when the first cast is not the one.
- 🛟 **Plan B.** Roles and alternatives for the moment the floor changes its mind.
- 🎧 **A player that stays out of the way.** A small card you can drag. Close sits in the corner. It stays reachable while you replace a track.
- 🎒 **Something to take with you.** The stick for the player, a PDF or a text list for the booth, a file for the computer. A checklist before you leave, the join in the player, and an average blend time the slot follows at once.

## Four steps

1. 📝 **Brief** — title, vibe, room, slot, length
2. 🔌 **Load** — connect the stick. A collection file can fill in keys; it does not replace the set.
3. 🎛️ **Build** — start from a playlist, add music, or both. Then phase, role, and order.
4. 🎒 **Take it** — write the stick, print the booth sheet, or export a file.

📖 **Walkthrough with screenshots:** [docs/GUIDE.md](docs/GUIDE.md)

> Play the stick on the actual player before the gig. SETBUILDER keeps a backup, and you still own the night.

## Download

The app ships for Mac, Windows and Linux. Grab it from [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases).

On a Mac, an unsigned download sometimes needs this once:

```bash
xattr -dr com.apple.quarantine /Applications/SETBUILDER.app
```

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
