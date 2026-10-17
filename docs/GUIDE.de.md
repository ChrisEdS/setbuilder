# SETBUILDER-Anleitung

**Deutsch** · [English](GUIDE.md) · [README](../README.de.md)

So bereitest du ein Set mit rekordbox vor: laden → bauen → exportieren. Die Screenshots zeigen ein Beispielset mit erfundenen Titeln.

> **Vor dem Gig:** Stick immer am echten Player testen (Playlist sichtbar, Tracks spielbar). Backup behalten — SETBUILDER schreibt in `export.pdb` und legt Kopien unter `SETBUILDER-Backup/` ab, für deine Medien bist du selbst verantwortlich. Keine Garantie. Works on my machine. :)

## So läuft ein Set mit rekordbox

1. **Brief:** Titel, Vibe, Venue, Slot-Art und Dauer.
2. **Aus rekordbox laden:** Stick (`export.pdb`) oder Collection-XML.
3. **Set bauen:** Phasen und Rollen prüfen, von Hand ändern oder automatisch verteilen.
4. **Zurück nach rekordbox:** Export als XML, Performance und Alternativen als zwei Playlists.

## 1. Aus rekordbox laden

![Set laden: Rekordbox-Stick und Collection](screenshots/de/01-rekordbox-laden-v302.png)

**Rekordbox-Stick.** Am besten **Stick wählen** (Chrome / Edge / Desktop) für die Volume-Wurzel, oder `PIONEER` / `PIONEER/rekordbox`. Wenn der Ordner-Dialog fehlschlägt oder hängt: **export.pdb** (`PIONEER/rekordbox/export.pdb` oder `.PIONEER/…`) — der zuverlässigste Weg. Nicht den ganzen USB mit allen Musikdateien wählen, das kann ewig dauern. SETBUILDER findet die Datenbank selbst, auch im versteckten Ordner `PIONEER` oder `.PIONEER`. Gelesen werden Playlists und die gespielte History. Reihenfolge, Key und BPM bleiben erhalten; der Energy Level wird aus dem rekordbox-Kommentar gelesen, wenn Mixed In Key ihn dort geschrieben hat. Dateien vom Stick lassen sich direkt vorhören. Während Dialog, Dateiliste und Datenbank-Lesen steht ein Status.

**Player-Check.** Nach dem Wählen zeigt ein kurzer Strip ein Urteil und eine Primäraktion (Für Player vorbereiten, Auswerfen oder rekordbox öffnen). Details liegen hinter einem Toggle: grüne / gelbe / rote Punkte markieren echten Status (Ordner, Datenbank, Player-Bibliothek); Zeilen ohne Punkt sind nur Info (z. B. noch keine SETBUILDER-Playlists). Grün heißt: Device-Library-Player können den Stick nutzen; Amber heißt: es fehlt noch ein Schritt — oft *Für Player vorbereiten*, damit die alte OneLibrary deine Playlists nicht verdeckt, danach *Auswerfen*.

**Collection ohne Stick.** In rekordbox unter *File → Export Collection in XML…* exportieren und laden. Key und BPM werden per Artist und Titel auf die Tracks im Set gelegt. Unverschlüsselte `master.db` und CSV gehen ebenfalls. Nach dem Import sucht die **Bibliothek** nach Artist, Titel, Key oder Stick-**Playlist** (Picker + Autocomplete). **Passt zu** rankt Tracks hinter einem gewählten Set-Track; **5 andere** blättert weitere Treffer.

**Energie.** Der Energy Level (1–10) kommt aus Mixed In Key. SETBUILDER liest ihn aus dem rekordbox-Kommentar (zum Beispiel `7A - Energy 6`, `Energie 6`), aus Grouping / Label / Remixer in der Collection-XML oder CSV (`Energy` / `Energie`), aus einer nackten `6` oder `E8` in diesen Feldern, oder von Hand in der Setliste. Der USB-`export.pdb` hat Kommentare, aber kein Grouping — in rekordbox Tags neu laden und die Collection-XML laden, wenn die Energie leer bleibt.

**Set-Notiz.** In den Track-Details ist die **Set-Notiz** nur für dieses Set in SETBUILDER (Cue, Floor). Sie ist nicht der MP3-/rekordbox-Kommentar und wird nicht zurück in ID3-Tags geschrieben.

**Energie aus Stick-Dateien.** Unter **Set bearbeiten** analysiert **Energie aus Dateien** Tracks mit Stick-Pfad (Chrome / Edge / Desktop). SETBUILDER setzt `energyLevel` im Draft und schreibt bei MP3 ID3 `TXXX EnergyLevel` plus `Energy N` in den Dateikommentar — die Audiodaten bleiben unverändert; Key, BPM und die Set-Notiz bleiben unangetastet. Beim erneuten Laden mit verbundenem Stick liest SETBUILDER fehlende Energie wieder aus den MP3-Tags — `TXXX EnergyLevel` / `Energy`, Kommentare mit `Energy N`, sowie Grouping / Remixer / Label (`export.pdb` kennt sie erst, wenn rekordbox die Tags neu geladen hat). Danach in rekordbox die Tags neu laden, damit Player und Bibliothek die Werte sehen. Die `master.db` auf dem Rechner bleibt unangetastet. Die Analyse nutzt [essentia.js](https://github.com/MTG/essentia.js) (AGPL-3.0) nur im Browser; siehe [THIRD_PARTY.md](../THIRD_PARTY.md).

## 2. Setliste

![Setliste mit Key, BPM, Energie und Übergang](screenshots/de/02-setliste-v302.png)

Jeder Track zeigt die Quelle (rekordbox), Phase und Rolle. Die Steuerung sitzt unter dem Titel: Phase und Rolle in einer Zeile, Play / Verschieben / Ersatz / **Opener** / **Closer** / Entfernen darunter. Hover zeigt kurze Tipps. Darunter stehen Key, BPM und Energie, der Übergang zum Vorgänger („Nachbar-Key (±1) · +1 BPM · Energie +1“) und die Begründung („Warum hier“). Die Reihenfolge änderst du per Ziehen oder mit den Pfeilen, „Ersatz“ tauscht einen Titel aus.

**Opener & Closer.** Einen Performance-Track als **Opener** pinnen (bleibt vorne, Phase Open) oder als **Closer** (bleibt hinten, Phase Release). Beim Extrahieren schlägt SETBUILDER warme Open-/Release-Pins vor; du kannst sie jederzeit ändern oder lösen. Sortieren setzt die Pins wieder an die Enden.

**Set bearbeiten**
- **Sortieren:** die meisten Techniken nur innerhalb einer Phase (Alternativen bleiben am Ende; gepinnter Opener/Closer bleiben insgesamt vorne/hinten). **Perfekt · Max Score** ist anders: es ordnet die ganze Performance über Phasengrenzen neu und legt Open→Release danach nach Timeline neu. Dasselbe Menü in der Setliste und im Key-Verlauf. Ändert sich nichts, sagt SETBUILDER das — oft fehlen Key/Energie/BPM, oder eine Phase hat nur ein bis zwei Tracks.

  | Technik | Was sie macht |
  |---|---|
  | **Perfekt · Max Score** | Ganzes Set als Camelot-TSP (exakt Held-Karp ≤18 Tracks, sonst NN+2-opt/Or-opt). Zuerst Clashes minimieren, dann Mix-Score maximieren. Opener/Closer bleiben; Phasen werden danach neu gelegt. 100 % nur wenn alle Keys auf dem Wheel verbunden sind — getrennte Cluster lassen weiterhin einen Bridge-Clash |
  | **Harmonisch** | Verwandte Camelot-Keys, weiche Energie, kleine BPM-Schritte |
  | **Ein-Schritt** | Mixed In Key: Energie ±1 pro Übergang |
  | **Energie-Welle** | Steigt Open→Peak, fällt im Release |
  | **Doppel-Peak** | Aufbauen, kurz −2, wieder hoch (Rise/Peak) |
  | **Tempo aufbauen** | BPM-Rampe mit der Phase |
  | **BPM-Kette** | Im ±2–4-Pocket bleiben |
  | **Camelot-Reise** | Im Uhrzeigersinn ums Wheel |
  | **Wellen** | Im Peak wechseln Groove und Impact |

- **Energie aus Dateien:** berechnet den Energy Level aus Stick-Audio (Essentia), setzt ihn im Draft und schreibt Energy-Tags in die MP3 auf dem Stick (Chrome / Edge / Desktop). Die Set-Notiz bleibt unangetastet. Danach Tags in rekordbox neu laden.
- **Auf Slot kürzen:** behält pro Phase die Tracks, deren Energie ins Band passt; der Rest wandert unter Alternativen
- **Rollen verteilen:** Anchor auf den stärksten Peak-Tracks und den Schluss, Bridge bei Phasenwechsel, Key-Clash, BPM- oder Energie-Sprung, sonst Groove
- **Spotify-Links suchen:** sucht zu Tracks ohne Link einen Spotify-Treffer, damit du sie im Set vorhören kannst (braucht die Spotify-Zugangsdaten, siehe [Setup im README](../README.de.md#setup)). Der rekordbox-Export bleibt davon unberührt.

## 3. Rollen und Plan B

![Rollen: Anchor, Bridge, Groove und Alternativen](screenshots/de/03-rollen-v302.png)

Jeder Track hat eine Phase (Open → Lift → Rise → Peak → Release) und eine Rolle:

| Rolle | Aufgabe |
|---|---|
| **Anchor** | Crowd-Connector, Signature-Track |
| **Bridge** | Pivot zwischen Phasen: Key, BPM, Energie |
| **Groove** | Atem zwischen den Peaks |
| **Alternativen** | Plan B, wenn der Floor dreht |

Titel lassen sich zwischen den Spalten ziehen. **Plan B** verlangt pro Phase mindestens zwei passende Alternativen. Eine Alternative zählt für die Phase, die du bei „Ersatz für“ wählst, solange ihre Energie ins Band der Phase passt. Sonst steht der Grund auf der Karte. „Lücken füllen“ nimmt Vorschläge aus deiner rekordbox-Bibliothek, die nach Energie, Key und BPM zu den Tracks der Phase passen.

## 4. Bogen

![Bogen: Key-Verlauf mit Mix-Score, Badges und Drag](screenshots/de/04-key-verlauf-v302.png)

Der Bogen zeigt, wie die Phasen den Slot füllen (aktive Phase hervorgehoben; gelb heißt über dem Fenster) und wie die Energie jedes Tracks zum Zielband der Phase steht. Sprünge ab drei Stufen werden markiert.

**Key-Verlauf** zeigt Camelot entlang der gespielten Reihenfolge. Jede Karte hat ein kurzes Relationen-Badge (Gleich, ±1, Clash, …), den Key, Energie wenn bekannt und BPM. Karten ziehen zum Umsortieren; **Sortieren** für die Techniken oben. Drei Kacheln mit **?** erklären die Zahlen:
- **Keys gesetzt** — Anteil der Performance-Tracks mit Camelot-Key
- **Mix-Score** — Mittel aller Übergänge (Key und Energie zu gleichen Teilen, kleine BPM-Korrektur). Über ~75 % ist weich, unter ~50 % knallt es oft
- **Clashes** — Übergänge, deren Keys auf dem Camelot-Wheel weit auseinanderliegen

Sortieren (besonders **Perfekt · Max Score**), Ziehen oder Key/Energie in der Setliste ändern die Zahlen. Ein Key-Clash lässt sich nicht allein durch gleiche Energie und BPM ausgleichen — wenn zwei Camelot-Cluster sich nie berühren (z. B. 1A/12A vs. 8A/9A), lässt Perfekt trotzdem die wenigsten Bridge-Clashes übrig.

| Phase | Energie-Ziel |
|---|---|
| Open | 3–5 |
| Lift | 5–6 |
| Rise | 6–8 |
| Peak | 8–10 |
| Release | 4–6 |

## 5. Mitnehmen

![Mitnehmen: Auf Stick schreiben, PDF, XML, M3U, Text kopieren](screenshots/de/05-export-v302.png)

Das Menü **Mitnehmen** ist nach Ziel gruppiert:

### Für den Player

- **Auf Stick schreiben** (Hauptweg): Playlist `SETBUILDER - <Titel>` plus Alternativen als `SETBUILDER - <Titel> Alternativen` in die `export.pdb`. Chrome, Edge oder Desktop-App. Der Stick wird gemerkt — nach Neustart reicht *Stick verbinden*. Nur Titel, die schon auf dem Stick liegen, werden geschrieben; ähnliche Treffer (Remix / Original Mix, oder derselbe Titel mehrfach) erscheinen als **eine** klare *Diesen nehmen*-Wahl. Liegt die Playlist schon da, ersetzt *Aktualisieren* sie (mit Sicherung). Vor jedem Schreiben Kopie nach `SETBUILDER-Backup/` (die drei neuesten bleiben), danach Prüfung; bei Fehler kommt der alte Stand zurück. Zusätzlich XML und M3U im Ordner `SETBUILDER` auf dem Stick. Der Health-Strip bietet *Für Player vorbereiten*, wenn eine veraltete OneLibrary (`exportLibrary.db`) Playlists auf CDJ-3000 / XDJ-XZ verdecken würde, und *Auswerfen* vor dem Abziehen. CDJ-3000X, XDJ-AZ und OPUS-QUAD brauchen weiter rekordbox für OneLibrary. Die Bibliothek auf dem Rechner (`master.db`) bleibt unangetastet. Erst an einem Ersatz-Stick üben; **nie mit ungetestetem Stick zum Gig**.

### Für die Kabine

- **PDF:** Druckansicht mit Brief, Reihenfolge, Key und BPM (im Dialog „Als PDF speichern“)
- **Text kopieren:** Set mit Brief und Kommentaren in die Zwischenablage

### Für den Rechner

- **XML für rekordbox:** Datei `SETBUILDER-rekordbox.xml` zum *Import* in rekordbox — schreibt nicht den Stick. In rekordbox einmal *Einstellungen → Erweitert → Datenbank → rekordbox xml* auf diese Datei setzen; dann links unter *rekordbox xml* → Rechtsklick → *Playlist importieren*. Performance und Alternativen als zwei Playlists.
- **M3U:** Playlist-Datei für Geräte, die M3U lesen

Der Brief und das Set lassen sich unter **Verbindungen & Setups** als Setup speichern, wieder laden oder als JSON sichern. Der Speichern-Name folgt dem Set-Titel aus dem Brief.

## Weitere Quellen

rekordbox ist der Hauptweg. Fehlen Keys, ergänzen Tidal (Key und BPM aus dem Catalog per ISRC), CSV oder Paste sie. Titel, die noch nicht in rekordbox liegen, kommen per Link von Spotify, Tidal, Beatport oder SoundCloud ins Set. Bei Beatport und SoundCloud ist kein Login nötig, der Titel kommt aus der Adresse, Key und BPM trägst du von Hand ein oder holst sie über rekordbox.

## Weiterführend

- [README](../README.de.md) — Setup, Desktop-Download, Sprachen, Tests, Lizenz
- [Desktop-Paketierung](../desktop/README.md) — Build, Signierung, Quarantäne
