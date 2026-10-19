# SETBUILDER

**Deutsch** · [English](README.md)

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 4.0.0** · Dramaturgie statt Playlist.

> Ein gutes Set muss nicht perfekt sein.  
> Musik lässt sich analysieren, sortieren und planen – aber am Ende entscheiden dein Gehör, dein Gefühl und der Moment auf dem Dancefloor. Kein Score und kein Algorithmus kann ersetzen, was du als DJ wahrnimmst.
>
> SETBUILDER soll dir deshalb keine Entscheidungen abnehmen. Es ist ein Werkzeug, das dir Orientierung gibt, Übergänge sichtbar macht und neue Ideen liefert. Nutze es als Hilfestellung und Inspiration – aber vertraue am Ende immer deinen Ohren.

SETBUILDER bereitet DJ-Sets für rekordbox vor. Baue ein Set aus einer Stick-Playlist, durch Musik hinzufügen oder mit beidem. **Set laden & Keys** verbindet den Stick und reichert ein bestehendes Set bzw. die Bibliothek aus Collection-XML, CSV oder einer unverschlüsselten Datenbank an; diese Collection-Dateien starten oder ersetzen allein kein Set. Danach legst du den Bogen, prüfst Energie, Key und BPM und nimmst das Ergebnis mit — Stick für den Player, PDF/Text für die Kabine, XML/M3U für den Rechner.

Die ausgelieferte App ist die Desktop-App auf Port **4317**. Die Browser-Entwicklung nutzt Port **4327**. Cover kommen aus `PIONEER/Artwork` auf dem Stick, danach aus dem ID3-APIC-Frame der MP3, wenn die Artwork-Datei fehlt; der Stick-Ordner muss in der Sitzung liegen. Die Setlisten-Zeile sind Icon-Buttons — Play, hoch, runter, Energie (Blitz), Ersatz, Opener (Fahne), Closer (karierte Flagge), Entfernen — jeweils mit demselben Hover-Tipp. Ersatz öffnet eine Schublade, die folgenden Tracks bleiben stehen; der Titel bleibt in der Kopfzeile, der Fokus geht hinein und kehrt bei Schließen oder Escape zurück. Play in dieser Liste ist derselbe runde Button wie in der Zeile. **Energie aus Dateien** zeigt die vier Aktionen nur, wenn Stick-Dateien da sind. Sonst steht eine Voraussetzung im Menü, und **Stick wählen**, wenn kein Stick verbunden ist. Der Vorhör-Player ist eine kompakte schwebende Karte, etwa 512px breit: am Titelstreifen ziehen, Schließen sitzt oben rechts, und die Karte bleibt über der Ersatz-Schublade, damit Play, Seek und Schließen erreichbar bleiben. Chrome und die installierte Desktop-App haben einen echten Stick nur lesend gezeigt. Stick-Schreiben, CDJ/XDJ-Wiedergabe, Spotify-/Tidal-Konten, Auswerfen und Energie-Kalibrierung auf echten Medien sind nicht geprüft.

**Highlights**
- ⚡ **Energie aus Dateien** — Tags lesen, fehlende/alle Werte messen oder Energie in MP3 schreiben; Schreiben mit Prüfung und Rollback, Audio unverändert
- 🔑 **Key-Verlauf** — Camelot entlang des Sets mit Mix-Score, Clash-Badges und Mixed-In-Key-Sortierungen
- 🎯 **Perfekt-Sort** — Ganzes Set als Camelot-TSP (Held-Karp): Clashes killen, Mix-Score maximieren; Opener/Closer bleiben
- 🎲 **Andere Songs** — Aus dem Playlist-Pool eine neue Performance für denselben Brief würfeln
- 🎚️ **Bogen & Energie** — Phasen Open→Release gegen Zielbänder; Sprünge sichtbar
- 📌 **Opener & Closer** — Enden pinnen oder aktuelle erste/letzte Tracks; jede Sortierung respektiert sie
- 💾 **Stick-Rundreise** — Gezieltes, transaktionales Aktualisieren einer vorhandenen SETBUILDER-Playlist in der aktuellen `export.pdb`; fremde Änderungen bleiben erhalten, mit Backup, Rücklesen und Rollback
- 🎒 **Mitnehmen** — Menü nach Player / Kabine / Rechner; Stick schreiben zuerst
- 🛟 **Plan B** — Rollen und Alternativen pro Phase, wenn der Floor dreht

## So läuft ein Set

1. **Brief** — Titel, Vibe, Venue, Slot-Art und Dauer
2. **Set laden & Keys** — Stick verbinden und das aktuelle Set/die Bibliothek optional aus XML, CSV oder DB anreichern
3. **Set bauen** — mit einer Stick-Playlist starten, Musik hinzufügen oder beides kombinieren; dann Phasen, Rollen und Reihenfolge setzen
4. **Mitnehmen** — Stick schreiben, dann PDF / Text, oder XML / M3U

📖 **Ausführliche Anleitung mit Screenshots:** [docs/GUIDE.de.md](docs/GUIDE.de.md)

🧪 **4.0-Notizen:** [docs/RELEASE-4.0-RC.md](docs/RELEASE-4.0-RC.md). Stick-Schreiben, Player und Streaming-Konten sind weiter ungeprüft.

Die Zeit ist eine Schätzung: Jeder Performance-Track zählt mit seiner Dauer minus fixer zwei Minuten Überblendung, mindestens jedoch 30 Sekunden. Cue-Punkte, Übergangsstil und Live-Entscheidungen werden nicht modelliert.

> Stick vor dem Gig immer am echten Player testen. SETBUILDER legt Kopien unter `SETBUILDER-Backup/` ab; Browser-Rechte, Abbruch/voller Datenträger, rekordbox-Tag-Reload/Import, Player-Familien und echte Medien bleiben externe Prüfgrenzen.

## Setup

1. Optional (nur Spotify / Tidal): Spotify Developer App mit **Web API**. rekordbox allein braucht keine Zugangsdaten.
2. Redirect URI **exakt**: `http://127.0.0.1:4317/api/auth/callback`  
   Tidal: `http://127.0.0.1:4317/api/auth/tidal/callback`
3. Dich selbst als User hinzufügen (Development Mode)
4. Keys unter **Einstellungen** in der App eintragen, oder in `.env.local` (Vorlage: [`.env.example`](.env.example))
5. Starten:

```bash
npm install
npm run dev
```

Dev: [http://127.0.0.1:4327](http://127.0.0.1:4327). Desktop-App: Port **4317**.

## Desktop

Paketierte App für Mac, Windows und Linux: [`desktop/README.md`](desktop/README.md). Releases: [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases).

Unsignierte Mac-Downloads brauchen einmal Quarantäne entfernen:

```bash
xattr -dr com.apple.quarantine /Applications/SETBUILDER.app
```

## Sprachen & Tests

Oberfläche und Exporte folgen **DE / EN** (gespeichert als `setbuilder-lang`). Texte in [`src/lib/i18n/messages`](src/lib/i18n/messages).

```bash
npm test
```

## Spenden

SETBUILDER bleibt kostenlos und offen. Unterstützung über **[GitHub Sponsors @ChrisEdS](https://github.com/sponsors/ChrisEdS)**.

## Lizenz

MIT, siehe [LICENSE](LICENSE). Die clientseitige Energie-Analyse nutzt essentia.js (AGPL-3.0); siehe [THIRD_PARTY.md](THIRD_PARTY.md).
