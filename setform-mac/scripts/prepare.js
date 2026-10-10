const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const appDir = path.join(__dirname, "..");
const repoRoot = path.join(appDir, "..");
const distDirName = ".next-standalone";
const standalone = path.join(repoRoot, distDirName, "standalone");
const target = path.join(appDir, "bundle", "setform");

execFileSync("npm", ["run", "build"], {
  cwd: repoRoot,
  env: { ...process.env, SETFORM_STANDALONE: "1" },
  stdio: "inherit",
});

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error(`Standalone-Server fehlt: ${standalone}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(standalone, target, { recursive: true });

const staticSrc = path.join(repoRoot, distDirName, "static");
const staticDest = path.join(target, distDirName, "static");
fs.mkdirSync(path.dirname(staticDest), { recursive: true });
fs.cpSync(staticSrc, staticDest, { recursive: true });

const publicSrc = path.join(repoRoot, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(target, "public"), { recursive: true });
}

fs.copyFileSync(
  path.join(appDir, "env.example"),
  path.join(appDir, "bundle", "env.example"),
);

console.log(`SETFORM Server bereit: ${target}`);
