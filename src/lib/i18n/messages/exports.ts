// Area "exports": keys start with "exports.". Declare `de` first, then type `en` against it.
// Covers the export builders (PDF, text, rekordbox XML) and the client-side importers/parsers.
const de = {
  // Locale used for dates in generated documents; its language part is the <html lang>.
  "exports.locale": "de-DE",

  // PDF / print view
  "exports.pdf.title": "{title} — Ausdruck",
  "exports.pdf.untitled": "Ohne Titel",
  "exports.pdf.brand": "SETFORM · Ausdruck",
  "exports.pdf.toolbarHint": "Ausdruck für die Kabine. Im Druckdialog „Als PDF speichern“ wählen.",
  "exports.pdf.print": "Drucken / PDF",
  "exports.pdf.close": "Schließen",
  "exports.pdf.backupNote": "Ersatz-Notiz: {text}",
  "exports.pdf.durationOpen": "Dauer einzelner Tracks offen: Startzeiten ab dort ungenau.",
  "exports.pdf.alternatives": "Alternativen",
  "exports.pdf.colStart": "Start",
  "exports.pdf.colTrack": "Track",
  "exports.pdf.colKey": "Key",
  "exports.pdf.colBpm": "BPM",
  "exports.pdf.colFromPrevious": "Von davor",
  "exports.pdf.briefOverBrief": " · über dem Brief",
  "exports.pdf.briefTrackCounts": "{performance} Performance · {alternatives} Alternativen",
  "exports.pdf.popupBlocked": "Popup blockiert — bitte Popups für SETFORM erlauben und erneut exportieren.",

  // Text export
  "exports.text.target": "Ziel: {target} min · Ist: {actual}",

  // rekordbox booth export
  "exports.booth.pathMissing": "Pfad fehlt — in rekordbox der Datei zuordnen",
  "exports.booth.alternativesPlaylist": "{title} Alternativen",

  // rekordbox collection / master.db / CSV import
  "exports.rekordbox.invalidXml": "Ungültiges XML — rekordbox Export Collection (.xml) erwartet.",
  "exports.rekordbox.noKeyTracks": "Keine Tracks mit Key/BPM im XML gefunden. In rekordbox: Analysis → Key analysieren, dann Collection als XML exportieren.",
  "exports.rekordbox.dbEncrypted": "rekordbox master.db ist verschlüsselt (SQLCipher ab v6). Bitte in rekordbox: File → Export Collection in XML… und die .xml hier laden.",
  "exports.rekordbox.noContentTable": "Keine Content-Tabelle gefunden ({tables}). Nutze XML-Export.",
  "exports.rekordbox.noContentTableEmpty": "Keine Content-Tabelle gefunden (leer). Nutze XML-Export.",
  "exports.rekordbox.noTitleColumn": "Title-Spalte in der DB nicht gefunden — bitte XML exportieren.",
  "exports.rekordbox.dbNoRows": "DB gelesen, aber keine Key/BPM-Zeilen. In rekordbox Keys analysieren oder XML exportieren.",
  "exports.rekordbox.dbWarning": "Unverschlüsselte DB gelesen. Für rekordbox 6+ ist XML-Export zuverlässiger (Artist + Key).",
  "exports.rekordbox.csvNoColumns": "CSV ohne erkennbare Artist/Title/Key/BPM-Spalten.",
  "exports.rekordbox.unsupportedFile": "Bitte rekordbox Collection-XML (.xml), CSV oder master.db hochladen.",

  // rekordbox stick
  "exports.stick.noPlaylists": "Die XML enthält keine Playlists. Für Keys ohne Set-Reihenfolge die Collection laden.",
  "exports.stick.notFound": "Kein Rekordbox-Stick erkannt. Den Stick-Ordner wählen oder PIONEER/rekordbox/export.pdb.",
  "exports.stick.invalidXml": "Ungültiges XML.",
  "exports.stick.whyLibrary": "Aus der Stick-Bibliothek ins Set gelegt",
  "exports.stick.whyHistory": "Gespielte Reihenfolge aus der Rekordbox-History",
  "exports.stick.whyPlaylist": "Reihenfolge der Rekordbox-Playlist",

  // export.pdb
  "exports.pdb.tooSmall": "Die Datei ist zu klein für eine rekordbox export.pdb.",
  "exports.pdb.notPdb": "Das ist keine rekordbox export.pdb. Auf dem Stick liegt sie unter PIONEER/rekordbox/export.pdb.",
  "exports.pdb.empty": "export.pdb gelesen, aber ohne Tracks oder Playlists.",
  "exports.pdbWrite.unsupported": "Diese Stick-Datenbank hat ein Layout, das SETFORM nicht sicher beschreiben kann. Es wurde nichts verändert.",
  "exports.pdbWrite.noRoom": "In der Stick-Datenbank ist kein Platz mehr für eine weitere Playlist. Es wurde nichts verändert.",
  "exports.pdbWrite.unknownTracks": "Ein Titel des Sets liegt nicht in dieser Stick-Datenbank.",
  "exports.pdbWrite.verifyFailed": "Die Prüfung der neuen Stick-Datenbank ist fehlgeschlagen ({detail}).",
} as const;

const en: Record<keyof typeof de, string> = {
  "exports.locale": "en-GB",

  "exports.pdf.title": "{title} — Printout",
  "exports.pdf.untitled": "Untitled",
  "exports.pdf.brand": "SETFORM · Printout",
  "exports.pdf.toolbarHint": "Printout for the booth. Choose “Save as PDF” in the print dialog.",
  "exports.pdf.print": "Print / PDF",
  "exports.pdf.close": "Close",
  "exports.pdf.backupNote": "Backup note: {text}",
  "exports.pdf.durationOpen": "Some track lengths unknown: start times after them are approximate.",
  "exports.pdf.alternatives": "Alternatives",
  "exports.pdf.colStart": "Start",
  "exports.pdf.colTrack": "Track",
  "exports.pdf.colKey": "Key",
  "exports.pdf.colBpm": "BPM",
  "exports.pdf.colFromPrevious": "From previous",
  "exports.pdf.briefOverBrief": " · over the brief",
  "exports.pdf.briefTrackCounts": "{performance} Performance · {alternatives} Alternatives",
  "exports.pdf.popupBlocked": "Popup blocked — please allow popups for SETFORM and export again.",

  "exports.text.target": "Target: {target} min · Actual: {actual}",

  "exports.booth.pathMissing": "Path missing — relink the file in rekordbox",
  "exports.booth.alternativesPlaylist": "{title} Alternatives",

  "exports.rekordbox.invalidXml": "Invalid XML — a rekordbox Export Collection (.xml) is expected.",
  "exports.rekordbox.noKeyTracks": "No tracks with key/BPM found in the XML. In rekordbox: Analysis → analyze keys, then export the collection as XML.",
  "exports.rekordbox.dbEncrypted": "rekordbox master.db is encrypted (SQLCipher since v6). In rekordbox, use File → Export Collection in XML… and load the .xml here.",
  "exports.rekordbox.noContentTable": "No content table found ({tables}). Use the XML export.",
  "exports.rekordbox.noContentTableEmpty": "No content table found (empty). Use the XML export.",
  "exports.rekordbox.noTitleColumn": "Title column not found in the DB — please export XML.",
  "exports.rekordbox.dbNoRows": "DB read, but no key/BPM rows. Analyze keys in rekordbox or export XML.",
  "exports.rekordbox.dbWarning": "Unencrypted DB read. For rekordbox 6+ the XML export is more reliable (artist + key).",
  "exports.rekordbox.csvNoColumns": "CSV without recognizable artist/title/key/BPM columns.",
  "exports.rekordbox.unsupportedFile": "Please upload a rekordbox collection XML (.xml), a CSV or a master.db.",

  "exports.stick.noPlaylists": "The XML contains no playlists. To get keys without a set order, load the collection.",
  "exports.stick.notFound": "No rekordbox stick found. Choose the stick folder or PIONEER/rekordbox/export.pdb.",
  "exports.stick.invalidXml": "Invalid XML.",
  "exports.stick.whyLibrary": "Added to the set from the stick library",
  "exports.stick.whyHistory": "Played order from the rekordbox history",
  "exports.stick.whyPlaylist": "Order of the rekordbox playlist",

  "exports.pdb.tooSmall": "The file is too small to be a rekordbox export.pdb.",
  "exports.pdb.notPdb": "This is not a rekordbox export.pdb. On the stick it is located at PIONEER/rekordbox/export.pdb.",
  "exports.pdb.empty": "export.pdb was read, but it has no tracks or playlists.",
  "exports.pdbWrite.unsupported": "This stick database has a layout SETFORM can't safely write to. Nothing was changed.",
  "exports.pdbWrite.noRoom": "The stick database has no room left for another playlist. Nothing was changed.",
  "exports.pdbWrite.unknownTracks": "A track of the set is not in this stick database.",
  "exports.pdbWrite.verifyFailed": "Checking the new stick database failed ({detail}).",
};

export const exports_ = { de, en };
