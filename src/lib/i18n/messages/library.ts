// Area "library": keys start with "library.". Declare `de` first, then type `en` against it.
const de = {
  // Shared
  "library.loading": "Lade…",

  // Library panel: header and status
  "library.panel.aria": "Stick laden und vorbereiten",
  "library.panel.title": "Stick laden & vorbereiten",
  "library.coverage.aria": "Key-Abdeckung",
  "library.status.noSet": "Noch kein Set — Stick-Playlist laden oder Set bauen",
  "library.status.noKeys": "Keys fehlen noch",
  "library.status.partial": "{keyed} von {total} Tracks mit Key",
  "library.status.complete": "Alle Performance-Tracks haben Keys",

  // Library panel: key sources
  "library.sources.aria": "Key-Quelle",
  "library.sources.rekordboxNote":
    "Der Stick lädt ein fertiges Set. Die Collection legt nur Key und BPM auf die Tracks, die schon da sind.",
  "library.sources.tidalNote": "Tidal schreibt Key und BPM an die Tracks, zuerst über die ISRC.",
  "library.sources.csvNote":
    "Tabelle einfügen, zum Beispiel aus Mixed In Key oder Serato. Camelot, Open Key oder Am/C.",

  // Library panel: rekordbox collection
  "library.collection.title": "rekordbox Collection",
  "library.collection.indexed": "Index {count}",
  "library.collection.body":
    "Ohne Stick: Collection als XML exportieren. Keys und BPM werden per Artist und Titel aufs bestehende Set gematcht. Unverschlüsselte master.db und CSV gehen auch.",
  "library.collection.path": "rekordbox → File → {item}",
  "library.collection.index": "· Index {count}",
  "library.collection.load": "Collection laden",

  // Library panel: Tidal
  "library.tidal.title": "Tidal Catalog",
  "library.tidal.body":
    "Tidal liefert Key, Scale und BPM. Matching zuerst per {isrc} (über Spotify-Track-Metadaten), sonst Artist/Title — Ergebnis als Camelot + BPM im Set.",
  "library.tidal.configured": "Zugangsdaten vorhanden.",
  "library.tidal.missing": "Zugangsdaten fehlen. Unter „Verbindungen & Setups“ eintragen.",
  "library.tidal.fetch": "Keys von Tidal holen",
  "library.tidal.needSet": "Zuerst ein Set extrahieren.",
  "library.tidal.unavailable":
    "Tidal-Keys nicht verfügbar — Zugangsdaten unter „Verbindungen & Setups“ eintragen oder rekordbox nutzen.",
  "library.tidal.applied": "Tidal: {count} Keys übernommen",
  "library.tidal.failed": "Tidal Enrichment fehlgeschlagen.",

  // Library panel: CSV
  "library.csv.title": "CSV / Paste",
  "library.csv.body":
    "Mixed In Key, Serato oder manuell — Camelot ({camelot}), Open Key oder {minor}/{major}.",
  "library.csv.example": "Beispiel",
  "library.csv.match": "Keys matchen",
  "library.csv.aria": "Key CSV Paste",

  // Library panel: import results
  "library.import.noKeys":
    "Kein Key-Import erkannt — rekordbox XML/DB, CSV oder eingefügte Tabelle nutzen.",
  "library.import.matched": "{matched}/{rows} Keys gematcht",
  "library.import.unmatched": "{count} ohne Treffer",
  "library.import.sample": "z. B. {track} → {key}",
  "library.import.rekordbox": "rekordbox {source}: {tracks} · {matched} aufs Set gematcht",
  "library.import.rekordboxFailed": "rekordbox Import fehlgeschlagen.",
  "library.rewrite.done": "Key und BPM neu geschrieben: {matched} von {total} gefunden.",

  // Library panel: browser
  "library.browser.title": "Bibliothek",
  "library.browser.searchPlaceholder": "Artist, Titel, Key oder Playlist…",
  "library.browser.searchAria": "rekordbox nach Artist, Titel, Key oder Playlist suchen",
  "library.browser.searchTip":
    "Frei tippen: Artist, Titel, Key oder Playlistname. Rechts eine Playlist wählen filtert die Liste darauf.",
  "library.browser.playlistPick": "Playlist",
  "library.browser.playlistPickAll": "Alle Playlists",
  "library.browser.playlistPickAria": "Nach Playlist filtern",
  "library.browser.playlistPickTip":
    "Playlist vom Stick wählen — zeigt nur Tracks aus dieser Playlist. „Alle Playlists“ setzt die Suche zurück.",
  "library.filter.key": "Key-Nachbarschaft",
  "library.filter.keyAny": "Jeder Key",
  "library.filter.bpmFrom": "BPM von",
  "library.filter.bpmTo": "BPM bis",
  "library.filter.energyFrom": "Energie von",
  "library.filter.energyTo": "Energie bis",
  "library.filter.energyAny": "—",
  "library.browser.rewrite": "Keys & BPM neu schreiben",
  "library.browser.rewriteTip":
    "Schreibt Key und BPM aus dieser Liste in die Tracks deiner Setliste. Gefunden wird über Artist und Titel. Vorhandene Werte werden überschrieben. Tracks ohne Treffer und leere Felder in der Liste lassen den alten Wert stehen.",
  "library.add.title": "Beim Hinzufügen",
  "library.add.phase": "Phase",
  "library.add.role": "Rolle",
  "library.add.fits": "Passt zu",
  "library.add.fitsTip":
    "Sortiert die Liste für den Anschluss. + Ins Set setzt den Track direkt hinter diesen Song.",
  "library.add.allTracks": "Alle Tracks",
  "library.add.moreMatches": "5 andere",
  "library.add.moreMatchesTip":
    "Nächste 5 passende Tracks — Key und BPM passen hinter den gewählten Track. Nochmal tippen zeigt die nächsten.",
  "library.add.moreMatchesAria":
    "Fünf andere passende Tracks anzeigen ({page} von {pages})",
  "library.add.matchCount": "{shown} von {total} passenden Tracks",
  "library.row.play": "Abspielen",
  "library.row.playAria": "{title} abspielen",
  "library.row.playDisabled": "Nur mit gewähltem Stick-Ordner abspielbar",
  "library.row.add": "+ Ins Set",
  "library.row.inSet": "Im Set",

  // Rekordbox stick
  "library.stick.title": "Rekordbox-Stick",
  "library.stick.intro":
    "Playlists und gespielte History direkt vom Export-Stick. Reihenfolge, Key, BPM und Kommentar bleiben erhalten.",
  "library.stick.path":
    "Im Dialog den ganzen Stick wählen, nicht einen Unterordner. Die Datenbank liegt im Ordner {pioneer} oder {dotPioneer} (mit Punkt, je nach rekordbox-Version). Der Ordner ist versteckt und wird von selbst gefunden.",
  "library.stick.found": "Gefunden: {label}",
  "library.stick.fold": "Zuklappen",
  "library.stick.unfold": "Aufklappen",
  "library.stick.choose": "Stick wählen",
  "library.stick.chooseFolder": "Ordner wählen",
  "library.stick.choosePdb": "export.pdb",
  "library.stick.cancel": "Abbrechen",
  "library.stick.picking": "Ordner-Dialog ist offen…",
  "library.stick.pickingHint":
    "Falls das System-Fenster nicht aufgeht: „Ordner wählen“ (am schnellsten direkt PIONEER) oder die Datei export.pdb wählen.",
  "library.stick.listing": "Lese die Dateien…",
  "library.stick.listingHint":
    "Der Ordner wird durchsucht. Bei vielen Musikdateien dauert der Browser-Upload länger — schneller geht es direkt mit dem Ordner PIONEER oder export.pdb.",
  "library.stick.reading": "Lese den Stick…",
  "library.stick.readingHint":
    "Die Datenbank wird gelesen. Bei einem großen Stick kann das einen Moment dauern.",
  "library.stick.blocked.text": "Der Ordner-Dialog ging in diesem Fenster nicht auf.",
  "library.stick.blocked.hint":
    "Bitte „Ordner wählen“ (am schnellsten direkt PIONEER) oder die Datei export.pdb benutzen.",
  "library.stick.emptyPick.text": "Kein Stick erkannt.",
  "library.stick.emptyPick.hint":
    "Den ganzen Stick wählen, nicht einen leeren Ordner. Oder die Datei export.pdb.",
  "library.stick.setsCount": "{shown} von {total}",
  "library.stick.filterPlaceholder": "Name oder Ordner filtern…",
  "library.stick.filterAria": "Sets vom Stick filtern",
  "library.stick.filterEmpty": "Kein Set passt auf „{query}“.",
  "library.stick.filterNone": "Keine Sets in dieser Auswahl.",
  "library.stick.kindAll": "Alle",
  "library.stick.kindPlaylist": "Playlists",
  "library.stick.kindHistory": "History",
  "library.stick.loadSet": "Als Set laden",
  "library.stick.historySnippet": "History · {track}",
  "library.stick.history": "History",
  "library.stick.playlist": "Playlist",
  "library.stick.noSets.text": "Die Datenbank hat Tracks, aber keine Playlist und keine History.",
  "library.stick.noSets.hint":
    "In rekordbox eine Playlist auf den Stick exportieren oder die History behalten, dann den Ordner erneut wählen.",
  "library.stick.readFailed.text": "Rekordbox-Stick konnte nicht gelesen werden.",
  "library.stick.readFailed.hint":
    "Den Ordner PIONEER/rekordbox wählen, oder nur die Datei export.pdb.",
  "library.stick.applied": "{kind} „{name}“ · {tracks}",
  "library.stick.withKey": "{count} mit Key",
  "library.stick.unmatched": "{count} ohne Treffer",

  // Connections: Spotify and Tidal credentials
  "library.connection.spotifyReady": "Spotify bereit",
  "library.connection.spotifyMissing": "Spotify fehlt",
  "library.connection.readFailed.text": "Verbindungen konnten nicht gelesen werden.",
  "library.connection.readFailed.hint":
    "Seite neu laden. SETBUILDER muss auf diesem Rechner laufen, nicht auf einem fremden Server.",
  "library.connection.copyFailed.text": "Kopieren hat nicht geklappt.",
  "library.connection.copyFailed.hint": "Die Adresse im Feld markieren und selbst kopieren.",
  "library.connection.copied": "Adresse kopiert. Die gehört genau so in die Developer-App.",
  "library.connection.saveFailed.text": "Speichern fehlgeschlagen.",
  "library.connection.saveFailed.hint":
    "Client ID und Secret ohne Leerzeile einfügen und erneut speichern.",
  "library.connection.saved":
    "Gespeichert. „{spotify}“ und „{tidal}“ nutzen jetzt diese Zugangsdaten.",
  "library.connection.note":
    "Zugangsdaten bleiben nur auf diesem Rechner. Beatport und SoundCloud brauchen keinen Login.",
  "library.connection.spotifyTitleReady": "Spotify",
  "library.connection.spotifyTitleMissing": "Spotify",
  "library.connection.tidalTitleReady": "Tidal",
  "library.connection.tidalTitleOptional": "Tidal",
  "library.connection.badgeReady": "Bereit",
  "library.connection.badgeOptional": "Optional",
  "library.connection.spotifyOpen": "Developer Dashboard",
  "library.connection.spotifyHelp":
    "App anlegen, Redirect URI exakt eintragen, dann ID und Secret hier speichern.",
  "library.connection.tidalOpen": "Tidal Developer",
  "library.connection.tidalHelp":
    "Scopes {read} und {playlists} einschalten, dieselbe Redirect URI eintragen, dann ID und Secret speichern.",
  "library.connection.redirectLabel": "Redirect URI",
  "library.connection.stored": "Gespeichert",
  "library.connection.saving": "Speichere…",
  "library.connection.save": "Zugangsdaten speichern",
  "library.connection.saveTip":
    "Client ID und Secret lokal speichern — nur auf diesem Rechner, nicht in der Cloud.",
  "library.connection.copyUriTip":
    "Redirect-URI kopieren und exakt so in die Developer-App eintragen.",
  "library.connection.connectSpotify": "Mit Spotify verbinden",
  "library.connection.connectTidal": "Mit Tidal verbinden",

  // Set toolbar: "Set bearbeiten" group and menus
  "library.tools.label": "Set bearbeiten",
  "library.tools.matchTip":
    "Zum Vorhören: sucht bei Spotify zu jedem Track ohne Link einen Treffer und hängt ihn an, damit du ihn im Set anspielen kannst. Titel und Artist müssen passen. Dein rekordbox-Export ändert sich dadurch nicht. Braucht die Spotify-Zugangsdaten in .env.local.",
  "library.tools.searching": "Suche…",
  "library.tools.matchLinks": "Spotify-Links suchen",
  "library.menu.take": "Exportieren",
  "library.menu.groupHere": "Im Setbuilder",
  "library.menu.saveSet": "Set speichern",
  "library.menu.saveSetHint": "Speichert dieses Set im Setbuilder.",
  "library.menu.groupPlayer": "Für den Player",
  "library.menu.groupBooth": "Für die Kabine",
  "library.menu.groupDesk": "Für den Rechner",
  "library.menu.pdf": "PDF",
  "library.menu.pdfHint": "Ausdruck mit Brief, Reihenfolge, Key und BPM. Im Dialog „Als PDF speichern“.",
  "library.menu.rekordbox": "XML für rekordbox",
  "library.menu.rekordboxHint": "Datei speichern und in rekordbox importieren — nicht der Stick.",
  "library.menu.m3u": "M3U",
  "library.menu.m3uHint": "Playlist-Datei für Geräte, die M3U lesen.",
  "library.menu.copyText": "Text kopieren",
  "library.menu.copyTextHint": "Set mit Brief und Kommentaren in die Zwischenablage.",
  "library.menu.stick": "Auf Stick schreiben",
  "library.menu.stickHint": "Playlist direkt auf den Stick — danach in den Player. Mit Sicherung.",
  "library.stickWrite.title": "Set auf den Stick schreiben",
  "library.stickWrite.intro": "Das Set wird als Playlist auf den Stick geschrieben. Danach Stick auswerfen und in den Player stecken. Die rekordbox-Bibliothek auf diesem Rechner bleibt unangetastet.",
  "library.stickWrite.safety": "Vorher Sicherung in SETBUILDER-Backup, danach Prüfung — bei Fehler wird zurückgesetzt.",
  "library.stickWrite.safetyDetails": "SETBUILDER kopiert die Stick-Datenbank nach SETBUILDER-Backup und prüft die Kopie. Nach dem Schreiben wird die Datenbank erneut gelesen. Besteht die Prüfung nicht, kommt der alte Stand zurück.",
  "library.stickWrite.safetyMore": "Wie die Sicherung funktioniert",
  "library.stickWrite.choose": "Stick wählen",
  "library.stickWrite.chooseHint": "Den ganzen Stick wählen (nicht einen Unterordner). Der Browser fragt um Erlaubnis.",
  "library.stickWrite.unsupported": "Dieser Browser darf nicht auf Laufwerke schreiben. Chrome, Edge oder die Desktop-App nutzen — oder XML für rekordbox exportieren.",
  "library.stickWrite.busy.reading": "Lese den Stick…",
  "library.stickWrite.busy.writing": "Schreibe und prüfe…",
  "library.stickWrite.busy.restoring": "Spiele die Sicherung zurück…",
  "library.stickWrite.found": "{found} von {total} Titeln liegen auf dem Stick.",
  "library.stickWrite.allFound": "Alle {total} Titel liegen auf dem Stick.",
  "library.stickWrite.missingTitle": "Nicht auf dem Stick, werden ausgelassen:",
  "library.stickWrite.missingMore": "… und {count} weitere",
  "library.stickWrite.noneFound": "Keiner der Titel liegt auf diesem Stick. Das Set muss aus Titeln bestehen, die du in rekordbox auf diesen Stick exportiert hast.",
  "library.stickWrite.willWrite": "Wird geschrieben: Playlist „{name}“ mit {count} Titeln.",
  "library.stickWrite.willWriteAlts": "Alternativen als „{name}“.",
  "library.stickWrite.willAddAltsOnly": "Das Set liegt schon als „{name}“ auf dem Stick. Alternativen werden als „{alts}“ ergänzt.",
  "library.stickWrite.alreadyThere": "„{name}“ liegt schon auf diesem Stick.",
  "library.stickWrite.rewrite": "Aktualisieren",
  "library.stickWrite.rewriteHint": "Aktualisieren ersetzt die Playlist auf dem Stick (mit Sicherung). Die rekordbox-Bibliothek auf dem Rechner bleibt unangetastet.",
  "library.stickWrite.rewriteConfirm": "Die Playlist auf dem Stick wird aktualisiert (Sicherung vorher). Fortfahren?",
  "library.stickWrite.suggestTitle": "Ähnliche Titel auf dem Stick — meinst du einen davon?",
  "library.stickWrite.suggestUse": "Diesen nehmen",
  "library.stickWrite.doneAlts": "Alternativen: „{name}“.",
  "library.stickWrite.sidecar": "Zusätzlich im Ordner SETBUILDER: {files} — nützlich, falls neuere Player die Stick-Playlist nicht zeigen.",
  "library.stickWrite.oneLibrary": "Neuere Player lesen manchmal eine andere Bibliothek und zeigen die Playlist dann nicht. SETBUILDER legt deshalb auch XML und M3U in den Ordner SETBUILDER.",
  "library.stickWrite.refused": "Dieser Stick kann nicht sicher beschrieben werden. {reason}",
  "library.stickWrite.write": "Auf Stick schreiben",
  "library.stickWrite.done": "Fertig: „{name}“ mit {count} Titeln steht auf dem Stick.",
  "library.stickWrite.doneTitle": "Set steht auf dem Stick",
  "library.stickWrite.doneNext": "Nächster Schritt: auswerfen, abziehen, in den Player.",
  "library.stickWrite.doneBackup": "Sicherung unter SETBUILDER-Backup/{backup}. Stick auswerfen, dann abziehen.",
  "library.stickWrite.restore": "Sicherung zurück",
  "library.stickWrite.restoreConfirm": "Die Stick-Datenbank wird durch die letzte SETBUILDER-Sicherung ersetzt. Playlists, die SETBUILDER danach angelegt hat, verschwinden wieder. Fortfahren?",
  "library.stickWrite.restoreDone": "Zurückgespielt: {backup}.",
  "library.stickWrite.close": "Schließen",
  "library.stickWrite.cancel": "Abbrechen",
  // Stick health strip: one verdict, one action, facts folded away
  "library.stickHealth.title": "Stick im Player",
  "library.stickHealth.verdict.ready": "Bereit für CDJ-3000, XDJ-XZ und ältere Player.",
  "library.stickHealth.verdict.readySynced": "Bereit für alle Player — rekordbox hat die Bibliothek erneuert.",
  "library.stickHealth.verdict.readyAside": "Bereit für CDJ-3000 und XDJ-XZ. Alte Bibliothek liegt sicher im Backup.",
  "library.stickHealth.verdict.needsRekordbox": "Noch nicht bereit: Die alte Player-Bibliothek verdeckt deine Playlists.",
  "library.stickHealth.verdict.needsRekordboxFiles": "Noch nicht bereit: Stick braucht rekordbox, bevor der Player ihn liest.",
  "library.stickHealth.verdict.hiddenFolder": "Ordner heißt .PIONEER (versteckt) — viele Player finden ihn trotzdem.",
  "library.stickHealth.verdict.empty": "Noch nicht bereit: Auf dem Stick liegen noch keine Playlists.",
  "library.stickHealth.verdict.broken": "Keine lesbare rekordbox-Datenbank auf diesem Stick.",
  "library.stickHealth.verdict.incomplete": "Nur eine Datei gewählt — für den Player-Check den ganzen Stick wählen.",
  "library.stickHealth.verdict.ejected": "Ausgeworfen — Stick abziehen und in den Player stecken.",
  "library.stickHealth.verdict.ejectFailed":
    "Auswerfen fehlgeschlagen — nicht abziehen. Zuerst reparieren oder im Finder auswerfen.",
  "library.stickHealth.verdict.writeDone":
    "Geschrieben — jetzt auswerfen, dann Stick in den Player.",
  "library.stickHealth.meaning.ejected":
    "Der Stick ist vom Mac getrennt. Abziehen und in den Player. Wenn du ihn wieder hier brauchst: Stick wählen und erneut prüfen.",
  "library.stickHealth.meaning.writeDone":
    "Das Set liegt auf dem Stick. Ohne Auswerfen riskierst du „Disk not ejected properly“, kaputte Dateien und Players die den Stick nur lesend zeigen.",
  "library.stickHealth.meaning.ejectFailed":
    "Der Stick ist noch gemountet. Nicht abziehen — sonst setzen CDJs ihn oft auf Nur-Lesen. Tippe „Stick reparieren“, dann erneut „Auswerfen“. Alternativ im Finder auswerfen und warten bis das Symbol verschwindet.",
  "library.stickHealth.next.eject": "Grün geschafft. Nächster Schritt: Auswerfen, dann Stick in den Player.",
  "library.stickHealth.next.prepare": "Zum Grün: „Für Player vorbereiten“ tippen — danach wird der Punkt grün, dann auswerfen.",
  "library.stickHealth.next.openRekordbox": "Zum Grün: In rekordbox öffnen, Stick dort auswerfen und die Device Library schreiben lassen.",
  "library.stickHealth.meaning.ready":
    "Die Stick-Datenbank ist lesbar. CDJ-3000, XDJ-XZ und ältere Player zeigen deine Playlists. Vor dem Abziehen immer auswerfen.",
  "library.stickHealth.meaning.readySynced":
    "rekordbox hat die Player-Bibliothek geschrieben. Auch neuere Player (CDJ-3000X, XDJ-AZ, OPUS-QUAD) sollten den Stick finden.",
  "library.stickHealth.meaning.readyAside":
    "Grün: Die alte OneLibrary liegt im Backup, der Player liest deine aktuellen Playlists aus export.pdb. Das ist beabsichtigt — nicht kaputt. Jetzt auswerfen und in den Player.",
  "library.stickHealth.meaning.readyAsideHidden":
    "Grün: Vorbereitung ist durch, alte Bibliothek im Backup. Der Ordner heißt .PIONEER (versteckt) — auf vielen Sticks normal. Auswerfen und in den Player; wenn nichts erscheint, Stick in rekordbox öffnen.",
  "library.stickHealth.meaning.needsRekordbox":
    "Auf dem Stick liegt noch eine ältere OneLibrary von rekordbox. CDJ-3000 und XDJ-XZ lesen die zuerst und zeigen dann nicht deine SETBUILDER-Playlists. So wird der Punkt grün: 1) „Für Player vorbereiten“ — die alte Bibliothek wandert sicher nach SETBUILDER-Backup. 2) „Auswerfen“. 3) Stick in den Player stecken. (CDJ-3000X, XDJ-AZ und OPUS-QUAD brauchen danach weiter rekordbox.)",
  "library.stickHealth.meaning.needsRekordboxFiles":
    "Dieser Stick braucht rekordbox, bevor ein Player die Bibliothek findet. So wird’s grün: Stick in rekordbox öffnen, dort auswerfen und die Device Library schreiben lassen — danach hier „Erneut prüfen“.",
  "library.stickHealth.meaning.hiddenFolder":
    "Pioneer speichert die Bibliothek oft als versteckten Ordner .PIONEER. Viele CDJs finden ihn. Wenn der Player leer bleibt: Stick in rekordbox öffnen — rekordbox legt oft PIONEER ohne Punkt an.",
  "library.stickHealth.meaning.empty":
    "export.pdb ist da, enthält aber noch keine Playlists. So wird’s grün: zuerst ein Set mit „Auf Stick schreiben“ legen, dann erneut prüfen.",
  "library.stickHealth.meaning.broken":
    "Keine lesbare export.pdb gefunden. Den ganzen Stick wählen (nicht nur einen Unterordner) oder in rekordbox neu exportieren.",
  "library.stickHealth.meaning.incomplete":
    "Mit einer einzelnen Datei können wir den Stick nicht vollständig prüfen. „Stick wählen“ und den ganzen USB-Stick nehmen.",
  "library.stickHealth.details": "Details",
  "library.stickHealth.detailsTip": "Erklärung und Fakten zur Stick-Datenbank einblenden.",
  "library.stickHealth.less": "Weniger",
  "library.stickHealth.lessTip": "Detailzeile wieder einklappen.",
  "library.stickHealth.recheck": "Erneut prüfen",
  "library.stickHealth.recheckTip": "Stick erneut lesen — nach rekordbox oder Dateiänderungen.",
  "library.stickHealth.tip.prepare":
    "Macht den Status grün für CDJ-3000 / XDJ-XZ: legt die alte Player-Bibliothek sicher beiseite. Danach auswerfen.",
  "library.stickHealth.tip.eject":
    "Stick sicher auswerfen, bevor du ihn abziehst und in den Player steckst. SETBUILDER wartet auf diskutil und prüft, dass der Stick wirklich weg ist.",
  "library.stickHealth.tip.repair":
    "Behebt einen „schmutzigen“ FAT-Zustand (häufige Ursache für Nur-Lesen am CDJ). Stick bleibt eingesteckt; danach erneut auswerfen.",
  "library.stickHealth.tip.openRekordbox":
    "rekordbox öffnen, dort den Stick auswerfen und die Player-Bibliothek schreiben lassen — danach hier erneut prüfen.",
  "library.stickHealth.tip.restore":
    "OneLibrary aus dem SETBUILDER-Backup zurück auf den Stick legen.",
  "library.stickHealth.fact.folder": "Ordner",
  "library.stickHealth.fact.folderNone": "kein PIONEER-Ordner",
  "library.stickHealth.fact.folderBoth": "PIONEER und .PIONEER",
  "library.stickHealth.fact.folderPlain": "PIONEER — so wie Player ihn erwarten",
  "library.stickHealth.fact.folderHidden": ".PIONEER (versteckt — oft normal)",
  "library.stickHealth.fact.db": "Datenbank",
  "library.stickHealth.fact.dbOk": "export.pdb · {tracks} Tracks · {playlists} Playlists",
  "library.stickHealth.fact.dbEmpty": "export.pdb · {tracks} Tracks · keine Playlists",
  "library.stickHealth.fact.dbFail": "export.pdb fehlt oder ist unlesbar",
  "library.stickHealth.fact.library": "Player-Bibliothek",
  "library.stickHealth.fact.libraryNone": "keine OneLibrary — Player lesen export.pdb",
  "library.stickHealth.fact.librarySynced": "OneLibrary aktuell, von rekordbox geschrieben",
  "library.stickHealth.fact.libraryStale": "älter als deine Playlists — „Für Player vorbereiten“ macht grün",
  "library.stickHealth.fact.libraryAside": "OneLibrary liegt sicher in SETBUILDER-Backup",
  "library.stickHealth.fact.setform": "SETBUILDER-Playlists",
  "library.stickHealth.fact.setformNone": "noch keine auf dem Stick",
  "library.stickHealth.fact.tech": "Technik",
  "library.stickHealth.fact.techLine": "USBANLZ {analysis} · Ordner SETBUILDER {sidecar}",
  "library.stickHealth.present": "da",
  "library.stickHealth.missing": "fehlt",
  "library.stickHealth.why": "CDJ-3000, XDJ-XZ und ältere lesen export.pdb. CDJ-3000X, XDJ-AZ und OPUS-QUAD brauchen eine Player-Bibliothek aus rekordbox. Vor dem Player immer auswerfen.",
  "library.stickHealth.fix.prepare": "Für Player vorbereiten",
  "library.stickHealth.fix.preparing": "Bereite vor…",
  "library.stickHealth.fix.done": "Grün. Stick ist vorbereitet — jetzt auswerfen, dann in den Player.",
  "library.stickHealth.fix.restored": "Player-Bibliothek liegt wieder auf dem Stick.",
  "library.stickHealth.fix.confirm": "Die alte Player-Bibliothek (exportLibrary.db) kommt nach SETBUILDER-Backup. Danach wird der Status grün für CDJ-3000, XDJ-XZ und ältere — sie lesen deine Playlists. CDJ-3000X, XDJ-AZ und OPUS-QUAD sehen ohne rekordbox weiter keine Bibliothek. Fortfahren?",
  "library.stickHealth.fix.eject": "Auswerfen",
  "library.stickHealth.fix.ejecting": "Werfe aus…",
  "library.stickHealth.fix.ejected": "Ausgeworfen. Stick abziehen und in den Player.",
  "library.stickHealth.fix.ejectFailed":
    "Auswerfen hat nicht geklappt. Nicht abziehen — „Stick reparieren“, dann erneut auswerfen (oder im Finder).",
  "library.stickHealth.fix.repair": "Stick reparieren",
  "library.stickHealth.fix.repairing": "Repariere Stick…",
  "library.stickHealth.fix.repaired":
    "Reparatur fertig. Jetzt auswerfen — erst dann abziehen und in den Player.",
  "library.stickHealth.fix.repairFailed":
    "Reparatur fehlgeschlagen. In der Festplattendienstprogramm Erste Hilfe versuchen, dann hier erneut auswerfen.",
  "library.stickHealth.fix.restore": "OneLibrary zurücklegen",
  "library.stickHealth.fix.failed": "Hat nicht geklappt. Stick noch eingesteckt und Zugriff erlaubt?",
  "library.stickHealth.prepare.open": "rekordbox öffnen",
  "library.stickHealth.prepare.opening": "Öffne rekordbox…",
  "library.stickHealth.prepare.opened": "rekordbox läuft. Dort den Stick auswerfen, dann hier erneut prüfen.",
  "library.stickHealth.prepare.failed": "rekordbox ließ sich nicht öffnen.",
  "library.stickWrite.healHint":
    "Zum Heilen in SETBUILDER: „Sicherung zurück“ stellt export.pdb wieder her; „OneLibrary zurücklegen“ / „Für Player vorbereiten“ regelt die Player-Bibliothek; bei Nur-Lesen am Player zuerst „Stick reparieren“, dann sauber auswerfen.",
  "library.menu.reset": "Zurücksetzen",
  "library.menu.resetHint":
    "Set leeren und zum Beispiel-Brief zurück. Gespeicherte Setups bleiben.",
} as const;

const en: Record<keyof typeof de, string> = {
  // Shared
  "library.loading": "Loading…",

  // Library panel: header and status
  "library.panel.aria": "Load stick and prepare",
  "library.panel.title": "Load stick & prepare",
  "library.coverage.aria": "Key coverage",
  "library.status.noSet": "No set yet — load a stick playlist or build a set",
  "library.status.noKeys": "Keys still missing",
  "library.status.partial": "{keyed} of {total} tracks with key",
  "library.status.complete": "All performance tracks have keys",

  // Library panel: key sources
  "library.sources.aria": "Key source",
  "library.sources.rekordboxNote":
    "The stick loads a finished set. The collection only puts key and BPM onto the tracks that are already there.",
  "library.sources.tidalNote": "Tidal writes key and BPM onto the tracks, matching by ISRC first.",
  "library.sources.csvNote":
    "Paste a table, for example from Mixed In Key or Serato. Camelot, Open Key or Am/C.",

  // Library panel: rekordbox collection
  "library.collection.title": "rekordbox Collection",
  "library.collection.indexed": "Index {count}",
  "library.collection.body":
    "Without a stick: export the collection as XML. Key and BPM are matched onto the existing set by artist and title. An unencrypted master.db and CSV work too.",
  "library.collection.path": "rekordbox → File → {item}",
  "library.collection.index": "· Index {count}",
  "library.collection.load": "Load collection",

  // Library panel: Tidal
  "library.tidal.title": "Tidal Catalog",
  "library.tidal.body":
    "Tidal provides key, scale and BPM. Matching goes by {isrc} first (via Spotify track metadata), then artist/title — the result lands in the set as Camelot + BPM.",
  "library.tidal.configured": "Credentials are in place.",
  "library.tidal.missing": "Credentials are missing. Enter them under “Connections & setups”.",
  "library.tidal.fetch": "Fetch keys from Tidal",
  "library.tidal.needSet": "Extract a set first.",
  "library.tidal.unavailable":
    "Tidal keys not available — enter credentials under “Connections & setups” or use rekordbox.",
  "library.tidal.applied": "Tidal: {count} keys applied",
  "library.tidal.failed": "Tidal enrichment failed.",

  // Library panel: CSV
  "library.csv.title": "CSV / Paste",
  "library.csv.body":
    "Mixed In Key, Serato or by hand — Camelot ({camelot}), Open Key or {minor}/{major}.",
  "library.csv.example": "Example",
  "library.csv.match": "Match keys",
  "library.csv.aria": "Key CSV paste",

  // Library panel: import results
  "library.import.noKeys":
    "No key import recognised — use rekordbox XML/DB, CSV or a pasted table.",
  "library.import.matched": "{matched}/{rows} keys matched",
  "library.import.unmatched": "{count} unmatched",
  "library.import.sample": "e.g. {track} → {key}",
  "library.import.rekordbox": "rekordbox {source}: {tracks} · {matched} matched to the set",
  "library.import.rekordboxFailed": "rekordbox import failed.",
  "library.rewrite.done": "Key and BPM rewritten: {matched} of {total} found.",

  // Library panel: browser
  "library.browser.title": "Library",
  "library.browser.searchPlaceholder": "Artist, title, key or playlist…",
  "library.browser.searchAria": "Search rekordbox by artist, title, key or playlist",
  "library.browser.searchTip":
    "Type freely: artist, title, key or playlist name. Pick a playlist on the right to filter the list to it.",
  "library.browser.playlistPick": "Playlist",
  "library.browser.playlistPickAll": "All playlists",
  "library.browser.playlistPickAria": "Filter by playlist",
  "library.browser.playlistPickTip":
    "Pick a stick playlist — shows only tracks from that playlist. “All playlists” resets the search.",
  "library.filter.key": "Key neighborhood",
  "library.filter.keyAny": "Any key",
  "library.filter.bpmFrom": "BPM from",
  "library.filter.bpmTo": "BPM to",
  "library.filter.energyFrom": "Energy from",
  "library.filter.energyTo": "Energy to",
  "library.filter.energyAny": "—",
  "library.browser.rewrite": "Rewrite keys & BPM",
  "library.browser.rewriteTip":
    "Writes key and BPM from this list into the tracks of your setlist. Tracks are found by artist and title. Existing values are overwritten. Tracks without a match and empty fields in the list keep their old value.",
  "library.add.title": "When adding",
  "library.add.phase": "Phase",
  "library.add.role": "Role",
  "library.add.fits": "Fits after",
  "library.add.fitsTip":
    "Ranks the list for that handoff. + Add to set places the track right after this song.",
  "library.add.allTracks": "All tracks",
  "library.add.moreMatches": "5 others",
  "library.add.moreMatchesTip":
    "Next 5 matching tracks — key and BPM fit after the chosen track. Tap again for the next batch.",
  "library.add.moreMatchesAria":
    "Show five other matching tracks (page {page} of {pages})",
  "library.add.matchCount": "{shown} of {total} matching tracks",
  "library.row.play": "Play",
  "library.row.playAria": "Play {title}",
  "library.row.playDisabled": "Only playable with a chosen stick folder",
  "library.row.add": "+ Add to set",
  "library.row.inSet": "In set",

  // Rekordbox stick
  "library.stick.title": "Rekordbox stick",
  "library.stick.intro":
    "Playlists and played history straight from the export stick. Order, key, BPM and comment are kept.",
  "library.stick.path":
    "In the dialog, choose the whole stick, not a subfolder. The database lives in the {pioneer} or {dotPioneer} folder (with a dot, depending on the rekordbox version). The folder is hidden and found automatically.",
  "library.stick.found": "Found: {label}",
  "library.stick.fold": "Collapse",
  "library.stick.unfold": "Expand",
  "library.stick.choose": "Choose stick",
  "library.stick.chooseFolder": "Choose folder",
  "library.stick.choosePdb": "export.pdb",
  "library.stick.cancel": "Cancel",
  "library.stick.picking": "Folder dialog is open…",
  "library.stick.pickingHint":
    "If the system dialog does not appear, use “Choose folder” (picking PIONEER directly is fastest) or choose the export.pdb file.",
  "library.stick.listing": "Reading the files…",
  "library.stick.listingHint":
    "The folder is being scanned. With many music files the browser upload takes longer — picking the PIONEER folder or export.pdb is faster.",
  "library.stick.reading": "Reading the stick…",
  "library.stick.readingHint":
    "The database is being read. A large stick can take a moment.",
  "library.stick.blocked.text": "The folder dialog could not open in this window.",
  "library.stick.blocked.hint":
    "Please use “Choose folder” (picking PIONEER directly is fastest) or the export.pdb file.",
  "library.stick.emptyPick.text": "No stick found.",
  "library.stick.emptyPick.hint":
    "Choose the whole stick, not an empty folder. Or the export.pdb file.",
  "library.stick.setsCount": "{shown} of {total}",
  "library.stick.filterPlaceholder": "Filter by name or folder…",
  "library.stick.filterAria": "Filter sets on the stick",
  "library.stick.filterEmpty": "No set matches “{query}”.",
  "library.stick.filterNone": "No sets in this view.",
  "library.stick.kindAll": "All",
  "library.stick.kindPlaylist": "Playlists",
  "library.stick.kindHistory": "History",
  "library.stick.loadSet": "Load as set",
  "library.stick.historySnippet": "History · {track}",
  "library.stick.history": "History",
  "library.stick.playlist": "Playlist",
  "library.stick.noSets.text": "The database has tracks, but no playlist and no history.",
  "library.stick.noSets.hint":
    "In rekordbox, export a playlist to the stick or keep the history, then choose the folder again.",
  "library.stick.readFailed.text": "The rekordbox stick could not be read.",
  "library.stick.readFailed.hint":
    "Choose the PIONEER/rekordbox folder, or just the export.pdb file.",
  "library.stick.applied": "{kind} “{name}” · {tracks}",
  "library.stick.withKey": "{count} with key",
  "library.stick.unmatched": "{count} unmatched",

  // Connections: Spotify and Tidal credentials
  "library.connection.spotifyReady": "Spotify ready",
  "library.connection.spotifyMissing": "Spotify missing",
  "library.connection.readFailed.text": "Connections could not be read.",
  "library.connection.readFailed.hint":
    "Reload the page. SETBUILDER has to run on this computer, not on a remote server.",
  "library.connection.copyFailed.text": "Copying did not work.",
  "library.connection.copyFailed.hint": "Select the address in the field and copy it yourself.",
  "library.connection.copied": "Address copied. It goes into the developer app exactly like this.",
  "library.connection.saveFailed.text": "Saving failed.",
  "library.connection.saveFailed.hint":
    "Paste client ID and secret without a blank line and save again.",
  "library.connection.saved":
    "Saved. “{spotify}” and “{tidal}” now use these credentials.",
  "library.connection.note":
    "Credentials stay on this computer only. Beatport and SoundCloud need no login.",
  "library.connection.spotifyTitleReady": "Spotify",
  "library.connection.spotifyTitleMissing": "Spotify",
  "library.connection.tidalTitleReady": "Tidal",
  "library.connection.tidalTitleOptional": "Tidal",
  "library.connection.badgeReady": "Ready",
  "library.connection.badgeOptional": "Optional",
  "library.connection.spotifyOpen": "Developer Dashboard",
  "library.connection.spotifyHelp":
    "Create an app, enter the redirect URI exactly, then save ID and secret here.",
  "library.connection.tidalOpen": "Tidal Developer",
  "library.connection.tidalHelp":
    "Enable scopes {read} and {playlists}, enter the same redirect URI, then save ID and secret.",
  "library.connection.redirectLabel": "Redirect URI",
  "library.connection.stored": "Saved",
  "library.connection.saving": "Saving…",
  "library.connection.save": "Save credentials",
  "library.connection.saveTip":
    "Save client ID and secret locally — on this computer only, not in the cloud.",
  "library.connection.copyUriTip":
    "Copy the redirect URI and paste it exactly into the developer app.",
  "library.connection.connectSpotify": "Connect with Spotify",
  "library.connection.connectTidal": "Connect with Tidal",

  // Set toolbar: "Edit set" group and menus
  "library.tools.label": "Edit set",
  "library.tools.matchTip":
    "For previewing: looks up each track without a link on Spotify and attaches the match, so you can play it in the set. Title and artist have to match. Your rekordbox export doesn't change. Needs the Spotify credentials in .env.local.",
  "library.tools.searching": "Searching…",
  "library.tools.matchLinks": "Find Spotify links",
  "library.menu.take": "Export",
  "library.menu.groupHere": "In SETBUILDER",
  "library.menu.saveSet": "Save set",
  "library.menu.saveSetHint": "Saves this set in SETBUILDER.",
  "library.menu.groupPlayer": "For the player",
  "library.menu.groupBooth": "For the booth",
  "library.menu.groupDesk": "For the computer",
  "library.menu.pdf": "PDF",
  "library.menu.pdfHint": "Printout with brief, order, key and BPM. Choose “Save as PDF” in the dialog.",
  "library.menu.rekordbox": "XML for rekordbox",
  "library.menu.rekordboxHint": "Save a file and import it in rekordbox — not the stick.",
  "library.menu.m3u": "M3U",
  "library.menu.m3uHint": "Playlist file for devices that read M3U.",
  "library.menu.copyText": "Copy text",
  "library.menu.copyTextHint": "Set with brief and comments to the clipboard.",
  "library.menu.stick": "Write to stick",
  "library.menu.stickHint": "Playlist straight onto the stick — then into the player. With backup.",
  "library.stickWrite.title": "Write the set to the stick",
  "library.stickWrite.intro": "The set is written as a playlist onto the stick. Then eject and put it in the player. The rekordbox library on this computer is left alone.",
  "library.stickWrite.safety": "Backup to SETBUILDER-Backup first, then a check — on failure the old state is restored.",
  "library.stickWrite.safetyDetails": "SETBUILDER copies the stick database into SETBUILDER-Backup and checks the copy. After writing, the database is read again. If the check fails, the previous state is put back.",
  "library.stickWrite.safetyMore": "How the backup works",
  "library.stickWrite.choose": "Choose stick",
  "library.stickWrite.chooseHint": "Choose the whole stick (not a subfolder). Your browser asks for permission.",
  "library.stickWrite.unsupported": "This browser can't write to drives. Use Chrome, Edge or the desktop app — or export XML for rekordbox.",
  "library.stickWrite.busy.reading": "Reading the stick…",
  "library.stickWrite.busy.writing": "Writing and checking…",
  "library.stickWrite.busy.restoring": "Restoring the backup…",
  "library.stickWrite.found": "{found} of {total} tracks are on the stick.",
  "library.stickWrite.allFound": "All {total} tracks are on the stick.",
  "library.stickWrite.missingTitle": "Not on the stick, left out:",
  "library.stickWrite.missingMore": "… and {count} more",
  "library.stickWrite.noneFound": "None of the tracks are on this stick. The set has to consist of tracks you exported to this stick in rekordbox.",
  "library.stickWrite.willWrite": "Will be written: playlist “{name}” with {count} tracks.",
  "library.stickWrite.willWriteAlts": "Alternatives as “{name}”.",
  "library.stickWrite.willAddAltsOnly": "The set is already on the stick as “{name}”. Alternatives will be added as “{alts}”.",
  "library.stickWrite.alreadyThere": "“{name}” is already on this stick.",
  "library.stickWrite.rewrite": "Update",
  "library.stickWrite.rewriteHint": "Update replaces the playlist on the stick (with a backup). The rekordbox library on this computer is left alone.",
  "library.stickWrite.rewriteConfirm": "The playlist on the stick will be updated (backup first). Continue?",
  "library.stickWrite.suggestTitle": "Similar titles on the stick — did you mean one of these?",
  "library.stickWrite.suggestUse": "Use this",
  "library.stickWrite.doneAlts": "Alternatives: “{name}”.",
  "library.stickWrite.sidecar": "Also in the SETBUILDER folder: {files} — useful if newer players don’t show the stick playlist.",
  "library.stickWrite.oneLibrary": "Newer players sometimes read a different library and then won’t show the playlist. SETBUILDER therefore also puts XML and M3U in the SETBUILDER folder.",
  "library.stickWrite.refused": "This stick can't be written to safely. {reason}",
  "library.stickWrite.write": "Write to stick",
  "library.stickWrite.done": "Done: “{name}” with {count} tracks is on the stick.",
  "library.stickWrite.doneTitle": "Set is on the stick",
  "library.stickWrite.doneNext": "Next: eject, unplug, put it in the player.",
  "library.stickWrite.doneBackup": "Backup under SETBUILDER-Backup/{backup}. Eject the stick, then unplug.",
  "library.stickWrite.restore": "Restore backup",
  "library.stickWrite.restoreConfirm": "The stick database will be replaced by the last SETBUILDER backup. Playlists SETBUILDER added after it disappear again. Continue?",
  "library.stickWrite.restoreDone": "Restored: {backup}.",
  "library.stickWrite.close": "Close",
  "library.stickWrite.cancel": "Cancel",
  // Stick health strip: one verdict, one action, facts folded away
  "library.stickHealth.title": "Stick in the player",
  "library.stickHealth.verdict.ready": "Ready for CDJ-3000, XDJ-XZ and older players.",
  "library.stickHealth.verdict.readySynced": "Ready for all players — rekordbox refreshed the library.",
  "library.stickHealth.verdict.readyAside": "Ready for CDJ-3000 and XDJ-XZ. Old library is safely in the backup.",
  "library.stickHealth.verdict.needsRekordbox": "Not ready yet: the old player library is hiding your playlists.",
  "library.stickHealth.verdict.needsRekordboxFiles": "Not ready yet: this stick needs rekordbox before a player can read it.",
  "library.stickHealth.verdict.hiddenFolder": "Folder is named .PIONEER (hidden) — many players still find it.",
  "library.stickHealth.verdict.empty": "Not ready yet: there are no playlists on the stick.",
  "library.stickHealth.verdict.broken": "No readable rekordbox database on this stick.",
  "library.stickHealth.verdict.incomplete": "Only one file picked — choose the whole stick for the player check.",
  "library.stickHealth.verdict.ejected": "Ejected — unplug the stick and put it in the player.",
  "library.stickHealth.verdict.ejectFailed":
    "Eject failed — do not unplug. Repair first, or eject in Finder.",
  "library.stickHealth.verdict.writeDone":
    "Written — eject now, then put the stick in the player.",
  "library.stickHealth.meaning.ejected":
    "The stick is disconnected from the Mac. Unplug it and put it in the player. When you need it here again: choose the stick and check again.",
  "library.stickHealth.meaning.writeDone":
    "The set is on the stick. Skipping eject risks “Disk not ejected properly”, damaged files, and players that show the stick read-only.",
  "library.stickHealth.meaning.ejectFailed":
    "The stick is still mounted. Do not unplug — CDJs often remount it read-only. Tap “Repair stick”, then “Eject” again. Or eject in Finder and wait until the icon disappears.",
  "library.stickHealth.next.eject": "You’re green. Next: eject, then put the stick in the player.",
  "library.stickHealth.next.prepare": "To go green: tap “Prepare for player” — the dot turns green, then eject.",
  "library.stickHealth.next.openRekordbox": "To go green: open in rekordbox, eject the stick there, and let it write the device library.",
  "library.stickHealth.meaning.ready":
    "The stick database is readable. CDJ-3000, XDJ-XZ and older players will show your playlists. Always eject before you unplug.",
  "library.stickHealth.meaning.readySynced":
    "rekordbox has written the player library. Newer players (CDJ-3000X, XDJ-AZ, OPUS-QUAD) should find the stick too.",
  "library.stickHealth.meaning.readyAside":
    "Green: the old OneLibrary is in the backup, so the player reads your current playlists from export.pdb. That is intentional — not broken. Now eject and put it in the player.",
  "library.stickHealth.meaning.readyAsideHidden":
    "Green: prepare is done, old library in the backup. The folder is named .PIONEER (hidden) — normal on many sticks. Eject and try the player; if it stays empty, open the stick in rekordbox.",
  "library.stickHealth.meaning.needsRekordbox":
    "An older OneLibrary from rekordbox is still on the stick. CDJ-3000 and XDJ-XZ read that first and then won’t show your SETBUILDER playlists. To turn the dot green: 1) “Prepare for player” — the old library moves safely into SETBUILDER-Backup. 2) “Eject”. 3) Put the stick in the player. (CDJ-3000X, XDJ-AZ and OPUS-QUAD still need rekordbox after that.)",
  "library.stickHealth.meaning.needsRekordboxFiles":
    "This stick needs rekordbox before a player finds the library. To go green: open the stick in rekordbox, eject there, let it write the device library — then tap “Check again” here.",
  "library.stickHealth.meaning.hiddenFolder":
    "Pioneer often stores the library as a hidden .PIONEER folder. Many CDJs find it. If the player stays empty: open the stick in rekordbox — it often creates PIONEER without the dot.",
  "library.stickHealth.meaning.empty":
    "export.pdb is there but has no playlists yet. To go green: write a set with “Write to stick” first, then check again.",
  "library.stickHealth.meaning.broken":
    "No readable export.pdb found. Choose the whole stick (not a subfolder) or re-export from rekordbox.",
  "library.stickHealth.meaning.incomplete":
    "A single file is not enough for a full stick check. Use “Choose stick” and pick the whole USB stick.",
  "library.stickHealth.details": "Details",
  "library.stickHealth.detailsTip": "Show explanation and facts about the stick database.",
  "library.stickHealth.less": "Less",
  "library.stickHealth.lessTip": "Collapse the detail row again.",
  "library.stickHealth.recheck": "Check again",
  "library.stickHealth.recheckTip": "Re-read the stick — after rekordbox or file changes.",
  "library.stickHealth.tip.prepare":
    "Turns the status green for CDJ-3000 / XDJ-XZ: moves the old player library aside safely. Then eject.",
  "library.stickHealth.tip.eject":
    "Eject the stick safely before you unplug it and put it in the player. SETBUILDER waits for diskutil and checks the stick is really gone.",
  "library.stickHealth.tip.repair":
    "Fixes a dirty FAT state (common cause of CDJ read-only). Stick stays plugged in; eject again afterwards.",
  "library.stickHealth.tip.openRekordbox":
    "Open rekordbox, eject the stick there, and let it write the player library — then check again here.",
  "library.stickHealth.tip.restore":
    "Put OneLibrary from the SETBUILDER backup back onto the stick.",
  "library.stickHealth.fact.folder": "Folder",
  "library.stickHealth.fact.folderNone": "no PIONEER folder",
  "library.stickHealth.fact.folderBoth": "PIONEER and .PIONEER",
  "library.stickHealth.fact.folderPlain": "PIONEER — as players expect",
  "library.stickHealth.fact.folderHidden": ".PIONEER (hidden — often normal)",
  "library.stickHealth.fact.db": "Database",
  "library.stickHealth.fact.dbOk": "export.pdb · {tracks} tracks · {playlists} playlists",
  "library.stickHealth.fact.dbEmpty": "export.pdb · {tracks} tracks · no playlists",
  "library.stickHealth.fact.dbFail": "export.pdb missing or unreadable",
  "library.stickHealth.fact.library": "Player library",
  "library.stickHealth.fact.libraryNone": "no OneLibrary — players read export.pdb",
  "library.stickHealth.fact.librarySynced": "OneLibrary current, written by rekordbox",
  "library.stickHealth.fact.libraryStale": "older than your playlists — “Prepare for player” turns green",
  "library.stickHealth.fact.libraryAside": "OneLibrary is safely in SETBUILDER-Backup",
  "library.stickHealth.fact.setform": "SETBUILDER playlists",
  "library.stickHealth.fact.setformNone": "none on the stick yet",
  "library.stickHealth.fact.tech": "Technical",
  "library.stickHealth.fact.techLine": "USBANLZ {analysis} · SETBUILDER folder {sidecar}",
  "library.stickHealth.present": "present",
  "library.stickHealth.missing": "missing",
  "library.stickHealth.why": "CDJ-3000, XDJ-XZ and older read export.pdb. CDJ-3000X, XDJ-AZ and OPUS-QUAD need a player library from rekordbox. Always eject before the player.",
  "library.stickHealth.fix.prepare": "Prepare for player",
  "library.stickHealth.fix.preparing": "Preparing…",
  "library.stickHealth.fix.done": "Green. Stick is prepared — now eject, then put it in the player.",
  "library.stickHealth.fix.restored": "Player library is back on the stick.",
  "library.stickHealth.fix.confirm": "The old player library (exportLibrary.db) will go to SETBUILDER-Backup. After that the status turns green for CDJ-3000, XDJ-XZ and older — they will read your playlists. CDJ-3000X, XDJ-AZ and OPUS-QUAD still will not see a library without rekordbox. Continue?",
  "library.stickHealth.fix.eject": "Eject",
  "library.stickHealth.fix.ejecting": "Ejecting…",
  "library.stickHealth.fix.ejected": "Ejected. Unplug the stick and put it in the player.",
  "library.stickHealth.fix.ejectFailed":
    "Eject failed. Do not unplug — tap “Repair stick”, then eject again (or use Finder).",
  "library.stickHealth.fix.repair": "Repair stick",
  "library.stickHealth.fix.repairing": "Repairing stick…",
  "library.stickHealth.fix.repaired":
    "Repair done. Eject now — only then unplug and put it in the player.",
  "library.stickHealth.fix.repairFailed":
    "Repair failed. Try Disk Utility First Aid, then eject here again.",
  "library.stickHealth.fix.restore": "Put OneLibrary back",
  "library.stickHealth.fix.failed": "That did not work. Is the stick still plugged in and access allowed?",
  "library.stickHealth.prepare.open": "Open rekordbox",
  "library.stickHealth.prepare.opening": "Opening rekordbox…",
  "library.stickHealth.prepare.opened": "rekordbox is running. Eject the stick there, then check again here.",
  "library.stickHealth.prepare.failed": "rekordbox could not be opened.",
  "library.stickWrite.healHint":
    "To heal in SETBUILDER: “Restore backup” puts export.pdb back; “Put OneLibrary back” / “Prepare for player” fixes the player library; if the player shows read-only, “Repair stick” first, then eject cleanly.",
  "library.menu.reset": "Reset",
  "library.menu.resetHint":
    "Clear the set and return to the sample brief. Saved setups stay.",
};

export const library = { de, en };
