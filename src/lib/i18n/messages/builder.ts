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

  // Hero and brief form
  "builder.hero.title": "Raus aus der Playlist.",
  "builder.hero.manifestoLead":
    "Der Stick ist das Material. Du ziehst den Bogen, setzt Übergang und Länge und hörst, ob der Anschluss trägt.",
  "builder.hero.manifestoBody":
    "Musik lässt sich analysieren und planen – aber Gehör, Gefühl und Floor entscheiden. SETBUILDER gibt Orientierung, macht Übergänge sichtbar und liefert Ideen. Nutze es als Hilfe – und vertraue dann deinen Ohren.",
  "builder.hero.lede":
    "SETBUILDER formt aus dem Rekordbox-Stick ein Set: Playlist oder History laden, den Bogen nach Slot und Dauer legen, Key und BPM prüfen. Spotify, Tidal und Beatport ergänzen, wenn ein Track noch nicht auf dem Stick liegt.",
  "builder.brief.aria": "Set brief",
  "builder.brief.title": "Titel",
  "builder.brief.titlePlaceholder": "Nachtlinie 01",
  "builder.brief.vibe": "Vibe / Genre-Arc",
  "builder.brief.vibePlaceholder": "Tech House → Melodic Peak",
  "builder.brief.venue": "Venue / Soundsystem",
  "builder.brief.venuePlaceholder": "Club, mid-size, guter PA",
  "builder.brief.slotKind": "Slot-Art",
  "builder.brief.slotKindEmpty": "—",
  "builder.brief.audience": "Audience",
  "builder.brief.audiencePlaceholder": "Locals, dancefloor schon warm",
  "builder.brief.gear": "Gear",
  "builder.brief.gearPlaceholder": "CDJs / USB",
  "builder.brief.duration": "Dauer (Min)",
  "builder.brief.blend": "Blend-Zeit (Durchschnitt)",
  "builder.brief.blendHint": "Durchschnittliche Zeit vom Ende jedes Tracks, die in den Übergang geht. Die Spielzeit im Slot folgt sofort.",
  "builder.brief.blend.30000": "0:30 Quick",
  "builder.brief.blend.60000": "1:00",
  "builder.brief.blend.120000": "2:00 Standard",
  "builder.brief.blend.240000": "4:00 Lang",
  "builder.brief.notes": "Notes",
  "builder.brief.notesPlaceholder": "Doors, Curfew, Promoter, Specials…",
  "builder.brief.more": "Set-Info",
  "builder.brief.moreHint":
    "Notizen zum Gig: Vibe, Venue, Slot, Publikum, Gear — Dauer und Blend-Zeit bleiben oben.",

  "builder.ready.title": "Vor dem Mitnehmen",
  "builder.ready.intro": "Kurz prüfen, dann mitnehmen.",
  "builder.ready.continue": "Trotzdem mitnehmen",
  "builder.ready.close": "Zurück",
  "builder.ready.block": "Hält diese Aktion auf",
  "builder.ready.filesBlock": "{count} Tracks ohne Datei in dieser Sitzung. Stick schreiben braucht die Dateien.",
  "builder.ready.filesAck": "{count} Tracks ohne Datei in dieser Sitzung.",
  "builder.ready.reselectStick": "Stick-Ordner erneut wählen",
  "builder.ready.reselectStickTip":
    "Denselben Ordner wählen, von dem das Set kommt — dann sind die Dateien wieder in der Sitzung.",
  "builder.ready.reselectStickBusy": "Lese den Stick…",
  "builder.ready.keys": "{count} Tracks ohne Key.",
  "builder.ready.energy": "{count} Tracks ohne Energie.",
  "builder.ready.planB": "Plan B dünn: {phases}.",
  "builder.ready.planBPhase": "{phase} {have}/{need}",
  "builder.ready.player.broken": "Auf dem Stick liegt keine lesbare Bibliothek.",
  "builder.ready.player.empty": "Auf dem Stick liegen noch keine Playlists.",
  "builder.ready.player.needsRekordbox": "Die alte Player-Bibliothek verdeckt die Playlists. Vorher für den Player vorbereiten.",
  "builder.ready.player.hiddenFolder": "Der Stick-Ordner ist versteckt. Viele Player finden ihn trotzdem.",
  "builder.ready.player.incomplete": "Nur eine Datei gewählt. Für den Player den ganzen Stick wählen.",
  "builder.ready.heard": "Den Stick am echten Player hören, bevor der Gig beginnt.",
  "builder.row.rehearse": "Übergang vorhören",
  "builder.row.rehearseTip": "Vorherigen, diesen und den nächsten Track nacheinander hören. Übergang und Notiz bleiben im Set.",

  // Folds
  "builder.library.title": "Stick laden & vorbereiten",
  "builder.library.keys": "{done}/{total} Keys",
  "builder.library.firstStep": "Erster Schritt",
  "builder.stickReload.body":
    "Für „{title}“ den Stick noch einmal wählen. Cover und Vorhören brauchen denselben Ordner, das Set bleibt.",
  "builder.stickReload.choose": "Stick wählen",
  "builder.stickReload.reconnect": "Stick verbinden",
  "builder.stickReload.busy": "Lese den Stick…",
  "builder.stickReload.later": "Später",
  "builder.stick.reading": "Lese den Stick…",
  "builder.stick.tags": "Energie aus Tags {done}/{total}",
  "builder.stick.ready": "Stick gelesen.",
  "builder.build.title": "Set bauen",
  "builder.build.summary": "{performance} Performance · {safety} Alternativen",
  "builder.guide.title": "So ist es gedacht",
  "builder.guide.brief.title": "Brief",
  "builder.guide.brief.body":
    "Dauer und Blend-Zeit (Durchschnitt) gelten für den Slot. Set-Info (Vibe, Venue, Slot, Audience, Gear, Notes) sind nur Notizen zum Gig.",
  "builder.guide.details.title": "Details",
  "builder.guide.details.body":
    "Key, BPM, Energie und Übergang in der Zeile sind die Mix-Marken für diesen Anschluss.",
  "builder.guide.transition.title": "Übergang",
  "builder.guide.transition.body":
    "Ein Übergang markiert, wie du in den nächsten Track gehst (Cut, Short blend, Long blend, EQ swap, Echo-out und die übrigen) und wird nicht in die Audiodatei geschrieben. „—“ heißt: keine Marke.",
  "builder.guide.length.title": "Länge",
  "builder.guide.length.body":
    "Die Länge daneben ist die Überlappung: diese Zeit geht von der Spielzeit ab, Slot-Zeile und Überlänge folgen ihr. Du wählst eine Länge oder tippst sie; lässt du sie leer, schlägt der Übergang eine Zeit vor, und „—“ behält die Blend-Zeit aus dem Brief.",
  "builder.guide.rehearse.title": "Vorhören",
  "builder.guide.rehearse.body":
    "Vorhören im Player (Vorher / Jetzt / Danach) ist zum Hören dieses Anschlusses und zum Setzen derselben Marke und Länge.",
  "builder.guide.note.title": "Set-Notiz",
  "builder.guide.note.body":
    "Die Set-Notiz ist für die Kabine (Cue, Floor). Sie wird nicht in die MP3 geschrieben.",
  "builder.playlist.title": "Mit einer Playlist starten",
  "builder.playlist.note":
    "Die Playlist wird die Basis des Sets. Einzelne Tracks danach unter Musik hinzufügen.",
  "builder.playlist.empty":
    "Noch kein Stick. Oben unter „Stick laden & vorbereiten“ den Stick laden.",
  "builder.playlist.confirmTitle": "Playlist „{name}“ laden?",
  "builder.playlist.confirmBody":
    "Im aktuellen Set stehen bereits Tracks. Ersetzen überschreibt die Setliste; Zusammenführen behält sie und hängt nur neue Tracks an.",
  "builder.playlist.replace": "Ersetzen",
  "builder.playlist.merge": "Zusammenführen",
  "builder.playlist.cancel": "Abbrechen",
  "builder.playlist.merged": "{kind} „{name}“ zusammengeführt · {tracks}",
  "builder.playlist.replacedTitle": "Playlist ersetzt",
  "builder.playlist.replacedBody":
    "Die vorherige Setliste kann einmal wiederhergestellt werden.",
  "builder.playlist.undo": "Rückgängig",
  "builder.playlist.dismiss": "Schließen",
  "builder.playlist.undoDone": "Vorherige Setliste wiederhergestellt.",

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
  "builder.add.backup": "Andere Quellen",
  "builder.add.backupNote":
    "Für Tracks, die nicht in der Bibliothek stehen.",
  "builder.add.empty":
    "Noch keine Bibliothek. Oben unter „Stick laden & vorbereiten“ den Stick laden.",

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
  "builder.tool.reshuffle": "Andere Songs",
  "builder.tool.reshuffleTip":
    "Würfelt aus dem Playlist-Pool ({pool} Tracks) eine neue Performance für denselben Brief. Alternativen werden neu gefüllt. Opener, Closer und gepinnte Tracks bleiben; Notizen gehen verloren.",
  "builder.tool.reshuffleTipStick":
    "Würfelt aus der Stick-Bibliothek ({pool} Tracks, alle Playlists) eine neue Performance für denselben Brief. Alternativen werden neu gefüllt. Opener, Closer und gepinnte Tracks bleiben; Notizen gehen verloren.",
  "builder.tool.reshuffleDisabledTip":
    "Braucht mehr Tracks als im Set. Stick laden — dann kommt die Auswahl aus den Playlists darauf — oder eine längere Playlist extrahieren.",
  "builder.tool.reshuffleConfirm":
    "Setliste aus dem Playlist-Pool ({pool} Tracks) neu setzen? Brief, Opener, Closer und gepinnte Tracks bleiben. Der Rest kommt neu aus der Playlist.",
  "builder.tool.reshuffleConfirmStick":
    "Setliste aus den {pool} Tracks auf dem Stick neu setzen? Brief, Opener, Closer und gepinnte Tracks bleiben. Der Rest kommt neu aus der Playlist.",
  "builder.pool.different": "Andere Tracks",
  "builder.pool.differentHint":
    "Neue Performance aus dem Playlist-Pool ({count} Tracks). Brief und Pins bleiben.",
  "builder.pool.differentStickHint":
    "Neue Performance aus der Stick-Bibliothek ({count} Tracks). Brief und Pins bleiben.",
  "builder.pool.differentMissing": "Kein größerer Pool geladen.",
  "builder.pool.differentSmall": "Der Pool hat nicht mehr Tracks als das Set.",
  "builder.pool.playlist": "Aus der Playlist",
  "builder.pool.playlistHint":
    "{count} Tracks der Playlist, aus der das Set kommt. Brief und Pins bleiben.",
  "builder.pool.playlistMissing": "Keine Playlist hinter diesem Set.",
  "builder.pool.playlistSmall": "Die Playlist hat nicht mehr Tracks als das Set.",
  "builder.pool.collection": "Aus der Collection",
  "builder.pool.collectionHint":
    "{count} Tracks aus der geladenen Collection. Brief und Pins bleiben.",
  "builder.pool.collectionMissing": "Collection ist nicht geladen.",
  "builder.pool.collectionSmall": "Die Collection hat nicht mehr Tracks als das Set.",
  "builder.pool.collectionConfirm":
    "Setliste aus den {pool} Tracks der Collection neu setzen? Brief, Opener, Closer und gepinnte Tracks bleiben. Der Rest kommt neu aus der Collection.",
  "builder.pool.history": "Aus der History",
  "builder.pool.historyHint":
    "{count} gespielte Tracks. Brief und Pins bleiben.",
  "builder.pool.historyMissing": "Keine History geladen.",
  "builder.pool.historySmall": "Die History hat nicht mehr Tracks als das Set.",
  "builder.pool.historyConfirm":
    "Setliste aus den {pool} gespielten Tracks neu setzen? Brief, Opener, Closer und gepinnte Tracks bleiben. Der Rest kommt neu aus der History.",
  "builder.tool.energy": "Energie aus Dateien",
  "builder.tool.energyBusy": "Energie…",
  "builder.energy.noStick":
    "Kein Stick verbunden. Unter „Stick laden & vorbereiten“ den Stick wählen (Chrome / Edge / Desktop).",
  "builder.energy.noFile":
    "Keine Tracks mit Stick-Pfad. Set vom Stick laden, damit die Dateien gefunden werden.",
  "builder.energy.measureFailed": "Messung fehlgeschlagen",
  "builder.energy.one": "Energie {level} · {name}",
  "builder.energy.oneWritten": "Energie {level} · {name} · MP3 geschrieben",
  "builder.energy.progress": "{done}/{total} · {skipped} übersprungen · {errors} Fehler",
  "builder.work.queued": "Wartet · noch {count} davor",
  "builder.work.queuedNamed":
    "{label}{target} wartet · Position {position}",
  "builder.work.runningNamed": "{label}{target} läuft…",
  "builder.work.stickReconnect": "Stick erneut verbinden",
  "builder.work.stickMerge": "Stick-Dateien ins Set einlesen",
  "builder.work.collectionImport": "rekordbox Collection importieren",
  "builder.work.energyTags": "Energie-Tags lesen",
  "builder.work.energyMissing": "Fehlende Energie messen",
  "builder.work.energyAll": "Alle Energien neu messen",
  "builder.work.energyWrite": "Energie in MP3 schreiben",
  "builder.work.energyTrack": "Track-Energie messen",
  "builder.energy.done":
    "Fertig: {set} gesetzt, {written} in MP3 geschrieben · {skipped} übersprungen · {errors} Fehler",
  "builder.energy.denied":
    "Kein Schreibzugriff auf den Stick. Im Dialog erlauben, sonst wird nur der Draft aktualisiert.",
  "builder.energy.measured": "Gemessen: {set} · {skipped} übersprungen · {errors} Fehler",
  "builder.energy.tags": "Tags {done}/{total}",
  "builder.energy.tagsDone": "{found} von {total} aus Tags gelesen",
  "builder.energy.noneMissing": "Alle Tracks mit Datei haben schon Energie.",
  "builder.energy.noneKnown": "Noch keine Energie zum Schreiben.",
  "builder.energy.writeProgress": "Schreibe {done}/{total} · {written} geschrieben",
  "builder.energy.writeDone": "{written} MP3 geschrieben · {skipped} übersprungen",
  "builder.energy.menu.read": "Aus Tags lesen",
  "builder.energy.menu.readHint":
    "{count} Dateien, ohne Audio zu dekodieren. Der Tag ersetzt den Level im Set.",
  "builder.energy.menu.missing": "Fehlende messen",
  "builder.energy.menu.missingHint":
    "{count} Tracks ohne Energie im Hintergrund messen. Die Datei wird nicht geschrieben.",
  "builder.energy.menu.all": "Alle neu berechnen",
  "builder.energy.menu.allHint":
    "{count} Dateien im Hintergrund neu messen. Die Datei bleibt unverändert.",
  "builder.energy.menu.write": "In MP3 schreiben",
  "builder.energy.menu.writeHint":
    "{count} gesetzte Level in die Dateien schreiben. Key, BPM und Audio bleiben.",
  "builder.sort.perfect": "Perfekt · Max Score",
  "builder.sort.perfectHint":
    "Ganzes Set: exakter Camelot-TSP (Held-Karp ≤18, sonst NN+2-opt/Or-opt). Clashes zuerst killen, dann Mix-Score. Opener/Closer bleiben. Phasen danach neu.",
  "builder.sort.harmonic": "Harmonisch",
  "builder.sort.harmonicHint":
    "Pro Phase: nächster Track verwandter Camelot-Key, weiche Energie, kleine BPM-Schritte. Opener/Closer bleiben. Hebt den Mix-Score, senkt Clashes.",
  "builder.sort.gentle": "Ein-Schritt",
  "builder.sort.gentleHint":
    "Pro Phase · Mixed In Key: Energie bevorzugt ±1, in Phasenrichtung. Opener/Closer bleiben. Weniger Sprünge, weicher Floor.",
  "builder.sort.energy": "Energie-Welle",
  "builder.sort.energyHint":
    "Pro Phase: Open bis Peak steigt die Energie, Release fällt. Key ist der Tiebreaker, BPM danach. Opener/Closer bleiben.",
  "builder.sort.roller": "Doppel-Peak",
  "builder.sort.rollerHint":
    "Pro Phase · Mixed In Key Arc: im Peak aufbauen, kurz absacken (−2), dann zum Peak. Open/Lift/Rise nur steigen, Release nur fallen. Opener/Closer bleiben.",
  "builder.sort.tempo": "Tempo aufbauen",
  "builder.sort.tempoHint":
    "Pro Phase: BPM steigt (Release fällt). Opener/Closer bleiben. Klassische House/Techno-Rampe.",
  "builder.sort.pulse": "BPM-Kette",
  "builder.sort.pulseHint":
    "Pro Phase: nächster Track möglichst nah am aktuellen BPM (±2–4), leicht mit der Phase. Opener/Closer bleiben. Bleibt im Pocket.",
  "builder.sort.journey": "Camelot-Reise",
  "builder.sort.journeyHint":
    "Pro Phase: läuft im Uhrzeigersinn ums Wheel, statt denselben Key zu stapeln. Opener/Closer bleiben.",
  "builder.sort.waves": "Wellen",
  "builder.sort.wavesHint":
    "Pro Phase: im Peak wechseln Groove und Impact (Anchor); sonst Low/High-Energie. Davor steigt die Energie, danach fällt sie. Opener/Closer bleiben.",
  "builder.tool.fit": "Auf Slot kürzen",
  "builder.tool.fitTip":
    "Kürzt auf die Spielzeit im Brief. {mix} pro Track gehen an den Blend, deshalb bleibt mehr Dateilänge im Set. Der Rest wandert unter Alternativen.",
  "builder.tool.fitTipPlan":
    "Kürzt auf die Spielzeit im Brief. Ein gesetzter Übergang zählt mit seiner Zeit, sonst der Blend {mix}. Der Rest wandert unter Alternativen.",
  "builder.tool.assign": "Rollen verteilen",
  "builder.tool.assignTip":
    "Setzt Anchor, Bridge und Groove neu nach Phase, Key und BPM. Die Reihenfolge bleibt.",

  // Setlist
  "builder.list.headAll":
    "Performance-Set · {tracks} · Blend {mix} · {duration} Spielzeit / {minutes}:00 Slot",
  "builder.list.headAllBlend":
    "Performance-Set · {tracks} · Blend {mix} · {duration} Spielzeit · {over} Überlänge / {minutes}:00 Slot",
  "builder.list.headAllLong":
    "Performance-Set · {tracks} · Blend {mix} · {duration} Spielzeit / {minutes}:00 Slot · zu lang",
  "builder.list.headAllLongBlend":
    "Performance-Set · {tracks} · Blend {mix} · {duration} Spielzeit · {over} Überlänge / {minutes}:00 Slot · zu lang",
  "builder.list.mixPlanned": "nach Plan",
  "builder.list.headRole": "{role} · {tracks} · {duration}",
  "builder.list.detailsClose": "Details aus",
  "builder.list.detailsOpen": "Details ein",
  "builder.list.detailsTitle": "Key, BPM, Energie und Set-Notiz in jeder Zeile ein- oder ausblenden.",
  "builder.list.filterAria": "Setliste filtern",
  "builder.list.filterSet": "Alle Tracks (Set)",
  "builder.list.filterSetTitle": "Performance-Reihenfolge, ohne die Alternativen.",
  "builder.list.empty": "Noch kein Set.",
  "builder.list.emptyHint":
    "Unter „Set bauen“ mit einer Playlist starten oder oben den Stick laden.",

  "builder.row.dragAria": "{name} verschieben",
  "builder.row.dragTitle": "Hier ziehen",
  "builder.row.phaseAria": "Phase für {name}",
  "builder.row.roleAria": "Rolle für {name}",
  "builder.row.playAria": "{name} abspielen",
  "builder.row.playTip": "Im Player unten anhören — Fokus auf diesen Track.",
  "builder.row.pauseAria": "{name} pausieren",
  "builder.row.pauseTip": "Wiedergabe pausieren.",
  "builder.row.moveUpTip": "Einen Platz nach oben in der gespielten Reihenfolge.",
  "builder.row.moveUpAria": "{name} nach oben",
  "builder.row.moveDownTip": "Einen Platz nach unten in der gespielten Reihenfolge.",
  "builder.row.moveDownAria": "{name} nach unten",
  "builder.row.removeTip": "Aus dem Set entfernen. Opener-/Closer-Pin fällt mit weg.",
  "builder.row.removeAria": "{name} entfernen",
  "builder.row.sourceTip":
    "Quelle des Tracks: Stick/rekordbox, Spotify, Tidal oder manuell hinzugefügt.",
  "builder.row.energyRedo": "Energie",
  "builder.row.energyRedoTip":
    "Energie neu aus der Datei messen. Die MP3 wird mitgeschrieben, wenn der Stick schon Schreibrecht hat.",
  "builder.row.energyRedoAria": "Energie für {name} neu messen",
  "builder.row.energyMenu.measure": "Neu messen",
  "builder.row.energyMenu.set": "Energie setzen",
  "builder.row.replace": "Ersatz",
  "builder.row.replaceTitle":
    "Ersatz aus deinen Alternativen oder aus der Bibliothek, passend zu Vorgänger und Nachfolger",
  "builder.row.setOpener": "Opener",
  "builder.row.setOpenerTitle":
    "Als ersten Track des Sets festlegen (Open). Bleibt beim Sortieren vorne.",
  "builder.row.clearOpener": "Opener lösen",
  "builder.row.clearOpenerTip":
    "Pin lösen — der Track bleibt im Set. Sortieren hält weiter den aktuellen ersten Track, bis du einen anderen pinnst oder nach vorne ziehst.",
  "builder.row.setCloser": "Closer",
  "builder.row.setCloserTitle":
    "Als letzten Track des Sets festlegen (Release). Bleibt beim Sortieren hinten.",
  "builder.row.clearCloser": "Closer lösen",
  "builder.row.clearCloserTip":
    "Pin lösen — der Track bleibt im Set. Sortieren hält weiter den aktuellen letzten Track, bis du einen anderen pinnst oder nach hinten ziehst.",
  "builder.row.setPin": "Pin",
  "builder.row.setPinTitle":
    "Im Set behalten. Beim Kürzen und bei Andere Songs bleibt der Track. Sortieren darf ihn frei verschieben.",
  "builder.row.setPinFromAltTitle":
    "Ins Set holen und pinnen. Bleibt beim Kürzen und bei Andere Songs. Sortieren darf ihn frei verschieben.",
  "builder.row.clearPin": "Pin lösen",
  "builder.row.clearPinTip":
    "Pin lösen. Der Track bleibt im Set, kann aber beim Kürzen zu den Alternativen wandern.",
  "builder.row.placeInSet": "Ins Set",
  "builder.row.placeInSetTip":
    "Alternative vor oder nach einem Song der aktuellen Playlist setzen.",
  "builder.place.ariaLabel": "Alternative ins Set setzen",
  "builder.place.title": "Ins Set setzen",
  "builder.place.target": "{name}",
  "builder.place.hint": "Vor oder nach einem Track der gespielten Playlist.",
  "builder.place.empty": "Noch keine Performance-Tracks — zuerst ein Set bauen.",
  "builder.place.before": "Davor",
  "builder.place.after": "Danach",
  "builder.place.beforeTip": "Direkt vor diesem Song in die Playlist setzen.",
  "builder.place.afterTip": "Direkt hinter diesem Song in die Playlist setzen.",
  "builder.status.placedBefore": "+ {name} vor {relative} → Performance",
  "builder.status.placedAfter": "+ {name} hinter {relative} → Performance",
  "builder.status.pinnedFromAlt": "Pin: {name} ist wieder in der Performance.",
  "builder.row.pinBadge": "Pin",
  "builder.row.pinBadgeTip":
    "Gepinnt. Bleibt im Set beim Kürzen und bei Andere Songs. Die Reihenfolge beim Sortieren ist frei.",
  "builder.row.openerBadge": "Opener",
  "builder.row.openerBadgeTip": "Gepinnter Opener — erster Performance-Track, auch nach Sortieren.",
  "builder.row.closerBadge": "Closer",
  "builder.row.closerBadgeTip": "Gepinnter Closer — letzter Performance-Track, auch nach Sortieren.",
  "builder.row.why": "Warum hier:",
  "builder.phase.purpose": "Zweck {phase}",
  "builder.phase.purposePlaceholder": "z. B. treibend, 128",
  "builder.row.details": "Details",
  "builder.row.keyOpen": "Key offen",
  "builder.row.bpmOpen": "BPM offen",
  "builder.row.energy": "Energie {level}",
  "builder.row.setNoteTag": "Set/Mix-Notiz",
  "builder.row.setNote": "Set/Mix-Notiz",
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
  "builder.row.length": "Länge",
  "builder.row.overlapHint": "Überlappung für die Spielzeit. Frei oder aus der Liste.",

  // Arc view
  "builder.curve.aria": "Phasen im Slot",
  "builder.curve.title": "Phasen im Slot",
  "builder.curve.summary":
    "{duration} / {minutes}:00 · {performance} Performance · {safety} Alternativen",
  "builder.curve.summaryOver":
    "{duration} / {minutes}:00 · über dem Brief · {performance} Performance · {safety} Alternativen",
  "builder.curve.overrun": "Warnung: {duration} über der geplanten Setdauer.",
  "builder.curve.phaseOverrun": "Warnung: {duration} über dem Phasenfenster.",
  "builder.curve.principles": "Dramaturgie-Prinzipien",
  "builder.curve.principlesIntro":
    "Diese Prinzipien bestimmen, wie SETBUILDER den Bogen legt und worauf du in der Setliste achten solltest.",
  "builder.curve.phaseLabel": "{phase}: {actual} von etwa {minutes} min",
  "builder.curve.phaseClick": "{label}. Klick legt neue Tracks in diese Phase.",
  "builder.curve.phaseTime": "{actual} / ~{minutes} min",
  "builder.curve.note":
    "Die Breite ist der Anteil am Brief, die Füllung die Spielzeit: pro Track zählen {mix} weniger, weil der Blend das Ende frisst. Gelb heißt, die Phase liegt über ihrem Fenster.",
  "builder.curve.notePlan":
    "Die Breite ist der Anteil am Brief, die Füllung die Spielzeit. Ein gesetzter Übergang ersetzt den Blend {mix} für diesen Track, — bleibt beim Durchschnitt. Gelb heißt, die Phase liegt über ihrem Fenster.",

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
  "builder.setups.topAria": "Gespeicherte Sets",
  "builder.setups.topLabel": "Sets",
  "builder.setups.topChoose": "Set wählen…",
  "builder.setups.topEmpty": "Noch kein gespeichertes Set",
  "builder.setups.scratch": "Neu anfangen",
  "builder.setups.fileTitle": "Datei",
  "builder.setups.fileHint": "Als JSON sichern oder auf einem anderen Rechner öffnen.",
  "builder.setups.download": "Herunterladen",
  "builder.setups.fallbackName": "Setup",
  "builder.app.statusUnsignedShort":
    "Nicht mit Apple signiert — Updates manuell von GitHub laden.",

  // Status toasts
  "builder.status.added": "+ {name} → {phase} / {role}",
  "builder.status.addedAfter": "+ {name} hinter {after} → {phase} / {role}",
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
  "builder.status.setupNeedsStick":
    "„{name}“ geladen. Als Nächstes den Stick verbinden — Dateien, Energie und Schreiben brauchen ihn.",
  "builder.status.setupDeleted": "„{name}“ gelöscht.",
  "builder.status.setupFromFile": "„{name}“ aus Datei geladen.",
  "builder.status.fileDownloaded": "Einstellungsdatei heruntergeladen.",
  "builder.status.reset": "Brief zurückgesetzt — das Set ist leer.",
  "builder.status.sorting": "Sortiere das Set…",
  "builder.status.reshuffling": "Mische das Set neu…",
  "builder.status.extracting": "Playlist wird gelesen…",
  "builder.status.sorted.perfect":
    "Perfekt sortiert: minimale Clashes, maximaler Mix-Score. Bogen prüfen — Opener/Closer bleiben. 100 % nur wenn alle Keys verbunden sind.",
  "builder.status.sorted.harmonic":
    "Harmonisch sortiert (pro Phase): verwandte Keys beieinander. Opener/Closer bleiben. Mix-Score und Clashes im Bogen prüfen.",
  "builder.status.sorted.gentle":
    "Ein-Schritt (pro Phase): Energie in kleinen Stufen. Opener/Closer bleiben. Sprünge im Bogen prüfen.",
  "builder.status.sorted.energy":
    "Energie-Welle (pro Phase): steigt Open→Peak, fällt im Release. Opener/Closer bleiben.",
  "builder.status.sorted.roller":
    "Doppel-Peak: im Peak aufbauen, kurz atmen, wieder hoch. Open/Lift/Rise nur steigen. Opener/Closer bleiben.",
  "builder.status.sorted.tempo":
    "Tempo (pro Phase): BPM baut auf, im Release wieder runter. Opener/Closer bleiben.",
  "builder.status.sorted.pulse":
    "BPM-Kette (pro Phase): Tempo bleibt nah beieinander. Opener/Closer bleiben.",
  "builder.status.sorted.journey":
    "Camelot-Reise (pro Phase): im Uhrzeigersinn, ohne denselben Key zu stapeln. Opener/Closer bleiben.",
  "builder.status.sorted.waves":
    "Wellen (pro Phase): im Peak Groove und Impact (Anchor). Opener/Closer bleiben.",
  "builder.status.sorted.unchanged":
    "Reihenfolge unverändert: innerhalb jeder Phase passt die Lage schon (Opener/Closer bleiben sowieso), oder Key, Energie und BPM fehlen. Tracks zwischen Phasen ziehen oder die Werte in der Setliste setzen.",
  "builder.status.reshuffle.done":
    "Neue Auswahl aus dem Pool ({pool}): {tracks} Performance-Tracks. Bogen und Alternativen prüfen.",
  "builder.status.reshuffle.unavailable":
    "Kein größerer Pool. Stick mit Playlists laden, oder eine längere Playlist extrahieren.",
  "builder.status.fits": "Das Set passt schon in den Slot.",
  "builder.status.fitStuck":
    "Nicht weiter kürzbar: der erste und der letzte Track und ein Track pro Phase bleiben immer. Lange Tracks von Hand auf Alternativen setzen.",
  "builder.status.trimmed":
    "Slot gekürzt, {before} auf {after}. {kept} bleiben, {moved} bei den Alternativen.",
  "builder.trim.undoBody": "{tracks} liegen bei den Alternativen.",
  "builder.trim.undo": "Zurückholen",
  "builder.trim.dismiss": "Lassen",
  "builder.trim.undoDone": "Wieder im Slot.",
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
  "builder.reset.title": "Set zurücksetzen?",
  "builder.reset.body": "Das aktuelle Set wird geleert.",
  "builder.reset.confirm": "Zurücksetzen",
  "builder.reset.cancel": "Abbrechen",
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

  "builder.hero.title": "Out of the playlist.",
  "builder.hero.manifestoLead":
    "The stick is the material. You draw the arc, set the join and its length, and hear if it holds.",
  "builder.hero.manifestoBody":
    "Music can be analyzed and planned — but your ears, your feel and the floor decide. SETBUILDER orients you, shows transitions and sparks ideas. Use it as help — then trust your ears.",
  "builder.hero.lede":
    "SETBUILDER shapes a set from your rekordbox stick: load playlist or history, lay the arc by slot and duration, check key and BPM. Spotify, Tidal and Beatport fill gaps when a track isn't on the stick yet.",
  "builder.brief.aria": "Set brief",
  "builder.brief.title": "Title",
  "builder.brief.titlePlaceholder": "Nightline 01",
  "builder.brief.vibe": "Vibe / genre arc",
  "builder.brief.vibePlaceholder": "Tech house → melodic peak",
  "builder.brief.venue": "Venue / sound system",
  "builder.brief.venuePlaceholder": "Club, mid-size, good PA",
  "builder.brief.slotKind": "Slot type",
  "builder.brief.slotKindEmpty": "—",
  "builder.brief.audience": "Audience",
  "builder.brief.audiencePlaceholder": "Locals, floor already warm",
  "builder.brief.gear": "Gear",
  "builder.brief.gearPlaceholder": "CDJs / USB",
  "builder.brief.duration": "Duration (min)",
  "builder.brief.blend": "Blend time (average)",
  "builder.brief.blendHint": "Average time from the end of each track that goes into the blend. Playing time in the slot follows at once.",
  "builder.brief.blend.30000": "0:30 Quick",
  "builder.brief.blend.60000": "1:00",
  "builder.brief.blend.120000": "2:00 Standard",
  "builder.brief.blend.240000": "4:00 Long",
  "builder.brief.notes": "Notes",
  "builder.brief.notesPlaceholder": "Doors, curfew, promoter, specials…",
  "builder.brief.more": "Set info",
  "builder.brief.moreHint":
    "Notes for the gig: vibe, venue, slot, audience, gear — duration and blend time stay above.",

  "builder.ready.title": "Before you take it",
  "builder.ready.intro": "A short check, then take it with you.",
  "builder.ready.continue": "Take it anyway",
  "builder.ready.close": "Back",
  "builder.ready.block": "Stops this action",
  "builder.ready.filesBlock": "{count} tracks have no file in this session. Writing the stick needs those files.",
  "builder.ready.filesAck": "{count} tracks have no file in this session.",
  "builder.ready.reselectStick": "Choose stick folder again",
  "builder.ready.reselectStickTip":
    "Pick the same folder the set came from — then the files are back in this session.",
  "builder.ready.reselectStickBusy": "Reading the stick…",
  "builder.ready.keys": "{count} tracks have no key.",
  "builder.ready.energy": "{count} tracks have no energy.",
  "builder.ready.planB": "Plan B is thin: {phases}.",
  "builder.ready.planBPhase": "{phase} {have}/{need}",
  "builder.ready.player.broken": "This stick has no readable library.",
  "builder.ready.player.empty": "This stick has no playlists yet.",
  "builder.ready.player.needsRekordbox": "The old player library is hiding the playlists. Prepare it for the player first.",
  "builder.ready.player.hiddenFolder": "The stick folder is hidden. Many players still find it.",
  "builder.ready.player.incomplete": "Only one file was picked. Choose the whole stick for the player.",
  "builder.ready.heard": "Play the stick on the actual player before the gig.",
  "builder.row.rehearse": "Rehearse the transition",
  "builder.row.rehearseTip": "Hear the previous, this and the next track in order. The transition and the note stay in the set.",

  "builder.library.title": "Load stick & prepare",
  "builder.library.keys": "{done}/{total} keys",
  "builder.library.firstStep": "First step",
  "builder.stickReload.body":
    "Choose the stick again for “{title}”. Covers and preview need the same folder, the set stays.",
  "builder.stickReload.choose": "Choose stick",
  "builder.stickReload.reconnect": "Reconnect stick",
  "builder.stickReload.busy": "Reading the stick…",
  "builder.stickReload.later": "Later",
  "builder.stick.reading": "Reading the stick…",
  "builder.stick.tags": "Energy from tags {done}/{total}",
  "builder.stick.ready": "Stick read.",
  "builder.build.title": "Build set",
  "builder.build.summary": "{performance} performance · {safety} alternatives",
  "builder.guide.title": "How this works",
  "builder.guide.brief.title": "Brief",
  "builder.guide.brief.body":
    "Duration and blend time (average) are what the slot uses. Set info (vibe, venue, slot, audience, gear, notes) is only notes about the gig.",
  "builder.guide.details.title": "Details",
  "builder.guide.details.body":
    "Key, BPM, energy and the transition on the row are the mix marks for that join.",
  "builder.guide.transition.title": "Transition",
  "builder.guide.transition.body":
    "A transition marks how you go into the next track (cut, short blend, long blend, EQ swap, echo-out, and the others) and is not written into the audio file. “—” means no mark.",
  "builder.guide.length.title": "Length",
  "builder.guide.length.body":
    "The length next to it is the overlap: that time comes off the playing time, so the slot line and the overrun follow it. Pick a length or type one; if you leave it, the chosen transition suggests a time, and “—” keeps the blend time from the brief.",
  "builder.guide.rehearse.title": "Rehearsal",
  "builder.guide.rehearse.body":
    "Rehearsing in the player (Before / Now / Next) is for hearing that join and setting the same mark and length.",
  "builder.guide.note.title": "Set note",
  "builder.guide.note.body":
    "The set note is for the booth (cue, floor). It is not written to the MP3.",
  "builder.playlist.title": "Start with a playlist",
  "builder.playlist.note":
    "The playlist becomes the base of the set. Add single tracks afterwards under Add music.",
  "builder.playlist.empty":
    "No stick yet. Load it above under “Load stick & prepare”.",
  "builder.playlist.confirmTitle": "Load playlist “{name}”?",
  "builder.playlist.confirmBody":
    "The current set already has tracks. Replace overwrites the set list; Merge keeps it and appends only new tracks.",
  "builder.playlist.replace": "Replace",
  "builder.playlist.merge": "Merge",
  "builder.playlist.cancel": "Cancel",
  "builder.playlist.merged": "{kind} “{name}” merged · {tracks}",
  "builder.playlist.replacedTitle": "Playlist replaced",
  "builder.playlist.replacedBody":
    "The previous set list can be restored once.",
  "builder.playlist.undo": "Undo",
  "builder.playlist.dismiss": "Dismiss",
  "builder.playlist.undoDone": "Previous set list restored.",

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
  "builder.add.backup": "Other sources",
  "builder.add.backupNote": "For tracks that are not in the library.",
  "builder.add.empty":
    "No library yet. Load the stick above under “Load stick & prepare”.",

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
  "builder.tool.reshuffle": "Different songs",
  "builder.tool.reshuffleTip":
    "Picks a new performance from the playlist pool ({pool} tracks) for the same brief. Alternatives are refilled. Opener, closer and pinned tracks stay; notes are lost.",
  "builder.tool.reshuffleTipStick":
    "Picks a new performance from the stick library ({pool} tracks, every playlist) for the same brief. Alternatives are refilled. Opener, closer and pinned tracks stay; notes are lost.",
  "builder.tool.reshuffleDisabledTip":
    "Needs more tracks than the set. Load the stick — then it draws from the playlists on it — or extract a longer playlist.",
  "builder.tool.reshuffleConfirm":
    "Rebuild the setlist from the playlist pool ({pool} tracks)? Brief, opener, closer and pinned tracks stay. The rest is drawn again from the playlist.",
  "builder.tool.reshuffleConfirmStick":
    "Rebuild the setlist from the {pool} tracks on the stick? Brief, opener, closer and pinned tracks stay. The rest is drawn again from the playlist.",
  "builder.pool.different": "Different songs",
  "builder.pool.differentHint":
    "A new performance from the playlist pool ({count} tracks). Brief and pins stay.",
  "builder.pool.differentStickHint":
    "A new performance from the stick library ({count} tracks). Brief and pins stay.",
  "builder.pool.differentMissing": "No larger pool loaded.",
  "builder.pool.differentSmall": "The pool has no more tracks than the set.",
  "builder.pool.playlist": "From the playlist",
  "builder.pool.playlistHint":
    "{count} tracks from the playlist that built this set. Brief and pins stay.",
  "builder.pool.playlistMissing": "No playlist stored with this set.",
  "builder.pool.playlistSmall": "The playlist has no more tracks than the set.",
  "builder.pool.collection": "From the collection",
  "builder.pool.collectionHint":
    "{count} tracks from the loaded collection. Brief and pins stay.",
  "builder.pool.collectionMissing": "Collection is not loaded.",
  "builder.pool.collectionSmall": "The collection has no more tracks than the set.",
  "builder.pool.collectionConfirm":
    "Rebuild the setlist from the {pool} collection tracks? Brief, opener, closer and pinned tracks stay. The rest is drawn again from the collection.",
  "builder.pool.history": "From history",
  "builder.pool.historyHint":
    "{count} played tracks. Brief and pins stay.",
  "builder.pool.historyMissing": "No history loaded.",
  "builder.pool.historySmall": "History has no more tracks than the set.",
  "builder.pool.historyConfirm":
    "Rebuild the setlist from the {pool} played tracks? Brief, opener, closer and pinned tracks stay. The rest is drawn again from history.",
  "builder.tool.energy": "Energy from files",
  "builder.tool.energyBusy": "Energy…",
  "builder.energy.noStick":
    "No stick connected. Choose the stick under “Load stick & prepare” (Chrome / Edge / desktop).",
  "builder.energy.noFile":
    "No tracks with a stick path. Load the set from the stick so the files can be found.",
  "builder.energy.measureFailed": "Measurement failed",
  "builder.energy.one": "Energy {level} · {name}",
  "builder.energy.oneWritten": "Energy {level} · {name} · written to MP3",
  "builder.energy.progress": "{done}/{total} · {skipped} skipped · {errors} errors",
  "builder.work.queued": "Waiting · {count} ahead",
  "builder.work.queuedNamed":
    "{label}{target} queued · position {position}",
  "builder.work.runningNamed": "{label}{target} running…",
  "builder.work.stickReconnect": "Reconnect stick",
  "builder.work.stickMerge": "Read stick files into set",
  "builder.work.collectionImport": "Import rekordbox collection",
  "builder.work.energyTags": "Read energy tags",
  "builder.work.energyMissing": "Measure missing energy",
  "builder.work.energyAll": "Recalculate all energy",
  "builder.work.energyWrite": "Write energy to MP3",
  "builder.work.energyTrack": "Measure track energy",
  "builder.energy.done":
    "Done: {set} set, {written} written to MP3 · {skipped} skipped · {errors} errors",
  "builder.energy.denied":
    "No write access to the stick. Allow it in the dialog, otherwise only the draft is updated.",
  "builder.energy.measured": "Measured: {set} · {skipped} skipped · {errors} errors",
  "builder.energy.tags": "Tags {done}/{total}",
  "builder.energy.tagsDone": "{found} of {total} read from tags",
  "builder.energy.noneMissing": "Every track with a file already has energy.",
  "builder.energy.noneKnown": "No energy to write yet.",
  "builder.energy.writeProgress": "Writing {done}/{total} · {written} written",
  "builder.energy.writeDone": "{written} MP3s written · {skipped} skipped",
  "builder.energy.menu.read": "Read from tags",
  "builder.energy.menu.readHint":
    "{count} files, without decoding audio. The tag replaces the level in the set.",
  "builder.energy.menu.missing": "Measure missing",
  "builder.energy.menu.missingHint":
    "Measure {count} tracks without energy in the background. The file is not written.",
  "builder.energy.menu.all": "Recalculate all",
  "builder.energy.menu.allHint":
    "Measure {count} files again in the background. The file stays unchanged.",
  "builder.energy.menu.write": "Write to MP3",
  "builder.energy.menu.writeHint":
    "Write {count} set levels into the files. Key, BPM and audio stay.",
  "builder.sort.perfect": "Perfect · Max score",
  "builder.sort.perfectHint":
    "Whole set: exact Camelot TSP (Held-Karp ≤18, else NN+2-opt/Or-opt). Kill clashes first, then max mix score. Opener/closer stay. Phases re-laid after.",
  "builder.sort.harmonic": "Harmonic",
  "builder.sort.harmonicHint":
    "Per phase: next track related Camelot key, smooth energy, small BPM steps. Opener/closer stay. Raises the mix score, cuts clashes.",
  "builder.sort.gentle": "One-step",
  "builder.sort.gentleHint":
    "Per phase · Mixed In Key: energy prefers ±1, with the phase. Opener/closer stay. Fewer jumps, smoother floor.",
  "builder.sort.energy": "Energy wave",
  "builder.sort.energyHint":
    "Per phase: energy rises from Open to Peak, falls in Release. Key is the tie-breaker, BPM after. Opener/closer stay.",
  "builder.sort.roller": "Twin peak",
  "builder.sort.rollerHint":
    "Per phase · Mixed In Key arc: in Peak build, dip about −2, climb to the peak. Open/Lift/Rise only climb, Release only fall. Opener/closer stay.",
  "builder.sort.tempo": "Build tempo",
  "builder.sort.tempoHint":
    "Per phase: BPM rises (falls in Release). Opener/closer stay. Classic house/techno ramp.",
  "builder.sort.pulse": "BPM chain",
  "builder.sort.pulseHint":
    "Per phase: next track stays close to the current BPM (±2–4), lightly with the phase. Opener/closer stay. Stays in the pocket.",
  "builder.sort.journey": "Camelot journey",
  "builder.sort.journeyHint":
    "Per phase: walks clockwise around the wheel instead of stacking the same key. Opener/closer stay.",
  "builder.sort.waves": "Waves",
  "builder.sort.wavesHint":
    "Per phase: in Peak, groove and impact (anchor) alternate; else low/high energy. Before that energy rises, after that it falls. Opener/closer stay.",
  "builder.tool.fit": "Trim to slot",
  "builder.tool.fitTip":
    "Trims to the playing time in the brief. {mix} per track go to the blend, so more file length stays in the set. The rest moves to Alternatives.",
  "builder.tool.fitTipPlan":
    "Trims to the playing time in the brief. A chosen transition counts with its own time, otherwise the {mix} blend. The rest moves to Alternatives.",
  "builder.tool.assign": "Assign roles",
  "builder.tool.assignTip":
    "Re-sets Anchor, Bridge and Groove by phase, key and BPM. The order stays.",

  "builder.list.headAll":
    "Performance set · {tracks} · blend {mix} · {duration} playing / {minutes}:00 slot",
  "builder.list.headAllBlend":
    "Performance set · {tracks} · blend {mix} · {duration} playing · {over} overlap / {minutes}:00 slot",
  "builder.list.headAllLong":
    "Performance set · {tracks} · blend {mix} · {duration} playing / {minutes}:00 slot · too long",
  "builder.list.headAllLongBlend":
    "Performance set · {tracks} · blend {mix} · {duration} playing · {over} overlap / {minutes}:00 slot · too long",
  "builder.list.mixPlanned": "as planned",
  "builder.list.headRole": "{role} · {tracks} · {duration}",
  "builder.list.detailsClose": "Details off",
  "builder.list.detailsOpen": "Details on",
  "builder.list.detailsTitle": "Show or hide key, BPM, energy and set note on every row.",
  "builder.list.filterAria": "Filter setlist",
  "builder.list.filterSet": "All tracks (Set)",
  "builder.list.filterSetTitle": "Performance order, without the alternatives.",
  "builder.list.empty": "No set yet.",
  "builder.list.emptyHint":
    "Start with a playlist under “Build set”, or load the stick above.",

  "builder.row.dragAria": "Move {name}",
  "builder.row.dragTitle": "Drag here",
  "builder.row.phaseAria": "Phase for {name}",
  "builder.row.roleAria": "Role for {name}",
  "builder.row.playAria": "Play {name}",
  "builder.row.playTip": "Listen in the player below — focus this track.",
  "builder.row.pauseAria": "Pause {name}",
  "builder.row.pauseTip": "Pause playback.",
  "builder.row.moveUpTip": "Move one slot up in the played order.",
  "builder.row.moveUpAria": "Move {name} up",
  "builder.row.moveDownTip": "Move one slot down in the played order.",
  "builder.row.moveDownAria": "Move {name} down",
  "builder.row.removeTip": "Remove from the set. Opener/closer pin goes with it.",
  "builder.row.removeAria": "Remove {name}",
  "builder.row.sourceTip":
    "Where the track came from: stick/rekordbox, Spotify, Tidal, or added by hand.",
  "builder.row.energyRedo": "Energy",
  "builder.row.energyRedoTip":
    "Measure energy again from the file. The MP3 is updated when the stick already allows writing.",
  "builder.row.energyRedoAria": "Measure energy again for {name}",
  "builder.row.energyMenu.measure": "Measure again",
  "builder.row.energyMenu.set": "Set energy",
  "builder.row.replace": "Replace",
  "builder.row.replaceTitle":
    "Replacement from your Alternatives or the library, matched to the previous and next track",
  "builder.row.setOpener": "Opener",
  "builder.row.setOpenerTitle":
    "Pin as the first track of the set (Open). Stays first when you sort.",
  "builder.row.clearOpener": "Unpin opener",
  "builder.row.clearOpenerTip":
    "Unpin — the track stays in the set. Sorting still keeps the current first track until you pin another or move one to the front.",
  "builder.row.setCloser": "Closer",
  "builder.row.setCloserTitle":
    "Pin as the last track of the set (Release). Stays last when you sort.",
  "builder.row.clearCloser": "Unpin closer",
  "builder.row.clearCloserTip":
    "Unpin — the track stays in the set. Sorting still keeps the current last track until you pin another or move one to the end.",
  "builder.row.setPin": "Pin",
  "builder.row.setPinTitle":
    "Keep this track in the set. Trim and Different songs leave it in. Sorting may move it freely.",
  "builder.row.setPinFromAltTitle":
    "Bring it into the set and pin it. Stays through trim and Different songs. Sorting may move it freely.",
  "builder.row.clearPin": "Unpin",
  "builder.row.clearPinTip":
    "Unpin. The track stays in the set, and trim may move it to Alternatives.",
  "builder.row.placeInSet": "Into set",
  "builder.row.placeInSetTip":
    "Put this Alternative before or after a song in the current playlist.",
  "builder.place.ariaLabel": "Place Alternative in the set",
  "builder.place.title": "Place in set",
  "builder.place.target": "{name}",
  "builder.place.hint": "Before or after a track in the played playlist.",
  "builder.place.empty": "No performance tracks yet — build a set first.",
  "builder.place.before": "Before",
  "builder.place.after": "After",
  "builder.place.beforeTip": "Insert directly before this song in the playlist.",
  "builder.place.afterTip": "Insert directly after this song in the playlist.",
  "builder.status.placedBefore": "+ {name} before {relative} → performance",
  "builder.status.placedAfter": "+ {name} after {relative} → performance",
  "builder.status.pinnedFromAlt": "Pin: {name} is back in the performance.",
  "builder.row.pinBadge": "Pin",
  "builder.row.pinBadgeTip":
    "Pinned. Stays in the set through trim and Different songs. Sort order stays free.",
  "builder.row.openerBadge": "Opener",
  "builder.row.openerBadgeTip": "Pinned opener — first performance track, even after sorting.",
  "builder.row.closerBadge": "Closer",
  "builder.row.closerBadgeTip": "Pinned closer — last performance track, even after sorting.",
  "builder.row.why": "Why here:",
  "builder.phase.purpose": "Purpose {phase}",
  "builder.phase.purposePlaceholder": "e.g. driving, 128",
  "builder.row.details": "Details",
  "builder.row.keyOpen": "Key open",
  "builder.row.bpmOpen": "BPM open",
  "builder.row.energy": "Energy {level}",
  "builder.row.setNoteTag": "Set/Mix note",
  "builder.row.setNote": "Set/Mix note",
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
  "builder.row.length": "Length",
  "builder.row.overlapHint": "Overlap used for playing time. Free or from the list.",

  "builder.curve.aria": "Phases in the slot",
  "builder.curve.title": "Phases in the slot",
  "builder.curve.summary":
    "{duration} / {minutes}:00 · {performance} performance · {safety} alternatives",
  "builder.curve.summaryOver":
    "{duration} / {minutes}:00 · over the brief · {performance} performance · {safety} alternatives",
  "builder.curve.overrun": "Warning: {duration} over the planned set duration.",
  "builder.curve.phaseOverrun": "Warning: {duration} over the phase window.",
  "builder.curve.principles": "Dramaturgy principles",
  "builder.curve.principlesIntro":
    "These principles decide how SETBUILDER lays out the arc and what to watch for in the setlist.",
  "builder.curve.phaseLabel": "{phase}: {actual} of about {minutes} min",
  "builder.curve.phaseClick": "{label}. Click to put new tracks in this phase.",
  "builder.curve.phaseTime": "{actual} / ~{minutes} min",
  "builder.curve.note":
    "The width is the share of the brief, the fill is playing time: each track counts {mix} less, because the blend eats the end. Yellow means the phase runs over its window.",
  "builder.curve.notePlan":
    "The width is the share of the brief, the fill is playing time. A chosen transition replaces the {mix} blend on that track, — stays on the average. Yellow means the phase runs over its window.",

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
  "builder.setups.topAria": "Saved sets",
  "builder.setups.topLabel": "Sets",
  "builder.setups.topChoose": "Choose a set…",
  "builder.setups.topEmpty": "No saved set yet",
  "builder.setups.scratch": "Start from scratch",
  "builder.setups.fileTitle": "File",
  "builder.setups.fileHint": "Save as JSON or open on another computer.",
  "builder.setups.download": "Download",
  "builder.setups.fallbackName": "Setup",
  "builder.app.statusUnsignedShort":
    "Not Apple-signed — download updates manually from GitHub.",

  "builder.status.added": "+ {name} → {phase} / {role}",
  "builder.status.addedAfter": "+ {name} after {after} → {phase} / {role}",
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
  "builder.status.setupNeedsStick":
    "“{name}” loaded. Connect the stick next — files, energy and writing need it.",
  "builder.status.setupDeleted": "“{name}” deleted.",
  "builder.status.setupFromFile": "“{name}” loaded from file.",
  "builder.status.fileDownloaded": "Settings file downloaded.",
  "builder.status.reset": "Brief reset — the set is empty.",
  "builder.status.sorting": "Sorting the set…",
  "builder.status.reshuffling": "Reshuffling the set…",
  "builder.status.extracting": "Reading the playlist…",
  "builder.status.sorted.perfect":
    "Sorted for max score: minimal clashes, maximal mix score. Check the Arc — opener/closer stay. 100% only when all keys connect.",
  "builder.status.sorted.harmonic":
    "Sorted harmonically (per phase): related keys together. Opener/closer stay. Check mix score and clashes on the Arc.",
  "builder.status.sorted.gentle":
    "One-step (per phase): energy in small steps. Opener/closer stay. Check jumps on the Arc.",
  "builder.status.sorted.energy":
    "Energy wave (per phase): climbs Open→Peak, falls in Release. Opener/closer stay.",
  "builder.status.sorted.roller":
    "Twin peak: in Peak build, breathe, climb again. Open/Lift/Rise only climb. Opener/closer stay.",
  "builder.status.sorted.tempo":
    "Tempo (per phase): BPM builds, then drops in Release. Opener/closer stay.",
  "builder.status.sorted.pulse":
    "BPM chain (per phase): tempo stays close. Opener/closer stay.",
  "builder.status.sorted.journey":
    "Camelot journey (per phase): clockwise, without stacking the same key. Opener/closer stay.",
  "builder.status.sorted.waves":
    "Waves (per phase): in Peak, groove and impact (anchor). Opener/closer stay.",
  "builder.status.sorted.unchanged":
    "Order unchanged: within each phase it already fits (opener/closer stay anyway), or key, energy and BPM are missing. Drag tracks across phases or set the values in the setlist.",
  "builder.status.reshuffle.done":
    "New pick from the pool ({pool}): {tracks} performance tracks. Check the arc and Alternatives.",
  "builder.status.reshuffle.unavailable":
    "No larger pool. Load a stick with playlists, or extract a longer playlist.",
  "builder.status.fits": "The set already fits the slot.",
  "builder.status.fitStuck":
    "Cannot trim further: the first and last track and one track per phase always stay. Move long tracks to Alternatives by hand.",
  "builder.status.trimmed":
    "Slot trimmed, {before} down to {after}. {kept} stay, {moved} with the alternatives.",
  "builder.trim.undoBody": "{tracks} are with the alternatives.",
  "builder.trim.undo": "Bring back",
  "builder.trim.dismiss": "Leave them",
  "builder.trim.undoDone": "Back in the slot.",
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

  "builder.reset.title": "Reset the set?",
  "builder.reset.body": "The current set is cleared.",
  "builder.reset.confirm": "Reset",
  "builder.reset.cancel": "Cancel",
  "builder.storage.blocked":
    "This browser is not saving the set right now (storage full or blocked). Changes last until reload — save it as a file under “Connections & setups”.",
};

export const builder = { de, en };
