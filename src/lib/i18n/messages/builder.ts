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
    "SETBUILDER formt aus dem Rekordbox-Stick ein Set. Playlist oder History laden, den Bogen nach Slot und Dauer legen, und an Key und BPM sehen, ob der Übergang zum nächsten Track trägt. Spotify, Tidal und Beatport sind die Ergänzung, wenn ein Track noch nicht auf dem Stick liegt.",
  "builder.brief.aria": "Set brief",
  "builder.brief.title": "Titel",
  "builder.brief.vibe": "Vibe / Genre-Arc",
  "builder.brief.venue": "Venue / Soundsystem",
  "builder.brief.slotKind": "Slot-Art",
  "builder.brief.audience": "Audience",
  "builder.brief.gear": "Gear",
  "builder.brief.duration": "Dauer (Min)",
  "builder.brief.notes": "Notes",
  "builder.brief.notesPlaceholder": "Doors, Curfew, Promoter, Specials…",

  // Folds
  "builder.library.title": "Set laden & Keys",
  "builder.library.keys": "{done}/{total} Keys",
  "builder.library.firstStep": "Erster Schritt",
  "builder.stickReload.title": "Stick wieder wählen",
  "builder.stickReload.body":
    "Das Set ist noch da. Cover und Vorhören vom Stick braucht denselben Ordner noch einmal — rekordbox bleibt unangetastet, das Set wird nicht ersetzt.",
  "builder.stickReload.choose": "Stick wählen",
  "builder.stickReload.reconnect": "Stick verbinden",
  "builder.stickReload.busy": "Lese den Stick…",
  "builder.stickReload.later": "Später",
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
    "SETBUILDER nimmt eine Playlist und verteilt die Tracks nach Dauer, Phasen und Rollen auf das Set.",
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
  "builder.conn.optional": "Spotify und Tidal verbinden (optional)",
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
  "builder.tool.sort": "Sortieren",
  "builder.tool.energy": "Energie aus Dateien",
  "builder.tool.energyTip":
    "Berechnet Energy Level 1–10 aus den Stick-Dateien (Essentia), setzt es im Draft und schreibt es in die MP3-Tags. Die Set-Notiz bleibt unangetastet; Key und BPM auch.",
  "builder.tool.energyBusy": "Energie…",
  "builder.energy.confirm":
    "Energie aus Stick-Dateien berechnen und in die MP3 auf dem Stick schreiben? Das Audio bleibt unverändert; Key und BPM werden nicht überschrieben. Chrome, Edge oder Desktop nötig.",
  "builder.energy.confirmMissing":
    "OK = nur die {missing} Tracks ohne Energie. Abbrechen = alle {total} mit Datei neu berechnen.",
  "builder.energy.confirmAll":
    "Alle Tracks haben schon Energie. Alle {total} mit Datei neu berechnen und schreiben?",
  "builder.energy.noStick":
    "Kein Stick verbunden. Unter „Set laden & Keys“ den Stick wählen (Chrome / Edge / Desktop).",
  "builder.energy.noFile":
    "Keine Tracks mit Stick-Pfad. Set vom Stick laden, damit die Dateien gefunden werden.",
  "builder.energy.notMp3": "Kein MP3 — nur Draft",
  "builder.energy.progress": "{done}/{total} · {skipped} übersprungen · {errors} Fehler",
  "builder.energy.done":
    "Fertig: {set} gesetzt, {written} in MP3 geschrieben · {skipped} übersprungen · {errors} Fehler",
  "builder.energy.denied":
    "Kein Schreibzugriff auf den Stick. Im Dialog erlauben, sonst wird nur der Draft aktualisiert.",
  "builder.sort.perfect": "Perfekt · Max Score",
  "builder.sort.perfectHint":
    "Ganzes Set: exakter Camelot-TSP (Held-Karp ≤18, sonst NN+2-opt/Or-opt). Clashes zuerst killen, dann Mix-Score. Opener/Closer bleiben. Phasen danach neu.",
  "builder.sort.harmonic": "Harmonisch",
  "builder.sort.harmonicHint":
    "Nächster Track: verwandter Camelot-Key, weiche Energie, kleine BPM-Schritte. Hebt den Mix-Score, senkt Clashes.",
  "builder.sort.gentle": "Ein-Schritt",
  "builder.sort.gentleHint":
    "Mixed In Key: Energie nur ±1 pro Übergang, in Phasenrichtung. Weniger Sprünge, weicher Floor.",
  "builder.sort.energy": "Energie-Welle",
  "builder.sort.energyHint":
    "Open bis Peak steigt die Energie, Release fällt. Key ist nur der Tiebreaker.",
  "builder.sort.roller": "Doppel-Peak",
  "builder.sort.rollerHint":
    "Mixed In Key Arc: erst aufbauen, kurz absacken (−2), dann zum Peak. Open/Lift nur steigen, Release nur fallen.",
  "builder.sort.tempo": "Tempo aufbauen",
  "builder.sort.tempoHint":
    "BPM steigt in der Phase (Release fällt). Klassische House/Techno-Rampe.",
  "builder.sort.pulse": "BPM-Kette",
  "builder.sort.pulseHint":
    "Nächster Track möglichst nah am aktuellen BPM (±2–4), leicht mit der Phase. Bleibt im Pocket.",
  "builder.sort.journey": "Camelot-Reise",
  "builder.sort.journeyHint":
    "Läuft im Uhrzeigersinn ums Wheel, statt denselben Key zu stapeln.",
  "builder.sort.waves": "Wellen",
  "builder.sort.wavesHint":
    "Im Peak wechseln Groove und Impact. Davor steigt die Energie, danach fällt sie.",
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
  "builder.list.detailsClose": "Details aus",
  "builder.list.detailsOpen": "Details ein",
  "builder.list.detailsTitle": "Key, BPM, Energie und Set-Notiz in jeder Zeile ein- oder ausblenden.",
  "builder.list.filterAria": "Setliste filtern",
  "builder.list.filterSet": "Alle Tracks (Set)",
  "builder.list.filterSetTitle": "Performance-Reihenfolge, ohne die Alternativen.",
  "builder.list.empty": "Noch kein Set.",
  "builder.list.emptyHint":
    "Oben Musik hinzufügen oder unter „Set laden & Keys“ eine Playlist vom Stick laden.",

  "builder.row.dragAria": "{name} verschieben",
  "builder.row.dragTitle": "Hier ziehen",
  "builder.row.phaseAria": "Phase für {name}",
  "builder.row.roleAria": "Rolle für {name}",
  "builder.row.playAria": "{name} abspielen",
  "builder.row.playTip": "Im Player unten anhören — Fokus auf diesen Track.",
  "builder.row.moveUpTip": "Einen Platz nach oben in der gespielten Reihenfolge.",
  "builder.row.moveDownTip": "Einen Platz nach unten in der gespielten Reihenfolge.",
  "builder.row.removeTip": "Aus dem Set entfernen. Opener-/Closer-Pin fällt mit weg.",
  "builder.row.removeAria": "{name} entfernen",
  "builder.row.sourceTip":
    "Quelle des Tracks: Stick/rekordbox, Spotify, Tidal oder manuell hinzugefügt.",
  "builder.row.replace": "Ersatz",
  "builder.row.replaceTitle":
    "Ersatz aus deinen Alternativen oder aus der Bibliothek, passend zu Vorgänger und Nachfolger",
  "builder.row.setOpener": "Opener",
  "builder.row.setOpenerTitle":
    "Als ersten Track des Sets festlegen (Open). Bleibt beim Sortieren vorne.",
  "builder.row.clearOpener": "Opener lösen",
  "builder.row.clearOpenerTip":
    "Pin lösen — der Track bleibt im Set, Sortieren wählt wieder frei den Anfang.",
  "builder.row.setCloser": "Closer",
  "builder.row.setCloserTitle":
    "Als letzten Track des Sets festlegen (Release). Bleibt beim Sortieren hinten.",
  "builder.row.clearCloser": "Closer lösen",
  "builder.row.clearCloserTip":
    "Pin lösen — der Track bleibt im Set, Sortieren wählt wieder frei das Ende.",
  "builder.row.openerBadge": "Opener",
  "builder.row.openerBadgeTip": "Gepinnter Opener — erster Performance-Track, auch nach Sortieren.",
  "builder.row.closerBadge": "Closer",
  "builder.row.closerBadgeTip": "Gepinnter Closer — letzter Performance-Track, auch nach Sortieren.",
  "builder.row.why": "Warum hier:",
  "builder.row.details": "Details",
  "builder.row.keyOpen": "Key offen",
  "builder.row.bpmOpen": "BPM offen",
  "builder.row.energy": "Energie {level}",
  "builder.row.setNoteTag": "Set-Notiz",
  "builder.row.setNote": "Set-Notiz",
  "builder.row.setNotePlaceholder": "Cue, Vocal rein, Floor-Notiz…",
  "builder.row.setNoteTip":
    "Nur für dieses Set in SETBUILDER. Wird nicht in die MP3-Tags geschrieben — anders als der Kommentar in rekordbox.",
  "builder.row.bpmPlaceholder": "BPM",
  "builder.row.bpmAria": "BPM für {name}",
  "builder.row.keyOption": "Key",
  "builder.row.keyAria": "Key für {name}",
  "builder.row.keyHint":
    "Camelot-Key, z. B. 8A. A = Moll, B = Dur. Gleicher Key, ±1 oder A↔B mischt weich. Ändern ändert Mix-Score und Clashes.",
  "builder.row.energyOption": "Energie",
  "builder.row.energyAria": "Energy Level für {name}",
  "builder.row.energyHint":
    "Energy Level 1–10 (Mixed In Key): wie hart der Track im Raum wirkt. 1–3 warm, 7–8 Rise, 8–10 Peak. Ändern ändert den Energie-Bogen.",
  "builder.row.bpmHint":
    "Tempo. Kleine Schritte gleicht der Pitch aus. Sprünge über 3 BPM brauchen einen Break.",
  "builder.row.phaseHint":
    "Wo der Track im Slot sitzt: Open wärmt, Peak ist der Höhepunkt, Release landet. Die Phase setzt das Energie-Zielband.",
  "builder.row.roleHint":
    "Anchor ist Signature, Bridge braucht Sorgfalt (Clash, Sprung), Groove ist der Atem, Alternativen sind Plan B.",
  "builder.row.transitionHint":
    "Wie du in den nächsten Track gehst: Long Blend weich, EQ oder Break bei Clash, Reset wenn die Energie fällt.",
  "builder.row.transitionAria": "Übergang für {name}",

  // Arc view
  "builder.curve.aria": "Phasen im Slot",
  "builder.curve.title": "Phasen im Slot",
  "builder.curve.summary":
    "{duration} / {minutes}:00 · {performance} Performance · {safety} Alternativen",
  "builder.curve.summaryOver":
    "{duration} / {minutes}:00 · über dem Brief · {performance} Performance · {safety} Alternativen",
  "builder.curve.principles": "Dramaturgie-Prinzipien",
  "builder.curve.principlesIntro":
    "Diese Prinzipien bestimmen, wie SETBUILDER den Bogen legt und worauf du in der Setliste achten solltest.",
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
  "builder.app.title": "App & Updates",
  "builder.app.versionLine": "Version {version} · {channel}",
  "builder.app.channelDesktop": "Desktop",
  "builder.app.channelWeb": "Browser",
  "builder.app.runtime": "Electron {electron} · {platform}/{arch}",
  "builder.app.statusIdle": "Optional nach einer neueren Version suchen.",
  "builder.app.statusChecking": "Suche nach Updates…",
  "builder.app.statusAvailable": "Version {version} ist bereit zum Laden.",
  "builder.app.statusDownloading": "Lade Update… {percent}%",
  "builder.app.statusReady": "Version {version} ist geladen. Neu starten zum Installieren.",
  "builder.app.statusCurrent": "Du hast die aktuelle Version.",
  "builder.app.statusUnsigned":
    "Diese Mac-Build ist nicht mit Apple signiert. Automatische Updates gehen damit nicht — neue Version von GitHub laden und die App ersetzen.",
  "builder.app.signatureFailed":
    "Update abgelehnt (Signatur). Unsignierte Builds können sich nicht selbst aktualisieren — bitte die neue Version von GitHub laden.",
  "builder.app.check": "Nach Updates suchen",
  "builder.app.checking": "Prüfe…",
  "builder.app.checkTip": "GitHub-Releases prüfen, ob eine neuere Desktop-Version da ist.",
  "builder.app.download": "Update laden",
  "builder.app.downloadTip": "Die neue Version im Hintergrund herunterladen.",
  "builder.app.downloadManual": "Neue Version laden",
  "builder.app.install": "Neu starten & installieren",
  "builder.app.installTip": "SETBUILDER beenden und die geladene Version installieren.",
  "builder.app.openReleases": "Releases auf GitHub",
  "builder.app.checkFailed": "Update-Prüfung hat nicht geklappt.",
  "builder.app.downloadFailed": "Download hat nicht geklappt.",
  "builder.app.installFailed": "Installation hat nicht geklappt.",
  "builder.setups.aria": "Verbindungen und Setups",
  "builder.setups.intro": "Brief sichern, Setup laden, optional Spotify und Tidal verbinden.",
  "builder.setups.sectionBrief": "Brief & Setup",
  "builder.setups.sectionServices": "Dienste",
  "builder.setups.name": "Name",
  "builder.setups.nameAria": "Setup-Name",
  "builder.setups.stored": "Gespeicherter Stand",
  "builder.setups.selectAria": "Gespeichertes Setup",
  "builder.setups.choose": "Wählen…",
  "builder.setups.fileTitle": "Datei",
  "builder.setups.fileHint": "Als JSON sichern oder auf einem anderen Rechner öffnen.",
  "builder.setups.download": "Herunterladen",
  "builder.setups.fallbackName": "Setup",
  "builder.app.statusUnsignedShort":
    "Nicht mit Apple signiert — Updates manuell von GitHub laden.",

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
    "SETBUILDER-rekordbox.xml gespeichert (Ordner Downloads). In rekordbox: Einstellungen → Erweitert → Datenbank → „rekordbox xml“ → diese Datei wählen. Dann links unter „rekordbox xml“ die Playlist per Rechtsklick „Playlist importieren“. Alternativen liegen in der zweiten Playlist.",
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
  "builder.status.sorted.perfect":
    "Perfekt sortiert: minimale Clashes, maximaler Mix-Score. Bogen prüfen — Opener/Closer bleiben. 100 % nur wenn alle Keys verbunden sind.",
  "builder.status.sorted.harmonic":
    "Harmonisch sortiert: verwandte Keys beieinander. Mix-Score und Clashes im Bogen prüfen.",
  "builder.status.sorted.gentle":
    "Ein-Schritt: Energie läuft in kleinen Stufen. Sprünge im Bogen prüfen.",
  "builder.status.sorted.energy":
    "Nach Energie sortiert: die Welle folgt den Phasen. Mix-Score im Bogen prüfen.",
  "builder.status.sorted.roller":
    "Doppel-Peak: aufbauen, kurz atmen, dann zum Peak. Mix-Score im Bogen prüfen.",
  "builder.status.sorted.tempo":
    "Nach Tempo sortiert: BPM baut auf, im Release wieder runter.",
  "builder.status.sorted.pulse":
    "BPM-Kette: Tempo bleibt nah beieinander, leicht mit der Phase.",
  "builder.status.sorted.journey":
    "Camelot-Reise: das Set läuft im Uhrzeigersinn ums Wheel.",
  "builder.status.sorted.waves":
    "Wellen: im Peak wechseln Groove und Impact.",
  "builder.status.sorted.unchanged":
    "Reihenfolge unverändert: innerhalb jeder Phase passt die Lage schon, oder Key, Energie und BPM fehlen. Tracks zwischen Phasen ziehen oder die Werte in der Setliste setzen.",
  "builder.status.fits": "Das Set passt schon in den Slot.",
  "builder.status.fitStuck":
    "Nicht weiter kürzbar: der erste und der letzte Track und ein Track pro Phase bleiben immer. Lange Tracks von Hand auf Alternativen setzen.",
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
    "Spotify unter „Verbindungen & Setups“ einrichten (Client ID und Secret), danach „Spotify-Links suchen“ erneut starten. Der rekordbox-Export braucht das nicht.",
  "builder.fail.notSetup": "Datei enthält kein SETBUILDER-Setup.",
  "builder.fail.file": "Datei ungültig.",
  "builder.fail.fileHint":
    "Eine Datei verwenden, die hier über Herunterladen gespeichert wurde.",
  "builder.fail.copy": "Zwischenablage nicht erreichbar.",
  "builder.fail.copyHint":
    "Der Text liegt stattdessen als Datei im Ordner Downloads.",
  "builder.fail.setupStorage": "Setup nicht gespeichert.",
  "builder.fail.setupStorageHint":
    "Der Browser-Speicher ist voll oder blockiert. Stattdessen „Herunterladen“ nutzen.",

  // Destructive actions and storage
  "builder.reset.confirm":
    "{tracks} aus dem Set entfernen und zum Beispiel-Brief zurück? Das lässt sich nicht rückgängig machen. Gespeicherte Setups bleiben.",
  "builder.storage.blocked":
    "Dieser Browser speichert das Set gerade nicht (Speicher voll oder blockiert). Änderungen gelten nur bis zum Neuladen — unter „Verbindungen & Setups“ als Datei sichern.",
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

  "builder.defaults.title": "Nightline 01",
  "builder.defaults.vibe": "Tech house → melodic peak",
  "builder.defaults.venue": "Club, mid-size, good PA",
  "builder.defaults.slot": "Peak time · 60 min",
  "builder.defaults.audience": "Locals, floor already warm",
  "builder.defaults.gear": "CDJs / USB",

  "builder.hero.title": "Dramaturgy, not a playlist.",
  "builder.hero.lede":
    "SETBUILDER shapes a set from your rekordbox stick. Load a playlist or history, lay out the arc by slot and duration, and see from key and BPM whether the transition to the next track holds. Spotify, Tidal and Beatport fill the gaps when a track isn't on the stick yet.",
  "builder.brief.aria": "Set brief",
  "builder.brief.title": "Title",
  "builder.brief.vibe": "Vibe / genre arc",
  "builder.brief.venue": "Venue / sound system",
  "builder.brief.slotKind": "Slot type",
  "builder.brief.audience": "Audience",
  "builder.brief.gear": "Gear",
  "builder.brief.duration": "Duration (min)",
  "builder.brief.notes": "Notes",
  "builder.brief.notesPlaceholder": "Doors, curfew, promoter, specials…",

  "builder.library.title": "Load set & keys",
  "builder.library.keys": "{done}/{total} keys",
  "builder.library.firstStep": "First step",
  "builder.stickReload.title": "Choose the stick again",
  "builder.stickReload.body":
    "The set is still here. Covers and stick preview need the same folder once more — rekordbox is left alone, the set is not replaced.",
  "builder.stickReload.choose": "Choose stick",
  "builder.stickReload.reconnect": "Reconnect stick",
  "builder.stickReload.busy": "Reading the stick…",
  "builder.stickReload.later": "Later",
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
    "SETBUILDER takes a playlist and spreads the tracks across the set by duration, phases and roles.",
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
  "builder.conn.optional": "Connect Spotify and Tidal (optional)",
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
  "builder.tool.sort": "Sort",
  "builder.tool.energy": "Energy from files",
  "builder.tool.energyTip":
    "Computes Energy Level 1–10 from stick files (Essentia), sets it in the draft, and writes it into MP3 tags. The set note stays untouched; so do key and BPM.",
  "builder.tool.energyBusy": "Energy…",
  "builder.energy.confirm":
    "Compute energy from stick files and write it into the MP3s on the stick? Audio stays unchanged; key and BPM are not overwritten. Needs Chrome, Edge or desktop.",
  "builder.energy.confirmMissing":
    "OK = only the {missing} tracks without energy. Cancel = recompute all {total} with a file.",
  "builder.energy.confirmAll":
    "Every track already has energy. Recompute and write all {total} with a file?",
  "builder.energy.noStick":
    "No stick connected. Choose the stick under “Load set & keys” (Chrome / Edge / desktop).",
  "builder.energy.noFile":
    "No tracks with a stick path. Load the set from the stick so the files can be found.",
  "builder.energy.notMp3": "Not MP3 — draft only",
  "builder.energy.progress": "{done}/{total} · {skipped} skipped · {errors} errors",
  "builder.energy.done":
    "Done: {set} set, {written} written to MP3 · {skipped} skipped · {errors} errors",
  "builder.energy.denied":
    "No write access to the stick. Allow it in the dialog, otherwise only the draft is updated.",
  "builder.sort.perfect": "Perfect · Max score",
  "builder.sort.perfectHint":
    "Whole set: exact Camelot TSP (Held-Karp ≤18, else NN+2-opt/Or-opt). Kill clashes first, then max mix score. Opener/closer stay. Phases re-laid after.",
  "builder.sort.harmonic": "Harmonic",
  "builder.sort.harmonicHint":
    "Next track: related Camelot key, smooth energy, small BPM steps. Raises the mix score, cuts clashes.",
  "builder.sort.gentle": "One-step",
  "builder.sort.gentleHint":
    "Mixed In Key: energy moves ±1 per transition, with the phase. Fewer jumps, smoother floor.",
  "builder.sort.energy": "Energy wave",
  "builder.sort.energyHint":
    "Energy rises from Open to Peak, falls in Release. Key is only the tie-breaker.",
  "builder.sort.roller": "Twin peak",
  "builder.sort.rollerHint":
    "Mixed In Key arc: build, dip about −2, climb to the peak. Open/Lift only climb, Release only fall.",
  "builder.sort.tempo": "Build tempo",
  "builder.sort.tempoHint":
    "BPM rises in the phase (falls in Release). Classic house/techno ramp.",
  "builder.sort.pulse": "BPM chain",
  "builder.sort.pulseHint":
    "Next track stays close to the current BPM (±2–4), lightly with the phase. Stays in the pocket.",
  "builder.sort.journey": "Camelot journey",
  "builder.sort.journeyHint":
    "Walks clockwise around the wheel instead of stacking the same key.",
  "builder.sort.waves": "Waves",
  "builder.sort.wavesHint":
    "In the peak, groove and impact alternate. Before that energy rises, after that it falls.",
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
  "builder.list.detailsClose": "Details off",
  "builder.list.detailsOpen": "Details on",
  "builder.list.detailsTitle": "Show or hide key, BPM, energy and set note on every row.",
  "builder.list.filterAria": "Filter setlist",
  "builder.list.filterSet": "All tracks (Set)",
  "builder.list.filterSetTitle": "Performance order, without the alternatives.",
  "builder.list.empty": "No set yet.",
  "builder.list.emptyHint":
    "Add music above or load a playlist from the stick under “Load set & keys”.",

  "builder.row.dragAria": "Move {name}",
  "builder.row.dragTitle": "Drag here",
  "builder.row.phaseAria": "Phase for {name}",
  "builder.row.roleAria": "Role for {name}",
  "builder.row.playAria": "Play {name}",
  "builder.row.playTip": "Listen in the player below — focus this track.",
  "builder.row.moveUpTip": "Move one slot up in the played order.",
  "builder.row.moveDownTip": "Move one slot down in the played order.",
  "builder.row.removeTip": "Remove from the set. Opener/closer pin goes with it.",
  "builder.row.removeAria": "Remove {name}",
  "builder.row.sourceTip":
    "Where the track came from: stick/rekordbox, Spotify, Tidal, or added by hand.",
  "builder.row.replace": "Replace",
  "builder.row.replaceTitle":
    "Replacement from your Alternatives or the library, matched to the previous and next track",
  "builder.row.setOpener": "Opener",
  "builder.row.setOpenerTitle":
    "Pin as the first track of the set (Open). Stays first when you sort.",
  "builder.row.clearOpener": "Unpin opener",
  "builder.row.clearOpenerTip":
    "Unpin — the track stays in the set; sorting picks the start freely again.",
  "builder.row.setCloser": "Closer",
  "builder.row.setCloserTitle":
    "Pin as the last track of the set (Release). Stays last when you sort.",
  "builder.row.clearCloser": "Unpin closer",
  "builder.row.clearCloserTip":
    "Unpin — the track stays in the set; sorting picks the end freely again.",
  "builder.row.openerBadge": "Opener",
  "builder.row.openerBadgeTip": "Pinned opener — first performance track, even after sorting.",
  "builder.row.closerBadge": "Closer",
  "builder.row.closerBadgeTip": "Pinned closer — last performance track, even after sorting.",
  "builder.row.why": "Why here:",
  "builder.row.details": "Details",
  "builder.row.keyOpen": "Key open",
  "builder.row.bpmOpen": "BPM open",
  "builder.row.energy": "Energy {level}",
  "builder.row.setNoteTag": "Set note",
  "builder.row.setNote": "Set note",
  "builder.row.setNotePlaceholder": "Cue, vocal in, floor note…",
  "builder.row.setNoteTip":
    "Only for this set in SETBUILDER. Not written to MP3 tags — unlike the comment in rekordbox.",
  "builder.row.bpmPlaceholder": "BPM",
  "builder.row.bpmAria": "BPM for {name}",
  "builder.row.keyOption": "Key",
  "builder.row.keyAria": "Key for {name}",
  "builder.row.keyHint":
    "Camelot key, e.g. 8A. A = minor, B = major. Same key, ±1 or A↔B mix smoothly. Changing it changes mix score and clashes.",
  "builder.row.energyOption": "Energy",
  "builder.row.energyAria": "Energy Level for {name}",
  "builder.row.energyHint":
    "Energy Level 1–10 (Mixed In Key): how hard the track hits the room. 1–3 warm, 7–8 rise, 8–10 peak. Changing it changes the energy path.",
  "builder.row.bpmHint":
    "Tempo. Pitch evens out small steps. Jumps over 3 BPM need a break.",
  "builder.row.phaseHint":
    "Where the track sits in the slot: Open warms up, Peak is the high point, Release lands. The phase sets the energy target band.",
  "builder.row.roleHint":
    "Anchor is the signature, Bridge needs care (clash, jump), Groove is the breath, Alternatives are Plan B.",
  "builder.row.transitionHint":
    "How you go into the next track: long blend when it's smooth, EQ or a break on a clash, a reset when energy drops.",
  "builder.row.transitionAria": "Transition for {name}",

  "builder.curve.aria": "Energy curve",
  "builder.curve.title": "Phases in the slot",
  "builder.curve.summary":
    "{duration} / {minutes}:00 · {performance} performance · {safety} alternatives",
  "builder.curve.summaryOver":
    "{duration} / {minutes}:00 · over the brief · {performance} performance · {safety} alternatives",
  "builder.curve.principles": "Dramaturgy principles",
  "builder.curve.principlesIntro":
    "These principles decide how SETBUILDER lays out the arc and what to watch for in the setlist.",
  "builder.curve.phaseLabel": "{phase}: {actual} of about {minutes} min",
  "builder.curve.phaseClick": "{label}. Click to put new tracks in this phase.",
  "builder.curve.phaseTime": "{actual} / ~{minutes} min",
  "builder.curve.note":
    "The width is the share of the brief, the fill is the playing time already placed. Yellow means the phase runs over its window.",

  "builder.settings.title": "Connections & setups",
  "builder.settings.default": "Save · Connect",
  "builder.settings.spotifyReady": "Spotify ready",
  "builder.settings.spotifyMissing": "Spotify missing",
  "builder.app.title": "App & updates",
  "builder.app.versionLine": "Version {version} · {channel}",
  "builder.app.channelDesktop": "Desktop",
  "builder.app.channelWeb": "Browser",
  "builder.app.runtime": "Electron {electron} · {platform}/{arch}",
  "builder.app.statusIdle": "Optionally check for a newer version.",
  "builder.app.statusChecking": "Checking for updates…",
  "builder.app.statusAvailable": "Version {version} is ready to download.",
  "builder.app.statusDownloading": "Downloading update… {percent}%",
  "builder.app.statusReady": "Version {version} is downloaded. Restart to install.",
  "builder.app.statusCurrent": "You are on the latest version.",
  "builder.app.statusUnsigned":
    "This Mac build is not Apple-signed. Automatic updates won’t work — download the new version from GitHub and replace the app.",
  "builder.app.signatureFailed":
    "Update rejected (code signature). Unsigned builds can’t self-update — download the new version from GitHub.",
  "builder.app.check": "Check for updates",
  "builder.app.checking": "Checking…",
  "builder.app.checkTip": "Check GitHub releases for a newer desktop build.",
  "builder.app.download": "Download update",
  "builder.app.downloadTip": "Download the new version in the background.",
  "builder.app.downloadManual": "Download new version",
  "builder.app.install": "Restart & install",
  "builder.app.installTip": "Quit SETBUILDER and install the downloaded version.",
  "builder.app.openReleases": "Releases on GitHub",
  "builder.app.checkFailed": "Update check failed.",
  "builder.app.downloadFailed": "Download failed.",
  "builder.app.installFailed": "Install failed.",
  "builder.setups.aria": "Connections and setups",
  "builder.setups.intro": "Save the brief, load a setup, optionally connect Spotify and Tidal.",
  "builder.setups.sectionBrief": "Brief & setup",
  "builder.setups.sectionServices": "Services",
  "builder.setups.name": "Name",
  "builder.setups.nameAria": "Setup name",
  "builder.setups.stored": "Saved state",
  "builder.setups.selectAria": "Saved setup",
  "builder.setups.choose": "Choose…",
  "builder.setups.fileTitle": "File",
  "builder.setups.fileHint": "Save as JSON or open on another computer.",
  "builder.setups.download": "Download",
  "builder.setups.fallbackName": "Setup",
  "builder.app.statusUnsignedShort":
    "Not Apple-signed — download updates manually from GitHub.",

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
    "SETBUILDER-rekordbox.xml saved (Downloads folder). In rekordbox: Preferences → Advanced → Database → “rekordbox xml” → choose this file. Then, under “rekordbox xml” in the left tree, right-click the playlist → “Import Playlist”. Alternatives are in the second playlist.",
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
  "builder.status.sorted.perfect":
    "Sorted for max score: minimal clashes, maximal mix score. Check the Arc — opener/closer stay. 100% only when all keys connect.",
  "builder.status.sorted.harmonic":
    "Sorted harmonically: related keys together. Check mix score and clashes on the Arc.",
  "builder.status.sorted.gentle":
    "One-step: energy moves in small steps. Check jumps on the Arc.",
  "builder.status.sorted.energy":
    "Sorted by energy: the wave follows the phases. Check the mix score on the Arc.",
  "builder.status.sorted.roller":
    "Twin peak: build, breathe, then climb to the peak. Check the mix score on the Arc.",
  "builder.status.sorted.tempo":
    "Sorted by tempo: BPM builds, then drops in the release.",
  "builder.status.sorted.pulse":
    "BPM chain: tempo stays close, lightly with the phase.",
  "builder.status.sorted.journey":
    "Camelot journey: the set walks clockwise around the wheel.",
  "builder.status.sorted.waves":
    "Waves: in the peak, groove and impact alternate.",
  "builder.status.sorted.unchanged":
    "Order unchanged: within each phase it already fits, or key, energy and BPM are missing. Drag tracks across phases or set the values in the setlist.",
  "builder.status.fits": "The set already fits the slot.",
  "builder.status.fitStuck":
    "Cannot trim further: the first and last track and one track per phase always stay. Move long tracks to Alternatives by hand.",
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
    "Set up Spotify under “Connections & setups” (client ID and secret), then run “Find Spotify links” again. The rekordbox export does not need it.",
  "builder.fail.notSetup": "The file doesn't contain a SETBUILDER setup.",
  "builder.fail.file": "Invalid file.",
  "builder.fail.fileHint": "Use a file that was saved here via Download.",
  "builder.fail.copy": "Clipboard not available.",
  "builder.fail.copyHint": "The text was saved as a file in your Downloads folder instead.",
  "builder.fail.setupStorage": "Setup not saved.",
  "builder.fail.setupStorageHint":
    "Browser storage is full or blocked. Use “Download” instead.",

  "builder.reset.confirm":
    "Remove {tracks} from the set and return to the sample brief? This cannot be undone. Saved setups stay.",
  "builder.storage.blocked":
    "This browser is not saving the set right now (storage full or blocked). Changes last until reload — save it as a file under “Connections & setups”.",
};

export const builder = { de, en };
