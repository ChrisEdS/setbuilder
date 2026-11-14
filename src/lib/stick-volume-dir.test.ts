import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { nodeVolumeIo, readUsbAnlzIndex, replaceFileAtomic, volumeDirectory } from "./stick-volume-dir.ts";

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

function anlzWithPath(trackPath: string): Buffer {
  const encoded = Buffer.alloc(trackPath.length * 2);
  for (let index = 0; index < trackPath.length; index += 1) {
    encoded.writeUInt16BE(trackPath.charCodeAt(index), index * 2);
  }
  const tag = Buffer.alloc(16 + encoded.length);
  tag.write("PPTH", 0, "ascii");
  tag.writeUInt32BE(0x10, 4);
  tag.writeUInt32BE(tag.length, 8);
  tag.writeUInt32BE(encoded.length, 12);
  encoded.copy(tag, 16);
  const file = Buffer.alloc(28 + tag.length);
  file.write("PMAI", 0, "ascii");
  file.writeUInt32BE(28, 4);
  file.writeUInt32BE(file.length, 8);
  tag.copy(file, 28);
  return file;
}

test("the analysis index reads ANLZ heads inside USBANLZ and skips a link that leaves the volume", async () => {
  const root = stickDir();
  const track = path.join(root, "PIONEER", "USBANLZ", "P001", "0000000A");
  mkdirSync(track, { recursive: true });
  writeFileSync(path.join(track, "ANLZ0000.DAT"), anlzWithPath("Contents/Kept.aiff"));
  writeFileSync(path.join(track, "ANLZ0000.EXT"), anlzWithPath("Contents/Not-a-dat.aiff"));
  const outside = mkdtempSync(path.join(tmpdir(), "setbuilder-outside-"));
  const escaped = path.join(outside, "escaped.dat");
  writeFileSync(escaped, anlzWithPath("Contents/Escaped.aiff"));
  symlinkSync(escaped, path.join(track, "ANLZ0001.DAT"));
  const leaked = path.join(root, "PIONEER", "USBANLZ", "P001", "linked");
  symlinkSync("/etc", leaked);

  const seen: Array<{ finished: number; total: number }> = [];
  const entries = await readUsbAnlzIndex(root, nodeVolumeIo, (walk) => {
    seen.push({ finished: walk.finished, total: walk.total });
  });
  assert.equal(seen.some((walk) => walk.finished > 0 && walk.finished < walk.total), false);
  assert.equal(seen.at(-1)?.finished, 1);
  assert.equal(seen.at(-1)?.total, 1);
  assert.deepEqual(entries, [
    {
      storedPath: "Contents/Kept.aiff",
      relativePath: "PIONEER/USBANLZ/P001/0000000A/ANLZ0000.DAT",
    },
  ]);
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
