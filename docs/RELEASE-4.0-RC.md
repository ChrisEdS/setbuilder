# SETBUILDER 4.0 release candidate

**Candidate date:** 2026-10-19  
**Status:** Tagged **v4.0.0**. The read path was checked on a real stick. The write path, players, and streaming accounts below are still open.

**4.1.0** follows this candidate. Each join can carry its own transition and length; the brief blend time is the fallback when a join is unmarked. The fixed two-minute model in the scope section describes 4.0.0 only.

## Scope

This candidate reorganizes the workflow around **Load set & keys**, **Build set**, **Add music**, and **Take with you**. A set can start from a stick playlist, added music, or both. Collection XML/CSV/DB enriches and indexes an existing set/library; it does not create or replace a set by itself.

It also separates energy tag reads, measurement and MP3 writes; serializes named heavy work with visible status; adds Replace/Merge/Cancel plus one-step Undo for playlist loads; keeps booth notes out of rekordbox Comments and ID3; and makes existing SETBUILDER playlist updates targeted and transactional against the current stick database with backup, read-back and rollback.

Replace for a single track opens as a drawer, so the setlist below does not move. The header keeps the track name. Focus moves into the drawer and returns on close or Escape. Play in that list uses the same round setlist play button. The set-wide Energy menu lists its four actions only when stick files are present. Otherwise it shows one prerequisite, and Choose stick (the existing picker) when no stick is connected. Covers come from `PIONEER/Artwork` on the stick, then from the MP3 ID3 APIC frame if that artwork file is missing. Both need the stick folder in the session. Setlist row actions are icon buttons: play, up, down, energy (lightning), replace, opener (flag), closer (checkered flag), remove. Energy uses the same hover tip as the other icons.

Set timing is intentionally fixed: every performance track contributes its duration minus two minutes of overlap, with a minimum of 30 seconds. This does not model cue points, transition style or live decisions.

## Migration note

Stored drafts now pass through a versioned draft codec. It validates and normalizes older data and repairs duplicate track/source-pool IDs deterministically while preserving recoverable user content.

## Automated gates

Currently known as passed for this candidate:

- 221 automated tests
- TypeScript (`tsc`)
- ESLint
- Production build

## Shipping client

SETBUILDER ships as the desktop app. Electron starts the local server on port **4317** and opens it in its own window (`npm start` in `desktop/` for a dev run, `npm run dist` for a package). A browser tab is not the release client.

## Browser matrix

Passed in the local Chromium test browser with fictional sample data:

- [x] German and English at 1280 px desktop, 768 px tablet and 375 px mobile
- [x] No horizontal overflow at the tested widths
- [x] Mobile setlist actions measure at least 44 × 44 px
- [x] Build via Add music, phase/role controls, Energy menu, Replace panel, Roles, Arc and Take to the gig
- [x] Replace opens as a drawer with focus inside, closes with Escape and returns focus to its trigger, and does not shift the following tracks. Checked locally in the browser on the sample set.
- [x] All five English and five German v400 guide screenshots captured from the current UI

Supplementary read-only note, not a release gate:

- [x] Chrome with a real rekordbox stick (ChrisleBeat, read-only: collection, playlists and history, a loaded set, covers). No stick write.

Edge, Firefox and Safari are not release gates for 4.0.

## Device check

- [x] Installed desktop app `/Applications/SETBUILDER.app` **3.6.5** (existing local package, not a new build or tag). Opened on this Mac on 2026-10-19. ChrisleBeat loaded read-only inside the app window: `Found: ChrisleBeat/PIONEER/rekordbox/export.pdb`, collection index 4686, playlists, and HISTORY 001–005, with the saved set still on screen. No Replace, Merge, Write to stick, Prepare for player, Eject, or energy write. `export.pdb` was unchanged.

## Unverified external blockers

These still need later device, service or real-media verification:

- Stick write path (Replace, Merge, Prepare for player, energy write) and rollback recovery
- Spare USB permissions, disconnect handling and full-disk behavior
- rekordbox XML import and tag reload
- CDJ/XDJ player families, including Device Library and OneLibrary differences
- Spotify/Tidal OAuth, catalog access and embeds
- Print/PDF, clipboard and eject integration
- Codec coverage and Energy calibration on representative real media

Tagged **v4.0.0**. The desktop app can read a real stick. The write path and the checks above are still open.
