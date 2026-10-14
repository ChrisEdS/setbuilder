// Area "api": keys start with "api.". Declare `de` first, then type `en` against it.
// Texts of server routes and server-only libraries that reach the client.
const de = {
  "api.genericError": "Anfrage fehlgeschlagen.",

  // Spotify login required (code AUTH_REQUIRED), one text per route
  "api.auth.playlist": "Spotify-Login nötig: Playlist-Tracks sind seit 2026 nur mit User-Auth lesbar.",
  "api.auth.resolveLink": "Spotify-Login nötig für Playlist-Links.",
  "api.auth.playlists": "Spotify-Login nötig.",
  "api.auth.crate": "Spotify-Login nötig, um Playlist-Tracks zu lesen. Track-Links gehen ohne Login.",

  // Playlist not readable (code PLAYLIST_FORBIDDEN)
  "api.forbidden.meta": "In Development Mode sind Tracklisten nur für Playlists lesbar, die du besitzt oder als Collaborator hast — nicht für fremde/editorial Playlists.",
  "api.forbidden.notOwned": "Diese Playlist gehört dir nicht. Wähle eine eigene Playlist aus der Liste oder mach sie kollaborativ.",
  "api.forbidden.items": "Trackliste nicht lesbar. Im Dev Mode funktionieren nur eigene oder kollaborative Playlists.",

  // Invalid input
  "api.invalid.playlistUrl": "Ungültige Playlist-URL. Erwarte open.spotify.com/playlist/… oder spotify:playlist:…",
  "api.invalid.tidalLink": "Ungültiger Tidal-Link. Erwartet wird tidal.com/browse/playlist/…",
  "api.invalid.musicLink": "Ungültiger Link. Spotify, Tidal, SoundCloud oder Beatport erwartet.",
  "api.invalid.spotifyLink": "Ungültiger Link. Erwarte open.spotify.com/track|playlist|album/… oder spotify:…",
  "api.invalid.tidalPlaylist": "Tidal-Playlist wählen oder tidal.com/browse/playlist/… einfügen.",
  "api.invalid.searchTooShort": "Die Suche braucht mindestens 2 Zeichen.",

  // Link resolving
  "api.resolve.tidalCollection": "Tidal Playlist/Album: Track-Link bevorzugen, oder manuell Titel setzen.",
  "api.resolve.beatportLimited": "Beatport-Metadaten sind limited — Titel aus URL, Kommentar/BPM kannst du manuell ergänzen.",

  // Spotify API failures
  "api.spotify.notConfigured":
    "Spotify ist nicht eingerichtet. Client ID und Secret unter „Verbindungen & Setups“ eintragen — für rekordbox allein ist das nicht nötig.",
  "api.spotify.trackFailed": "Track laden fehlgeschlagen ({status}): {body}",
  "api.spotify.albumFailed": "Album laden fehlgeschlagen ({status}): {body}",
  "api.spotify.playlistsFailed": "Eigene Playlists laden fehlgeschlagen ({status}): {body}",
  "api.spotify.playlistFailed": "Playlist laden fehlgeschlagen ({status}): {body}",
  "api.spotify.playlistTracksFailed": "Playlist-Tracks fehlgeschlagen ({status}): {body}",

  // Tidal playlists
  "api.tidal.notConfigured":
    "Tidal ist nicht eingerichtet. Client ID und Secret unter „Verbindungen & Setups“ eintragen.",
  "api.tidal.playlistUnreadable": "Tidal-Playlist nicht lesbar. Mit Tidal verbinden oder einen öffentlichen Playlist-Link nutzen.",
  "api.tidal.playlistFailed": "Tidal-Playlist fehlgeschlagen ({status})",
  "api.tidal.playlistEmpty": "Tidal-Playlist enthält keine lesbaren Tracks.",

  // Tidal key enrichment
  "api.enrich.notConfigured": "Tidal Keys brauchen TIDAL_CLIENT_ID + TIDAL_CLIENT_SECRET in .env.local (developer.tidal.com).",
  "api.enrich.matchedSearch": "Tidal: {matched}/{checked} Keys/BPM gematcht · {search} per Titelsuche",
  "api.enrich.matchedIsrc": "Tidal: {matched}/{checked} Keys/BPM gematcht · per ISRC",
  "api.enrich.noKeys": "Tidal: keine Keys gefunden — Titel prüfen oder rekordbox nutzen.",
  "api.enrich.failed": "Tidal Enrichment fehlgeschlagen.",
  "api.enrich.credentialsSet": "Tidal Client Credentials gesetzt.",
  "api.enrich.credentialsMissing": "TIDAL_CLIENT_ID / TIDAL_CLIENT_SECRET fehlen in .env.local",

  // Local setup
  "api.setup.localOnly": "Nur lokal.",
  "api.setup.saveFailed": "Speichern fehlgeschlagen.",
  "api.setup.noLineBreaks": "Zugangsdaten dürfen keine Zeilenumbrüche enthalten.",
  "api.rekordbox.notFound": "rekordbox wurde auf diesem Rechner nicht gefunden.",
  "api.rekordbox.openFailed": "rekordbox ließ sich nicht öffnen.",
  "api.eject.badVolume": "Der Stick-Name ist unsicher oder kein Laufwerk.",
  "api.eject.notPioneer": "Unter diesem Namen liegt kein rekordbox-Stick.",
  "api.eject.unsupported": "Auswerfen kann SETBUILDER nur auf dem Mac.",
  "api.eject.failed": "Der Stick ließ sich nicht auswerfen.",
} as const;

const en: Record<keyof typeof de, string> = {
  "api.genericError": "Request failed.",

  "api.auth.playlist": "Spotify login required: since 2026 playlist tracks can only be read with user auth.",
  "api.auth.resolveLink": "Spotify login required for playlist links.",
  "api.auth.playlists": "Spotify login required.",
  "api.auth.crate": "Spotify login required to read playlist tracks. Track links work without logging in.",

  "api.forbidden.meta": "In Development Mode, track lists can only be read for playlists you own or collaborate on — not for other people's or editorial playlists.",
  "api.forbidden.notOwned": "You don't own this playlist. Pick one of your own playlists from the list or make it collaborative.",
  "api.forbidden.items": "Track list not readable. In Dev Mode only your own or collaborative playlists work.",

  "api.invalid.playlistUrl": "Invalid playlist URL. Expected open.spotify.com/playlist/… or spotify:playlist:…",
  "api.invalid.tidalLink": "Invalid Tidal link. Expected tidal.com/browse/playlist/…",
  "api.invalid.musicLink": "Invalid link. Expected Spotify, Tidal, SoundCloud or Beatport.",
  "api.invalid.spotifyLink": "Invalid link. Expected open.spotify.com/track|playlist|album/… or spotify:…",
  "api.invalid.tidalPlaylist": "Choose a Tidal playlist or paste tidal.com/browse/playlist/…",
  "api.invalid.searchTooShort": "The search needs at least 2 characters.",

  "api.resolve.tidalCollection": "Tidal playlist/album: prefer a track link, or set the title manually.",
  "api.resolve.beatportLimited": "Beatport metadata is limited — the title comes from the URL, you can add comment/BPM manually.",

  "api.spotify.notConfigured":
    "Spotify is not set up. Enter the client ID and secret under “Connections & setups” — rekordbox alone does not need it.",
  "api.spotify.trackFailed": "Loading track failed ({status}): {body}",
  "api.spotify.albumFailed": "Loading album failed ({status}): {body}",
  "api.spotify.playlistsFailed": "Loading your playlists failed ({status}): {body}",
  "api.spotify.playlistFailed": "Loading playlist failed ({status}): {body}",
  "api.spotify.playlistTracksFailed": "Loading playlist tracks failed ({status}): {body}",

  "api.tidal.notConfigured":
    "Tidal is not set up. Enter the client ID and secret under “Connections & setups”.",
  "api.tidal.playlistUnreadable": "Tidal playlist not readable. Connect Tidal or use a public playlist link.",
  "api.tidal.playlistFailed": "Tidal playlist failed ({status})",
  "api.tidal.playlistEmpty": "The Tidal playlist has no readable tracks.",

  "api.enrich.notConfigured": "Tidal keys need TIDAL_CLIENT_ID + TIDAL_CLIENT_SECRET in .env.local (developer.tidal.com).",
  "api.enrich.matchedSearch": "Tidal: {matched}/{checked} keys/BPM matched · {search} via title search",
  "api.enrich.matchedIsrc": "Tidal: {matched}/{checked} keys/BPM matched · via ISRC",
  "api.enrich.noKeys": "Tidal: no keys found — check the titles or use rekordbox.",
  "api.enrich.failed": "Tidal enrichment failed.",
  "api.enrich.credentialsSet": "Tidal client credentials set.",
  "api.enrich.credentialsMissing": "TIDAL_CLIENT_ID / TIDAL_CLIENT_SECRET are missing in .env.local",

  "api.setup.localOnly": "Local only.",
  "api.setup.saveFailed": "Saving failed.",
  "api.setup.noLineBreaks": "Credentials must not contain line breaks.",
  "api.rekordbox.notFound": "rekordbox was not found on this computer.",
  "api.rekordbox.openFailed": "rekordbox could not be opened.",
  "api.eject.badVolume": "The stick name is unsafe or not a volume.",
  "api.eject.notPioneer": "There is no rekordbox stick under that name.",
  "api.eject.unsupported": "SETBUILDER can only eject on a Mac.",
  "api.eject.failed": "The stick could not be ejected.",
};

export const api = { de, en };
