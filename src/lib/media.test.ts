import assert from "node:assert/strict";
import test from "node:test";
import { draftNeedsStickFiles, sanitizeDraftImages, usableImageUrl } from "./media.ts";
import { DEFAULT_SET, type SetDraft, type SetTrack } from "./set.ts";

function track(partial: Partial<SetTrack> & Pick<SetTrack, "id" | "name">): SetTrack {
  return {
    artists: ["Ada"],
    album: "",
    durationMs: 180_000,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase: "lift",
    role: "groove",
    transition: "unset",
    bpm: "128",
    keyCamelot: "8A",
    note: "",
    comment: "",
    safetyAlt: "",
    ...partial,
  };
}

test("usableImageUrl drops dead blob covers and keeps http covers", () => {
  assert.equal(usableImageUrl(null), null);
  assert.equal(usableImageUrl(""), null);
  assert.equal(usableImageUrl("blob:http://localhost/abc"), null);
  assert.equal(usableImageUrl("https://i.scdn.co/cover.jpg"), "https://i.scdn.co/cover.jpg");
});

test("sanitizeDraftImages strips blob URLs and leaves the rest", () => {
  const draft: SetDraft = {
    ...DEFAULT_SET,
    tracks: [
      track({ id: "a", name: "Night Drive", imageUrl: "blob:http://localhost/dead" }),
      track({ id: "b", name: "Keep", imageUrl: "https://i.scdn.co/ok.jpg" }),
    ],
  };
  const clean = sanitizeDraftImages(draft);
  assert.equal(clean.tracks[0].imageUrl, null);
  assert.equal(clean.tracks[1].imageUrl, "https://i.scdn.co/ok.jpg");
  assert.equal(sanitizeDraftImages(clean), clean);
});

test("a reopened stick set still needs the folder, a fresh set does not", () => {
  assert.equal(draftNeedsStickFiles(DEFAULT_SET), false);
  assert.equal(
    draftNeedsStickFiles({
      ...DEFAULT_SET,
      tracks: [track({ id: "a", name: "Night Drive", filePath: "/PIONEER/USB/a.mp3" })],
    }),
    true,
  );
  assert.equal(
    draftNeedsStickFiles({
      ...DEFAULT_SET,
      tracks: [track({ id: "a", name: "Night Drive", source: "rekordbox" })],
    }),
    true,
  );
});
