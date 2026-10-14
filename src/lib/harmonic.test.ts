import assert from "node:assert/strict";
import test from "node:test";
import { harmonicRelation, mixJoin, transitionScore } from "./harmonic.ts";

test("camelot moves match Mixed In Key's safe set", () => {
  assert.equal(harmonicRelation("8A", "8A"), "same");
  assert.equal(harmonicRelation("8A", "9A"), "adjacent");
  assert.equal(harmonicRelation("8A", "7A"), "adjacent");
  assert.equal(harmonicRelation("8A", "8B"), "relative");
  assert.equal(harmonicRelation("8A", "10A"), "energyBoost");
  assert.equal(harmonicRelation("8A", "9B"), "contrast");
  assert.equal(harmonicRelation("8A", "3A"), "clash");
});

test("an energy jump drags a key-perfect transition down", () => {
  const smooth = transitionScore(
    { keyCamelot: "8A", bpm: "124", energyLevel: 6 },
    { keyCamelot: "9A", bpm: "125", energyLevel: 7 },
  );
  const jump = transitionScore(
    { keyCamelot: "8A", bpm: "124", energyLevel: 9 },
    { keyCamelot: "8A", bpm: "124", energyLevel: 5 },
  );
  assert.ok(smooth != null && jump != null && smooth > jump);
});

test("Energie gleich reads naturally in the join label", () => {
  const label = mixJoin(
    { keyCamelot: "8A", bpm: "124", energyLevel: 5 },
    { keyCamelot: "8A", bpm: "124", energyLevel: 5 },
  ).label;
  assert.ok(label.includes("Gleicher Key"));
});
