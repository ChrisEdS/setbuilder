// Area "builder": keys start with "builder.". Declare `de` first, then type `en` against it.
const de = {
  // OAuth return banner (?auth=ok|error&message=...)
  "builder.auth.ok":
    "Spotify ist neu verbunden. Track nochmal starten — dann läuft Premium in voller Länge.",
  "builder.auth.invalidState":
    "Der Spotify-Login ist nicht zurückgekommen. Einmal neu verbinden und warten, bis die Seite wieder da ist.",
  "builder.auth.tidalState":
    "Der Tidal-Login ist nicht zurückgekommen. Einmal neu verbinden und warten, bis die Seite wieder da ist.",
  "builder.auth.tidalFailed": "Tidal-Login fehlgeschlagen: {error}",
  "builder.auth.spotifyFailed": "Spotify-Login fehlgeschlagen: {message}",
  "builder.auth.connectedStatus":
    "Spotify verbunden — wähle eine eigene Playlist und extrahiere das Set.",
  "builder.auth.failedHint":
    "Redirect URI in der Developer-App prüfen, Zugangsdaten unter „Verbindungen & Setups“ speichern, dann erneut verbinden.",

  // Sample brief shown while the brief is still untouched
  "builder.defaults.title": "Nachtlinie 01",
  "builder.defaults.vibe": "Tech House → Melodic Peak",
  "builder.defaults.venue": "Club, mid-size, guter PA",
  "builder.defaults.slot": "Peak Time · 60 Min",
  "builder.defaults.audience": "Locals, dancefloor schon warm",
  "builder.defaults.gear": "CDJs / USB",

  // Hero and brief form
  "builder.hero.title": "Dramaturgie statt Playlist.",
  "builder.hero.lede":
    "SETFORM formt aus dem Rekordbox-Stick ein Set. Playlist oder History laden, den Bogen nach Slot und Dauer legen, und an Key und BPM sehen, ob der Übergang zum nächsten Track trägt. Spotify, Tidal und Beatport sind die Ergänzung, wenn ein Track noch nicht auf dem Stick liegt.",
  "builder.brief.aria": "Set brief",
  "builder.brief.title": "Titel",
  "builder.brief.vibe": "Vibe / Genre-Arc",
  "builder.brief.venue": "Venue / Soundsystem",
  "builder.brief.slotKind": "Slot-Art",
  "builder.brief.slotNote": "Slot-Notiz",
  "builder.brief.audience": "Audience",
  "builder.brief.gear": "Gear",
  "builder.brief.duration": "Dauer (Min)",
  "builder.brief.slotText": "{kind} · {minutes} Min",

  // Folds
  "builder.library.title": "Set laden & Keys",
  "builder.library.keys": "{done}/{total} Keys",
  "builder.library.firstStep": "Erster Schritt",
  "builder.build.title": "Set bauen",
  "builder.build.summary": "{performance} Performance · {safety} Alternativen",
  "builder.build.note":
    "Hier kommt Musik rein und bekommt eine Phase und eine Rolle. Danach ordnest du das Set von Hand oder lässt es nach Key sortieren.",

  // Add music
  "builder.add.title": "Musik hinzufügen",
  "builder.add.target": "Neue Tracks landen in",
  "builder.add.phaseAria": "Phase für neue Tracks",
  "builder.add.roleAria": "Rolle für neue Tracks",
  "builder.add.tabsAria": "Wie Musik hinzufügen",
  "builder.add.tab.link.label": "Link",
  "builder.add.tab.link.hint":
    "Track, Playlist oder Album von Spotify, Tidal, Beatport oder SoundCloud.",
  "builder.add.tab.search.label": "Suche",
  "builder.add.tab.search.hint":
    "Den Spotify-Katalog nach Artist, Titel oder Genre durchsuchen.",
  "builder.add.tab.manual.label": "Von Hand",
  "builder.add.tab.manual.hint": "Titel und Artist selbst eintragen.",
  "builder.add.tab.auto.label": "Automatisch",
  "builder.add.tab.auto.hint":
    "Eine ganze Playlist als fertiges Set verteilen lassen.",

  "builder.search.placeholder": "Artist, Titel oder Genre",
  "builder.search.aria": "Spotify-Suche",
  "builder.search.busy": "Suche…",
  "builder.search.submit": "Suchen",
  "builder.search.hint":
    "Durchsucht den Spotify-Katalog. Ein Link im Feld wird direkt geladen.",

  "builder.link.placeholder": "Link von Spotify, Tidal, Beatport oder SoundCloud",
  "builder.link.aria": "Link",
  "builder.link.busy": "Lade…",
  "builder.link.tidalPlaylists": "Eigene Tidal-Playlists",
  "builder.link.tidalPickAria": "Tidal-Playlist wählen",
  "builder.link.spotifyPlaylists": "Eigene Spotify-Playlists",
  "builder.link.spotifyPickAria": "Spotify-Playlist wählen",
  "builder.link.pickOption": "Playlist laden…",
  "builder.link.hint":
    "Beatport und SoundCloud brauchen keinen Login, der Titel kommt aus der Adresse. Key und BPM stehen dort nicht. Spotify liefert im Dev Mode nur eigene oder kollaborative Playlists.",

  "builder.crate.addAll": "Alle + ({count})",
  "builder.crate.emptySearch":
    "Suche starten. Treffer lassen sich einzeln oder alle auf einmal hinzufügen.",
  "builder.crate.emptyLink":
    "Link einfügen und laden. Danach einzeln oder alle ins Set legen.",
  "builder.crate.none": "Keine Tracks geladen.",
  "builder.crate.add": "+ dazu",
  "builder.crate.source": "{kind}: {label}",
  "builder.crate.kind.track": "Track",
  "builder.crate.kind.album": "Album",
  "builder.crate.kind.playlist": "Playlist",
  "builder.crate.playlistFallback": "Playlist",

  "builder.manual.title": "Titel",
  "builder.manual.artist": "Artist",
  "builder.manual.link": "Link (optional)",
  "builder.manual.linkPlaceholder": "Adresse zum Track, zum Beispiel für den Player",
  "builder.manual.add": "Hinzufügen",

  "builder.auto.note":
    "SETFORM nimmt eine Playlist und verteilt die Tracks nach Dauer, Phasen und Rollen auf das Set.",
  "builder.auto.replaces": "Das aktuelle Set mit {tracks} wird dabei ersetzt.",
  "builder.auto.ownPlaylists": "Eigene Playlists",
  "builder.auto.pickAria": "Eigene Playlist wählen",
  "builder.auto.pickOption": "Playlist wählen…",
  "builder.auto.placeholder": "Spotify- oder Tidal-Playlist-Link",
  "builder.auto.linkAria": "Playlist-Link",
  "builder.auto.busy": "Extrahiere…",
  "builder.auto.submit": "Set extrahieren",
  "builder.auto.how": "So funktioniert die Extraktion",

  // Connection state next to the link / auto tabs
  "builder.conn.disconnectSpotify": "Spotify trennen",
  "builder.conn.connectSpotify": "Mit Spotify verbinden",
  "builder.conn.disconnectTidal": "Tidal trennen",
  "builder.conn.connectTidal": "Mit Tidal verbinden",
  "builder.conn.spotifyDisconnected": "Spotify getrennt.",
  "builder.conn.tidalDisconnected": "Tidal getrennt.",
  "builder.conn.state": "Spotify {spotify} · Tidal {tidal}",
  "builder.conn.checking": "wird geprüft",
  "builder.conn.connected": "verbunden",
  "builder.conn.notConnected": "nicht verbunden",
  "builder.conn.hint":
    "Die Zugangsdaten für Spotify und Tidal stehen unter „Verbindungen & Setups“.",

  // View tabs and set tools
  "builder.view.aria": "Ansicht",
  "builder.view.list.label": "Setliste",
  "builder.view.list.hint":
    "Die Reihenfolge des Abends. Hier sortierst du von Hand und schreibst Kommentare.",
  "builder.view.roles.label": "Rollen",
  "builder.view.roles.hint":
    "Anchor, Bridge, Groove und Alternativen als Spalten. Titel zwischen Rollen ziehen.",
  "builder.view.keys.label": "Bogen",
  "builder.view.keys.hint":
    "Phasen im Slot, Energie pro Track und Camelot-Keys entlang der Reihenfolge, mit Mix-Score und Clashes.",
  "builder.tool.harmonize": "Harmonisch sortieren",
  "builder.tool.harmonizeTip":
    "Ordnet jede Phase nach Camelot-Key und BPM neu. Die Rollen bleiben.",
  "builder.tool.fit": "Auf Slot kürzen",
  "builder.tool.fitTip":
    "Kürzt das Set auf die Dauer im Brief. Pro Phase bleiben gleichmäßig verteilte Tracks, der Rest wandert unter Alternativen. Nichts geht verloren.",
  "builder.tool.assign": "Rollen verteilen",
  "builder.tool.assignTip":
    "Setzt Anchor, Bridge und Groove neu nach Phase, Key und BPM. Die Reihenfolge bleibt.",

  // Setlist
  "builder.list.headAll": "Performance-Set · {tracks} · {duration} / {minutes}:00 Slot",
  "builder.list.headAllLong":
    "Performance-Set · {tracks} · {duration} / {minutes}:00 Slot · zu lang",
  "builder.list.headRole": "{role} · {tracks} · {duration}",
  "builder.list.detailsClose": "Details zu",
  "builder.list.detailsOpen": "Details auf",
  "builder.list.filterAria": "Setliste filtern",
  "builder.list.filterSet": "Set",
  "builder.list.filterSetTitle": "Performance-Reihenfolge, ohne die Alternativen.",
  "builder.list.empty": "Noch kein Set.",
  "builder.list.emptyHint":
    "Oben Musik hinzufügen oder unter „Set laden & Keys“ eine Playlist vom Stick laden.",

  "builder.row.dragAria": "{name} verschieben",
  "builder.row.dragTitle": "Hier ziehen",
  "builder.row.phaseAria": "Phase für {name}",
  "builder.row.roleAria": "Rolle für {name}",
  "builder.row.playAria": "{name} abspielen",
  "builder.row.replace": "Ersatz",
  "builder.row.replaceTitle":
    "Ersatz aus deinen Alternativen oder aus der Bibliothek, passend zu Vorgänger und Nachfolger",
  "builder.row.why": "Warum hier:",
  "builder.row.details": "Details",
  "builder.row.keyOpen": "Key offen",
  "builder.row.bpmOpen": "BPM offen",
  "builder.row.energy": "Energie {level}",
  "builder.row.commentTag": "Kommentar",
  "builder.row.comment": "Kommentar",
  "builder.row.commentPlaceholder": "Cue, Energy, Vocal rein, Floor-Notiz…",
  "builder.row.bpmPlaceholder": "BPM",
  "builder.row.bpmAria": "BPM für {name}",
  "builder.row.keyOption": "Key",
  "builder.row.keyAria": "Key für {name}",
  "builder.row.energyOption": "Energie",
  "builder.row.energyAria": "Energy Level für {name}",
  "builder.row.transitionAria": "Übergang für {name}",

  // Arc view
  "builder.curve.aria": "Energy curve",
  "builder.curve.title": "Phasen im Slot",
  "builder.curve.summary":
    "{duration} / {minutes}:00 · {performance} Performance · {safety} Alternativen",
  "builder.curve.summaryOver":
    "{duration} / {minutes}:00 · über dem Brief · {performance} Performance · {safety} Alternativen",
  "builder.curve.principles": "Dramaturgie-Prinzipien",
  "builder.curve.principlesIntro":
    "Diese Prinzipien bestimmen, wie SETFORM den Bogen legt und worauf du in der Setliste achten solltest.",
  "builder.curve.phaseLabel": "{phase}: {actual} von etwa {minutes} min",
  "builder.curve.phaseClick": "{label}. Klick legt neue Tracks in diese Phase.",
  "builder.curve.phaseTime": "{actual} / ~{minutes} min",
  "builder.curve.note":
    "Die Breite ist der Anteil am Brief, die Füllung die schon gelegte Spielzeit. Gelb heißt, die Phase liegt über ihrem Fenster.",

  // Connections & setups panel
  "builder.settings.title": "Verbindungen & Setups",
  "builder.settings.default": "Sichern · Verbinden",
  "builder.settings.spotifyReady": "Spotify bereit",
  "builder.settings.spotifyMissing": "Spotify fehlt",
  "builder.setups.aria": "Verbindungen und Setups",
  "builder.setups.intro": "Brief sichern. Spotify und Tidal hier verbinden.",
  "builder.setups.name": "Name",
  "builder.setups.nameAria": "Setup-Name",
  "builder.setups.stored": "Gespeicherter Stand",
  "builder.setups.selectAria": "Gespeichertes Setup",
  "builder.setups.choose": "Wählen…",
  "builder.setups.fileTitle": "Datei",
  "builder.setups.fileHint": "JSON sichern oder auf einem anderen Rechner öffnen.",
  "builder.setups.download": "Herunterladen",
  "builder.setups.fallbackName": "Setup",

  // Status toasts
  "builder.status.added": "+ {name} → {phase} / {role}",
  "builder.status.addedMany": "+ {tracks} → {phase} / {role}",
  "builder.status.alreadyIn": "Track ist schon im Set.",
  "builder.status.alreadyInNamed": "{name} ist schon im Set.",
  "builder.status.allAlreadyIn": "Alle Treffer sind schon im Set.",
  "builder.status.planBFilled": "Plan B gefüllt: +{count} Alternativen ({parts}).",
  "builder.status.copied": "Set als Text kopiert, mit Cue-Notizen und Alternativen.",
  "builder.status.pdf":
    "Druckansicht geöffnet. Dort drucken oder „Als PDF speichern“ wählen.",
  "builder.status.m3u": "M3U der Performance-Reihenfolge gespeichert.",
  "builder.status.rekordbox":
    "rekordbox-XML gespeichert. In rekordbox: File → Import Playlist. Alternativen liegen in der zweiten Playlist.",
  "builder.status.replaced":
    "Alternative eingesetzt. Der ersetzte Track liegt bei den Alternativen.",
  "builder.status.replacedFromLibrary":
    "{name} ersetzt {target}. {target} liegt bei den Alternativen.",
  "builder.status.allHaveLinks": "Alle Tracks haben schon einen Link.",
  "builder.status.searchingLinks": "Suche Spotify-Links… {done}/{total}",
  "builder.status.linksSet":
    "{found} Spotify-Links gesetzt, {missing} ohne sicheren Treffer.",
  "builder.status.noLink": "Kein sicherer Spotify-Treffer.",
  "builder.status.setupSaved": "„{name}“ gespeichert.",
  "builder.status.setupLoaded": "„{name}“ geladen.",
  "builder.status.setupDeleted": "„{name}“ gelöscht.",
  "builder.status.setupFromFile": "„{name}“ aus Datei geladen.",
  "builder.status.fileDownloaded": "Einstellungsdatei heruntergeladen.",
  "builder.status.reset": "Brief zurückgesetzt — das Set ist leer.",
  "builder.status.harmonized": "Set innerhalb der Phasen nach Camelot/BPM neu sortiert.",
  "builder.status.fits": "Das Set passt schon in den Slot.",
  "builder.status.trimmed":
    "Auf Slot gekürzt: {before} → {after} · {kept} bleiben, {moved} liegen unter Alternativen.",
  "builder.status.roles":
    "Rollen verteilt: Anchor auf Peak und Schluss, Bridge bei Phasenwechsel, Key-Clash, BPM- oder Energie-Sprung, sonst Groove.",
  "builder.status.noHits": "Keine Treffer — anderen Artist oder Track versuchen.",
  "builder.status.tidalPlaylistLoaded":
    "{tracks} aus Tidal — einzeln oder alle ins Set.",
  "builder.status.tidalLinkLoaded": "{tracks} aus Tidal geladen.",
  "builder.status.storeLoaded": "{store} geladen — mit + dazu ins Set.",
  "builder.status.noTracksInLink": "Keine Tracks im Link.",
  "builder.status.trackLoaded": "Track geladen — mit + zum Set hinzufügen.",
  "builder.status.tracksLoaded": "{tracks} geladen — einzeln oder alle hinzufügen.",
  "builder.status.extractedTidalNone":
    "Set aus „{name}“: {performance} Performance-Tracks + {safety} Alternativen (Pool: {pool}). Tidal ohne Treffer.",
  "builder.status.extractedTidalKeyed":
    "Set aus „{name}“: {performance} Performance-Tracks + {safety} Alternativen (Pool: {pool}). Tidal: {keyed} mit Key/BPM, {matched} gematcht.",
  "builder.status.extractedTidalPopular":
    "Set aus „{name}“: {performance} Performance-Tracks + {safety} Alternativen (Pool: {pool}). Tidal: {matched} Tracks über Popularität sortiert. Key/BPM gibt diese App nicht zurück.",

  // Failures: title + hint
  "builder.fail.playlistMissing": "Playlist-Link fehlt.",
  "builder.fail.playlistMissingHint":
    "Einen Spotify- oder Tidal-Playlist-Link ins Feld einfügen.",
  "builder.fail.spotifyAuth": "Spotify-Login nötig, um Playlist-Tracks zu lesen.",
  "builder.fail.spotifyAuthHint":
    "Unter „Verbindungen & Setups“ mit Spotify verbinden, dann hier noch einmal extrahieren.",
  "builder.fail.extract": "Extraktion fehlgeschlagen.",
  "builder.fail.extractHint":
    "Den Link prüfen. Im Spotify Dev Mode gehen nur eigene oder kollaborative Playlists.",
  "builder.fail.queryShort": "Mindestens 2 Zeichen für die Suche.",
  "builder.fail.queryShortHint":
    "Artist oder Titel mit mindestens zwei Zeichen eintippen.",
  "builder.fail.search": "Suche fehlgeschlagen.",
  "builder.fail.searchHint":
    "Verbindung unter „Verbindungen & Setups“ prüfen und die Suche wiederholen.",
  "builder.fail.tidalPlaylist": "Tidal-Playlist fehlgeschlagen.",
  "builder.fail.tidalPlaylistHint":
    "Mit Tidal verbinden. In der Entwickler-App user.read und playlists.read einschalten.",
  "builder.fail.linkMissing": "Playlist- oder Track-Link fehlt.",
  "builder.fail.linkMissingHint":
    "Einen Link von Spotify, Tidal, Beatport oder SoundCloud ins Feld einfügen.",
  "builder.fail.storeLink": "{store}-Link fehlgeschlagen.",
  "builder.fail.storeLinkHint":
    "Den Link im Browser öffnen. Steht der Titel in der Adresse, hier noch einmal einfügen.",
  "builder.fail.tidalLink": "Tidal-Link fehlgeschlagen.",
  "builder.fail.tidalLinkHint":
    "Mit Tidal verbinden. Die Redirect URI muss exakt die aus „Verbindungen & Setups“ sein.",
  "builder.fail.crateLink": "Link konnte nicht geladen werden.",
  "builder.fail.crateLinkHint":
    "Unter „Verbindungen & Setups“ verbinden und den Link erneut laden. Im Dev Mode nur eigene Playlists.",
  "builder.fail.titleMissing": "Titel fehlt.",
  "builder.fail.titleMissingHint":
    "Einen Titel eintragen. Artist und Link dürfen leer bleiben.",
  "builder.fail.pdf": "PDF-Export fehlgeschlagen.",
  "builder.fail.pdfHint": "Pop-ups für diese Seite erlauben und PDF noch einmal öffnen.",
  "builder.fail.spotifySearch": "Spotify-Suche fehlgeschlagen.",
  "builder.fail.spotifySearchHint":
    "Unter „Verbindungen & Setups“ mit Spotify verbinden und Links suchen erneut starten.",
  "builder.fail.notSetup": "Datei enthält kein SETFORM-Setup.",
  "builder.fail.file": "Datei ungültig.",
  "builder.fail.fileHint":
    "Eine Datei verwenden, die hier über Herunterladen gespeichert wurde.",
} as const;

const en: Record<keyof typeof de, string> = {
  "builder.auth.ok":
    "Spotify is connected again. Start the track once more — then Premium plays in full length.",
  "builder.auth.invalidState":
    "The Spotify login didn't come back. Reconnect once and wait until the page has loaded again.",
  "builder.auth.tidalState":
    "The Tidal login didn't come back. Reconnect once and wait until the page has loaded again.",
  "builder.auth.tidalFailed": "Tidal login failed: {error}",
  "builder.auth.spotifyFailed": "Spotify login failed: {message}",
  "builder.auth.connectedStatus":
    "Spotify connected — pick one of your playlists and extract the set.",
  "builder.auth.failedHint":
    "Check the redirect URI in the developer app, save the credentials under “Connections & setups”, then connect again.",

  "builder.defaults.title": "Nightline 01",
  "builder.defaults.vibe": "Tech house → melodic peak",
  "builder.defaults.venue": "Club, mid-size, good PA",
  "builder.defaults.slot": "Peak time · 60 min",
  "builder.defaults.audience": "Locals, dancefloor already warm",
  "builder.defaults.gear": "CDJs / USB",

  "builder.hero.title": "Dramaturgy, not a playlist.",
  "builder.hero.lede":
    "SETFORM shapes a set from your rekordbox stick. Load a playlist or history, lay out the arc by slot and duration, and see from key and BPM whether the transition to the next track holds. Spotify, Tidal and Beatport fill the gaps when a track isn't on the stick yet.",
  "builder.brief.aria": "Set brief",
  "builder.brief.title": "Title",
  "builder.brief.vibe": "Vibe / genre arc",
  "builder.brief.venue": "Venue / sound system",
  "builder.brief.slotKind": "Slot type",
  "builder.brief.slotNote": "Slot note",
  "builder.brief.audience": "Audience",
  "builder.brief.gear": "Gear",
  "builder.brief.duration": "Duration (min)",
  "builder.brief.slotText": "{kind} · {minutes} min",

  "builder.library.title": "Load set & keys",
  "builder.library.keys": "{done}/{total} keys",
  "builder.library.firstStep": "First step",
  "builder.build.title": "Build set",
  "builder.build.summary": "{performance} performance · {safety} alternatives",
  "builder.build.note":
    "Music goes in here and gets a phase and a role. Then you arrange the set by hand or let it sort by key.",

  "builder.add.title": "Add music",
  "builder.add.target": "New tracks go to",
  "builder.add.phaseAria": "Phase for new tracks",
  "builder.add.roleAria": "Role for new tracks",
  "builder.add.tabsAria": "How to add music",
  "builder.add.tab.link.label": "Link",
  "builder.add.tab.link.hint":
    "Track, playlist or album from Spotify, Tidal, Beatport or SoundCloud.",
  "builder.add.tab.search.label": "Search",
  "builder.add.tab.search.hint":
    "Search the Spotify catalog by artist, title or genre.",
  "builder.add.tab.manual.label": "Manual",
  "builder.add.tab.manual.hint": "Enter title and artist yourself.",
  "builder.add.tab.auto.label": "Automatic",
  "builder.add.tab.auto.hint": "Turn a whole playlist into a ready-made set.",

  "builder.search.placeholder": "Artist, title or genre",
  "builder.search.aria": "Spotify search",
  "builder.search.busy": "Searching…",
  "builder.search.submit": "Search",
  "builder.search.hint":
    "Searches the Spotify catalog. A link in the field is loaded directly.",

  "builder.link.placeholder": "Link from Spotify, Tidal, Beatport or SoundCloud",
  "builder.link.aria": "Link",
  "builder.link.busy": "Loading…",
  "builder.link.tidalPlaylists": "Your Tidal playlists",
  "builder.link.tidalPickAria": "Choose Tidal playlist",
  "builder.link.spotifyPlaylists": "Your Spotify playlists",
  "builder.link.spotifyPickAria": "Choose Spotify playlist",
  "builder.link.pickOption": "Load playlist…",
  "builder.link.hint":
    "Beatport and SoundCloud need no login; the title comes from the address. Key and BPM aren't available there. In dev mode, Spotify only returns your own or collaborative playlists.",

  "builder.crate.addAll": "Add all ({count})",
  "builder.crate.emptySearch":
    "Start a search. Add results one by one or all at once.",
  "builder.crate.emptyLink":
    "Paste a link and load it. Then add tracks to the set one by one or all at once.",
  "builder.crate.none": "No tracks loaded.",
  "builder.crate.add": "+ add",
  "builder.crate.source": "{kind}: {label}",
  "builder.crate.kind.track": "Track",
  "builder.crate.kind.album": "Album",
  "builder.crate.kind.playlist": "Playlist",
  "builder.crate.playlistFallback": "Playlist",

  "builder.manual.title": "Title",
  "builder.manual.artist": "Artist",
  "builder.manual.link": "Link (optional)",
  "builder.manual.linkPlaceholder": "Address of the track, for example for the player",
  "builder.manual.add": "Add",

  "builder.auto.note":
    "SETFORM takes a playlist and spreads the tracks across the set by duration, phases and roles.",
  "builder.auto.replaces": "This replaces the current set with {tracks}.",
  "builder.auto.ownPlaylists": "Your playlists",
  "builder.auto.pickAria": "Choose your playlist",
  "builder.auto.pickOption": "Choose playlist…",
  "builder.auto.placeholder": "Spotify or Tidal playlist link",
  "builder.auto.linkAria": "Playlist link",
  "builder.auto.busy": "Extracting…",
  "builder.auto.submit": "Extract set",
  "builder.auto.how": "How extraction works",

  "builder.conn.disconnectSpotify": "Disconnect Spotify",
  "builder.conn.connectSpotify": "Connect with Spotify",
  "builder.conn.disconnectTidal": "Disconnect Tidal",
  "builder.conn.connectTidal": "Connect with Tidal",
  "builder.conn.spotifyDisconnected": "Spotify disconnected.",
  "builder.conn.tidalDisconnected": "Tidal disconnected.",
  "builder.conn.state": "Spotify {spotify} · Tidal {tidal}",
  "builder.conn.checking": "checking",
  "builder.conn.connected": "connected",
  "builder.conn.notConnected": "not connected",
  "builder.conn.hint":
    "The credentials for Spotify and Tidal are under “Connections & setups”.",

  "builder.view.aria": "View",
  "builder.view.list.label": "Setlist",
  "builder.view.list.hint":
    "The order of the night. Sort by hand and write comments here.",
  "builder.view.roles.label": "Roles",
  "builder.view.roles.hint":
    "Anchor, Bridge, Groove and Alternatives as columns. Drag tracks between roles.",
  "builder.view.keys.label": "Arc",
  "builder.view.keys.hint":
    "Phases in the slot, energy per track and Camelot keys along the order, with mix score and clashes.",
  "builder.tool.harmonize": "Sort harmonically",
  "builder.tool.harmonizeTip":
    "Re-sorts each phase by Camelot key and BPM. Roles stay.",
  "builder.tool.fit": "Trim to slot",
  "builder.tool.fitTip":
    "Trims the set to the duration in the brief. Evenly spread tracks stay in each phase, the rest moves to Alternatives. Nothing is lost.",
  "builder.tool.assign": "Assign roles",
  "builder.tool.assignTip":
    "Re-sets Anchor, Bridge and Groove by phase, key and BPM. The order stays.",

  "builder.list.headAll": "Performance set · {tracks} · {duration} / {minutes}:00 slot",
  "builder.list.headAllLong":
    "Performance set · {tracks} · {duration} / {minutes}:00 slot · too long",
  "builder.list.headRole": "{role} · {tracks} · {duration}",
  "builder.list.detailsClose": "Hide details",
  "builder.list.detailsOpen": "Show details",
  "builder.list.filterAria": "Filter setlist",
  "builder.list.filterSet": "Set",
  "builder.list.filterSetTitle": "Performance order, without the alternatives.",
  "builder.list.empty": "No set yet.",
  "builder.list.emptyHint":
    "Add music above or load a playlist from the stick under “Load set & keys”.",

  "builder.row.dragAria": "Move {name}",
  "builder.row.dragTitle": "Drag here",
  "builder.row.phaseAria": "Phase for {name}",
  "builder.row.roleAria": "Role for {name}",
  "builder.row.playAria": "Play {name}",
  "builder.row.replace": "Replace",
  "builder.row.replaceTitle":
    "Replacement from your Alternatives or the library, matched to the previous and next track",
  "builder.row.why": "Why here:",
  "builder.row.details": "Details",
  "builder.row.keyOpen": "Key open",
  "builder.row.bpmOpen": "BPM open",
  "builder.row.energy": "Energy {level}",
  "builder.row.commentTag": "Comment",
  "builder.row.comment": "Comment",
  "builder.row.commentPlaceholder": "Cue, energy, vocal in, floor note…",
  "builder.row.bpmPlaceholder": "BPM",
  "builder.row.bpmAria": "BPM for {name}",
  "builder.row.keyOption": "Key",
  "builder.row.keyAria": "Key for {name}",
  "builder.row.energyOption": "Energy",
  "builder.row.energyAria": "Energy Level for {name}",
  "builder.row.transitionAria": "Transition for {name}",

  "builder.curve.aria": "Energy curve",
  "builder.curve.title": "Phases in the slot",
  "builder.curve.summary":
    "{duration} / {minutes}:00 · {performance} performance · {safety} alternatives",
  "builder.curve.summaryOver":
    "{duration} / {minutes}:00 · over the brief · {performance} performance · {safety} alternatives",
  "builder.curve.principles": "Dramaturgy principles",
  "builder.curve.principlesIntro":
    "These principles decide how SETFORM lays out the arc and what to watch for in the setlist.",
  "builder.curve.phaseLabel": "{phase}: {actual} of about {minutes} min",
  "builder.curve.phaseClick": "{label}. Click to put new tracks in this phase.",
  "builder.curve.phaseTime": "{actual} / ~{minutes} min",
  "builder.curve.note":
    "The width is the share of the brief, the fill is the playing time already placed. Yellow means the phase runs over its window.",

  "builder.settings.title": "Connections & setups",
  "builder.settings.default": "Save · Connect",
  "builder.settings.spotifyReady": "Spotify ready",
  "builder.settings.spotifyMissing": "Spotify missing",
  "builder.setups.aria": "Connections and setups",
  "builder.setups.intro": "Save the brief. Connect Spotify and Tidal here.",
  "builder.setups.name": "Name",
  "builder.setups.nameAria": "Setup name",
  "builder.setups.stored": "Saved state",
  "builder.setups.selectAria": "Saved setup",
  "builder.setups.choose": "Choose…",
  "builder.setups.fileTitle": "File",
  "builder.setups.fileHint": "Save as JSON or open on another computer.",
  "builder.setups.download": "Download",
  "builder.setups.fallbackName": "Setup",

  "builder.status.added": "+ {name} → {phase} / {role}",
  "builder.status.addedMany": "+ {tracks} → {phase} / {role}",
  "builder.status.alreadyIn": "Track is already in the set.",
  "builder.status.alreadyInNamed": "{name} is already in the set.",
  "builder.status.allAlreadyIn": "All results are already in the set.",
  "builder.status.planBFilled": "Plan B filled: +{count} alternatives ({parts}).",
  "builder.status.copied": "Set copied as text, with cue notes and alternatives.",
  "builder.status.pdf": "Print view opened. Print there or choose “Save as PDF”.",
  "builder.status.m3u": "M3U of the performance order saved.",
  "builder.status.rekordbox":
    "rekordbox XML saved. In rekordbox: File → Import Playlist. Alternatives are in the second playlist.",
  "builder.status.replaced":
    "Alternative swapped in. The replaced track is now in Alternatives.",
  "builder.status.replacedFromLibrary":
    "{name} replaces {target}. {target} is now in Alternatives.",
  "builder.status.allHaveLinks": "All tracks already have a link.",
  "builder.status.searchingLinks": "Finding Spotify links… {done}/{total}",
  "builder.status.linksSet":
    "{found} Spotify links set, {missing} without a safe match.",
  "builder.status.noLink": "No safe Spotify match.",
  "builder.status.setupSaved": "“{name}” saved.",
  "builder.status.setupLoaded": "“{name}” loaded.",
  "builder.status.setupDeleted": "“{name}” deleted.",
  "builder.status.setupFromFile": "“{name}” loaded from file.",
  "builder.status.fileDownloaded": "Settings file downloaded.",
  "builder.status.reset": "Brief reset — the set is empty.",
  "builder.status.harmonized": "Set re-sorted within the phases by Camelot/BPM.",
  "builder.status.fits": "The set already fits the slot.",
  "builder.status.trimmed":
    "Trimmed to slot: {before} → {after} · keeping {kept}, {moved} moved to Alternatives.",
  "builder.status.roles":
    "Roles assigned: Anchor on the peak and the close, Bridge at a phase change, key clash, BPM or energy jump, otherwise Groove.",
  "builder.status.noHits": "No results — try another artist or track.",
  "builder.status.tidalPlaylistLoaded":
    "{tracks} from Tidal — add them one by one or all at once.",
  "builder.status.tidalLinkLoaded": "{tracks} loaded from Tidal.",
  "builder.status.storeLoaded": "{store} loaded — add to the set with +.",
  "builder.status.noTracksInLink": "No tracks in the link.",
  "builder.status.trackLoaded": "Track loaded — add it to the set with +.",
  "builder.status.tracksLoaded": "{tracks} loaded — add them one by one or all at once.",
  "builder.status.extractedTidalNone":
    "Set from “{name}”: {performance} performance tracks + {safety} alternatives (pool: {pool}). No Tidal matches.",
  "builder.status.extractedTidalKeyed":
    "Set from “{name}”: {performance} performance tracks + {safety} alternatives (pool: {pool}). Tidal: {keyed} with key/BPM, {matched} matched.",
  "builder.status.extractedTidalPopular":
    "Set from “{name}”: {performance} performance tracks + {safety} alternatives (pool: {pool}). Tidal: {matched} tracks sorted by popularity. This app doesn't get key/BPM back.",

  "builder.fail.playlistMissing": "Playlist link missing.",
  "builder.fail.playlistMissingHint": "Paste a Spotify or Tidal playlist link into the field.",
  "builder.fail.spotifyAuth": "Spotify login needed to read playlist tracks.",
  "builder.fail.spotifyAuthHint":
    "Connect with Spotify under “Connections & setups”, then extract again here.",
  "builder.fail.extract": "Extraction failed.",
  "builder.fail.extractHint":
    "Check the link. In Spotify dev mode only your own or collaborative playlists work.",
  "builder.fail.queryShort": "At least 2 characters for the search.",
  "builder.fail.queryShortHint": "Type an artist or title with at least two characters.",
  "builder.fail.search": "Search failed.",
  "builder.fail.searchHint":
    "Check the connection under “Connections & setups” and repeat the search.",
  "builder.fail.tidalPlaylist": "Tidal playlist failed.",
  "builder.fail.tidalPlaylistHint":
    "Connect with Tidal. Enable user.read and playlists.read in the developer app.",
  "builder.fail.linkMissing": "Playlist or track link missing.",
  "builder.fail.linkMissingHint":
    "Paste a link from Spotify, Tidal, Beatport or SoundCloud into the field.",
  "builder.fail.storeLink": "{store} link failed.",
  "builder.fail.storeLinkHint":
    "Open the link in your browser. If the title is in the address, paste it here again.",
  "builder.fail.tidalLink": "Tidal link failed.",
  "builder.fail.tidalLinkHint":
    "Connect with Tidal. The redirect URI must match the one under “Connections & setups” exactly.",
  "builder.fail.crateLink": "Couldn't load the link.",
  "builder.fail.crateLinkHint":
    "Connect under “Connections & setups” and load the link again. In dev mode only your own playlists work.",
  "builder.fail.titleMissing": "Title missing.",
  "builder.fail.titleMissingHint": "Enter a title. Artist and link can stay empty.",
  "builder.fail.pdf": "PDF export failed.",
  "builder.fail.pdfHint": "Allow pop-ups for this page and open the PDF again.",
  "builder.fail.spotifySearch": "Spotify search failed.",
  "builder.fail.spotifySearchHint":
    "Connect with Spotify under “Connections & setups” and run Find links again.",
  "builder.fail.notSetup": "The file doesn't contain a SETFORM setup.",
  "builder.fail.file": "Invalid file.",
  "builder.fail.fileHint": "Use a file that was saved here via Download.",
};

export const builder = { de, en };
