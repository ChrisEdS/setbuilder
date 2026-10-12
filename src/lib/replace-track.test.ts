import assert from "node:assert/strict";
import test from "node:test";
import { sidePhrase } from "./replace-track.ts";

test("a key clash is never bought back by matching energy and BPM", () => {
  const from = { keyCamelot: "10A", bpm: "125", energyLevel: 8 };
  const clash = sidePhrase(from, { keyCamelot: "4A", bpm: "125", energyLevel: 8 }, "danach");
  const fit = sidePhrase(from, { keyCamelot: "9A", bpm: "125", energyLevel: 8 }, "danach");
  assert.ok(clash && fit);
  assert.ok(clash.score < 0.55, "stays below the Passt-zu threshold");
  assert.ok(fit.score > 0.85);
});

test("an energy jump lowers the score and is named", () => {
  const from = { keyCamelot: "8A", bpm: "124", energyLevel: 9 };
  const jump = sidePhrase(from, { keyCamelot: "8A", bpm: "124", energyLevel: 4 }, "danach");
  assert.ok(jump);
  assert.ok(jump.text.includes("Sprung"));
  assert.ok(jump.score < 0.85);
});
