# SETBUILDER guide

[Deutsch](GUIDE.de.md) · **English** · [README](../README.md)

**5.0.12.** The pictures are the English interface in Chrome. **DE** / **EN** at the top right switches the labels. The German guide is the same steps.

Connect the stick, build the set, hear it on the deck, take it with you. The shipping client is the desktop app (port **4317**). In the browser: port **4327**.

> **Before the gig:** Test the stick on the actual player (playlist visible, tracks playable). Keep a backup. SETBUILDER can write `export.pdb` and keeps copies under `SETBUILDER-Backup/`. You are responsible for your media.

## 1. Connect the stick

![Rekordbox stick and playlists](screenshots/en/01-stick-library.png)

Plug the stick in. SETBUILDER reads playlists and history from `export.pdb`, including the hidden `PIONEER` or `.PIONEER` folder. Under **Build set**, **Start with a playlist** lists them. **Load as set** takes a playlist into the set. Order, key and BPM stay. Files from the stick play in the player.

If the folder dialog hangs, pick **export.pdb** (`PIONEER/rekordbox/export.pdb`). Do not select the whole USB with every music file; that can stall. **Change stick** when another volume is mounted.

The strip on the stick is the player check. Amber means the old player library is still hiding your playlists. **Prepare for player** is that button, then eject. This guide does not press it. Green means Device Library players can use the stick. CDJ-3000X, XDJ-AZ and OPUS-QUAD still need rekordbox for OneLibrary. Check it on the hardware.

## 2. Build the set

![Brief: title, slot, blend time](screenshots/en/02-brief.png)

![Setlist after the playlist](screenshots/en/02-setlist.png)

The brief is at the top. **Title**, **Slot duration (min)** and **Blend time (average)**. Those minutes are the clock **Fit to slot** uses: lengthen them and the set fills; shorten them and it cuts. **Set info** (vibe, venue, slot, audience, gear, notes) is for the gig. The clock stays in the minutes.

**Start with a playlist** lists the playlists on the stick. Loading one into a set that already has tracks asks:

- **Replace** overwrites the setlist and offers one **Undo**.
- **Merge** keeps the setlist and appends only tracks that are missing.
- **Cancel** changes nothing.

The setlist shows phase, role and the join from the previous track. **Setlist**, **Roles** and **Arc** switch the view. **Comfortable** shows the icon row; **Compact** keeps it tight. Change the order with the grip or the arrows. Play opens the player. **Fit to slot** cuts when the set runs over the slot. **Fill with matches** adds tracks that fit when it is short.

## 3. Hear it on the deck

![Player with waveform, 2× zoom, Q and cues A–H](screenshots/en/03-deck.png)

The player is the card over the setlist. Drag the right edge wider and the bottom edge taller. The waveform runs the width of the card. The overview is on top, the large wave under it. **+** zooms (the picture is at **2×**). The overview marks the window. The playhead stays.

**Q** quantizes. A hot cue **A–H** then lands on the next downbeat of the Rekordbox beatgrid. With **Q** off, the cue keeps the time you set. **−5** and **+5** nudge the grid by 5 ms. **1** moves the nearest downbeat onto the playhead. Phrase color bands come from the rekordbox analysis and follow the grid when you nudge it. Cues and the nudge stay in the player. The CDJ sees them once they are in the analysis file on the stick.

In the picture: Nefertiti (Futuro Pelo), the waveform, zoom 2×, **Q**, **−5**, **+5**, **1**, pads A–H. Under that it says “No Rekordbox beatgrid for this track.” On the tracks opened from this set, the player drew no grid, so no phrase bands and no placed cue either. The same buttons apply once the analysis file matches the track.

## 4. Take it with you

![Export: Save set, Write to stick, PDF, Copy text](screenshots/en/04-export.png)

**Export** is grouped by where the set goes.

- **In SETBUILDER** — **Save set**. Does not write the stick.
- **For the player** — **Write to stick**. Playlist `SETBUILDER - <title>` plus alternatives in the current `export.pdb`, with a backup, a read-back and a rollback. Only tracks already on the stick. This guide did not press it.
- **For the booth** — **PDF** (choose “Save as PDF” in the print dialog) and **Copy text**. Brief, order, key, BPM, energy when known, set note.
- **For the computer** — further down the same menu: **XML for rekordbox** (an import, not the stick) and **M3U**.

Under **Connections & setups** you can save the brief and the set as a setup. The name follows the title from the brief.

## Before the gig

Stick reads, imports and writes run one after another. The rest of the UI stays usable. Check the write path, CDJ/XDJ playback and eject on the hardware you play. SETBUILDER cannot prove browser folder permissions or a full stick for you.

## Further reading

- [README](../README.md) — setup, desktop download, languages, tests, license
- [Desktop packaging](../desktop/README.md) — build, signing, quarantine
