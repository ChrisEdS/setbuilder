import assert from "node:assert/strict";
import test from "node:test";
import { openCommand, pickExisting, rekordboxCandidates } from "./open-rekordbox.ts";

test("macOS finds both a flat .app and Pioneer’s rekordbox 7 folder", () => {
  const paths = rekordboxCandidates("darwin", {}, ["rekordbox 7", "Chess.app"]);
  assert.ok(paths.includes("/Applications/rekordbox 7.app"));
  assert.ok(paths.includes("/Applications/rekordbox 7/rekordbox.app"));
  assert.ok(paths.includes("/Applications/rekordbox.app"));
});

test("Windows looks under Pioneer in Program Files", () => {
  const paths = rekordboxCandidates("win32", { ProgramFiles: "C:\\Program Files" }, []);
  assert.ok(paths.some((path) => path.endsWith("Pioneer\\rekordbox 7\\rekordbox.exe")));
});

test("pickExisting takes the first path that is there", () => {
  assert.equal(
    pickExisting(["/missing", "/Applications/rekordbox.app"], (path) => path.endsWith("rekordbox.app")),
    "/Applications/rekordbox.app",
  );
  assert.equal(pickExisting(["/missing"], () => false), null);
});

test("macOS launches with open -a, Windows with the exe", () => {
  assert.deepEqual(openCommand("darwin", "/Applications/rekordbox.app"), {
    command: "open",
    args: ["-a", "/Applications/rekordbox.app"],
  });
  assert.deepEqual(openCommand("win32", "C:\\Pioneer\\rekordbox.exe"), {
    command: "C:\\Pioneer\\rekordbox.exe",
    args: [],
  });
});
