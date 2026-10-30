# SETBUILDER

**Deutsch** · [English](README.md)

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 4.7.11** · Raus aus der Playlist.

Der Stick ist das Material. Du ziehst den Bogen, setzt den Anschluss und hörst, ob er trägt.

Vor dem Gig ist es still. SETBUILDER ist dieser Raum. Du kommst mit einem rekordbox-Stick und gehst mit einer Nacht, die du spielen willst: ein Bogen, Keys, die sich finden, Energie, die steigt und fällt, und ein Plan B, wenn der Floor dreht.

## Was du mitnimmst

- 🎚️ **Eine Nacht mit Form.** Open, Lift, Peak, Release. Du siehst, wo noch Luft ist und wo es schon voll ist.
- ⏱️ **Die Nacht auf den Slot.** Zu lang, sie wird kürzer. Zu kurz legt **Mit besten Matches füllen** Tracks nach, die zu Key, BPM und Energie passen — zuerst Alternativen, dann die geladene Playlist. Die Slot-Dauer im Brief stößt denselben Lauf an wie **Auf Slot setzen**. Sortieren holt die übrigen Alternativen zurück in die Nacht. Ein Song, den du rausmarkiert hast, bleibt draußen. Das Rückgängig-Banner nennt Track und Rückplatz.
- 🔑 **Keys, die miteinander reden.** Camelot entlang des Sets. Ein Clash fällt auf, solange du noch Zeit hast. **Perfekt · nur Pins** sortiert nur die Mittel-Pins untereinander; der Rest bleibt in den Lücken.
- ⚡ **Energie, die zum Song gehört.** Aus der Datei gelesen, gemessen oder von dir gesetzt. Sie steht am Track, sobald sie fest ist, und auf dem Zettel und im kopierten Text, wenn du sie kennst.
- 📌 **Pins, die im Set bleiben.** Opener und Closer halten die Enden. Mittel-Pins überstehen Auf Slot setzen und Andere Songs und wandern beim Sortieren mit — außer bei Perfekt · nur Pins.
- 🚫 **Ein Song kann die Nacht aussetzen.** Markier ihn raus aus dem Set. Er bleibt bei den Alternativen. Auf Slot setzen und Andere Songs lassen ihn dort. Pin und Raus lösen einander.
- 🔁 **Tauschen aus derselben Playlist.** Songs aus dem Playlist-Pool, die an dieser Stelle zu Key, BPM und Energie passen — getrennt vom allgemeinen Ersatz.
- 🎛️ **Jeder Anschluss mit eigener Länge.** Cut, Blend, Echo-out. Die Uhr des Slots folgt dem, was du an den Übergang schreibst. „—“ nimmt die Blend-Zeit aus dem Brief.
- 🎲 **Eine andere Nacht aus derselben Kiste.** Andere Songs. Oder die Playlist, die Collection, die History, sobald sie da ist. Nach dem Laden einer Stick-Playlist bleibt **Aus der Playlist** am Set verfügbar.
- 🛟 **Plan B in der Tasche.** Rollen und Alternativen für den Moment, in dem der Floor es sich anders überlegt. Setz eine davor oder dahinter, oder pinne sie in die Nacht.
- 🎧 **Den Übergang vorher hören.** Eine Karte zum Ziehen und größer machen. Vorher, dieser Track, der nächste. Dieselbe Länge wie in der Setliste.
- 📋 **Kompakt oder Comfortabel.** In der Setliste wählst du die Zeilendichte. Kompakt hält Play, Pin, Tauschen und Entfernen in einer Zeile. **Details** öffnet nur Notiz, Key, BPM, Energie und Blend; **Zuklappen** oder erneut **Kompakt** macht die Zeile wieder klein.
- 🔍 **Nur noch, was passt.** Key, BPM und Energie holen die Bibliothek heran. Passt zu reiht, was hinter einem gewählten Track tragen kann, und der Song, den du hinzufügst, landet direkt dahinter.
- 📝 **Ein Satz für die Phase.** Auf dem Bogen, wenn du ihn brauchst. Treibend, 128. Er geht mit auf den Zettel für die Kabine.
- 🎒 **Fertig, wenn es sitzt.** Erst die Checkliste. Wenn die Dateien nicht in dieser Sitzung sind, wähl den Stick-Ordner direkt dort noch einmal. Dann der Stick für den Player, der Zettel für die Kabine, die Datei für den Rechner. Oder das Set bleibt in SETBUILDER.

## Vier Schritte

1. 📝 **Brief** — Titel, die Minuten des Slots, wie dicht die Übergänge sein sollen. Die Beispiele unter Set-Info sind Platzhalter. Den Slot länger oder kürzer machen — sobald die Minuten stehen, läuft derselbe Fit wie **Auf Slot setzen**.
2. 🔌 **Laden** — Stick verbinden (ein erinnerter Stick bringt Bibliothek und Playlists zurück, solange der Zugriff gilt). Eine Collection darf die Keys nachreichen.
3. 🎛️ **Bauen** — Playlist, eigene Songs oder beides. Eng die Kiste ein, nutz Passt zu, wenn der nächste Song direkt hinter einem gewählten landen soll, und setz Phase, Rolle und jeden Anschluss. Tauschen greift in denselben Playlist-Pool.
4. 🎒 **Exportieren** — Stick für den Player, Zettel für die Kabine, Datei für zu Hause. Bekannte Energie steht auf dem Zettel und im kopierten Text.

📖 **Anleitung mit Screenshots:** [docs/GUIDE.de.md](docs/GUIDE.de.md)

> Spiel den Stick vor dem Gig am echten Player. SETBUILDER legt ein Backup ab, die Nacht bleibt deine.

## Download

Die App gibt es für Mac, Windows und Linux. Hol sie dir unter [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases).

Auf dem Mac braucht ein unsignierter Download manchmal einmal das hier:

```bash
xattr -dr com.apple.quarantine /Applications/SETBUILDER.app
```

<a id="setup"></a>

## Für Entwickler

rekordbox allein braucht kein Konto. Spotify und Tidal sind optional und nutzen eine Weiterleitung auf `http://127.0.0.1:4317/api/auth/callback` (Tidal: `…/api/auth/tidal/callback`). Keys trägst du unter **Einstellungen** ein oder in `.env.local` ([`.env.example`](.env.example)).

```bash
npm install
npm run dev
```

Die Desktop-App nutzt Port **4317**. Der Dev-Server nutzt [Port 4327](http://127.0.0.1:4327). Hinweise zum Paketieren stehen in [`desktop/README.md`](desktop/README.md). Die Oberfläche ist Deutsch und Englisch. Tests: `npm test`.

## Spenden

SETBUILDER bleibt kostenlos und offen. Unterstützung über **[GitHub Sponsors @ChrisEdS](https://github.com/sponsors/ChrisEdS)**.

## Lizenz

MIT, siehe [LICENSE](LICENSE). Die Energiemessung nutzt essentia.js (AGPL-3.0); siehe [THIRD_PARTY.md](THIRD_PARTY.md).
