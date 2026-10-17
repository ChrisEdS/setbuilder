# SETBUILDER guide

[Deutsch](GUIDE.de.md) · **English** · [README](../README.md)

How to prepare a set with rekordbox: load → build → export. Screenshots use a sample set with made-up titles.

> **Before the gig:** Always test the stick on the actual player (playlist visible, tracks playable). Keep a backup — SETBUILDER writes to `export.pdb` and keeps copies under `SETBUILDER-Backup/`, but you are responsible for your media. No warranty. Works on my machine. :)

## How a set works with rekordbox

1. **Brief:** title, vibe, venue, slot type and duration.
2. **Load from rekordbox:** the stick (`export.pdb`) or a collection XML.
3. **Build the set:** check phases and roles, change them by hand or let SETBUILDER assign them.
4. **Back to rekordbox:** export as XML, with the performance and the alternatives as two playlists.

## 1. Load from rekordbox

![Load a set: rekordbox stick and collection](screenshots/en/01-rekordbox-load-v302.png)

**Rekordbox stick.** Prefer **Choose stick** (Chrome / Edge / desktop) for the volume root, or pick `PIONEER` / `PIONEER/rekordbox`. If the folder dialog fails or hangs, use **export.pdb** (`PIONEER/rekordbox/export.pdb` or `.PIONEER/…`) — the most reliable path. Avoid selecting the whole USB with every music file; that can stall. SETBUILDER finds the database itself, even in the hidden `PIONEER` or `.PIONEER` folder. It reads playlists and the played history. Order, key and BPM are kept; Energy Level is read from the rekordbox comment when Mixed In Key wrote it there. Files from the stick can be previewed directly. Status text shows while the dialog is open, while files are listed, and while the database is read.

**Player check.** After a stick is chosen, a short strip shows one verdict and one primary action (prepare for player, eject, or open rekordbox). Details (folder, database, OneLibrary, SETBUILDER playlists) sit behind a toggle. Green means Device Library players can use the stick; amber means a step is still needed.

**Collection without a stick.** In rekordbox, export via *File → Export Collection in XML…* and load the file. Key and BPM are matched onto the tracks in the set by artist and title. An unencrypted `master.db` and CSV work too. After the import, the **Library** searches by artist, title, key or stick **playlist** (picker + autocomplete). **Fits after** ranks tracks that can follow a chosen set track; **5 others** pages through more matches.

**Energy.** The Energy Level (1–10) comes from Mixed In Key. SETBUILDER reads it from the rekordbox comment (for example `7A - Energy 6`, `Energie 6`), from Grouping / Label / Remixer in the collection XML or CSV (`Energy` / `Energie`), from a lone `6` or `E8` in those fields, or you set it by hand in the setlist. USB `export.pdb` has comments but not Grouping — reload tags in rekordbox and load the collection XML if energy stays empty.

**Set note.** In the setlist details, **Set note** is only for this set in SETBUILDER (cue, floor). It is not the MP3/rekordbox comment and is not written back into ID3 tags.

**Energy from stick files.** Under **Edit set**, **Energy from files** analyzes tracks that have a stick path (Chrome / Edge / desktop). It sets `energyLevel` in the draft and, for MP3s, writes ID3 `TXXX EnergyLevel` plus `Energy N` in the file comment — audio bytes stay unchanged; key, BPM and the Set note stay untouched. When you load the set again with the stick connected, SETBUILDER re-reads missing energy from MP3 tags — `TXXX EnergyLevel` / `Energy`, comments with `Energy N`, and Grouping / Remixer / Label fields (export.pdb is not updated until rekordbox reloads tags). After writing, reload tags in rekordbox so the player and library see the new values. `master.db` on the computer is never touched. Analysis uses [essentia.js](https://github.com/MTG/essentia.js) (AGPL-3.0) in the browser only; see [THIRD_PARTY.md](../THIRD_PARTY.md).

## 2. Setlist

![Setlist with key, BPM, energy and transition](screenshots/en/02-setlist-v302.png)

Each track shows its source (rekordbox), phase and role. Controls sit under the title: phase and role on one row, play / move / Replace / **Opener** / **Closer** / remove on the next. Hover any control for a short tip. Below are key, BPM and energy, the transition from the previous track (“Adjacent key (±1) · +1 BPM · Energy +1”) and the reasoning (“Why here”). Change the order by dragging or with the arrows; “Replace” swaps a title.

**Opener & closer.** Pin a performance track as **Opener** (stays first, phase Open) or **Closer** (stays last, phase Release). Extract suggests warm open / release pins; you can change or clear them anytime. Sorting re-applies the pins so they stay at the ends.

**Edit set**
- **Sort:** most techniques reorder only inside each phase (Alternatives stay at the end; pinned opener/closer stay first/last overall). **Perfect · Max score** is different: it reorders the whole performance across phase seams, then re-lays Open→Release by timeline. Same menu on the setlist and on the Key path. If nothing moves, SETBUILDER says so — often key/energy/BPM are missing, or a phase has only one or two tracks.

  | Technique | What it does |
  |---|---|
  | **Perfect · Max score** | Whole-set Camelot TSP (exact Held-Karp ≤18 tracks, else NN+2-opt/Or-opt). Minimizes clashes first, then maximizes mix score. Opener/closer stay pinned; phases are re-laid after. 100% needs keys that all connect on the wheel — disconnected clusters still leave a bridge clash |
  | **Harmonic** | Related Camelot keys, soft energy, small BPM steps |
  | **One-step** | Mixed In Key: energy ±1 per transition |
  | **Energy wave** | Climbs Open→Peak, falls in Release |
  | **Twin peak** | Build, dip ≈−2, climb again (rise/peak) |
  | **Build tempo** | BPM ramp with the phase |
  | **BPM chain** | Stay in the ±2–4 pocket |
  | **Camelot journey** | Clockwise around the wheel |
  | **Waves** | In Peak, groove and impact alternate |

- **Energy from files:** computes Energy Level from stick audio (Essentia), sets it in the draft, and writes ID3 energy tags into MP3s on the stick (Chrome / Edge / desktop). The Set note is not changed. Then reload tags in rekordbox.
- **Trim to slot:** keeps, per phase, the tracks whose energy fits the band; the rest moves to Alternatives
- **Assign roles:** Anchor on the strongest Peak tracks and the closer, Bridge at a phase change, key clash, BPM or energy jump, otherwise Groove
- **Find Spotify links:** looks up a Spotify match for tracks without a link so you can preview them in the set (needs the Spotify credentials, see [Setup in the README](../README.md#setup)). Your rekordbox export is unaffected.

## 3. Roles and Plan B

![Roles: Anchor, Bridge, Groove and Alternatives](screenshots/en/03-roles-v302.png)

Every track has a phase (Open → Lift → Rise → Peak → Release) and a role:

| Role | Job |
|---|---|
| **Anchor** | Crowd connector, signature track |
| **Bridge** | Pivot between phases: key, BPM, energy |
| **Groove** | Room to breathe between peaks |
| **Alternatives** | Plan B when the floor turns |

Drag titles between the columns. **Plan B** asks for at least two fitting alternatives per phase. An alternative counts for the phase you pick under “Replaces”, as long as its energy fits the phase's band. Otherwise the reason is shown on the card. “Fill gaps” takes suggestions from your rekordbox library that fit the phase's tracks by energy, key and BPM.

## 4. Arc

![Arc: Key path with mix score, badges and drag reorder](screenshots/en/04-key-path-v302.png)

The arc shows how the phases fill the slot (active phase is highlighted; yellow means over the window) and how each track's energy sits against the phase's target band. Jumps of three levels or more are marked.

**Key path** shows Camelot along the played order. Each card has a short relation badge (Same, ±1, Clash, …), the key, energy when known, and BPM. Drag cards to reorder; use **Sort** for the techniques above. Three stats with a **?** explain the numbers:
- **Keys set** — share of performance tracks with a Camelot key
- **Mix score** — average of every transition (key and energy in equal parts, small BPM correction). Above ~75 % is smooth; below ~50 % often clashes
- **Clashes** — transitions whose keys sit far apart on the Camelot wheel

Sort (especially **Perfect · Max score**), drag, or change key/energy in the setlist to move the numbers. A clash can't be bought back with matching energy and BPM alone — if two Camelot clusters never touch (for example 1A/12A vs 8A/9A), Perfect still leaves the fewest possible bridge clashes.

| Phase | Energy target |
|---|---|
| Open | 3–5 |
| Lift | 5–6 |
| Rise | 6–8 |
| Peak | 8–10 |
| Release | 4–6 |

## 5. Take with you

![Take with you: write to stick, PDF, XML, M3U, copy text](screenshots/en/05-export-v302.png)

The **Take with you** menu is grouped by where the set goes next:

### For the player

- **Write to stick** (main path): playlist `SETBUILDER - <title>` plus alternatives as `SETBUILDER - <title> Alternatives` in `export.pdb`. Chrome, Edge or the desktop app. The stick is remembered — after a restart, *Reconnect stick* is enough. Only tracks already on the stick are written; near-matches (remix / original mix, or the same title listed more than once) show as one clear *Use this* choice. If the playlist is already there, *Update* replaces it (backup first). Every write copies the database to `SETBUILDER-Backup/` (keeps the three newest), then verifies; on failure the old state is restored. XML and M3U also land in the `SETBUILDER` folder on the stick. The health strip offers *Prepare for player* when a stale OneLibrary (`exportLibrary.db`) would hide playlists on CDJ-3000 / XDJ-XZ, and *Eject* before you unplug. CDJ-3000X, XDJ-AZ and OPUS-QUAD still need rekordbox for OneLibrary. The computer library (`master.db`) is never touched. Practice on a spare stick first; **never go to a gig with an untested stick**.

### For the booth

- **PDF:** print view with brief, order, key and BPM (save as PDF in the print dialog)
- **Copy text:** set with brief and comments to the clipboard

### For the computer

- **XML for rekordbox:** file `SETBUILDER-rekordbox.xml` to *import* in rekordbox — not writing the stick. In rekordbox set *Preferences → Advanced → Database → rekordbox xml* to this file once; then left tree → *rekordbox xml* → right-click → *Import Playlist*. Performance and alternatives come as two playlists.
- **M3U:** playlist file for devices that read M3U

Under **Connections & setups** you can save the brief and the set as a setup, load it again, or back it up as JSON. The save name follows the set title from the brief.

## More sources

rekordbox is the main route. If keys are missing, Tidal (key and BPM from the catalog via ISRC), CSV or paste fill them in. Titles that aren't in rekordbox yet come into the set by link from Spotify, Tidal, Beatport or SoundCloud. Beatport and SoundCloud need no login: the title comes from the address, and you enter key and BPM by hand or get them through rekordbox.

## Further reading

- [README](../README.md) — setup, desktop download, languages, tests, license
- [Desktop packaging](../desktop/README.md) — build, signing, quarantine
