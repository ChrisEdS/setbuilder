import assert from "node:assert/strict";
import test from "node:test";
import { applyEnergyLevels, applyRereadEnergyLevels, isWritableMp3 } from "./stick-file.ts";
import { DEFAULT_SET, type SetTrack } from "./set.ts";

test("isWritableMp3 accepts mp3 names and MPEG types", () => {
  assert.equal(isWritableMp3(new File([], "track.mp3")), true);
  assert.equal(isWritableMp3(new File([], "TRACK.MP3")), true);
  assert.equal(isWritableMp3(new File([], "a.wav", { type: "audio/mpeg" })), true);
  assert.equal(isWritableMp3(new File([], "x"), "/Contents/Song.mp3"), true);
  assert.equal(isWritableMp3(new File([], "track.flac")), false);
  assert.equal(isWritableMp3(new File([], "track.aiff")), false);
});

function setTrack(partial: Partial<SetTrack> & Pick<SetTrack, "id">): SetTrack {
  return {
    name: "Night",
    artists: ["Ada"],
    album: "",
    durationMs: 1,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase: "peak",
    role: "groove",
    transition: "unset",
    bpm: "",
    keyCamelot: "",
    note: "",
    safetyAlt: "",
    ...partial,
  };
}

test("applyEnergyLevels fills a missing level and an anonymous 1 from the tag", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      setTrack({ id: "bare" }),
      setTrack({ id: "placeholder", energyLevel: 1 }),
      setTrack({ id: "hand", energyLevel: 1, energySource: "manual" }),
      setTrack({ id: "kept", energyLevel: 6 }),
    ],
  };
  const next = applyEnergyLevels(
    draft,
    new Map([
      ["bare", 4],
      ["placeholder", 9],
      ["hand", 2],
      ["kept", 3],
    ]),
  );
  assert.equal(next.tracks[0].energyLevel, 4);
  assert.equal(next.tracks[0].energySource, "tag");
  assert.equal(next.tracks[1].energyLevel, 9);
  assert.equal(next.tracks[1].energySource, "tag");
  assert.equal(next.tracks[2].energyLevel, 1);
  assert.equal(next.tracks[2].energySource, "manual");
  assert.equal(next.tracks[3].energyLevel, 6);
  assert.equal(next.tracks[3].energySource, undefined);
});

test("applyRereadEnergyLevels replaces a known level with the tag", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      setTrack({ id: "measured", energyLevel: 8, energySource: "measured" }),
      setTrack({ id: "untagged", energyLevel: 4, energySource: "manual" }),
    ],
  };
  const next = applyRereadEnergyLevels(draft, new Map([["measured", 5]]));
  assert.equal(next.tracks[0].energyLevel, 5);
  assert.equal(next.tracks[0].energySource, "tag");
  assert.equal(next.tracks[1].energyLevel, 4);
  assert.equal(next.tracks[1].energySource, "manual");
});
