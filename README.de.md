# SETBUILDER

**Deutsch** · [English](README.md)

**Version 5.0.11**

SETBUILDER baut ein DJ-Set aus einem rekordbox-USB-Stick. Du lädst eine Playlist oder eine History, legst die Nacht auf den Slot und prüfst Key, BPM und Energie. Danach schreibst du das Set zurück und hörst die Übergänge vor dem Gig. Die Oberfläche ist Deutsch und Englisch.

Anleitung mit Screenshots: [docs/GUIDE.de.md](docs/GUIDE.de.md)

## Was 5.0 geändert hat

Der Player ist ein Deck im Rekordbox-Stil.

Die Wellenform nutzt die volle Breite. Der Zoom folgt der Wiedergabe, das Mausrad zoomt. Ein Klick sucht, die Wiedergabe läuft weiter. Ein Ziehen pausiert zum Schieben. Die Leertaste setzt fort. Die Pfeiltasten springen einen Takt und landen auf einem Downbeat.

Das Beatgrid auf der Welle startet als das, das rekordbox schon angelegt hat. Analyse ersetzt es aus der Audiodatei, und −5, +5 und 1 schieben es weiter. Fehlt ein Grid, sagt das Deck das.

5.0.1 ergänzt Quantize, das Verschieben des Beatgrids und die Rekordbox-Phrasenbänder, plus eine aktuelle Anleitung. 5.0.2 macht Set-Cues auf der Welle sichtbar und ergänzt Tooltips an den Deck-Bedienelementen. 5.0.3 ergänzt eine kleinere Wellenform, Struktur-Cues mit Zurück, Platz vor dem ersten Downbeat und einen Playhead, der mitläuft. 5.0.4 findet das Beatgrid, das schon beim Track liegt, zeichnet dünnere leisere Grid-Linien, die sich ausblenden lassen, und ein Cue-Klick spielt, ohne den Cue zu verschieben. 5.0.5 zeigt einen Hinweis, solange das Beatgrid noch gelesen wird, zeichnet deutlichere Phrasenbänder und hält geplanten Übergang, Länge und Set-Notiz in einer Zeile. 5.0.6 zieht das Player-Fenster mit Light zusammen, ergänzt Schließen, Einklappen und Vergrößern, zeigt die Längenvorgaben vollständig und lässt den Zoom am Anfang der Welle heranzoomen. 5.0.7 nimmt die Fensterknöpfe wieder weg. Der Player schließt nur sich selbst, über das × neben den Sprungtasten. 5.0.8 behält dieses Schließen und bringt den Desktop-Build wieder durch die Typprüfung. 5.0.9 zoomt die Welle bis 128× und liest nur das Beatgrid, nicht die ganze Analyse-Datei. 5.0.10 setzt die laufende Zeit größer in die Leiste und trennt Ansicht, Cues und Grid. 5.0.11 analysiert auf Knopfdruck ein Beatgrid aus der Audiodatei und ersetzt das, das schon beim Track liegt.

Hot Cues A–H kommen mit dem Track. Ein neuer Cue rastet auf den nächsten Downbeat ein, wenn ein Grid da ist, und wird sofort auf den Stick geschrieben. Cues, die schon als Memory Cues liegen, bleiben. Liegt für den Track noch keine Analyse auf dem Stick, bleiben die Cues im Set. Der Player sieht sie dann noch nicht.

## Der Stick

Einen rekordbox-USB-Stick verbinden (ein erinnerter Stick kommt zurück, solange der Zugriff gilt). Playlist, History oder die Collection für die Keys laden. Im Brief setzt du die Slot-Minuten und die mittlere Blend-Zeit. Im Set legst du den Bogen, die Übergänge, Pins und Alternativen, und du kannst die Nacht auf den Slot setzen. **Auf Stick schreiben** legt das Set als Playlist ab und behält eine Sicherung. **Für Player vorbereiten** legt eine ältere Player-Bibliothek beiseite, damit der Player diese Playlists zeigt. Auswerfen, dann den Stick vor dem Gig am echten Player spielen.

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
