import assert from "node:assert/strict";
import test from "node:test";
import {
  ejectCommand,
  isPioneerVolume,
  repairCommand,
  runEject,
  runRepairVolume,
  volumePath,
  type ProcessResult,
} from "./stick-eject.ts";

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

test("macOS repairs with diskutil repairVolume", () => {
  assert.deepEqual(repairCommand("darwin", "/Volumes/Beat"), {
    command: "diskutil",
    args: ["repairVolume", "/Volumes/Beat"],
  });
  assert.equal(repairCommand("win32", "D:\\"), null);
});

test("runEject syncs, ejects, and only succeeds when the mount is gone", async () => {
  const calls: string[][] = [];
  let mounted = true;
  const exec = async (command: string, args: string[]): Promise<ProcessResult> => {
    calls.push([command, ...args]);
    if (command === "diskutil" && args[0] === "eject") {
      mounted = false;
      return { code: 0, stdout: "Volume ejected", stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  };
  await runEject("/Volumes/Beat", "darwin", () => mounted, exec);
  assert.ok(calls.some((c) => c[0] === "/bin/sync"));
  assert.ok(calls.some((c) => c[0] === "diskutil" && c[1] === "eject"));
  assert.equal(mounted, false);
});

test("runEject does not force-unmount when the volume stays busy", async () => {
  const calls: string[][] = [];
  const exec = async (command: string, args: string[]): Promise<ProcessResult> => {
    calls.push([command, ...args]);
    if (command === "/bin/sync") return { code: 0, stdout: "", stderr: "" };
    if (command === "diskutil" && args[0] === "eject") {
      return { code: 1, stdout: "", stderr: "Volume busy\nResource busy" };
    }
    return { code: 0, stdout: "", stderr: "" };
  };
  await assert.rejects(
    () => runEject("/Volumes/Beat", "darwin", () => true, exec),
    /busy|eject-failed/i,
  );
  assert.equal(
    calls.some((c) => c[0] === "diskutil" && c[1] === "unmount"),
    false,
  );
});

test("runEject fails when the volume stays mounted", async () => {
  const exec = async (): Promise<ProcessResult> => ({
    code: 1,
    stdout: "",
    stderr: "Could not eject",
  });
  await assert.rejects(
    () => runEject("/Volumes/Beat", "darwin", () => true, exec),
    /Could not eject|eject-failed/,
  );
});

test("runRepairVolume calls diskutil repairVolume", async () => {
  const calls: string[][] = [];
  const exec = async (command: string, args: string[]): Promise<ProcessResult> => {
    calls.push([command, ...args]);
    return { code: 0, stdout: "Finished file system check", stderr: "" };
  };
  await runRepairVolume("/Volumes/Beat", "darwin", exec);
  assert.deepEqual(calls.at(-1), ["diskutil", "repairVolume", "/Volumes/Beat"]);
});
