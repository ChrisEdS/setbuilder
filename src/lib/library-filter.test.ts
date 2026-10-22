import assert from "node:assert/strict";
import test from "node:test";
import {
  boundOf,
  inCamelotNeighborhood,
  matchesLibraryFilter,
} from "./library-filter.ts";

test("neighborhood keeps same, relative and one step, and drops a clash", () => {
  assert.equal(inCamelotNeighborhood("8A", "8A"), true);
  assert.equal(inCamelotNeighborhood("8A", "8B"), true);
  assert.equal(inCamelotNeighborhood("8A", "9A"), true);
  assert.equal(inCamelotNeighborhood("8A", "7A"), true);
  assert.equal(inCamelotNeighborhood("8A", "1A"), false);
  assert.equal(inCamelotNeighborhood("Am", "8A"), true);
});

test("bpm and energy bounds drop tracks outside the window", () => {
  const row = { key: "8A", bpm: "122", energy: 6 };
  assert.equal(matchesLibraryFilter(row, { key: "8A", bpmMin: 120, bpmMax: 126, energyMin: 5, energyMax: 7 }), true);
  assert.equal(matchesLibraryFilter(row, { bpmMin: 130 }), false);
  assert.equal(matchesLibraryFilter(row, { energyMax: 4 }), false);
  assert.equal(matchesLibraryFilter({ key: "8A", bpm: "", energy: 6 }, { bpmMin: 100 }), false);
  assert.equal(matchesLibraryFilter({ key: "8A", bpm: "122" }, { energyMin: 1 }), false);
});

test("an empty bound stays open", () => {
  assert.equal(boundOf(""), null);
  assert.equal(boundOf("  "), null);
  assert.equal(boundOf("122"), 122);
  assert.equal(boundOf("nope"), null);
});
