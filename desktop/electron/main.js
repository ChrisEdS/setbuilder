const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.SETFORM_PORT || 4317);
const APP_HOST = "127.0.0.1";

app.setName("SETFORM");

let mainWindow = null;
let server = null;
let serverLog = "";

function userEnvFile() {
  return path.join(app.getPath("userData"), ".env");
}

function dataDir() {
  return path.join(app.getPath("userData"), "data");
}

function serverRoot() {
  if (app.isPackaged) return path.join(process.resourcesPath, "setform");
  return path.join(__dirname, "..", "bundle", "setform");
}

function repoEnvFiles() {
  if (app.isPackaged) return [];
  const root = path.join(__dirname, "..", "..");
  return [path.join(root, ".env.local"), path.join(root, ".env")];
}

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function readEnvMap(file) {
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }
  return map;
}

function ensureConfigFile() {
  const target = userEnvFile();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const spotifyRedirect = `http://${APP_HOST}:${PORT}/api/auth/callback`;
  const tidalRedirect = `http://${APP_HOST}:${PORT}/api/auth/tidal/callback`;
  const current = readEnvMap(target);
  for (const file of repoEnvFiles()) {
    const repo = readEnvMap(file);
    for (const key of [
      "SPOTIFY_CLIENT_ID",
      "SPOTIFY_CLIENT_SECRET",
      "TIDAL_CLIENT_ID",
      "TIDAL_CLIENT_SECRET",
    ]) {
      if (!current.get(key) && repo.get(key)) current.set(key, repo.get(key));
    }
  }
  const body = `# SETFORM, nur auf diesem Mac. Nicht ins Repo legen.
# Spotify: https://developer.spotify.com/dashboard
# Redirect URI dort exakt so eintragen wie hier:
#   ${spotifyRedirect}
# Tidal: https://developer.tidal.com
# Redirect URI exakt:
#   ${tidalRedirect}
# Tidal-Scopes: user.read und playlists.read

SPOTIFY_CLIENT_ID=${current.get("SPOTIFY_CLIENT_ID") || ""}
SPOTIFY_CLIENT_SECRET=${current.get("SPOTIFY_CLIENT_SECRET") || ""}
SPOTIFY_REDIRECT_URI=${spotifyRedirect}

TIDAL_CLIENT_ID=${current.get("TIDAL_CLIENT_ID") || ""}
TIDAL_CLIENT_SECRET=${current.get("TIDAL_CLIENT_SECRET") || ""}
TIDAL_REDIRECT_URI=${tidalRedirect}
`;
  const previous = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (previous !== body) fs.writeFileSync(target, body, { mode: 0o600 });
}

function loadEnv() {
  ensureConfigFile();
  for (const file of [...repoEnvFiles(), userEnvFile()]) parseEnvFile(file);
  process.env.SPOTIFY_REDIRECT_URI = `http://${APP_HOST}:${PORT}/api/auth/callback`;
  process.env.TIDAL_REDIRECT_URI = `http://${APP_HOST}:${PORT}/api/auth/tidal/callback`;
}

function remember(chunk) {
  serverLog = (serverLog + chunk.toString()).slice(-6000);
}

function probeServer() {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: APP_HOST, port: PORT, path: "/", timeout: 800 },
      (res) => {
        res.resume();
        resolve(res.statusCode != null && res.statusCode < 500);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

function waitForServer() {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (server && server.exitCode !== null) {
        reject(new Error(serverLog || "Der SETFORM-Server ist sofort beendet."));
        return;
      }
      const req = http.get(
        { hostname: APP_HOST, port: PORT, path: "/", timeout: 1000 },
        (res) => {
          res.resume();
          resolve();
        },
      );
      req.on("error", () => {
        if (Date.now() - started > 25000) {
          reject(new Error(serverLog || "Der SETFORM-Server antwortet nicht."));
          return;
        }
        setTimeout(tick, 250);
      });
    };
    tick();
  });
}

function startServer() {
  const root = serverRoot();
  const entry = path.join(root, "server.js");
  if (!fs.existsSync(entry)) {
    throw new Error(`Server fehlt: ${entry}`);
  }
  fs.mkdirSync(dataDir(), { recursive: true });
  const logFile = path.join(app.getPath("userData"), "server.log");
  const log = fs.createWriteStream(logFile, { flags: "a" });
  server = spawn(process.execPath, [entry], {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: APP_HOST,
      PORT: String(PORT),
      SETFORM_DATA_DIR: dataDir(),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => {
    remember(chunk);
    log.write(chunk);
  });
  server.stderr.on("data", (chunk) => {
    remember(chunk);
    log.write(chunk);
  });
  server.on("exit", (code) => {
    if (code && code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        "SETFORM",
        `Der Server ist beendet (Code ${code}).\n\n${serverLog.slice(-800)}`,
      );
    }
  });
}

function installMenu() {
  const view = [
    { role: "reload", label: "Neu laden" },
    { role: "togglefullscreen", label: "Vollbild" },
    { type: "separator" },
    { role: "resetZoom", label: "Originalgröße" },
    { role: "zoomIn", label: "Größer" },
    { role: "zoomOut", label: "Kleiner" },
  ];
  if (!app.isPackaged) {
    view.push({ type: "separator" }, { role: "toggleDevTools", label: "Entwicklerwerkzeuge" });
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "SETFORM",
        submenu: [
          { role: "about", label: "Über SETFORM" },
          { type: "separator" },
          { role: "hide", label: "SETFORM ausblenden" },
          { role: "hideOthers", label: "Andere ausblenden" },
          { role: "unhide", label: "Alle einblenden" },
          { type: "separator" },
          { role: "quit", label: "SETFORM beenden" },
        ],
      },
      {
        label: "Bearbeiten",
        submenu: [
          { role: "undo", label: "Widerrufen" },
          { role: "redo", label: "Wiederholen" },
          { type: "separator" },
          { role: "cut", label: "Ausschneiden" },
          { role: "copy", label: "Kopieren" },
          { role: "paste", label: "Einsetzen" },
          { role: "selectAll", label: "Alles auswählen" },
        ],
      },
      { label: "Darstellung", submenu: view },
    ]),
  );
}

function isAppUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === APP_HOST || parsed.hostname === "localhost") &&
      parsed.port === String(PORT)
    );
  } catch {
    return false;
  }
}

function isLoginUrl(url) {
  try {
    const host = new URL(url).hostname;
    return (
      host === "accounts.spotify.com" ||
      host === "challenge.spotify.com" ||
      host.endsWith(".spotify.com") ||
      host === "login.tidal.com" ||
      host === "auth.tidal.com" ||
      host.endsWith(".tidal.com")
    );
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "SETFORM",
    backgroundColor: "#121212",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === "about:blank") {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 960,
          height: 900,
          title: "SETFORM Ausdruck",
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }
    if (!isAppUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url) || isLoginUrl(url)) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.loadURL(`http://${APP_HOST}:${PORT}/`);
}

function warnIfCredentialsMissing() {
  if (process.env.SPOTIFY_CLIENT_ID) return;
  dialog.showMessageBox({
    type: "info",
    title: "Spotify verbinden",
    message: "SETFORM braucht noch die Spotify-Zugangsdaten.",
    detail:
      `Trag Client ID und Secret in diese Datei ein und starte die App neu:\n\n${userEnvFile()}\n\n` +
      `Redirect-URI in der Spotify-Developer-App, exakt:\nhttp://${APP_HOST}:${PORT}/api/auth/callback\n\n` +
      "Tidal ist optional und nutzt TIDAL_CLIENT_ID, TIDAL_CLIENT_SECRET und TIDAL_REDIRECT_URI.",
  });
}

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    loadEnv();
    const chrome = process.versions.chrome;
    const platformToken =
      process.platform === "win32"
        ? "Windows NT 10.0; Win64; x64"
        : process.platform === "linux"
          ? "X11; Linux x86_64"
          : "Macintosh; Intel Mac OS X 10_15_7";
    app.userAgentFallback = `Mozilla/5.0 (${platformToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36`;
    installMenu();
    app.setAboutPanelOptions({
      applicationName: "SETFORM",
      applicationVersion: app.getVersion(),
      version: "Apple Silicon",
      credits: "DJ-Set-Vorbereitung",
    });
    try {
      const alreadyRunning = await probeServer();
      if (!alreadyRunning) {
        startServer();
        await waitForServer();
      }
      createWindow();
      warnIfCredentialsMissing();
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const busy = raw.includes("EADDRINUSE");
      dialog.showErrorBox(
        "SETFORM",
        busy
          ? `Port ${PORT} ist schon belegt. Beende den anderen SETFORM- oder Dev-Server und starte die App erneut.`
          : raw,
      );
      app.quit();
    }
  });
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  if (server && !server.killed) server.kill("SIGTERM");
});
