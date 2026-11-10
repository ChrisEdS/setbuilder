import assert from "node:assert/strict";
import test from "node:test";
import {
  addRememberedStickFiles,
  forgetStickFiles,
  getStickMediaEpoch,
  isStickAudioPath,
  lookupRememberedStickFile,
  matchStickFile,
  rememberStickFiles,
  stickArtworkUrl,
  stickAudioUrl,
  stickFileCount,
  stickFileInSession,
  type StickFileRef,
} from "./stick-audio.ts";

function fileWithPath(name: string, path: string, bytes: number[]): File {
  const file = new File([new Uint8Array(bytes)], name);
  try {
    Object.defineProperty(file, "webkitRelativePath", {
      value: path,
      configurable: true,
    });
  } catch {
    /* ignore */
  }
  return file;
}

test("stickArtworkUrl resolves Collection JPEGs and stickAudioUrl ignores them", () => {
  const jpeg = fileWithPath(
    "a1_m.jpg",
    "PIONEER/Artwork/00001/a1_m.jpg",
    [0xff, 0xd8, 0xff, 1],
  );
  const mp3 = fileWithPath("Night Drive.mp3", "Contents/Night Drive.mp3", [0xff, 0xfb, 1]);
  rememberStickFiles([jpeg, mp3]);
  const cover = stickArtworkUrl("/PIONEER/Artwork/00001/a1_m.jpg");
  assert.ok(cover?.startsWith("blob:"));
  assert.equal(stickAudioUrl("/PIONEER/Artwork/00001/a1_m.jpg"), null);
  assert.ok(stickAudioUrl("/Contents/Night Drive.mp3")?.startsWith("blob:"));
  forgetStickFiles();
  assert.equal(stickFileCount(), 0);
  assert.equal(stickAudioUrl("/Contents/Night Drive.mp3"), null);
});

test("addRememberedStickFiles keeps audio already in the session", () => {
  const mp3 = fileWithPath("Night Drive.mp3", "Contents/Night Drive.mp3", [0xff, 0xfb, 1]);
  rememberStickFiles([mp3]);
  const audio = stickAudioUrl("/Contents/Night Drive.mp3");
  const jpeg = fileWithPath(
    "a90_m.jpg",
    "PIONEER/Artwork/00005/a90_m.jpg",
    [0xff, 0xd8, 0xff, 2],
  );
  const mediaEpoch = getStickMediaEpoch();
  addRememberedStickFiles([jpeg]);
  assert.equal(stickAudioUrl("/Contents/Night Drive.mp3"), audio);
  assert.equal(getStickMediaEpoch(), mediaEpoch);
  assert.ok(stickArtworkUrl("/PIONEER/Artwork/00005/a90_m.jpg")?.startsWith("blob:"));
  forgetStickFiles();
  assert.equal(getStickMediaEpoch(), mediaEpoch + 1);
});
