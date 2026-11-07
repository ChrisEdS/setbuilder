import assert from "node:assert/strict";
import test from "node:test";
import { volumePath } from "./stick-eject.ts";
import {
  cachedPdbCounts,
  confineToVolume,
  isSafeVolumeName,
  listPioneerVolumes,
  resolveUnderVolume,
  stickVolumeName,
} from "./stick-volumes.ts";

test("volume names match the eject allow-list and skip the Mac disk", () => {
  const names = ["ChrisleBeat", "LE_BACKUP", "Stick Name", "Macintosh HD", "Macintosh HD - Data", "../etc", "a/b", "", "D:"];
  for (const name of names) {
    assert.equal(
      isSafeVolumeName(name),
      volumePath(name, "darwin") !== null,
      name,
    );
  }
});

test("the stick name is the volume, not the export.pdb path", () => {
  const found = "ChrisleBeat/PIONEER/rekordbox/export.pdb";
  assert.equal(stickVolumeName("ChrisleBeat", found), "ChrisleBeat");
  assert.equal(stickVolumeName("PIONEER", found), "ChrisleBeat");
  assert.equal(stickVolumeName(".PIONEER", found), "ChrisleBeat");
  assert.equal(stickVolumeName(null, found), "ChrisleBeat");
  assert.equal(stickVolumeName("LE_BACKUP", null), "LE_BACKUP");
  assert.equal(stickVolumeName(null, "export.pdb"), null);
  assert.equal(stickVolumeName("rekordbox", "rekordbox/export.pdb"), null);
});

test("paths stay under the volume and reject ..", () => {
  const root = "/Volumes/ChrisleBeat";
  assert.equal(
    resolveUnderVolume(root, "PIONEER/rekordbox/export.pdb"),
    "/Volumes/ChrisleBeat/PIONEER/rekordbox/export.pdb",
  );
  assert.equal(resolveUnderVolume(root, ".PIONEER/rekordbox/export.pdb"), "/Volumes/ChrisleBeat/.PIONEER/rekordbox/export.pdb");
  assert.equal(resolveUnderVolume(root, ""), root);
  assert.equal(resolveUnderVolume(root, "../LE_BACKUP/export.pdb"), null);
  assert.equal(resolveUnderVolume(root, "PIONEER/../../etc/passwd"), null);
  assert.equal(resolveUnderVolume(root, "/etc/passwd"), null);
  assert.equal(resolveUnderVolume(root, "PIONEER/./export.pdb"), null);
  assert.equal(resolveUnderVolume(root, "PIONEER\\rekordbox\\export.pdb"), "/Volumes/ChrisleBeat/PIONEER/rekordbox/export.pdb");
  assert.equal(resolveUnderVolume(root, "bad\0name"), null);
});

test("a symlink that leaves the volume is not a stick path", () => {
  const root = "/Volumes/ChrisleBeat";
  const calls: string[] = [];
  const realpath = (absolute: string) => {
    calls.push(absolute);
    if (absolute === root) return root;
    if (absolute === `${root}/leak`) return "/etc/passwd";
    if (absolute.startsWith(`${root}/`)) return absolute;
    return null;
  };
  assert.equal(confineToVolume(root, "../LE_BACKUP/export.pdb", realpath), null);
  assert.deepEqual(calls, []);
  assert.equal(confineToVolume(root, "leak", realpath), null);
  assert.equal(
    confineToVolume(root, "PIONEER/rekordbox/export.pdb", realpath),
    "/Volumes/ChrisleBeat/PIONEER/rekordbox/export.pdb",
  );
  assert.equal(
    confineToVolume(root, "PIONEER/new.pdb", (absolute) =>
      absolute.endsWith("new.pdb") ? null : absolute,
    ),
    "/Volumes/ChrisleBeat/PIONEER/new.pdb",
  );
});

test("listing keeps both Pioneer sticks and skips Macintosh HD", () => {
  const seen: string[] = [];
  const listed = listPioneerVolumes({
    names: ["Macintosh HD", "LE_BACKUP", "ChrisleBeat", "../etc", "Empty"],
    volumePath,
    exists(file) {
      seen.push(file);
      return file.startsWith("/Volumes/ChrisleBeat") || file.startsWith("/Volumes/LE_BACKUP");
    },
    stat(file) {
      if (!file.endsWith("export.pdb")) return null;
      return {
        size: file.includes("LE_BACKUP") ? 5_500_000 : 15_600_000,
        mtimeMs: 1_700_000_000_000,
      };
    },
    freeBytes(dir) {
      return dir.endsWith("LE_BACKUP") ? 41 * 1024 ** 3 : 44 * 1024 ** 3;
    },
  });
  assert.deepEqual(
    listed.map((volume) => volume.name),
    ["ChrisleBeat", "LE_BACKUP"],
  );
  assert.equal(listed[0]?.pdbBytes, 15_600_000);
  assert.equal(listed[1]?.pdbBytes, 5_500_000);
  assert.equal(listed[0]?.freeBytes, 44 * 1024 ** 3);
  assert.equal(listed[0]?.pdbRelative, "PIONEER/rekordbox/export.pdb");
  assert.equal(seen.some((file) => file.includes("..") || file.includes("Macintosh")), false);
});

test("playlist counts are not parsed again when mtime and size match", () => {
  const cache = new Map();
  let reads = 0;
  const load = () => {
    reads += 1;
    return { tracks: 10, playlists: 2 };
  };
  assert.deepEqual(cachedPdbCounts(cache, "ChrisleBeat", 100, 5, load), { tracks: 10, playlists: 2 });
  assert.deepEqual(cachedPdbCounts(cache, "ChrisleBeat", 100, 5, load), { tracks: 10, playlists: 2 });
  assert.equal(reads, 1);
  assert.deepEqual(cachedPdbCounts(cache, "ChrisleBeat", 101, 5, load), { tracks: 10, playlists: 2 });
  assert.equal(reads, 2);
});
