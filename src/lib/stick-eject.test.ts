import assert from "node:assert/strict";
import test from "node:test";
import { ejectCommand, isPioneerVolume, volumePath } from "./stick-eject.ts";

test("only a safe volume name maps to /Volumes", () => {
  assert.equal(volumePath("ChrisleBeat", "darwin"), "/Volumes/ChrisleBeat");
  assert.equal(volumePath("Macintosh HD", "darwin"), null);
  assert.equal(volumePath("../etc", "darwin"), null);
  assert.equal(volumePath("D:", "win32"), "D:\\");
});

test("a Pioneer volume must contain export.pdb", () => {
  const files = new Set(["/Volumes/Beat/PIONEER/rekordbox/export.pdb"]);
  assert.equal(isPioneerVolume("/Volumes/Beat", (file) => files.has(file)), true);
  assert.equal(isPioneerVolume("/Volumes/Empty", () => false), false);
});

test("macOS ejects with diskutil", () => {
  assert.deepEqual(ejectCommand("darwin", "/Volumes/Beat"), {
    command: "diskutil",
    args: ["eject", "/Volumes/Beat"],
  });
  assert.equal(ejectCommand("linux", "/mnt/beat"), null);
});
