import assert from "node:assert/strict";
import test from "node:test";
import { isWritableMp3 } from "./stick-file.ts";

test("isWritableMp3 accepts mp3 names and MPEG types", () => {
  assert.equal(isWritableMp3(new File([], "track.mp3")), true);
  assert.equal(isWritableMp3(new File([], "TRACK.MP3")), true);
  assert.equal(isWritableMp3(new File([], "a.wav", { type: "audio/mpeg" })), true);
  assert.equal(isWritableMp3(new File([], "x"), "/Contents/Song.mp3"), true);
  assert.equal(isWritableMp3(new File([], "track.flac")), false);
  assert.equal(isWritableMp3(new File([], "track.aiff")), false);
});
