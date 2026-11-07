# SETBUILDER

**Deutsch** · [English](README.md)

**Version 5.0.1**

SETBUILDER baut ein DJ-Set aus einem rekordbox-USB-Stick. Du lädst eine Playlist oder eine History, legst die Nacht auf den Slot und prüfst Key, BPM und Energie. Danach schreibst du das Set zurück und hörst die Übergänge vor dem Gig. Die Oberfläche ist Deutsch und Englisch.

Anleitung mit Screenshots: [docs/GUIDE.de.md](docs/GUIDE.de.md)

## Was 5.0 geändert hat

5.0.1 ist derselbe Player. Der Desktop-Build von 5.0.0 blieb an einem Lint-Fehler im Deck hängen, und dieses Release räumt ihn ab.

Der Player ist ein Deck im Rekordbox-Stil.

Die Wellenform nutzt die volle Breite. Der Zoom folgt der Wiedergabe, das Mausrad zoomt. Ein Klick sucht, die Wiedergabe läuft weiter. Ein Ziehen pausiert zum Schieben. Die Leertaste setzt fort. Die Pfeiltasten springen einen Takt und landen auf einem Downbeat.

Das Beatgrid auf der Welle ist das Rekordbox-Grid, nur gelesen. Es ist der PQTZ-Tag in der bestehenden ANLZ-Datei. SETBUILDER findet die Datei über den Audio-Pfad, der darin steht, unter `PIONEER/USBANLZ`. Dieser Ordnername ist nicht die Track-ID in `export.pdb`. Das Grid wird nicht neu geschrieben. Fehlt ein Grid, sagt das Deck das.

Hot Cues A–H kommen aus derselben ANLZ-Datei. Ein neuer Cue rastet auf den nächsten Downbeat ein, wenn ein Grid da ist. Zurückgeschrieben wird in die bestehende Datei, und nur der Hot-Cue-Tag ändert sich. Memory Cues bleiben. Liegt für den Track keine Analyse-Datei auf dem Stick, bleiben die Cues im Set. Der Player sieht sie dann noch nicht.

## Der Stick

Ein Stick ist ein rekordbox-USB-Export, wie ChrisleBeat oder LE_BACKUP: auf dem Volume liegen `PIONEER/rekordbox/export.pdb`, die Audio-Dateien und `PIONEER/USBANLZ`.

Stick verbinden (ein erinnerter Stick kommt zurück, solange der Zugriff gilt). Playlist, History oder die Collection für die Keys laden. Im Brief setzt du die Slot-Minuten und die mittlere Blend-Zeit. Im Set legst du den Bogen, die Übergänge, Pins und Alternativen, und du kannst die Nacht auf den Slot setzen. **Auf Stick schreiben** legt das Set als Playlist in `export.pdb` ab und behält eine Sicherung. **Für Player vorbereiten** legt eine ältere Player-Bibliothek beiseite, damit der Player diese Playlists zeigt. Auswerfen, dann den Stick vor dem Gig am echten Player spielen.

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
