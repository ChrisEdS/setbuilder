# SETBUILDER

**Deutsch** · [English](README.md)

**Version 5.2.5**

SETBUILDER hilft dir, aus einem rekordbox-USB-Stick ein DJ-Set zu planen, die Titel im Zusammenspiel zu prüfen, die Übergänge vorzuhören und das fertige Set als Playlist wieder auf denselben Stick zu schreiben. Die App spricht Deutsch und Englisch.

**Für wen:** DJs, die schon mit rekordbox auf den Stick exportieren und vor dem Gig einen Slot planen wollen — nicht nur eine Playlist.

## In vier Schritten

1. **Stick laden** — Playlists und Bibliothek vom rekordbox-Stick einlesen.
2. **Set bauen** — mit einer Playlist starten, den Slot (die Zeit, die du hast) setzen und die Performance-Titel ordnen.
3. **Abend formen** — Rollen (Anchor, Bridge, Groove), Bogen-Phasen (Open, Lift, Rise, Peak, Release), Übergänge und Alternativen.
4. **Auf Stick schreiben** — Set als Playlist auf den Stick speichern, auswerfen, am Player testen.

## Das bekommst du

- **Playlist wird zum Set** — Dein rekordbox-Stick ist die Bibliothek: Eine Playlist laden, und ihre Reihenfolge wird deine Setliste — Key und BPM wie exportiert. Du planst in einem **Slot** (der Zeit, die du hast), nicht nur nach Playlist-Länge.
- **Spielzeit gegen Slot** — Pro Zeile zieht die geplante Überlappung von der Titellänge ab. Die Statuszeile summiert die **Spielzeit** gegen den Slot und sagt dir, wenn das Set zu lang wird.
- **Rollen und Alternativen** — Performance-Titel als **Anchor**, **Bridge** oder **Groove** markieren, damit du ihre Aufgabe im Abend siehst. **Alternativen** halten Reserve-Titel neben der Liste; sie zählen nicht zur Spielzeit, bis du einen reinziehst.
- **Energie-Bogen** — In der Bogen-Ansicht sitzen Titel über **Open**, **Lift**, **Rise**, **Peak** und **Release** auf deinem Slot. So siehst du vor dem Gig, ob Aufbau und Höhepunkt dort landen, wo du sie willst.
- **Vorhören** — **Vorher**, **Jetzt** und **Danach** spielen den Übergang in den nächsten Titel mit der Überlappungs-Länge aus der Zeile. Übergangs-Marke beim Hören anpassen — sie bleibt im Set, nicht in der Datei auf dem Stick.
- **Beatgrid in der Wellenform** — Das rekordbox-Beatgrid im Player schieben (**−5**, **+5**, **1**). Hot Cues **A–H** liegen auf der Wellenform; **Q** rastet neue Cues am Grid ein, und beim Export kannst du Cues zurück auf den Stick schreiben.
- **Sicher auf den Stick schreiben** — **Auf Stick schreiben** legt Performance-Titel und Alternativen als Playlist auf denselben USB-Stick. SETBUILDER sichert vorher, liest die Datenbank danach zum Prüfen wieder ein und rollt bei fehlgeschlagener Prüfung zurück.
- **Deutsch und Englisch** — **DE** / **EN** jederzeit umschalten; dieselben Bildschirme und die Anleitung gibt es in beiden Sprachen.

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
