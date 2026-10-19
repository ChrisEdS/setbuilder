import assert from "node:assert/strict";
import test from "node:test";
import {
  PLAN_B_MIN,
  energyFromRekordboxTags,
  energyReasonSummary,
  energyStatusLine,
  energyStep,
  hasKnownEnergy,
  isMetadataComment,
  parseEnergyField,
  parseEnergyLevel,
  planBCount,
  planBState,
  settledEnergy,
} from "./energy.ts";
import { parseKeyImportText } from "./key-import.ts";

test("tag-only comments are metadata, real set notes are not", () => {
  assert.equal(isMetadataComment("Energy 6"), true);
  assert.equal(isMetadataComment("7A - Energy 6"), true);
  assert.equal(isMetadataComment("Energie 4"), true);
  assert.equal(isMetadataComment(""), true);
  assert.equal(isMetadataComment("Vocal rein bei 2:10"), false);
  assert.equal(isMetadataComment("Intro | Energy 6"), false);
});

test("reads the Mixed In Key comment format", () => {
  assert.equal(parseEnergyLevel("7A - Energy 6"), 6);
  assert.equal(parseEnergyLevel("8B - Energy 10 - vocal in"), 10);
  assert.equal(parseEnergyLevel("energy: 4"), 4);
  assert.equal(parseEnergyLevel("7A – Energie 6"), 6);
  assert.equal(parseEnergyLevel("Energy6"), 6);
  assert.equal(parseEnergyLevel("6 Energy"), 6);
  assert.equal(parseEnergyLevel("Energy 7/10"), 7);
  assert.equal(parseEnergyLevel("Cue 7 bei 2:30"), undefined);
  assert.equal(parseEnergyLevel("10mKEY:10m;"), undefined);
  assert.equal(parseEnergyLevel("spotify:track:abc"), undefined);
  assert.equal(parseEnergyLevel(""), undefined);
});

test("CSV Grouping and Energy columns become Energy Levels", () => {
  const grouped = parseKeyImportText(
    "Artist,Title,Key,BPM,Grouping\nAda,Night Drive,8A,124,7\n",
  );
  assert.equal(grouped[0]?.energyLevel, 7);
  const comments = parseKeyImportText(
    "Artist,Title,Key,BPM,Comments\nAda,Night Drive,8A,124,7A - Energy 4\n",
  );
  assert.equal(comments[0]?.energyLevel, 4);
});

test("dedicated fields accept a lone level", () => {
  assert.equal(parseEnergyField("6"), 6);
  assert.equal(parseEnergyField("E8"), 8);
  assert.equal(parseEnergyField("e 10"), 10);
  assert.equal(parseEnergyField("vocal house"), undefined);
  assert.equal(
    energyFromRekordboxTags({ comment: "spotify:track:x", grouping: "7" }),
    7,
  );
  assert.equal(
    energyFromRekordboxTags({ comment: "7A - Energy 5", grouping: "9" }),
    5,
  );
});

test("energy steps follow the one-step rule", () => {
  assert.equal(energyStep(6, 6), "same");
  assert.equal(energyStep(6, 7), "smooth");
  assert.equal(energyStep(5, 7), "lift");
  assert.equal(energyStep(9, 5), "jump");
  assert.equal(energyStep(undefined, 5), "unknown");
});

test("Plan B counts Alternativen set for the phase unless their energy contradicts it", () => {
  const tracks = [
    { role: "safety", phase: "peak" as const, energyLevel: 9 },
    { role: "safety", phase: "peak" as const, energyLevel: 5 },
    { role: "safety", phase: "open" as const },
    { role: "safety", phase: "open" as const, energyLevel: 4 },
    { role: "groove", phase: "peak" as const, energyLevel: 9 },
  ];
  assert.equal(planBCount(tracks, "peak"), 1, "E5 contradicts the peak band 8-10");
  assert.equal(planBCount(tracks, "open"), 2, "no energy counts, E4 fits open 3-5");
  assert.equal(planBCount(tracks, "rise"), 0, "the phase you set is what counts");
  assert.equal(PLAN_B_MIN, 2);
});

test("Plan B state names why an Alternative does not count", () => {
  assert.equal(planBState({ phase: "lift", energyLevel: 6 }), "fit");
  assert.equal(planBState({ phase: "lift", energyLevel: 3 }), "below");
  assert.equal(planBState({ phase: "open", energyLevel: 9 }), "above");
  assert.equal(planBState({ phase: "open" }), "unknown");
});

test("anonymous Energy 1 is missing; a sourced 1 and any other level stay", () => {
  assert.equal(hasKnownEnergy({ energyLevel: 1 }), false);
  assert.equal(hasKnownEnergy({}), false);
  assert.equal(hasKnownEnergy({ energyLevel: 1, energySource: "tag" }), true);
  assert.equal(hasKnownEnergy({ energyLevel: 1, energySource: "measured" }), true);
  assert.equal(hasKnownEnergy({ energyLevel: 1, energySource: "manual" }), true);
  assert.equal(hasKnownEnergy({ energyLevel: 7 }), true);
  assert.deepEqual(settledEnergy({ energyLevel: 1 }), {});
  assert.deepEqual(settledEnergy({ energyLevel: 7 }), { energyLevel: 7 });
  assert.deepEqual(settledEnergy({ energyLevel: 1, energySource: "manual" }), {
    energyLevel: 1,
    energySource: "manual",
  });
});

test("energy status counts one repeated reason instead of repeating the sentence", () => {
  assert.equal(energyReasonSummary([["Decoding failed", 48]]), "Decoding failed");
  assert.equal(
    energyReasonSummary([
      ["Decoding failed", 46],
      ["Could not measure energy from this file", 2],
    ]),
    "Decoding failed ×46 · Could not measure energy from this file ×2",
  );
  assert.equal(
    energyStatusLine("48/248 · 0 übersprungen · 48 Fehler", [["Decoding failed", 48]]),
    "48/248 · 0 übersprungen · 48 Fehler · Decoding failed",
  );
  assert.equal(energyStatusLine("0/10 · 0 skipped · 0 errors", []), "0/10 · 0 skipped · 0 errors");
});
