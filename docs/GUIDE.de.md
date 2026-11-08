# SETBUILDER-Anleitung

**Deutsch** · [English](GUIDE.md) · [README](../README.de.md)

**5.1.0.** Die Bilder sind die englische Oberfläche in Chrome. Dieselben Schritte, deutsche Beschriftungen. Oben rechts schaltet **DE** / **EN**.

Stick verbinden, Set bauen, im Deck hören, mitnehmen. Die ausgelieferte App ist die Desktop-App (Port **4317**). Im Browser: Port **4327**.

> **Vor dem Gig:** Stick am echten Player testen (Playlist sichtbar, Tracks spielbar). Backup behalten. SETBUILDER kann `export.pdb` schreiben und legt Kopien unter `SETBUILDER-Backup/` ab. Für deine Medien bist du selbst verantwortlich.

## 1. Stick verbinden

![Rekordbox-Stick und Playlists](screenshots/de/01-stick-library.png)

Stick anschließen. SETBUILDER liest Playlists und History aus `export.pdb`, auch im versteckten Ordner `PIONEER` oder `.PIONEER`. Unter **Set bauen** steht **Mit einer Playlist starten**. Jede Playlist ist eine Zeile. Ein langer Name kürzt sich am Ende, die grüne Zahl bleibt neben dem Namen, und **Als Set laden** sitzt in der Zeile. **Als Set laden** übernimmt eine Playlist ins Set. Reihenfolge, Key und BPM bleiben. Dateien vom Stick lassen sich im Player hören.

Hängt der Ordner-Dialog: **export.pdb** wählen (`PIONEER/rekordbox/export.pdb`). Nicht den ganzen USB mit allen Musikdateien, das kann ewig dauern. **Anderer Stick**, wenn ein anderes Volume dran ist.

Der Streifen am Stick ist der Player-Check. Gelb heißt: die alte Player-Bibliothek verdeckt die Playlists noch. **Für Player vorbereiten** ist der Knopf dafür, danach auswerfen. Diese Anleitung drückt ihn nicht. Grün heißt: Device-Library-Player können den Stick nutzen. CDJ-3000X, XDJ-AZ und OPUS-QUAD brauchen weiter rekordbox für OneLibrary. Am Gerät prüfen.

## 2. Set bauen

![Brief: Titel, Slot, Blend-Zeit](screenshots/de/02-brief.png)

![Setliste nach der Playlist](screenshots/de/02-setlist.png)

Oben der Brief. **Titel**, **Slot-Dauer (Min)** und **Blend-Zeit (Durchschnitt)**. Die Minuten sind die Uhr für **Auf Slot setzen**: länger, und das Set füllt sich; kürzer, und es wird geschnitten. **Set-Info** (Vibe, Venue, Slot, Audience, Gear, Notes) sind Notizen zum Gig. Die Uhr bleibt in den Minuten.

**Mit einer Playlist starten** listet die Playlists vom Stick. Über ein nicht leeres Set fragt SETBUILDER:

- **Ersetzen** überschreibt die Setliste und bietet einmal **Rückgängig**.
- **Zusammenführen** behält die Setliste und hängt nur Tracks an, die noch fehlen.
- **Abbrechen** ändert nichts.

Die Setliste zeigt Phase, Rolle und den Anschluss zum Vorgänger. **Setliste**, **Rollen** und **Bogen** wechseln die Ansicht. **Comfortabel** zeigt die Icon-Zeile, **Kompakt** hält sie schmal. Die Reihenfolge änderst du am Griff oder mit den Pfeilen. **Behalten** lässt den Track im Set, Sortieren darf ihn verschieben. **Genau hier** hält den Slot. Play öffnet den Player, und die spielende Zeile bleibt daneben sichtbar. **Auf Slot setzen** kürzt, wenn das Set über dem Slot liegt. **Mit Matches füllen** legt passende Tracks nach, wenn es zu kurz ist.

Die Bibliothek schließt auf den Titel und die Trackzahl und öffnet sich wieder. Ihre Trackzeilen bleiben eine Zeile, mit einem kleineren Abspielen und einem kleineren **+ Ins Set**. Unter **Beim Hinzufügen** bleiben **Phase** und **Rolle**. **Hinzufügen danach** ist **Automatisch**, ein gewählter Song im Set oder **Ende des Sets**. **Automatisch** legt den neuen Track hinter die beste Übereinstimmung in derselben Phase (Key, BPM, Energie). Passt in der Phase nichts, geht der Track ans Ende.

## 3. Im Deck hören

![Player mit Wellenform, Zoom 2×, Q und Cues A–H](screenshots/de/03-deck.png)

Der Player ist die Karte über der Setliste. An der rechten Kante breiter ziehen, an der unteren höher. Die Wellenform geht über die Breite der Karte. Oben die Übersicht, darunter die große Welle. **+** zoomt (im Bild **2×**), die Übersicht markiert das Fenster, der Playhead bleibt. Die Setliste hält die spielende Zeile neben dem Player im Blick, auch wenn der Player sich danach verschiebt oder wächst. Das Beatgrid der Playlist wird im Hintergrund gelesen, bevor der Player aufgeht, und die erste Lesung zeigt, wie weit sie ist.

**Q** quantisiert. Ein Hot Cue **A–H** landet dann auf dem nächsten Downbeat des Rekordbox-Beatgrids. Aus macht **Q** die Zeit, die du gesetzt hast. **−5** und **+5** schieben das Grid um 5 ms. **1** legt den nächsten Downbeat auf den Playhead. Phrasenbänder kommen aus der rekordbox-Analyse und wandern mit, wenn du das Grid schiebst. Cues und die Verschiebung bleiben im Player. Der CDJ sieht sie erst, wenn sie in der Analyse-Datei auf dem Stick stehen.

Im Bild: Nefertiti (Futuro Pelo), Wellenform, Zoom 2×, **Q**, **−5**, **+5**, **1**, Pads A–H. Darunter steht „Kein Rekordbox-Beatgrid für diesen Track.“ Bei den Tracks, die hier aus dem Set geöffnet wurden, hat der Player kein Grid gezeichnet — also auch keine Phrasenbänder und keinen gesetzten Cue. Die Knöpfe sind dieselben, sobald die Analyse-Datei zum Track passt.

## 4. Mitnehmen

![Export: Set speichern, Auf Stick schreiben, PDF, Text kopieren](screenshots/de/04-export.png)

**Exportieren** ist nach Ziel gruppiert.

- **Im Setbuilder** — **Set speichern**. Schreibt den Stick nicht.
- **Für den Player** — **Auf Stick schreiben**. Playlist `SETBUILDER - <Titel>` plus Alternativen in die aktuelle `export.pdb`, mit Backup, Rücklesen und Rollback. Nur Tracks, die schon auf dem Stick liegen. Diese Anleitung hat den Knopf nicht gedrückt.
- **Für die Kabine** — **PDF** (im Druckdialog „Als PDF speichern“) und **Text kopieren**. Brief, Reihenfolge, Key, BPM, Energie wenn bekannt, Set-Notiz.
- **Für den Rechner** — im selben Menü darunter: **XML für rekordbox** (Import, nicht der Stick) und **M3U**.

Unter **Verbindungen & Setups** lassen sich Brief und Set als Setup speichern. Der Name folgt dem Titel aus dem Brief.

## Vor dem Gig

Stick-Lesen, Import und Schreiben laufen nacheinander. Der Rest der Oberfläche bleibt bedienbar. Schreibweg, CDJ/XDJ-Wiedergabe und Auswerfen an der Hardware prüfen, die du spielst. Browser-Ordnerrechte und ein voller Stick kann SETBUILDER nicht für dich beweisen.

## Weiterführend

- [README](../README.de.md) — Setup, Desktop-Download, Sprachen, Tests, Lizenz
- [Desktop-Paketierung](../desktop/README.md) — Build, Signierung, Quarantäne
