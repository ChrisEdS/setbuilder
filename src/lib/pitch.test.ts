import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPitchPercent,
  nudgePitchPosition,
  pitchPercent,
  pitchRate,
  playedBpm,
  positionForPercent,
  togglePitchRange,
} from "./pitch.ts";

test("the fader throw stays and the percent scales with the range", () => {
  const position = positionForPercent(6, 10);
  assert.equal(pitchPercent(position, 10), 6);
  assert.equal(pitchPercent(position, 25), 15);
  assert.equal(togglePitchRange(10), 25);
  assert.equal(togglePitchRange(25), 10);
});

test("percent becomes the playback rate and the played BPM", () => {
  assert.equal(pitchRate(0), 1);
  assert.equal(pitchRate(6), 1.06);
  assert.equal(pitchRate(-10), 0.9);
  assert.equal(playedBpm(128, 10), 140.8);
  assert.equal(playedBpm(128, -10), 115.2);
  assert.equal(playedBpm(0, 10), null);
});

test("a fine step stays inside the selected range", () => {
  assert.equal(nudgePitchPosition(1, 10, 0.1), 1);
  assert.equal(nudgePitchPosition(-1, 25, -0.1), -1);
  assert.equal(pitchPercent(nudgePitchPosition(0, 10, 0.1), 10), 0.1);
  assert.equal(formatPitchPercent(6), "+6.0");
  assert.equal(formatPitchPercent(-1.24), "-1.2");
  assert.equal(formatPitchPercent(0), "0.0");
});
