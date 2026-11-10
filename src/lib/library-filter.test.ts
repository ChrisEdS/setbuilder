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

test("a star minimum keeps rated tracks and drops unrated ones", () => {
  const rated = { key: "8A", bpm: "122", rating: 4 };
  const none = { key: "8A", bpm: "122" };
  const zero = { key: "8A", bpm: "122", rating: 0 };
  assert.equal(matchesLibraryFilter(rated, {}), true);
  assert.equal(matchesLibraryFilter(rated, { ratingMin: 0 }), true);
  assert.equal(matchesLibraryFilter(rated, { ratingMin: null }), true);
  assert.equal(matchesLibraryFilter(none, { ratingMin: 0 }), true);
  assert.equal(matchesLibraryFilter(rated, { ratingMin: 4 }), true);
  assert.equal(matchesLibraryFilter(rated, { ratingMin: 5 }), false);
  assert.equal(matchesLibraryFilter(none, { ratingMin: 1 }), false);
  assert.equal(matchesLibraryFilter(zero, { ratingMin: 1 }), false);
});

test("color, genre and comment narrow the library", () => {
  const pink = { key: "8A", bpm: "122", color: 1, genre: "Techno", comment: "8A - Energy 7" };
  const plain = { key: "8A", bpm: "122", color: 0, genre: "", comment: "" };
  assert.equal(matchesLibraryFilter(pink, {}), true);
  assert.equal(matchesLibraryFilter(plain, { color: 0 }), true);
  assert.equal(matchesLibraryFilter({ key: "8A", bpm: "122" }, { color: 0 }), true);
  assert.equal(matchesLibraryFilter(plain, { color: 1 }), false);
  assert.equal(matchesLibraryFilter(pink, { color: 1 }), true);
  assert.equal(matchesLibraryFilter(plain, { genre: "Techno" }), false);
  assert.equal(matchesLibraryFilter(pink, { genre: "Techno" }), true);
  assert.equal(matchesLibraryFilter(pink, { genre: "" }), true);
  assert.equal(matchesLibraryFilter(pink, { comment: "energy" }), true);
  assert.equal(matchesLibraryFilter(pink, { comment: "  " }), true);
  assert.equal(matchesLibraryFilter(plain, { comment: "energy" }), false);
});

test("an empty bound stays open", () => {
  assert.equal(boundOf(""), null);
  assert.equal(boundOf("  "), null);
  assert.equal(boundOf("122"), 122);
  assert.equal(boundOf("nope"), null);
});
