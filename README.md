# SETBUILDER

[Deutsch](README.de.md) · **English**

**Version 5.2.0**

The library filters by stars, color, genre, and comment. Playlist names open in a list under the search field. A missing cover uses the setlist note tile. A playlist row keeps the track count beside the title, and Load as set stays clear of the scrollbar. Stick health says when newer players still show an older copy. Detail fields stay one short line, with the source mark next to Details. The player opens in Light, Structure highlights the cues it sets, and Analyze stays in the grid bar.

SETBUILDER builds a DJ set from a rekordbox USB stick. Load a playlist or a history, fit the night to the slot, and check key, BPM, and energy. Then write the set back and hear the joins before the gig. The interface is German and English.

Walkthrough with screenshots: [docs/GUIDE.md](docs/GUIDE.md)

## What you take with you

- 🎚️ **A night with a shape.** Open, lift, peak, release. You see where there is still air and where it is already full.
- ⏱️ **The night fitted to the slot.** Too long, it cuts. Too short, it fills from alternatives and the playlist you loaded.
- 🔑 **Keys that talk to each other.** Camelot along the set. A clash shows up while you still have time.
- ⚡ **Energy that belongs to the song.** Read from the file, measured, or set by you.
- ➕ **Where the next song comes in.** After a song you name, at the end, or Auto. Auto puts it after the song it best follows — key, BPM, energy — in its phase first, then anywhere, and only at the end if nothing fits. The status says which place it took.
- 📌 **Keep it, or pin the slot.** A kept track stays in the set while sorting may move it. A pin holds the exact slot. Opener and closer hold the ends.
- 🛟 **Plan B in your pocket.** Roles and alternatives for when the floor turns.
- 🎧 **Hear the handoff first.** Previous, this track, next — the same lengths as the set. The list follows the track that is playing and keeps that row visible beside the player.
- 🌊 **A wave across the full width.** Zoom follows playback, and the mouse wheel zooms. A click seeks while playback continues. A drag pauses so you can scrub. Space resumes. The arrow keys move one bar and land on a downbeat.
- 🎼 **The rekordbox beatgrid.** The playlist grid is read in the background before the player opens, and the first read shows its progress. It starts as the one rekordbox already made. Analyze replaces it from the audio on request, and −5, +5, and 1 nudge it. If a track has no grid, the deck says so.
- 🥁 **The first downbeat on the playhead.** It sets the first downbeat there and keeps the beat spacing. With no Rekordbox grid it does nothing.
- 🔖 **Hot cues and phrase bands.** Hot cues A–H load with the track. A new cue snaps to the nearest downbeat when a grid is there, and it is written to the stick straight away. Cues already stored as memory cues stay as they are. Phrase bands from rekordbox sit on the wave. If the stick has no analysis for that track yet, the cues stay in the set and the player does not see them yet.
- 💡 **Light.** A smaller waveform. In the deck bar the elapsed time stays large, and view, cues, and the grid stay apart.
- 🎒 **Ready when it holds.** The stick for the player, the sheet for the booth, the file for the computer.

## The stick

Connect a rekordbox USB stick (one recognized volume loads without a picker; a remembered stick comes back while access still holds). Load a playlist, the history, or the collection for keys. In the brief you set the slot in minutes and the average blend. On the set you place the arc, the joins, pins, and alternatives, and you can fit the night to the slot. **Write to stick** stores the set as a playlist in export.pdb and, when that file can be opened, in the player library. The library is not deleted. **Prepare for player** puts a missing player library back from the backup. Eject, then play the stick on the actual player before the gig.

For the booth there is a PDF and copied text. For the computer there is rekordbox XML and M3U.

rekordbox on its own needs no account. Spotify and Tidal are optional. The desktop redirect is `http://127.0.0.1:4317/api/auth/callback` (Tidal: `…/api/auth/tidal/callback`). For `npm run dev` on port **4327**, use that port in the redirect instead. Keys go under **Settings**, or into `.env.local` ([`.env.example`](.env.example)).

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
