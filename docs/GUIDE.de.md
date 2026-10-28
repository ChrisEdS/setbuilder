# SETBUILDER-Anleitung

**Deutsch** · [English](GUIDE.md) · [README](../README.de.md)

So bereitest du ein Set mit rekordbox vor: Bibliothek verbinden und verstehen → bauen → exportieren. Die Screenshots zeigen ein in der App geöffnetes Set. Die Bilder sind von 4.0. Der Text beschreibt 4.4.1, einschließlich Bibliotheksfilter, die Phasenzeile, Pins und Ausschluss, Auf Slot setzen, und Energie in der Details-Zeile und auf dem Kabinenzettel.

Die ausgelieferte App ist die Desktop-App (Port **4317**). Die Browser-Entwicklung nutzt Port **4327**. Dieses Dokument beschreibt **4.4.1**. Stick-Schreiben, Player und Streaming-Konten sind weiter ungeprüft.

> **Vor dem Gig:** Stick immer am echten Player testen (Playlist sichtbar, Tracks spielbar). Backup behalten — SETBUILDER schreibt in `export.pdb` und legt Kopien unter `SETBUILDER-Backup/` ab, für deine Medien bist du selbst verantwortlich. Keine Garantie. Works on my machine. :)

## So läuft ein Set mit rekordbox

1. **Brief:** Titel, Slot-Dauer in Minuten und durchschnittliche Blend-Zeit. Diese Minuten sind die Uhr für **Auf Slot setzen**: länger machen, dann setzen, und das Set füllt sich; kürzer machen, dann setzen, und es wird geschnitten. Set-Info (Vibe, Venue, Slot, Audience, Gear, Notes) klappt zu. Die Beispiele in diesen Feldern sind Platzhalter, und die Felder starten leer. Das sind Notizen zum Gig. Die Uhr bleibt in den Minuten darüber.
2. **Stick laden & vorbereiten:** Stick verbinden und das aktuelle Set/die Bibliothek optional aus Collection-XML, CSV oder unverschlüsselter Datenbank anreichern.
3. **Set bauen:** mit Stick-Playlist starten, Musik hinzufügen oder beides kombinieren; dann Phasen, Rollen, Reihenfolge und jeden Anschluss prüfen.
4. **Exportieren:** das Set im Setbuilder speichern, die Stick-Playlist aktualisieren, Kabinen-PDF/Text erstellen oder XML/M3U exportieren.

## 1. Stick laden & vorbereiten

![Stick einrichten und Collection anreichern](screenshots/de/01-stick-setup-v400.png)

**Rekordbox-Stick.** Am besten **Stick wählen** (Chrome / Edge / Desktop) für die Volume-Wurzel, oder `PIONEER` / `PIONEER/rekordbox`. Wenn der Ordner-Dialog fehlschlägt oder hängt: **export.pdb** (`PIONEER/rekordbox/export.pdb` oder `.PIONEER/…`) — der zuverlässigste Weg. Nicht den ganzen USB mit allen Musikdateien wählen, das kann ewig dauern. SETBUILDER findet die Datenbank selbst, auch im versteckten Ordner `PIONEER` oder `.PIONEER`. Gelesen werden Playlists und die gespielte History. Jede Playlist-Id bleibt einmal. Eine übrig gebliebene Kopie derselben Id, mit Parent 0 und Sort 0, fällt weg. Reihenfolge, Key und BPM bleiben erhalten; der Energy Level wird aus dem rekordbox-Kommentar gelesen, wenn Mixed In Key ihn dort geschrieben hat. Dateien vom Stick lassen sich direkt vorhören. Während Dialog, Dateiliste und Datenbank-Lesen steht ein Status.

**Cover.** Das Bild kommt aus `PIONEER/Artwork` auf dem Stick (zuerst die größere `_m`-Datei, dann das kleinere JPEG). Fehlt die Artwork-Datei, liest SETBUILDER das Front-Cover aus dem ID3-APIC-Frame der MP3. Beide Wege brauchen den Stick-Ordner in der aktuellen Sitzung.

**Player-Check.** Nach dem Wählen zeigt ein kurzer Strip ein Urteil und eine Primäraktion (Für Player vorbereiten, Auswerfen oder rekordbox öffnen). Details liegen hinter einem Toggle: grüne / gelbe / rote Punkte markieren echten Status (Ordner, Datenbank, Player-Bibliothek); Zeilen ohne Punkt sind nur Info (z. B. noch keine SETBUILDER-Playlists). Grün heißt: Device-Library-Player können den Stick nutzen; Amber heißt: es fehlt noch ein Schritt — oft *Für Player vorbereiten*, damit die alte OneLibrary deine Playlists nicht verdeckt, danach *Auswerfen*.

**Collection-Anreicherung.** In rekordbox unter *File → Export Collection in XML…* exportieren und laden. Unverschlüsselte `master.db` und CSV gehen ebenfalls. Diese Quellen indexieren die Bibliothek und matchen Metadaten wie Key/BPM auf Tracks, die schon im Set stehen; allein starten, ersetzen oder bilden sie **kein** Set. Die Playlist-Auswahl liegt unter **Set bauen**. Nach dem Import sucht die **Bibliothek** nach Artist, Titel, Key oder Playlist. Unter der Suche: Key-Nachbarschaft (derselbe Key, relativer Dur/Moll oder ±1 auf dem Wheel), BPM von/bis und Energie von/bis auf der Skala 1–10. Das gilt zusammen mit der Suche und mit **Passt zu**, das Tracks hinter einem gewählten Set-Track rankt. Einen daraus hinzufügen setzt ihn direkt hinter den gewählten Song. Bei **Alle Tracks** wird der neue Song angehängt. Es gibt keine Danceability, keine Emotion und keinen Genre-Score. **5 andere** blättert weitere Treffer.

**Energie.** Der Energy Level (1–10) kommt aus Mixed In Key. SETBUILDER liest ihn aus dem rekordbox-Kommentar (zum Beispiel `7A - Energy 6`, `Energie 6`), aus Grouping / Label / Remixer in der Collection-XML oder CSV (`Energy` / `Energie`), aus einer nackten `6` oder `E8` in diesen Feldern, oder von Hand in der Setliste. Der USB-`export.pdb` hat Kommentare, aber kein Grouping — in rekordbox Tags neu laden und die Collection-XML laden, wenn die Energie leer bleibt.

**Set-Notiz.** In den Track-Details ist die **Set-Notiz** nur für die Kabine (Cue, Floor). Sie erscheint in PDF und kopiertem Text, niemals in rekordbox Comments oder ID3-Tags.

**Energie aus Dateien.** Wenn Stick-Dateien da sind, trennt das Menü **Aus Tags lesen** (ohne Audio-Decoding), **Fehlende messen**, **Alle neu berechnen** (messen ohne Schreiben) und **In MP3 schreiben**. Ohne verbundenen Stick zeigt das Menü genau diese Voraussetzung und **Stick wählen** — das öffnet den vorhandenen Stick-Dialog unter Stick laden & vorbereiten. Ist der Stick da, aber kein Track hat einen Dateipfad, steht diese Voraussetzung statt vier leerer Aktionen. MP3-Schreiben ergänzt `TXXX EnergyLevel` plus `Energy N` im Dateikommentar; jede ersetzte Datei wird erneut geöffnet und bytegenau geprüft, bei Fehler wird das Original wiederhergestellt. Key, BPM, Set-Notiz und Audiodaten bleiben unverändert. Danach Tags in rekordbox neu laden; `export.pdb` und die `master.db` auf dem Rechner werden durch diese Aktion nicht geändert. Die Analyse nutzt [essentia.js](https://github.com/MTG/essentia.js) (AGPL-3.0). Die Kalibrierung mit echten Medien ist nicht geprüft.

## 2. Set bauen

![Set aus Playlist und hinzugefügter Musik bauen](screenshots/de/02-build-set-v400.png)

Unter **Set bauen** wählst du **Mit einer Playlist starten** vom verbundenen Stick, nutzt **Musik hinzufügen** oder kombinierst beides. Beim Laden einer Playlist über ein nicht leeres Set fragt SETBUILDER:
- **Ersetzen** überschreibt die aktuelle Setliste und bietet einmal **Rückgängig** zur vorherigen Setliste.
- **Zusammenführen** behält die aktuelle Setliste und hängt nur Tracks an, die noch nicht enthalten sind.
- **Abbrechen** ändert nichts.

Collection-XML/CSV/DB löst diese Auswahl nie aus, weil es nur Metadaten und Bibliothek anreichert.

Jeder Track zeigt die Quelle (rekordbox), Phase und Rolle. Die Zahl und der Ziehgriff bleiben auf der Titelzeile; aufgeklappte Details ziehen sie nicht mit. Phase und Rolle stehen in einer Zeile. Darunter liegen Icon-Buttons: Play, Vorhören, hoch, runter, Energie (Blitz, wenn der Track eine Datei hat), Ersatz, Opener (Fahne), Closer (karierte Flagge), Pin, Ausschließen und Entfernen. Bei einer Alternative ist Ersatz **Ins Set**. Opener und Closer gibt es nur an einem Song in der Performance. Energie nutzt denselben Hover-Tipp wie die anderen Icons. Das Bau-Bild ist von 4.0, Pin, Ausschließen und Ins Set sind darauf nicht zu sehen. Unter dem Titel stehen der Anschluss zum Vorgänger („Nachbar-Key (±1) · +1 BPM · Energie +1“) und die Begründung („Warum hier“). **Details** hält Key, BPM, Energie, den Übergang, seine Länge und die Set-Notiz. Die geschlossene Zeile liest sich wie „7A · 125 BPM · Energie 7 · Long blend“. Energie steht nur da, wenn das Level bekannt ist. Unbekannte Energie und die alte anonyme Energy 1 bleiben leer. **So ist es gedacht**, neben Set bauen, sagt, wofür jedes davon da ist. Die Reihenfolge änderst du am Griff oder mit den Pfeilen.

Ein Übergang markiert, wie du in den nächsten Track gehst: Cut, Short blend, Long blend, EQ swap, Echo-out und die übrigen. Er wird nicht in die Audiodatei geschrieben. „—“ heißt keine Marke, und dieser Anschluss behält die Blend-Zeit aus dem Brief. **Länge** ist die Überlappung: diese Zeit geht von der Spielzeit ab, Slot-Zeile und Überlänge folgen ihr. Der letzte Track verliert seine Überlappung weiter. Du wählst eine Länge oder tippst sie. Eine gesetzte Länge, auch 0, schlägt die Zeit, die der Übergang vorschlägt. Lässt du sie leer, schlägt der Übergang eine Zeit vor. **Zurücksetzen**, neben Exportieren, fragt zuerst und leert dann das Set.

**Ersatz** öffnet eine Schublade über der Setliste, die Tracks darunter rutschen nicht. Die Kopfzeile behält den Tracknamen („Für „Name““). Der Fokus geht in die Schublade; Schließen oder Escape bringt ihn zum Ersatz-Button zurück. Play in dieser Liste ist derselbe runde Play-Button wie in der Setlisten-Zeile. Einsetzen tauscht den Titel.

Der Vorhör-Player ist eine kompakte schwebende Karte. Am Titelstreifen ziehen; an der rechten Kante breiter, an der unteren Kante höher; die Karte bleibt im Fenster. Schließen sitzt oben rechts. Vorhören zeigt Vorher, diesen Track und Nächsten, mit denselben Übergangschips und derselben Länge wie die Setliste. Die Karte liegt über der Ersatz-Schublade, der Player bleibt erreichbar, solange Ersatz offen ist.

![Vorhör-Player](screenshots/de/02-preview-player-v400.png)

**Opener, Closer und Pins.** Einen Performance-Track als **Opener** pinnen (bleibt vorne, Phase Open) oder als **Closer** (bleibt hinten, Phase Release). Ein **Pin** in der Mitte hält den Song im Set durch **Auf Slot setzen** und **Andere Songs**, und lässt ihn beim Sortieren trotzdem wandern. Beim Extrahieren schlägt SETBUILDER warme Open-/Release-Pins vor; du kannst sie jederzeit ändern oder lösen. Sortieren hält gepinnte Enden — und ohne Pin bleiben die aktuellen ersten und letzten Performance-Tracks sowieso an den Enden. **Ausschließen** markiert einen Track raus aus dem Set. Stand er in der Performance, wandert er zu den Alternativen und bleibt dort. Auf Slot setzen, Auffüllen und Andere Songs lassen ihn dort. Den Ausschluss lösen lässt ihn, wo er ist. Pin und Ausschluss lösen einander: Pinnen löst den Ausschluss, Ausschließen löst Opener, Closer und den Mittel-Pin.

**Set bearbeiten**
- **Sortieren:** die meisten Techniken nur innerhalb einer Phase (Alternativen bleiben am Ende; Opener/Closer bleiben insgesamt vorne/hinten). **Perfekt · Max Score** ist anders: es ordnet die ganze Performance über Phasengrenzen neu und legt Open→Release danach nach Timeline neu. Dasselbe Menü in der Setliste und im Key-Verlauf. Ändert sich nichts, sagt SETBUILDER das — oft fehlen Key/Energie/BPM, oder eine Phase hat nur ein bis zwei Tracks.

  | Technik | Was sie macht |
  |---|---|
  | **Perfekt · Max Score** | Ganzes Set als Camelot-TSP (exakt Held-Karp ≤18 Tracks, sonst NN+2-opt/Or-opt). Zuerst Clashes minimieren, dann Mix-Score maximieren. Opener/Closer bleiben; Phasen werden danach neu gelegt. 100 % nur wenn alle Keys auf dem Wheel verbunden sind — getrennte Cluster lassen weiterhin einen Bridge-Clash |
  | **Harmonisch** | Pro Phase: verwandte Camelot-Keys, weiche Energie, kleine BPM-Schritte |
  | **Ein-Schritt** | Pro Phase · Mixed In Key: Energie bevorzugt ±1 mit der Phase |
  | **Energie-Welle** | Pro Phase: steigt Open→Peak, fällt im Release; Key ist der Tiebreaker |
  | **Doppel-Peak** | Pro Phase: im Peak aufbauen, kurz −2, wieder hoch; Open/Lift/Rise nur steigen |
  | **Tempo aufbauen** | Pro Phase: BPM-Rampe mit der Phase |
  | **BPM-Kette** | Pro Phase: im ±2–4-Pocket bleiben |
  | **Camelot-Reise** | Pro Phase: im Uhrzeigersinn ums Wheel (stapelt denselben Key nicht) |
  | **Wellen** | Pro Phase: im Peak Groove ↔ Impact (Anchor); sonst Low/High-Energie |

- **Andere Songs:** ein kurzes Menü zwischen Sortieren und Energie. **Andere Tracks** nutzt denselben Pool wie früher (den Playlist-Pool, sonst die Stick-Bibliothek). **Aus der Playlist**, **Aus der Collection** und **Aus der History** nehmen diese geladene Quelle. Ein Eintrag bleibt sichtbar und ist deaktiviert, mit kurzer Begründung, wenn sein Pool nicht geladen ist. Vorher die Rückfrage; Opener, Closer und Mittel-Pins bleiben in der neuen Ziehung, ausgeschlossene Tracks bleiben draußen, Notizen gehen verloren.
- **Energie aus Dateien:** mit Stick-Dateien Tags lesen, fehlende messen, alle neu berechnen oder gesetzte Level ausdrücklich in MP3 schreiben. Messen schreibt keine Dateien. Ohne Stick zeigt das Menü diese Voraussetzung und **Stick wählen**. Ohne Dateipfade steht die Voraussetzung statt vier leerer Aktionen.
- **Auf Slot setzen:** kürzt die Performance, wenn sie über dem Slot liegt, und füllt sie, wenn sie unter dem Slot gestartet ist — Tracks, die du entfernt hast, oder ein längerer Slot. Gefüllt wird zuerst aus Alternativen, dann aus der Playlist, die am Set hängt. Ein Setzen, das über dem Slot startet, kürzt nur. Ausgeschlossene Tracks bleiben draußen. Opener, Closer und Mittel-Pins bleiben drin. Ist nichts mehr zum Nachlegen da, sagt das der Status. Ein Rückgängig holt die Tracks, die rausgewandert oder dazugekommen sind, in Rolle, Phase und Platz zurück. Ein zweites Setzen ersetzt diese Momentaufnahme.
- **Rollen verteilen:** Anchor auf den stärksten Peak-Tracks und den Schluss, Bridge bei Phasenwechsel, Key-Clash, BPM- oder Energie-Sprung, sonst Groove
- **Spotify-Links suchen:** sucht zu Tracks ohne Link einen Spotify-Treffer, damit du sie im Set vorhören kannst (braucht die Spotify-Zugangsdaten, siehe [Setup im README](../README.de.md#setup)). Der rekordbox-Export bleibt davon unberührt.

## 3. Rollen und Plan B

![Setlisten-Rollen und Alternativen](screenshots/de/03-setlist-roles-v400.png)

Jeder Track hat eine Phase (Open → Lift → Rise → Peak → Release) und eine Rolle:

| Rolle | Aufgabe |
|---|---|
| **Anchor** | Crowd-Connector, Signature-Track |
| **Bridge** | Pivot zwischen Phasen: Key, BPM, Energie |
| **Groove** | Atem zwischen den Peaks |
| **Alternativen** | Plan B, wenn der Floor dreht |

Titel lassen sich zwischen den Spalten ziehen. Bei einer Alternative setzt **Ins Set** sie vor oder hinter einen Song der Playlist, und **Pin** holt sie in die Performance und hält sie durch Auf Slot setzen und Andere Songs. Das Rollen-Bild ist von 4.0, diese Aktionen sind darauf nicht zu sehen. **Plan B** verlangt pro Phase mindestens zwei passende Alternativen. Eine Alternative zählt für die Phase, die du bei „Ersatz für“ wählst, solange ihre Energie ins Band der Phase passt. Sonst steht der Grund auf der Karte. „Lücken füllen“ nimmt Vorschläge aus deiner rekordbox-Bibliothek, die nach Energie, Key und BPM zu den Tracks der Phase passen.

## 4. Bogen

![Bogen und Camelot-Key-Verlauf](screenshots/de/04-arc-key-path-v400.png)

Der Bogen zeigt, wie die Phasen den Slot füllen (aktive Phase hervorgehoben; gelb heißt über dem Fenster) und wie die Energie jedes Tracks zum Zielband der Phase steht. Sprünge ab drei Stufen werden markiert. Unter jeder Phase sagt eine optionale Zeile, wofür dieser Teil da ist — der Platzhalter lautet „z. B. treibend, 128“. Eine leere Zeile wird nicht gespeichert. Die Set-Datei bleibt Version 1. Das Kabinen-PDF setzt die Zeile auf das Banner dieser Phase. Das Bogen-Bild ist von 4.0, die Zeile ist darauf nicht zu sehen. Die Spielzeit folgt der durchschnittlichen Blend-Zeit im Brief: 30 Sekunden, eine Minute, zwei Minuten oder vier Minuten weniger pro Track, und nie unter 30 Sekunden einer kurzen Datei. Ein gesetzter Übergang und seine Länge ersetzen diesen Durchschnitt an diesem Track. Cue-Punkte und was du live tust, bleiben bei dir.

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

## 5. Exportieren

![Set zum Player und in die Kabine mitnehmen](screenshots/de/05-take-to-gig-v400.png)

Bevor etwas mitgeht, fragt eine Checkliste nach fehlenden Dateien, Keys, Energie, einem dünnen Plan B und ob du das Set am Player gehört hast. Nur eine Lücke, die diese Aktion zur Lüge machen würde, hält sie auf. Haben Tracks in dieser Sitzung keine Datei, wählt **Stick-Ordner erneut wählen** in diesem Dialog denselben Ordner noch einmal, damit die Dateien wieder da sind. Im Player hörst du den Übergang vor: vorher, dieser Track, nächster, die Übergangsmarkierung und die Set-Notiz.

Das Menü **Exportieren** ist nach Ziel gruppiert. **Set speichern**, unter Im Setbuilder, öffnet das vorhandene Speichern unter Verbindungen & Setups. Es startet die Checkliste nicht und schreibt den Stick nicht.

### Für den Player

- **Auf Stick schreiben** (Hauptweg): Playlist `SETBUILDER - <Titel>` plus Alternativen als `SETBUILDER - <Titel> Alternativen` in die **aktuelle** `export.pdb`. Das Erstellen oder Aktualisieren dieser benannten Playlists ist gezielt und transaktional: fremde Datenbankänderungen bleiben erhalten, vorher entsteht ein Backup, danach wird zurückgelesen, bei Fehler erfolgt Rollback. Nur Titel, die schon auf dem Stick liegen, werden geschrieben; mehrdeutige ähnliche Treffer brauchen eine ausdrückliche Auswahl. XML und M3U landen zusätzlich in `SETBUILDER/`. Der Health-Strip kann ältere Device-Library-Player vorbereiten und bietet Auswerfen. CDJ-3000X, XDJ-AZ und OPUS-QUAD brauchen weiter rekordbox für OneLibrary; das Verhalten der CDJ/XDJ-Familien muss an echter Hardware geprüft werden. Die `master.db` auf dem Rechner bleibt unangetastet.

### Für die Kabine

- **PDF:** Druckansicht mit Brief, Reihenfolge, Key, BPM, Energie wenn das Level bekannt ist (sonst ein Strich), einer Phasenzeile wenn du eine geschrieben hast, und Kabinen-Set-Notizen (im Dialog „Als PDF speichern“). Das Export-Bild ist von 4.0, die Energie-Spalte ist darauf nicht zu sehen.
- **Text kopieren:** Set mit Brief, bekannter Energie und Kabinen-Set-Notizen in die Zwischenablage. Unbekannte Energie bleibt von der Zeile weg.

### Für den Rechner

- **XML für rekordbox:** Datei `SETBUILDER-rekordbox.xml` zum *Import* in rekordbox — schreibt nicht den Stick. In rekordbox einmal *Einstellungen → Erweitert → Datenbank → rekordbox xml* auf diese Datei setzen; dann links unter *rekordbox xml* → Rechtsklick → *Playlist importieren*. Performance und Alternativen als zwei Playlists.
- **M3U:** Playlist-Datei für Geräte, die M3U lesen

Der Brief und das Set lassen sich unter **Verbindungen & Setups** als Setup speichern, wieder laden oder als JSON sichern. Der Speichern-Name folgt dem Set-Titel aus dem Brief.

## Schwere Arbeit und Prüfgrenzen

Stick-Reconnect/-Import, Collection-Import, Energie-Taglesen, Messungen und Schreiben sind benannte schwere Jobs. Sie laufen in einer einzigen Queue: Der Status zeigt laufenden Job oder Warteposition, schwere Operationen laufen niemals parallel. Die übrige Oberfläche bleibt bedienbar.

Chrome und die installierte Desktop-App haben einen echten Stick nur lesend gezeigt (Collection, Playlists, History, ein geladenes Set, Cover). Stick-Schreiben, CDJ/XDJ-Wiedergabe, Spotify-/Tidal-Konten, Auswerfen und Energie-Kalibrierung auf echten Medien sind nicht geprüft. SETBUILDER kann auch Browser-Ordnerrechte, USB-Abbruch/vollen Datenträger, rekordbox-Import/Tag-Reload, Drucken/Zwischenablage oder Codec-Abdeckung nicht beweisen. Prüfe die Pfade, die du vor dem Gig brauchst.

## Weitere Quellen

rekordbox ist der Hauptweg. Fehlen Keys, ergänzen Tidal (Key und BPM aus dem Catalog per ISRC), CSV oder Paste sie. Titel, die noch nicht in rekordbox liegen, kommen per Link von Spotify, Tidal, Beatport oder SoundCloud ins Set. Bei Beatport und SoundCloud ist kein Login nötig, der Titel kommt aus der Adresse, Key und BPM trägst du von Hand ein oder holst sie über rekordbox.

## Weiterführend

- [README](../README.de.md) — Setup, Desktop-Download, Sprachen, Tests, Lizenz
- [Desktop-Paketierung](../desktop/README.md) — Build, Signierung, Quarantäne
