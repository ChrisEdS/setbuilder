import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { nodeVolumeIo, replaceFileAtomic, volumeDirectory } from "./stick-volume-dir.ts";

function stickDir(): string {
  const root = mkdtempSync(path.join(tmpdir(), "setbuilder-stick-"));
  const rekordbox = path.join(root, "PIONEER", "rekordbox");
  mkdirSync(rekordbox, { recursive: true });
  writeFileSync(path.join(rekordbox, "export.pdb"), "old-pdb");
  return root;
}

test("a volume directory rejects .. and writes by replacing the file", async () => {
  const root = stickDir();
  const dir = volumeDirectory(root, "ChrisleBeat", nodeVolumeIo);
  assert.equal(dir.name, "ChrisleBeat");
  await assert.rejects(() => dir.getDirectoryHandle(".."), /not found/i);
  await assert.rejects(() => dir.getFileHandle(".."), /not found/i);
  await assert.rejects(() => dir.getFileHandle("PIONEER/rekordbox"), /not found/i);

  const pioneer = await dir.getDirectoryHandle("PIONEER");
  const rekordbox = await pioneer.getDirectoryHandle("rekordbox");
  const handle = await rekordbox.getFileHandle("export.pdb");
  const writable = await handle.createWritable();
  await writable.write(new TextEncoder().encode("new-pdb"));
  await writable.close();

  const file = path.join(root, "PIONEER", "rekordbox", "export.pdb");
  assert.equal(readFileSync(file, "utf8"), "new-pdb");
  assert.equal(
    readdirSync(path.dirname(file)).some((name) => name.includes("setbuilder-tmp")),
    false,
  );
});

test("a symlink out of the volume cannot be opened", async () => {
  const root = stickDir();
  symlinkSync("/etc", path.join(root, "leak"));
  const dir = volumeDirectory(root, "ChrisleBeat", nodeVolumeIo);
  await assert.rejects(() => dir.getDirectoryHandle("leak"), /not found/i);
  await assert.rejects(() => dir.getFileHandle("leak"), /not found/i);
  assert.equal(readFileSync(path.join(root, "PIONEER", "rekordbox", "export.pdb"), "utf8"), "old-pdb");
});

test("replaceFileAtomic swaps the bytes and leaves no temp file", async () => {
  const root = stickDir();
  const target = path.join(root, "PIONEER", "rekordbox", "export.pdb");
  await replaceFileAtomic(target, new TextEncoder().encode("swapped"));
  assert.equal(readFileSync(target, "utf8"), "swapped");
  assert.equal(
    readdirSync(path.dirname(target)).some((name) => name.includes("setbuilder-tmp")),
    false,
  );
});
