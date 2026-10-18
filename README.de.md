# SETBUILDER

**Deutsch** · [English](README.md)

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 3.6.1** · Dramaturgie statt Playlist.

> Ein gutes Set muss nicht perfekt sein.  
> Musik lässt sich analysieren, sortieren und planen – aber am Ende entscheiden dein Gehör, dein Gefühl und der Moment auf dem Dancefloor. Kein Score und kein Algorithmus kann ersetzen, was du als DJ wahrnimmst.
>
> SETBUILDER soll dir deshalb keine Entscheidungen abnehmen. Es ist ein Werkzeug, das dir Orientierung gibt, Übergänge sichtbar macht und neue Ideen liefert. Nutze es als Hilfestellung und Inspiration – aber vertraue am Ende immer deinen Ohren.

SETBUILDER bereitet DJ-Sets für rekordbox vor. Du lädst Playlist oder History vom Export-Stick (oder eine Collection-XML), legst den Bogen nach Slot und Dauer, prüfst Energie, Key und BPM und nimmst das Set mit — Stick für den Player, PDF für die Kabine, XML/M3U für den Rechner. Die Logik folgt Mixed In Key: erst Energie, dann Key, dann BPM. Der Ablauf folgt dem [DJ.Studio Prep-Workflow](https://dj.studio/blog/dj-set-preparation#crafting-a-dj-set-that-feels-right-advanced-tips): Brief → Set bauen → Transitions → Export.

**Highlights**
- ⚡ **Energie aus Dateien** — Stick-MP3s analysieren, Energy in ID3 schreiben (Audio unangetastet), Tags in rekordbox neu laden
- 🔑 **Key-Verlauf** — Camelot entlang des Sets mit Mix-Score, Clash-Badges und Mixed-In-Key-Sortierungen
- 🎯 **Perfekt-Sort** — Ganzes Set als Camelot-TSP (Held-Karp): Clashes killen, Mix-Score maximieren; Opener/Closer bleiben
- 🎲 **Andere Songs** — Aus dem Playlist-Pool eine neue Performance für denselben Brief würfeln
- 🎚️ **Bogen & Energie** — Phasen Open→Release gegen Zielbänder; Sprünge sichtbar
- 📌 **Opener & Closer** — Enden pinnen oder aktuelle erste/letzte Tracks; jede Sortierung respektiert sie
- 💾 **Stick-Rundreise** — Aus `export.pdb` laden, Set zurückschreiben, Player-Check vor dem Gig
- 🎒 **Mitnehmen** — Menü nach Player / Kabine / Rechner; Stick schreiben zuerst
- 🛟 **Plan B** — Rollen und Alternativen pro Phase, wenn der Floor dreht

## So läuft ein Set

1. **Brief** — Titel, Vibe, Venue, Slot-Art und Dauer
2. **Aus rekordbox laden** — Stick (`export.pdb`) oder Collection-XML
3. **Set bauen** — Phasen, Rollen, Opener/Closer, Sortieren, bei Bedarf Andere Songs, Kürzen
4. **Mitnehmen** — Stick schreiben, dann PDF / Text, oder XML / M3U

📖 **Ausführliche Anleitung mit Screenshots:** [docs/GUIDE.de.md](docs/GUIDE.de.md)

> Stick vor dem Gig immer am echten Player testen. SETBUILDER legt Kopien unter `SETBUILDER-Backup/` ab; für deine Medien bist du selbst verantwortlich.

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
