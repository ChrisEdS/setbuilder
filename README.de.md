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
