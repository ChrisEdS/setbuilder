# SETFORM für Apple Silicon

Native Mac-App für die SETFORM-Setvorbereitung. Sie startet den SETFORM-Server lokal und öffnet ihn in einem eigenen Fenster. Gebaut für Macs mit M1, M2, M3 oder M4.

Das Web-Projekt eine Ebene höher bleibt die Quelle. Dieses Verzeichnis ist die Mac-App.

## Auf dem Mac starten

Zuerst im Projektroot `npm install` (Node 22), damit Next und die Bildbibliothek zur Mac-Architektur passen. Danach im Ordner `setform-mac`:

```bash
npm install
npm start
```

`npm start` baut den Produktions-Server und öffnet das Fenster. Das geht auf einem Apple-Silicon-Mac.

Zugangsdaten kommen aus `../.env.local`, solange du die App aus dem Repo startest. Dieselben Redirect-URIs wie in der Web-App:

- `http://127.0.0.1:4317/api/auth/callback`
- `http://127.0.0.1:4317/api/auth/tidal/callback`

## SETFORM.app erzeugen

```bash
npm run dist
```

Die App liegt danach unter `dist/SETFORM-darwin-arm64/SETFORM.app`. In den Programme-Ordner ziehen.

Beim ersten Öffnen blockt macOS unsignierte Apps. Im Finder: Rechtsklick auf SETFORM → Öffnen. Falls die Datei aus dem Download kommt und sich nicht starten lässt:

```bash
xattr -dr com.apple.quarantine /Applications/SETFORM.app
```

Die gepackte App liest Zugangsdaten aus:

`~/Library/Application Support/SETFORM/.env`

Die Datei wird beim ersten Start angelegt. Spotify- und optional Tidal-Client eintragen, App neu starten. Login, Playlists und Tokens bleiben in `~/Library/Application Support/SETFORM/data`.

## Was die App mitbringt

- Fenster mit Mac-Menü, Vollbild und versteckter Titelleiste
- Server nur auf `127.0.0.1:4317`, damit die bestehenden Spotify- und Tidal-Redirects passen
- Spotify- und Tidal-Login bleibt im Fenster, Track-Links gehen in den Browser
- Eine laufende Instanz; ein zweiter Start holt das Fenster nach vorn
