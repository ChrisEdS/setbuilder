# SETFORM Desktop

Electron-Hülle für Mac, Windows und Linux. Sie startet den SETFORM-Server lokal und öffnet ihn im eigenen Fenster. Spotify- und Tidal-Redirects bleiben `http://127.0.0.1:4317/...`.

Der Next-Server wird auf dem Rechner gebaut, auf dem die App entstehen soll. Die Bildbibliothek ist an das Betriebssystem gebunden.

## Starten

Im Projektroot, Node 22:

```bash
npm install
cd desktop
npm install
npm start
```

Zugangsdaten kommen aus `../.env.local`, solange du aus dem Repo startest. Die Vorlage ist `../.env.example`.

## Paket bauen

```bash
cd desktop
npm run dist
```

Ergebnis unter `desktop/dist/`:

- macOS: `.dmg` und `.zip` für die Architektur des Macs
- Windows: NSIS-Installer
- Linux: AppImage und `.deb`

Für eine andere Architektur als die des Build-Rechners die Flags von electron-builder setzen, zum Beispiel `npx electron-builder --mac --x64 --publish never`. Der Server-Build davor muss trotzdem auf einem passenden System liegen. GitHub Actions macht das pro System, siehe `.github/workflows/desktop.yml`. Ein Tag `v0.1.0` lädt die Dateien als Release hoch.

Ohne Apple- und Windows-Zertifikat sind die Pakete unsigniert. macOS: Rechtsklick → Öffnen. Windows: SmartScreen-Hinweis. Linux startet die AppImage direkt.
