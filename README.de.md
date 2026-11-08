# SETBUILDER

**Deutsch** · [English](README.md)

**Version 5.1.0**

SETBUILDER baut ein DJ-Set aus einem rekordbox-USB-Stick. Du lädst eine Playlist oder eine History, legst die Nacht auf den Slot und prüfst Key, BPM und Energie. Danach schreibst du das Set zurück und hörst die Übergänge vor dem Gig. Die Oberfläche ist Deutsch und Englisch.

Anleitung mit Screenshots: [docs/GUIDE.de.md](docs/GUIDE.de.md)

## Was du mitnimmst

- 🎚️ **Eine Nacht mit Form.** Open, Lift, Peak, Release. Du siehst, wo noch Luft ist und wo es schon voll ist.
- ⏱️ **Die Nacht auf den Slot.** Zu lang, sie wird kürzer. Zu kurz füllt sie aus Alternativen und der geladenen Playlist.
- 🔑 **Keys, die miteinander reden.** Camelot entlang des Sets. Ein Clash fällt auf, solange du noch Zeit hast.
- ⚡ **Energie, die zum Song gehört.** Aus der Datei gelesen, gemessen oder von dir gesetzt.
- ➕ **Wo der nächste Song reinkommt.** Hinter einem Song, den du nennst, am Ende oder auf Automatisch. Automatisch setzt ihn hinter den Song, dem er nach Key, BPM und Energie am besten folgt — zuerst in seiner Phase, dann überall, und nur ans Ende, wenn nichts passt. Der Status sagt, welchen Platz er hat.
- 📌 **Behalten, oder den Slot pinnen.** Ein behaltener Track bleibt im Set, Sortieren darf ihn verschieben. Ein Pin hält genau diesen Slot. Opener und Closer halten die Enden.
- 🛟 **Plan B in der Tasche.** Rollen und Alternativen, wenn der Floor dreht.
- 🎧 **Den Übergang vorher hören.** Vorher, dieser Track, der nächste — dieselbe Länge wie im Set. Die Liste folgt dem Track, der spielt, und hält diese Zeile neben dem Player sichtbar.
- 🌊 **Eine Welle über die volle Breite.** Der Zoom folgt der Wiedergabe, das Mausrad zoomt. Ein Klick sucht, die Wiedergabe läuft weiter. Ein Ziehen pausiert zum Schieben. Die Leertaste setzt fort. Die Pfeiltasten springen einen Takt und landen auf einem Downbeat.
- 🎼 **Das rekordbox-Beatgrid.** Das Grid der Playlist wird im Hintergrund gelesen, bevor der Player aufgeht, und die erste Lesung zeigt den Fortschritt. Es startet als das, das rekordbox schon angelegt hat. Analyse ersetzt es auf Wunsch aus der Audiodatei, und −5, +5 und 1 schieben es weiter. Fehlt ein Grid, sagt das Deck das.
- 🥁 **Der erste Downbeat auf dem Playhead.** Er setzt den ersten Downbeat dort und behält den Abstand der Beats. Ohne Rekordbox-Grid tut er nichts.
- 🔖 **Hot Cues und Phrasenbänder.** Hot Cues A–H kommen mit dem Track. Ein neuer Cue rastet auf den nächsten Downbeat ein, wenn ein Grid da ist, und wird sofort auf den Stick geschrieben. Cues, die schon als Memory Cues liegen, bleiben. Die Phrasenbänder von rekordbox liegen auf der Welle. Liegt für den Track noch keine Analyse auf dem Stick, bleiben die Cues im Set. Der Player sieht sie dann noch nicht.
- 💡 **Light.** Eine kleinere Wellenform. In der Leiste bleibt die laufende Zeit groß, und Ansicht, Cues und Grid bleiben getrennt.
- 🎒 **Fertig, wenn es sitzt.** Der Stick für den Player, der Zettel für die Kabine, die Datei für den Rechner.

## Der Stick

Einen rekordbox-USB-Stick verbinden (ein erkanntes Volume lädt ohne Ordner-Dialog; ein erinnerter Stick kommt zurück, solange der Zugriff gilt). Playlist, History oder die Collection für die Keys laden. Im Brief setzt du die Slot-Minuten und die mittlere Blend-Zeit. Im Set legst du den Bogen, die Übergänge, Pins und Alternativen, und du kannst die Nacht auf den Slot setzen. **Auf Stick schreiben** legt das Set als Playlist ab und behält eine Sicherung. **Für Player vorbereiten** legt eine ältere Player-Bibliothek beiseite, damit der Player diese Playlists zeigt. Auswerfen, dann den Stick vor dem Gig am echten Player spielen.

Für die Kabine gibt es ein PDF und kopierten Text. Für den Rechner rekordbox-XML und M3U.

rekordbox allein braucht kein Konto. Spotify und Tidal sind optional. Die Weiterleitung ist `http://127.0.0.1:4317/api/auth/callback` (Tidal: `…/api/auth/tidal/callback`). Keys trägst du unter **Einstellungen** ein oder in `.env.local` ([`.env.example`](.env.example)).

## Starten

Builds für Mac, Windows und Linux liegen unter [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases). Ein Tag `v*` baut sie in GitHub Actions mit Node 22: macOS arm64 und x64 (`.dmg` und `.zip`), Windows x64 (NSIS), Linux x64 (AppImage und `.deb`). Die Desktop-App hört auf Port **4317**.

Ein unsignierter Mac-Download braucht manchmal einmal das hier:

```bash
xattr -dr com.apple.quarantine /Applications/SETBUILDER.app
```

Aus dem Repo, mit Node 22:

```bash
npm install
npm run dev
```

Der Dev-Server ist [http://127.0.0.1:4327](http://127.0.0.1:4327). Tests: `npm test`.

Die Desktop-Hülle, aus dem Repo:

```bash
npm install
cd desktop
npm install
npm start
```

Hinweise zum Paketieren: [`desktop/README.md`](desktop/README.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE). Die Energiemessung nutzt essentia.js (AGPL-3.0); siehe [THIRD_PARTY.md](THIRD_PARTY.md).

Unterstützung: [GitHub Sponsors @ChrisEdS](https://github.com/sponsors/ChrisEdS).
