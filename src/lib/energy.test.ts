import assert from "node:assert/strict";
import test from "node:test";
import { energyStep, parseEnergyLevel } from "./energy.ts";

test("reads the Mixed In Key comment format", () => {
  assert.equal(parseEnergyLevel("7A - Energy 6"), 6);
  assert.equal(parseEnergyLevel("8B - Energy 10 - vocal in"), 10);
  assert.equal(parseEnergyLevel("energy: 4"), 4);
  assert.equal(parseEnergyLevel("Cue 7 bei 2:30"), undefined);
  assert.equal(parseEnergyLevel(""), undefined);
});

test("energy steps follow the one-step rule", () => {
  assert.equal(energyStep(6, 6), "same");
  assert.equal(energyStep(6, 7), "smooth");
  assert.equal(energyStep(5, 7), "lift");
  assert.equal(energyStep(9, 5), "jump");
  assert.equal(energyStep(undefined, 5), "unknown");
});
