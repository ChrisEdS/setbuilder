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

Für eine andere Architektur als die des Build-Rechners die Flags von electron-builder setzen, zum Beispiel `npx electron-builder --mac --x64 --publish never`. Der Server-Build davor muss trotzdem auf einem passenden System liegen. GitHub Actions macht das pro System, siehe `.github/workflows/desktop.yml`. Ein Tag `v*` lädt die Dateien als Release hoch.

Ohne Apple- und Windows-Zertifikat sind die Pakete unsigniert. Linux startet die AppImage direkt. Windows zeigt SmartScreen, „Trotzdem ausführen“ setzt die Installation fort.

macOS hängt an Browser-Downloads das Attribut `com.apple.quarantine`. Die Meldung lautet dann „SETFORM.app is damaged and can’t be opened“. Die App ist nicht beschädigt. Nach dem Entpacken:

```bash
xattr -dr com.apple.quarantine ~/Downloads/SETFORM.app
```

Danach öffnet sie per Doppelklick. Mit Notarisierung entfällt das.

## Signierung

Linux braucht keine Signatur. Mac und Windows signiert GitHub Actions beim nächsten Tag, sobald die Secrets im Repo `ChrisEdS/setform` unter Settings → Secrets and variables → Actions liegen. Leere Secrets lassen den Build unsigniert.

### macOS

1. Im [Apple Developer Program](https://developer.apple.com/programs/) anmelden (jährlich). Freigabe kann ein paar Tage dauern.
2. Unter Certificates ein Zertifikat **Developer ID Application** anlegen. Das ist nicht das Development-Zertifikat und nicht das Mac-App-Store-Zertifikat.
3. In der Schlüsselbundverwaltung das Zertifikat samt privatem Schlüssel als `.p12` exportieren und ein Passwort setzen.
4. `base64 -i Zertifikat.p12 | pbcopy` und den Inhalt als Secret `MAC_CSC_LINK` speichern. Das Passwort heißt `MAC_CSC_KEY_PASSWORD`.
5. In App Store Connect unter Users and Access → Integrations einen API-Key mit Rolle Developer anlegen. Die Datei `AuthKey_XXXX.p8` gibt es nur einmal.
6. Den Inhalt der `.p8` als `APPLE_API_KEY` speichern, die Key-ID als `APPLE_API_KEY_ID`, die Issuer-ID als `APPLE_API_ISSUER`.

electron-builder signiert damit die `.app`, schickt sie an die Apple-Notarisierung und heftet das Ticket an. Die App darf danach lokal auf Port 4317 hören, weil `desktop/build/entitlements.mac.plist` den Netzwerk-Server erlaubt.

### Windows

Ein Code-Signing-Zertifikat als `.pfx` exportieren. `base64 -i Zertifikat.pfx` wird `WIN_CSC_LINK`, das Passwort `WIN_CSC_KEY_PASSWORD`.

Azure Trusted Signing ist die Alternative ohne USB-Token. Dafür kommen später `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` und `AZURE_CLIENT_SECRET` dazu, plus die Kontonamen in der electron-builder-Konfiguration. Solange nur die PFX-Secrets gesetzt sind, signiert der Windows-Job mit der PFX.
