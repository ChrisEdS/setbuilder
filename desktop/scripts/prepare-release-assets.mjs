#!/usr/bin/env node
/**
 * Prepare matrix build artifacts for a GitHub release that electron-updater can consume.
 *
 * - Rename files that contain spaces (GitHub turns spaces into dots → broken latest.yml urls).
 * - Merge latest-mac-<arch>.yml from parallel Mac jobs into one latest-mac.yml.
 * - Rewrite urls in latest*.yml to match the final filenames on disk.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "artifacts");

if (!fs.existsSync(root)) {
  console.error(`Missing artifacts dir: ${root}`);
  process.exit(1);
}

function listFiles() {
  return fs.readdirSync(root).filter((name) => fs.statSync(path.join(root, name)).isFile());
}

function safeName(name) {
  return name.replace(/ /g, "-");
}

function renameSpacedFiles() {
  for (const name of listFiles()) {
    const next = safeName(name);
    if (next === name) continue;
    const from = path.join(root, name);
    const to = path.join(root, next);
    if (fs.existsSync(to)) {
      console.warn(`skip rename, target exists: ${next}`);
      continue;
    }
    fs.renameSync(from, to);
    console.log(`renamed ${name} → ${next}`);
  }
}

function parseUpdateYml(text) {
  const version = /^version:\s*(.+)$/m.exec(text)?.[1]?.trim();
  const releaseDate = /^releaseDate:\s*(.+)$/m.exec(text)?.[1]?.trim();
  const pathLine = /^path:\s*(.+)$/m.exec(text)?.[1]?.trim();
  const sha512 = /^sha512:\s*(.+)$/m.exec(text)?.[1]?.trim();
  const files = [];
  const block = /files:\n([\s\S]*?)(?=\npath:|\nsha512:|\nreleaseDate:|$)/.exec(text)?.[1] || "";
  for (const chunk of block.split(/\n(?= {2}- url:)/)) {
    const url = /- url:\s*(.+)/.exec(chunk)?.[1]?.trim();
    if (!url) continue;
    const size = Number(/size:\s*(\d+)/.exec(chunk)?.[1] || 0);
    const blockMapSizeRaw = /blockMapSize:\s*(\d+)/.exec(chunk)?.[1];
    files.push({
      url: safeName(url),
      sha512: /sha512:\s*(.+)/.exec(chunk)?.[1]?.trim() || "",
      size,
      blockMapSize: blockMapSizeRaw ? Number(blockMapSizeRaw) : undefined,
    });
  }
  return {
    version,
    releaseDate,
    path: pathLine ? safeName(pathLine) : undefined,
    sha512,
    files,
  };
}

function dumpUpdateYml(doc) {
  const lines = [`version: ${doc.version}`, "files:"];
  for (const file of doc.files) {
    lines.push(`  - url: ${file.url}`);
    lines.push(`    sha512: ${file.sha512}`);
    lines.push(`    size: ${file.size}`);
    if (file.blockMapSize != null) lines.push(`    blockMapSize: ${file.blockMapSize}`);
  }
  const primary =
    doc.files.find((f) => f.url === doc.path) ||
    doc.files.find((f) => f.url.endsWith("-mac.zip") && !f.url.includes("arm64")) ||
    doc.files.find((f) => f.url.endsWith(".zip")) ||
    doc.files[0];
  lines.push(`path: ${primary?.url || doc.path}`);
  lines.push(`sha512: ${primary?.sha512 || doc.sha512}`);
  if (doc.releaseDate) lines.push(`releaseDate: ${doc.releaseDate}`);
  return `${lines.join("\n")}\n`;
}

function mergeMacYmls() {
  const parts = listFiles()
    .filter((name) => /^latest-mac(-[a-z0-9]+)?\.yml$/i.test(name))
    .sort();
  if (parts.length === 0) {
    console.warn("no latest-mac*.yml — skip mac merge");
    return;
  }

  const merged = { version: null, releaseDate: null, files: [] };
  const seen = new Set();

  for (const name of parts) {
    const doc = parseUpdateYml(fs.readFileSync(path.join(root, name), "utf8"));
    merged.version = merged.version || doc.version;
    merged.releaseDate = merged.releaseDate || doc.releaseDate;
    for (const file of doc.files) {
      if (seen.has(file.url)) continue;
      seen.add(file.url);
      merged.files.push(file);
    }
  }

  merged.files.sort((a, b) => a.url.localeCompare(b.url));
  if (!merged.files.length) {
    console.warn("mac merge produced no files");
    return;
  }

  const out = path.join(root, "latest-mac.yml");
  fs.writeFileSync(out, dumpUpdateYml(merged));
  console.log(`merged ${parts.join(", ")} → latest-mac.yml (${merged.files.length} files)`);

  for (const name of parts) {
    if (name === "latest-mac.yml") continue;
    fs.unlinkSync(path.join(root, name));
    console.log(`removed ${name}`);
  }
}

function rewriteYmlUrls(fileName) {
  const full = path.join(root, fileName);
  if (!fs.existsSync(full)) return;
  const onDisk = new Set(listFiles());
  const doc = parseUpdateYml(fs.readFileSync(full, "utf8"));
  let changed = false;
  doc.files = doc.files.map((file) => {
    let url = safeName(file.url);
    if (!onDisk.has(url)) {
      const dotted = file.url.replace(/ /g, ".");
      if (onDisk.has(dotted)) url = dotted;
    }
    if (url !== file.url) changed = true;
    if (!onDisk.has(url)) {
      console.warn(`${fileName}: missing asset on disk for url ${url}`);
    }
    return { ...file, url };
  });
  if (doc.path) {
    const nextPath = safeName(doc.path);
    if (nextPath !== doc.path) changed = true;
    doc.path = nextPath;
  }
  if (changed || true) {
    fs.writeFileSync(full, dumpUpdateYml(doc));
    console.log(`normalized ${fileName}`);
  }
}

renameSpacedFiles();
mergeMacYmls();
for (const name of ["latest.yml", "latest-linux.yml", "latest-mac.yml"]) {
  rewriteYmlUrls(name);
}
console.log("release assets prepared");
