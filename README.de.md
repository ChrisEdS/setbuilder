# SETBUILDER

**Deutsch** · [English](README.md)

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/ChrisEdS)

**Version 4.0.0** · Dramaturgie statt Playlist.

> Ein gutes Set muss nicht perfekt sein.  
> Musik lässt sich analysieren, sortieren und planen – aber am Ende entscheiden dein Gehör, dein Gefühl und der Moment auf dem Dancefloor. Kein Score und kein Algorithmus kann ersetzen, was du als DJ wahrnimmst.
>
> SETBUILDER soll dir deshalb keine Entscheidungen abnehmen. Es ist ein Werkzeug, das dir Orientierung gibt, Übergänge sichtbar macht und neue Ideen liefert. Nutze es als Hilfestellung und Inspiration – aber vertraue am Ende immer deinen Ohren.

SETBUILDER ist der ruhige Raum vor dem Gig. Du nimmst einen rekordbox-Stick, legst der Nacht eine Form und gehst mit einem Set, das du spielen kannst: ein klarer Bogen, Keys, die zueinander passen, Energie, die steigt und fällt, und ein Plan B, wenn der Floor dreht.

## Was du bekommst

- 🎚️ **Ein Set mit Form.** Open, Lift, Peak, Release. Du siehst, wo die Nacht dünn ist und wo sie schon voll ist.
- 🔑 **Keys, denen du trauen kannst.** Camelot entlang des Sets, Clashes markiert, bevor du in der Kabine stehst.
- ⚡ **Energie, die zum Track gehört.** Aus den Dateien lesen, Fehlendes messen oder selbst setzen.
- 📌 **Opener und Closer, die bleiben.** Jede Sortierung respektiert die Enden, die du gepinnt hast.
- 🎲 **Eine andere Nacht aus derselben Kiste.** Für denselben Brief eine neue Auswahl würfeln, wenn der erste Cast nicht trägt.
- 🛟 **Plan B.** Rollen und Alternativen für den Moment, in dem der Floor es sich anders überlegt.
- 🎧 **Ein Player, der nicht im Weg ist.** Eine kleine Karte, die du ziehen kannst. Schließen sitzt in der Ecke. Er bleibt erreichbar, während du einen Track ersetzt.
- 🎒 **Etwas zum Mitnehmen.** Der Stick für den Player, PDF oder Text für die Kabine, eine Datei für den Rechner.

## Vier Schritte

1. 📝 **Brief** — Titel, Vibe, Raum, Slot, Länge
2. 🔌 **Laden** — Stick verbinden. Eine Collection kann Keys ergänzen; sie ersetzt das Set nicht.
3. 🎛️ **Bauen** — mit einer Playlist starten, Musik hinzufügen oder beides. Dann Phase, Rolle und Reihenfolge.
4. 🎒 **Mitnehmen** — Stick schreiben, Kabinenzettel drucken oder eine Datei exportieren.

📖 **Anleitung mit Screenshots:** [docs/GUIDE.de.md](docs/GUIDE.de.md)

> Spiel den Stick vor dem Gig am echten Player. SETBUILDER legt ein Backup ab, die Nacht bleibt deine.

## Download

Die App gibt es für Mac, Windows und Linux. Hol sie dir unter [GitHub Releases](https://github.com/ChrisEdS/setbuilder/releases).

Auf dem Mac braucht ein unsignierter Download manchmal einmal das hier:

```bash
xattr -dr com.apple.quarantine /Applications/SETBUILDER.app
```

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
