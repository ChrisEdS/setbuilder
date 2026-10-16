// Area "library": keys start with "library.". Declare `de` first, then type `en` against it.
const de = {
  // Shared
  "library.loading": "Lade…",

  // Library panel: header and status
  "library.panel.aria": "Set laden und Keys",
  "library.panel.title": "Set laden & Keys",
  "library.panel.intro":
    "Erster Schritt: ein fertiges Set vom Rekordbox-Stick laden, mit Key, BPM und Dateipfad. Danach Keys und BPM aus Rekordbox, Tidal oder CSV an die Tracks legen.",
  "library.coverage.aria": "Key-Abdeckung",
  "library.status.noSet": "Noch kein Set — zuerst eine Playlist vom Stick laden",
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
  "library.collection.body":
    "Ohne Stick: Collection als XML exportieren. Keys und BPM werden per Artist/Title aufs bestehende Set gematcht. Unverschlüsselte {db} und CSV gehen auch.",
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
  "library.browser.rewrite": "Keys & BPM neu schreiben",
  "library.browser.rewriteTip":
    "Schreibt Key und BPM aus dieser Liste in die Tracks deiner Setliste. Gefunden wird über Artist und Titel. Vorhandene Werte werden überschrieben. Tracks ohne Treffer und leere Felder in der Liste lassen den alten Wert stehen.",
  "library.browser.note":
    "Alle Tracks aus der geladenen Rekordbox-Datenbank. Suche nach Artist, Titel, Key oder Playlist — rechts eine Playlist wählen filtert genau darauf. Mit ▶ hörst du rein, mit „{add}“ legst du einen Track in Phase und Rolle. „{rewrite}“ gleicht die Setliste ab.",
  "library.browser.empty":
    "Noch kein Index. Nach dem Collection-Import kannst du hier suchen und erneut matchen.",
  "library.add.title": "Beim Hinzufügen",
  "library.add.phase": "Phase",
  "library.add.role": "Rolle",
  "library.add.fits": "Passt zu",
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
  "library.stick.loadSet": "Als Set laden",
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
    "Zugangsdaten werden nur auf diesem Rechner gespeichert. Beatport braucht keinen Login, Track-Links lassen sich direkt einfügen.",
  "library.connection.spotifyTitleReady": "Spotify · bereit",
  "library.connection.spotifyTitleMissing": "Spotify · optional",
  "library.connection.tidalTitleReady": "Tidal · bereit",
  "library.connection.tidalTitleOptional": "Tidal · optional",
  "library.connection.spotifyOpen": "Developer Dashboard öffnen",
  "library.connection.spotifyStep2": "App anlegen und die Redirect URI exakt eintragen.",
  "library.connection.spotifyStep3": "Client ID und Secret hier einfügen.",
  "library.connection.tidalOpen": "Tidal Developer öffnen",
  "library.connection.tidalScopes": "Scopes {read} und {playlists} einschalten.",
  "library.connection.tidalStep3":
    "Dieselbe Redirect URI eintragen, dann ID und Secret hier einfügen.",
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
  "library.menu.take": "Mitnehmen",
  "library.menu.pdfHint":
    "Druckansicht mit Brief, Reihenfolge, Key, BPM, Übergang und Alternativen. Im Dialog „Als PDF speichern“ wählen.",
  "library.menu.rekordboxHint": "Datei SETBUILDER-rekordbox.xml zum Import in rekordbox (Anleitung nach dem Speichern). Performance und Alternativen als zwei Playlists.",
  "library.menu.m3uHint": "Playlist der Performance-Reihenfolge für Player, die M3U lesen.",
  "library.menu.copyText": "Text kopieren",
  "library.menu.copyTextHint": "Set mit Brief, Kommentaren und Alternativen in die Zwischenablage.",
  "library.menu.stick": "Auf Stick schreiben",
  "library.menu.stickHint": "Das Set als Playlist direkt in die Datenbank eines rekordbox-Sticks, mit Sicherung.",
  "library.stickWrite.title": "Set auf den Stick schreiben",
  "library.stickWrite.intro": "SETBUILDER legt das Set als Playlist in die Datenbank deines rekordbox-Sticks. Danach kommt der Stick in den Player. Die rekordbox-Bibliothek auf diesem Rechner wird nicht angefasst.",
  "library.stickWrite.safety": "Vorher kopiert SETBUILDER die Stick-Datenbank in den Ordner SETBUILDER-Backup auf dem Stick und prüft die Kopie. Nach dem Schreiben wird die Datenbank noch einmal gelesen und geprüft. Besteht sie die Prüfung nicht, wird der alte Stand zurückgesetzt.",
  "library.stickWrite.choose": "Stick wählen",
  "library.stickWrite.chooseHint": "Den ganzen Stick wählen, nicht einen Unterordner. Der Browser fragt dafür um Erlaubnis.",
  "library.stickWrite.unsupported": "Dieser Browser darf nicht auf Laufwerke schreiben. Chrome, Edge oder die SETBUILDER-Desktop-App verwenden, oder den rekordbox-Export nutzen.",
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
  "library.stickWrite.rewriteHint": "SETBUILDER legt zuerst das letzte Backup zurück und schreibt dann das aktuelle Set neu. Die rekordbox-Bibliothek auf diesem Rechner bleibt unangetastet.",
  "library.stickWrite.rewriteConfirm": "Das letzte SETBUILDER-Backup kommt zurück, danach wird das aktuelle Set neu geschrieben. Fortfahren?",
  "library.stickWrite.suggestTitle": "Ähnliche Titel auf dem Stick — meinst du einen davon?",
  "library.stickWrite.suggestUse": "Diesen nehmen",
  "library.stickWrite.doneAlts": "Alternativen: „{name}“.",
  "library.stickWrite.sidecar": "Zusätzlich auf dem Stick im Ordner SETBUILDER: {files}. Neuere Player, die exportLibrary.db lesen, können die Playlists in export.pdb ignorieren — die XML dort ist der sichere Weg zurück nach rekordbox.",
  "library.stickWrite.oneLibrary": "Auf diesem Stick liegt auch exportLibrary.db. Neuere Player lesen diese Datei statt export.pdb und zeigen die Playlist dann eventuell nicht an. SETBUILDER legt deshalb XML und M3U in den Ordner SETBUILDER auf den Stick.",
  "library.stickWrite.refused": "Dieser Stick kann nicht sicher beschrieben werden. {reason}",
  "library.stickWrite.write": "Auf Stick schreiben",
  "library.stickWrite.done": "Fertig: „{name}“ mit {count} Titeln steht auf dem Stick.",
  "library.stickWrite.doneBackup": "Sicherung: SETBUILDER-Backup/{backup}. Den Stick im Betriebssystem auswerfen, bevor du ihn abziehst.",
  "library.stickWrite.restore": "Letzte Sicherung zurückspielen",
  "library.stickWrite.restoreConfirm": "Die Stick-Datenbank wird durch die letzte SETBUILDER-Sicherung ersetzt. Playlists, die SETBUILDER danach angelegt hat, verschwinden wieder. Fortfahren?",
  "library.stickWrite.restoreDone": "Zurückgespielt: {backup}.",
  "library.stickWrite.close": "Schließen",
  "library.stickWrite.cancel": "Abbrechen",
  // Stick health strip: one verdict, one action, facts folded away
  "library.stickHealth.title": "Stick im Player",
  "library.stickHealth.verdict.ready": "Bereit für CDJ-3000, XDJ-XZ und ältere Player.",
  "library.stickHealth.verdict.readySynced": "Bereit für alle Player — rekordbox hat die Bibliothek erneuert.",
  "library.stickHealth.verdict.readyAside": "Bereit für CDJ-3000 und XDJ-XZ. Alte Bibliothek liegt sicher im Backup.",
  "library.stickHealth.verdict.needsRekordbox": "Player würden noch die alte rekordbox-Bibliothek zeigen, nicht deine Playlists.",
  "library.stickHealth.verdict.needsRekordboxFiles": "Stick braucht rekordbox, bevor er im Player läuft.",
  "library.stickHealth.verdict.hiddenFolder": "Ordner heißt .PIONEER (versteckt) — viele Player finden ihn trotzdem.",
  "library.stickHealth.verdict.empty": "Die Datenbank auf dem Stick hat noch keine Playlists.",
  "library.stickHealth.verdict.broken": "Keine lesbare rekordbox-Datenbank auf diesem Stick.",
  "library.stickHealth.verdict.incomplete": "Nur eine Datei gewählt — für den Player-Check den ganzen Stick wählen.",
  "library.stickHealth.next.eject": "Nächster Schritt: Auswerfen, dann Stick in den Player stecken.",
  "library.stickHealth.next.prepare": "Nächster Schritt: Für Player vorbereiten — alte Bibliothek zur Seite legen.",
  "library.stickHealth.next.openRekordbox": "Nächster Schritt: In rekordbox öffnen und den Stick dort auswerfen.",
  "library.stickHealth.meaning.ready":
    "Die Stick-Datenbank ist lesbar. CDJ-3000, XDJ-XZ und ältere Player zeigen deine Playlists. Vor dem Abziehen immer auswerfen.",
  "library.stickHealth.meaning.readySynced":
    "rekordbox hat die Player-Bibliothek geschrieben. Auch neuere Player (CDJ-3000X, XDJ-AZ, OPUS-QUAD) sollten den Stick finden.",
  "library.stickHealth.meaning.readyAside":
    "Die alte OneLibrary liegt im Backup, damit der Player deine aktuellen Playlists aus export.pdb liest. Das ist beabsichtigt — nicht kaputt.",
  "library.stickHealth.meaning.readyAsideHidden":
    "Vorbereitung ist durch. Die alte Bibliothek liegt im Backup. Der Ordner heißt .PIONEER (versteckt) — auf vielen Sticks normal. Auswerfen und in den Player; wenn nichts erscheint, Stick in rekordbox öffnen.",
  "library.stickHealth.meaning.needsRekordbox":
    "Auf dem Stick liegt noch eine ältere Player-Bibliothek. Ohne Vorbereitung zeigen CDJ-3000 und XDJ-XZ die alten Playlists. „Für Player vorbereiten“ legt sie sicher zur Seite.",
  "library.stickHealth.meaning.needsRekordboxFiles":
    "Dieser Stick braucht rekordbox, bevor ein Player die Bibliothek findet. In rekordbox den Stick öffnen, auswerfen und die Device Library schreiben lassen.",
  "library.stickHealth.meaning.hiddenFolder":
    "Pioneer speichert die Bibliothek oft als versteckten Ordner .PIONEER. Viele CDJs finden ihn. Wenn der Player leer bleibt: Stick in rekordbox öffnen — rekordbox legt oft PIONEER ohne Punkt an.",
  "library.stickHealth.meaning.empty":
    "export.pdb ist da, enthält aber noch keine Playlists. Zuerst Sets auf den Stick schreiben, dann erneut prüfen.",
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
    "Alte Player-Bibliothek sicher zur Seite legen, damit der Player deine aktuellen Playlists liest. Danach auswerfen.",
  "library.stickHealth.tip.eject":
    "Stick sicher auswerfen, bevor du ihn abziehst und in den Player steckst.",
  "library.stickHealth.tip.openRekordbox":
    "rekordbox öffnen, dort den Stick auswerfen und die Player-Bibliothek schreiben lassen.",
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
  "library.stickHealth.fact.libraryStale": "OneLibrary älter als deine Playlists",
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
  "library.stickHealth.fix.done": "Fertig. Stick ist vorbereitet — jetzt auswerfen, dann in den Player.",
  "library.stickHealth.fix.restored": "Player-Bibliothek liegt wieder auf dem Stick.",
  "library.stickHealth.fix.confirm": "Die alte Player-Bibliothek (exportLibrary.db) kommt nach SETBUILDER-Backup. CDJ-3000, XDJ-XZ und ältere Player lesen dann deine Playlists. CDJ-3000X, XDJ-AZ und OPUS-QUAD sehen ohne rekordbox weiter keine Bibliothek. Fortfahren?",
  "library.stickHealth.fix.eject": "Auswerfen",
  "library.stickHealth.fix.ejecting": "Werfe aus…",
  "library.stickHealth.fix.ejected": "Ausgeworfen. Stick abziehen und in den Player.",
  "library.stickHealth.fix.ejectFailed": "Auswerfen hat nicht geklappt. Im Finder auswerfen, bevor du ihn abziehst.",
  "library.stickHealth.fix.restore": "OneLibrary zurücklegen",
  "library.stickHealth.fix.failed": "Hat nicht geklappt. Stick noch eingesteckt und Zugriff erlaubt?",
  "library.stickHealth.prepare.open": "rekordbox öffnen",
  "library.stickHealth.prepare.opening": "Öffne rekordbox…",
  "library.stickHealth.prepare.opened": "rekordbox läuft. Dort den Stick auswerfen, dann hier erneut prüfen.",
  "library.stickHealth.prepare.failed": "rekordbox ließ sich nicht öffnen.",
  "library.menu.more": "Weitere Aktionen",
  "library.menu.reset": "Zurücksetzen",
  "library.menu.resetHint":
    "Set leeren und zum Beispiel-Brief zurück. Gespeicherte Setups bleiben.",
} as const;

const en: Record<keyof typeof de, string> = {
  // Shared
  "library.loading": "Loading…",

  // Library panel: header and status
  "library.panel.aria": "Load set and keys",
  "library.panel.title": "Load set & keys",
  "library.panel.intro":
    "First step: load a finished set from the rekordbox stick, with key, BPM and file path. Then put keys and BPM from rekordbox, Tidal or CSV onto the tracks.",
  "library.coverage.aria": "Key coverage",
  "library.status.noSet": "No set yet — load a playlist from the stick first",
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
  "library.collection.body":
    "Without a stick: export the collection as XML. Key and BPM are matched onto the existing set by artist/title. An unencrypted {db} and CSV work too.",
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
  "library.browser.rewrite": "Rewrite keys & BPM",
  "library.browser.rewriteTip":
    "Writes key and BPM from this list into the tracks of your setlist. Tracks are found by artist and title. Existing values are overwritten. Tracks without a match and empty fields in the list keep their old value.",
  "library.browser.note":
    "All tracks from the loaded rekordbox database. Search by artist, title, key or playlist — pick a playlist on the right to filter to it exactly. Use ▶ to preview, “{add}” to put a track into phase and role. “{rewrite}” syncs the setlist.",
  "library.browser.empty":
    "No index yet. After importing the collection you can search here and match again.",
  "library.add.title": "When adding",
  "library.add.phase": "Phase",
  "library.add.role": "Role",
  "library.add.fits": "Fits after",
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
  "library.stick.loadSet": "Load as set",
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
    "Credentials are only stored on this computer. Beatport needs no login, track links can be pasted directly.",
  "library.connection.spotifyTitleReady": "Spotify · ready",
  "library.connection.spotifyTitleMissing": "Spotify · optional",
  "library.connection.tidalTitleReady": "Tidal · ready",
  "library.connection.tidalTitleOptional": "Tidal · optional",
  "library.connection.spotifyOpen": "Open Developer Dashboard",
  "library.connection.spotifyStep2": "Create an app and enter the redirect URI exactly.",
  "library.connection.spotifyStep3": "Paste client ID and secret here.",
  "library.connection.tidalOpen": "Open Tidal Developer",
  "library.connection.tidalScopes": "Enable the scopes {read} and {playlists}.",
  "library.connection.tidalStep3":
    "Enter the same redirect URI, then paste ID and secret here.",
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
  "library.menu.take": "Take with you",
  "library.menu.pdfHint":
    "Print view with brief, order, key, BPM, transition and alternatives. Choose “Save as PDF” in the dialog.",
  "library.menu.rekordboxHint": "File SETBUILDER-rekordbox.xml to import into rekordbox (steps shown after saving). Performance and alternatives as two playlists.",
  "library.menu.m3uHint": "Playlist of the performance order for players that read M3U.",
  "library.menu.copyText": "Copy text",
  "library.menu.copyTextHint": "Set with brief, comments and alternatives to the clipboard.",
  "library.menu.stick": "Write to stick",
  "library.menu.stickHint": "The set as a playlist straight into the database of a rekordbox stick, with a backup.",
  "library.stickWrite.title": "Write the set to the stick",
  "library.stickWrite.intro": "SETBUILDER adds the set as a playlist to the database of your rekordbox stick. Then the stick goes into the player. The rekordbox library on this computer is not touched.",
  "library.stickWrite.safety": "First SETBUILDER copies the stick database to the folder SETBUILDER-Backup on the stick and checks the copy. After writing, the database is read again and checked. If it fails the check, the old state is put back.",
  "library.stickWrite.choose": "Choose stick",
  "library.stickWrite.chooseHint": "Choose the whole stick, not a subfolder. Your browser asks for permission.",
  "library.stickWrite.unsupported": "This browser can't write to drives. Use Chrome, Edge or the SETBUILDER desktop app, or use the rekordbox export.",
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
  "library.stickWrite.rewriteHint": "SETBUILDER first puts the last backup back, then writes the current set again. The rekordbox library on this computer is left alone.",
  "library.stickWrite.rewriteConfirm": "The last SETBUILDER backup will be restored, then the current set will be written again. Continue?",
  "library.stickWrite.suggestTitle": "Similar titles on the stick — did you mean one of these?",
  "library.stickWrite.suggestUse": "Use this",
  "library.stickWrite.doneAlts": "Alternatives: “{name}”.",
  "library.stickWrite.sidecar": "Also on the stick in the SETBUILDER folder: {files}. Newer players that read exportLibrary.db may ignore the playlists in export.pdb — the XML there is the reliable way back into rekordbox.",
  "library.stickWrite.oneLibrary": "This stick also has exportLibrary.db. Newer players read that file instead of export.pdb and may not show the playlist. SETBUILDER therefore puts XML and M3U in the SETBUILDER folder on the stick.",
  "library.stickWrite.refused": "This stick can't be written to safely. {reason}",
  "library.stickWrite.write": "Write to stick",
  "library.stickWrite.done": "Done: “{name}” with {count} tracks is on the stick.",
  "library.stickWrite.doneBackup": "Backup: SETBUILDER-Backup/{backup}. Eject the stick in your operating system before you pull it out.",
  "library.stickWrite.restore": "Restore last backup",
  "library.stickWrite.restoreConfirm": "The stick database will be replaced by the last SETBUILDER backup. Playlists SETBUILDER added after it disappear again. Continue?",
  "library.stickWrite.restoreDone": "Restored: {backup}.",
  "library.stickWrite.close": "Close",
  "library.stickWrite.cancel": "Cancel",
  // Stick health strip: one verdict, one action, facts folded away
  "library.stickHealth.title": "Stick in the player",
  "library.stickHealth.verdict.ready": "Ready for CDJ-3000, XDJ-XZ and older players.",
  "library.stickHealth.verdict.readySynced": "Ready for all players — rekordbox refreshed the library.",
  "library.stickHealth.verdict.readyAside": "Ready for CDJ-3000 and XDJ-XZ. Old library is safely in the backup.",
  "library.stickHealth.verdict.needsRekordbox": "Players would still show the old rekordbox library, not your playlists.",
  "library.stickHealth.verdict.needsRekordboxFiles": "Stick needs rekordbox before it works in the player.",
  "library.stickHealth.verdict.hiddenFolder": "Folder is named .PIONEER (hidden) — many players still find it.",
  "library.stickHealth.verdict.empty": "The database on the stick has no playlists yet.",
  "library.stickHealth.verdict.broken": "No readable rekordbox database on this stick.",
  "library.stickHealth.verdict.incomplete": "Only one file picked — choose the whole stick for the player check.",
  "library.stickHealth.next.eject": "Next: eject, then put the stick in the player.",
  "library.stickHealth.next.prepare": "Next: prepare for the player — move the old library aside.",
  "library.stickHealth.next.openRekordbox": "Next: open in rekordbox and eject the stick there.",
  "library.stickHealth.meaning.ready":
    "The stick database is readable. CDJ-3000, XDJ-XZ and older players will show your playlists. Always eject before you unplug.",
  "library.stickHealth.meaning.readySynced":
    "rekordbox has written the player library. Newer players (CDJ-3000X, XDJ-AZ, OPUS-QUAD) should find the stick too.",
  "library.stickHealth.meaning.readyAside":
    "The old OneLibrary is in the backup so the player reads your current playlists from export.pdb. That is intentional — not broken.",
  "library.stickHealth.meaning.readyAsideHidden":
    "Prepare is done. The old library is in the backup. The folder is named .PIONEER (hidden) — normal on many sticks. Eject and try the player; if it stays empty, open the stick in rekordbox.",
  "library.stickHealth.meaning.needsRekordbox":
    "An older player library is still on the stick. Without prepare, CDJ-3000 and XDJ-XZ show the old playlists. “Prepare for player” moves it aside safely.",
  "library.stickHealth.meaning.needsRekordboxFiles":
    "This stick needs rekordbox before a player finds the library. Open the stick in rekordbox, eject there, and let it write the device library.",
  "library.stickHealth.meaning.hiddenFolder":
    "Pioneer often stores the library as a hidden .PIONEER folder. Many CDJs find it. If the player stays empty: open the stick in rekordbox — it often creates PIONEER without the dot.",
  "library.stickHealth.meaning.empty":
    "export.pdb is there but has no playlists yet. Write sets to the stick first, then check again.",
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
    "Move the old player library aside safely so the player reads your current playlists. Then eject.",
  "library.stickHealth.tip.eject":
    "Eject the stick safely before you unplug it and put it in the player.",
  "library.stickHealth.tip.openRekordbox":
    "Open rekordbox, eject the stick there, and let it write the player library.",
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
  "library.stickHealth.fact.libraryStale": "OneLibrary older than your playlists",
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
  "library.stickHealth.fix.done": "Done. Stick is prepared — now eject, then put it in the player.",
  "library.stickHealth.fix.restored": "Player library is back on the stick.",
  "library.stickHealth.fix.confirm": "The old player library (exportLibrary.db) will go to SETBUILDER-Backup. CDJ-3000, XDJ-XZ and older players will then read your playlists. CDJ-3000X, XDJ-AZ and OPUS-QUAD still will not see a library without rekordbox. Continue?",
  "library.stickHealth.fix.eject": "Eject",
  "library.stickHealth.fix.ejecting": "Ejecting…",
  "library.stickHealth.fix.ejected": "Ejected. Unplug the stick and put it in the player.",
  "library.stickHealth.fix.ejectFailed": "Eject failed. Eject in Finder before you pull it out.",
  "library.stickHealth.fix.restore": "Put OneLibrary back",
  "library.stickHealth.fix.failed": "That did not work. Is the stick still plugged in and access allowed?",
  "library.stickHealth.prepare.open": "Open rekordbox",
  "library.stickHealth.prepare.opening": "Opening rekordbox…",
  "library.stickHealth.prepare.opened": "rekordbox is running. Eject the stick there, then check again here.",
  "library.stickHealth.prepare.failed": "rekordbox could not be opened.",
  "library.menu.more": "More actions",
  "library.menu.reset": "Reset",
  "library.menu.resetHint":
    "Clear the set and return to the sample brief. Saved setups stay.",
};

export const library = { de, en };
