# SETBUILDER

**Deutsch** · [English](README.md)

**Version 5.2.2**

SETBUILDER hilft dir, aus einem rekordbox-USB-Stick ein DJ-Set zu planen, die Titel im Zusammenspiel zu prüfen, die Übergänge vorzuhören und das fertige Set als Playlist wieder auf denselben Stick zu schreiben. Die App spricht Deutsch und Englisch.

**Für wen:** DJs, die schon mit rekordbox auf den Stick exportieren und vor dem Gig einen Slot planen wollen — nicht nur eine Playlist.

## In vier Schritten

1. **Stick laden** — Playlists und Bibliothek vom rekordbox-Stick einlesen.
2. **Set bauen** — mit einer Playlist starten, den Slot (die Zeit, die du hast) setzen und die Performance-Titel ordnen.
3. **Abend formen** — Rollen (Anchor, Bridge, Groove), Bogen-Phasen (Open, Lift, Rise, Peak, Release), Übergänge und Alternativen.
4. **Auf Stick schreiben** — Set als Playlist auf den Stick speichern, auswerfen, am Player testen.

## Das bekommst du

- **Stick und Playlist** — Rekordbox-USB-Stick einstecken, eine Playlist laden — ihre Reihenfolge wird deine Setliste, Key und BPM wie auf dem Stick.
- **Slot und Spielzeit** — Der **Slot** ist die Zeit, die du für den Gig hast; die **Spielzeit** summiert Titellängen minus die geplante Überlappung an jedem Übergang, und die Statuszeile sagt, wenn die Spielzeit länger als der Slot ist.
- **Rollen** — Jedem Performance-Titel gibst du eine **Rolle** (seine Aufgabe): **Anchor** für einen Signature-Moment, **Bridge** wenn Key oder Energie springen, **Groove** für ruhigen Fluss zwischen Peaks.
- **Alternativen** — **Alternativen** sind Reserve-Titel neben der Hauptliste; sie zählen nicht zur Spielzeit, bis du sie in die Performance ziehst.
- **Energie-Bogen** — Der **Bogen** zeigt, wie die Energie über den Slot in Phasen läuft — **Open**, **Lift**, **Rise**, **Peak**, **Release** — damit du siehst, ob der Aufbau zur Zeit passt.
- **Übergänge hören** — **Vorhören** spielt den vorherigen Titel, diesen und den nächsten mit denselben Übergangs-Längen wie im Set, damit du Blends zu Hause prüfen kannst.
- **Zurück auf den Stick** — **Auf Stick schreiben** legt das Set als Playlist auf denselben USB-Stick; SETBUILDER sichert vorher, bevor etwas geändert wird.
- **Deutsch und Englisch** — **DE** / **EN** in der App umschalten; die Anleitung gibt es in beiden Sprachen.

Anleitung mit Screenshots: [docs/GUIDE.de.md](docs/GUIDE.de.md)

## Starten

Builds für Mac, Windows und Linux liegen unter [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases). Die Desktop-App öffnet sich im Browser unter Port **4317**.

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

Desktop-Hülle aus dem Repo:

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
