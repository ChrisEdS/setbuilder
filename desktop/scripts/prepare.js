const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const appDir = path.join(__dirname, "..");
const repoRoot = path.join(appDir, "..");
const distDirName = ".next-standalone";
const standalone = path.join(repoRoot, distDirName, "standalone");
const target = path.join(appDir, "bundle", "setform");

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
// next/font fetches the Google fonts at build time. That request fails now and then on CI,
// so a failed build gets two more tries before the packaging gives up.
const attempts = 3;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    execFileSync(npx, ["next", "build", "--webpack"], {
      cwd: repoRoot,
      env: { ...process.env, SETBUILDER_STANDALONE: "1" },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    break;
  } catch (error) {
    if (attempt === attempts) throw error;
    console.warn(`next build failed (attempt ${attempt}/${attempts}), trying again...`);
  }
}

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error(`Standalone-Server fehlt: ${standalone}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(standalone, target, { recursive: true, dereference: true });

const nextPackage = path.join(target, "node_modules", "next", "package.json");
if (!fs.existsSync(nextPackage)) {
  throw new Error(
    `Standalone-Bundle ohne next: ${nextPackage}. Die gepackte App könnte den Server nicht starten.`,
  );
}
if (fs.lstatSync(path.join(target, "node_modules")).isSymbolicLink()) {
  throw new Error(
    "node_modules ist ein Symlink. Die App würde auf den Build-Rechner zeigen.",
  );
}

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

console.log(`SETBUILDER Server bereit: ${target}`);
