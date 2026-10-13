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
  "library.sources.tidalMissingNote":
    "Tidal-Zugangsdaten fehlen. Unter „Verbindungen & Setups“ eintragen.",
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
  "library.browser.searchPlaceholder": "Artist, Titel oder Key…",
  "library.browser.searchAria": "rekordbox suchen",
  "library.browser.rewrite": "Keys & BPM neu schreiben",
  "library.browser.rewriteTip":
    "Schreibt Key und BPM aus dieser Liste in die Tracks deiner Setliste. Gefunden wird über Artist und Titel. Vorhandene Werte werden überschrieben. Tracks ohne Treffer und leere Felder in der Liste lassen den alten Wert stehen.",
  "library.browser.note":
    "Alle Tracks aus der geladenen Rekordbox-Datenbank. Mit ▶ hörst du rein, mit „{add}“ legst du einen Track in Phase und Rolle deiner Wahl. „{rewrite}“ gleicht die Setliste mit dieser Liste ab.",
  "library.browser.empty":
    "Noch kein Index. Nach dem Collection-Import kannst du hier suchen und erneut matchen.",
  "library.add.title": "Beim Hinzufügen",
  "library.add.phase": "Phase",
  "library.add.role": "Rolle",
  "library.add.fits": "Passt zu",
  "library.add.allTracks": "Alle Tracks",
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
    "Seite neu laden. SETFORM muss auf diesem Rechner laufen, nicht auf einem fremden Server.",
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
  "library.connection.spotifyTitleMissing": "Spotify · fehlt",
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
  "library.menu.rekordboxHint": "Datei SETFORM-rekordbox.xml zum Import in rekordbox (Anleitung nach dem Speichern). Performance und Alternativen als zwei Playlists.",
  "library.menu.m3uHint": "Playlist der Performance-Reihenfolge für Player, die M3U lesen.",
  "library.menu.copyText": "Text kopieren",
  "library.menu.copyTextHint": "Set mit Brief, Kommentaren und Prinzipien in die Zwischenablage.",
  "library.menu.stick": "Auf Stick schreiben",
  "library.menu.stickHint": "Das Set als Playlist direkt in die Datenbank eines rekordbox-Sticks, mit Sicherung.",
  "library.stickWrite.title": "Set auf den Stick schreiben",
  "library.stickWrite.intro": "SETFORM legt das Set als Playlist in die Datenbank deines rekordbox-Sticks. Danach kommt der Stick in den Player. Die rekordbox-Bibliothek auf diesem Rechner wird nicht angefasst.",
  "library.stickWrite.safety": "Vorher kopiert SETFORM die Stick-Datenbank in den Ordner SETFORM-Backup auf dem Stick und prüft die Kopie. Nach dem Schreiben wird die Datenbank noch einmal gelesen und geprüft. Besteht sie die Prüfung nicht, wird der alte Stand zurückgesetzt.",
  "library.stickWrite.choose": "Stick wählen",
  "library.stickWrite.chooseHint": "Den ganzen Stick wählen, nicht einen Unterordner. Ihr Browser fragt dafür um Erlaubnis.",
  "library.stickWrite.unsupported": "Dieser Browser darf nicht auf Laufwerke schreiben. Chrome, Edge oder die SETFORM-Desktop-App verwenden, oder den rekordbox-Export nutzen.",
  "library.stickWrite.busy.reading": "Lese den Stick…",
  "library.stickWrite.busy.writing": "Schreibe und prüfe…",
  "library.stickWrite.busy.restoring": "Spiele die Sicherung zurück…",
  "library.stickWrite.found": "{found} von {total} Titeln liegen auf dem Stick.",
  "library.stickWrite.allFound": "Alle {total} Titel liegen auf dem Stick.",
  "library.stickWrite.missingTitle": "Nicht auf dem Stick, werden ausgelassen:",
  "library.stickWrite.missingMore": "… und {count} weitere",
  "library.stickWrite.noneFound": "Keiner der Titel liegt auf diesem Stick. Das Set muss aus Titeln bestehen, die du in rekordbox auf diesen Stick exportiert hast.",
  "library.stickWrite.willWrite": "Wird geschrieben: Playlist „{name}“ mit {count} Titeln.",
  "library.stickWrite.oneLibrary": "Auf diesem Stick liegt auch exportLibrary.db. Neuere Player lesen diese Datei statt export.pdb und zeigen die Playlist dann eventuell nicht an. In dem Fall den rekordbox-Export nutzen.",
  "library.stickWrite.refused": "Dieser Stick kann nicht sicher beschrieben werden. {reason}",
  "library.stickWrite.write": "Auf Stick schreiben",
  "library.stickWrite.done": "Fertig: „{name}“ mit {count} Titeln steht auf dem Stick.",
  "library.stickWrite.doneBackup": "Sicherung: SETFORM-Backup/{backup}. Den Stick im Betriebssystem auswerfen, bevor du ihn abziehst.",
  "library.stickWrite.restore": "Letzte Sicherung zurückspielen",
  "library.stickWrite.restoreConfirm": "Die Stick-Datenbank wird durch die letzte SETFORM-Sicherung ersetzt. Playlists, die SETFORM danach angelegt hat, verschwinden wieder. Fortfahren?",
  "library.stickWrite.restoreDone": "Zurückgespielt: {backup}.",
  "library.stickWrite.close": "Schließen",
  "library.stickWrite.cancel": "Abbrechen",
  "library.menu.more": "Weitere Aktionen",
  "library.menu.reset": "Zurücksetzen",
  "library.menu.resetHint": "Set leeren und zum leeren Brief zurück. Gespeicherte Setups bleiben.",
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
  "library.sources.tidalMissingNote":
    "Tidal credentials are missing. Enter them under “Connections & setups”.",
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
  "library.browser.searchPlaceholder": "Artist, title or key…",
  "library.browser.searchAria": "Search rekordbox",
  "library.browser.rewrite": "Rewrite keys & BPM",
  "library.browser.rewriteTip":
    "Writes key and BPM from this list into the tracks of your setlist. Tracks are found by artist and title. Existing values are overwritten. Tracks without a match and empty fields in the list keep their old value.",
  "library.browser.note":
    "All tracks from the loaded rekordbox database. Use ▶ to preview, use “{add}” to put a track into the phase and role of your choice. “{rewrite}” syncs the setlist with this list.",
  "library.browser.empty":
    "No index yet. After importing the collection you can search here and match again.",
  "library.add.title": "When adding",
  "library.add.phase": "Phase",
  "library.add.role": "Role",
  "library.add.fits": "Fits after",
  "library.add.allTracks": "All tracks",
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
    "Reload the page. SETFORM has to run on this computer, not on a remote server.",
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
  "library.connection.spotifyTitleMissing": "Spotify · missing",
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
  "library.menu.rekordboxHint": "File SETFORM-rekordbox.xml to import into rekordbox (steps shown after saving). Performance and alternatives as two playlists.",
  "library.menu.m3uHint": "Playlist of the performance order for players that read M3U.",
  "library.menu.copyText": "Copy text",
  "library.menu.copyTextHint": "Set with brief, comments and principles to the clipboard.",
  "library.menu.stick": "Write to stick",
  "library.menu.stickHint": "The set as a playlist straight into the database of a rekordbox stick, with a backup.",
  "library.stickWrite.title": "Write the set to the stick",
  "library.stickWrite.intro": "SETFORM adds the set as a playlist to the database of your rekordbox stick. Then the stick goes into the player. The rekordbox library on this computer is not touched.",
  "library.stickWrite.safety": "First SETFORM copies the stick database to the folder SETFORM-Backup on the stick and checks the copy. After writing, the database is read again and checked. If it fails the check, the old state is put back.",
  "library.stickWrite.choose": "Choose stick",
  "library.stickWrite.chooseHint": "Choose the whole stick, not a subfolder. Your browser asks for permission.",
  "library.stickWrite.unsupported": "This browser can't write to drives. Use Chrome, Edge or the SETFORM desktop app, or use the rekordbox export.",
  "library.stickWrite.busy.reading": "Reading the stick…",
  "library.stickWrite.busy.writing": "Writing and checking…",
  "library.stickWrite.busy.restoring": "Restoring the backup…",
  "library.stickWrite.found": "{found} of {total} tracks are on the stick.",
  "library.stickWrite.allFound": "All {total} tracks are on the stick.",
  "library.stickWrite.missingTitle": "Not on the stick, left out:",
  "library.stickWrite.missingMore": "… and {count} more",
  "library.stickWrite.noneFound": "None of the tracks are on this stick. The set has to consist of tracks you exported to this stick in rekordbox.",
  "library.stickWrite.willWrite": "Will be written: playlist “{name}” with {count} tracks.",
  "library.stickWrite.oneLibrary": "This stick also has exportLibrary.db. Newer players read that file instead of export.pdb and may not show the playlist. In that case use the rekordbox export.",
  "library.stickWrite.refused": "This stick can't be written to safely. {reason}",
  "library.stickWrite.write": "Write to stick",
  "library.stickWrite.done": "Done: “{name}” with {count} tracks is on the stick.",
  "library.stickWrite.doneBackup": "Backup: SETFORM-Backup/{backup}. Eject the stick in your operating system before you pull it out.",
  "library.stickWrite.restore": "Restore last backup",
  "library.stickWrite.restoreConfirm": "The stick database will be replaced by the last SETFORM backup. Playlists SETFORM added after it disappear again. Continue?",
  "library.stickWrite.restoreDone": "Restored: {backup}.",
  "library.stickWrite.close": "Close",
  "library.stickWrite.cancel": "Cancel",
  "library.menu.more": "More actions",
  "library.menu.reset": "Reset",
  "library.menu.resetHint": "Clear the set and return to the empty brief. Saved setups stay.",
};

export const library = { de, en };
