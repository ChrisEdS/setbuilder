import assert from "node:assert/strict";
import test from "node:test";
import { energyText } from "./energy.ts";
import { distributeRoles, extractSetFromPlaylist, fitToSlot } from "./extract-set.ts";
import {
  mixJoin,
  relationHint,
  relationLabel,
  relationShortLabel,
} from "./harmonic.ts";
import { tDe, tEn } from "./i18n/core.ts";
import { localizeWhy } from "./i18n/stored.ts";
import { rankReplacements, sidePhrase, swapIntoSlot } from "./replace-track.ts";
import {
  ARC_GUIDE,
  DEFAULT_SET,
  EXTRACT_STEPS,
  PREP_PRINCIPLES,
  arcGuideFor,
  extractStepsFor,
  phaseWindowLabel,
  prepPrinciplesFor,
  trackCount,
  type SetTrack,
} from "./set.ts";

const track = (
  id: string,
  over: Partial<SetTrack> = {},
): SetTrack => ({
  id,
  name: `Track ${id}`,
  artists: ["A"],
  album: "",
  durationMs: 6 * 60_000,
  uri: "",
  externalUrl: "",
  imageUrl: null,
  phase: "lift",
  role: "groove",
  transition: "unset",
  bpm: "124",
  keyCamelot: "8A",
  note: "",
  why: "",
  safetyAlt: "",
  ...over,
});

test("Bogen aria copy stays German in de, English in en", () => {
  assert.equal(tDe("analysis.harmonic.ariaLabel"), "Key-Verlauf");
  assert.equal(tDe("analysis.harmonic.title"), "Key-Verlauf");
  assert.equal(tDe("builder.curve.aria"), "Phasen im Slot");
  assert.equal(tEn("analysis.harmonic.ariaLabel"), "Harmonic path");
  assert.equal(tEn("builder.curve.aria"), "Energy curve");
  assert.match(tDe("analysis.energyPath.statKnownHint"), / /);
  assert.match(tDe("analysis.energyPath.noLevels"), /Energy Levels/);
});

test("energy text and relation labels in both languages", () => {
  assert.equal(energyText(5, 5), "Energie gleich");
  assert.equal(energyText(5, 5, tEn), "Energy same");
  assert.equal(energyText(5, 7), "Energie +2");
  assert.equal(energyText(7, 5, tEn), "Energy -2");
  assert.equal(relationLabel("adjacent"), "Nachbar-Key (±1)");
  assert.equal(relationLabel("adjacent", tEn), "Adjacent key (±1)");
  assert.equal(relationLabel("clash", tEn), "Harmonic clash");
  assert.equal(relationShortLabel("relative"), "Relativ");
  assert.equal(relationShortLabel("adjacent", tEn), "±1");
  assert.equal(relationShortLabel("clash"), "Clash");
});

test("relationHint explains the jargon in DE and EN", () => {
  assert.match(relationHint("clash"), /weit auseinander|beißen|Sortieren/);
  assert.match(relationHint("clash", tEn), /far apart|fight|Sorting/i);
  assert.match(relationHint("adjacent"), /Wheel|Zahl|Standard-Mix/);
  assert.match(relationHint("adjacent", tEn), /wheel|number|standard mix/i);
  assert.match(relationHint("relative"), /8A → 8B|Dur\/Moll/);
  assert.match(relationHint("relative", tEn), /8A → 8B|major\/minor/);
});

test("mixJoin names an energy jump in the active language", () => {
  const from = { keyCamelot: "8A", bpm: "124", energyLevel: 9 };
  const to = { keyCamelot: "9A", bpm: "126", energyLevel: 4 };
  assert.equal(mixJoin(from, to)?.label, "Nachbar-Key (±1) · +2 BPM · Energie -5 (Sprung)");
  assert.equal(mixJoin(from, to, tEn)?.label, "Adjacent key (±1) · +2 BPM · Energy -5 (jump)");
});

test("sidePhrase and rankReplacements speak English on request", () => {
  const from = { keyCamelot: "8A", bpm: "124", energyLevel: 9 };
  const to = { keyCamelot: "8A", bpm: "124", energyLevel: 4 };
  assert.equal(sidePhrase(from, to, "danach")?.text, "danach: Gleicher Key, 0 BPM, Energie -5 (Sprung)");
  assert.equal(
    sidePhrase(from, to, tEn("analysis.side.after"), tEn)?.text,
    "after: same key, 0 BPM, Energy -5 (jump)",
  );

  const tracks = [
    track("a", { energyLevel: 5 }),
    track("b", { energyLevel: 5 }),
    track("alt", { role: "safety", keyCamelot: "", bpm: "" }),
  ];
  const de = rankReplacements(tracks, "b")[0];
  const en = rankReplacements(tracks, "b", tEn)[0];
  assert.match(de.detail, /^Key offen · BPM offen · davor: /);
  assert.match(en.detail, /^Key unknown · BPM unknown · before: /);
});

test("swapIntoSlot writes the why in the given language and localizeWhy converts it", () => {
  const tracks = [track("a"), track("alt", { role: "safety" })];
  const de = swapIntoSlot(tracks, "a", "alt");
  const en = swapIntoSlot(tracks, "a", "alt", tEn);
  assert.equal(de[0].why, "Ersatz für Track a");
  assert.equal(de[1].why, "Ersetzt durch Track alt");
  assert.equal(en[0].why, "Replacement for Track a");
  assert.equal(en[1].why, "Replaced by Track alt");
  assert.equal(localizeWhy(de[0].why, tEn), en[0].why);
});

test("extraction writes roles, notes and reasons in the given language", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      track("1", { phase: "open", energyLevel: 3 }),
      track("2", { phase: "peak", energyLevel: 9 }),
      track("3", { phase: "peak", energyLevel: 9 }),
    ],
  };
  const de = distributeRoles(draft);
  const en = distributeRoles(draft, tEn);
  assert.equal(de.tracks[0].why, "Opener — Headroom, Long Blend");
  assert.equal(en.tracks[0].why, "Opener — headroom, long blend");
  for (const [index, entry] of de.tracks.entries()) {
    assert.equal(localizeWhy(entry.why, tEn), en.tracks[index].why);
  }
});

test("extractSetFromPlaylist texts and the empty playlist error", () => {
  assert.throws(() => extractSetFromPlaylist([], "X", { durationMinutes: 60 }), {
    message: "Playlist enthält keine abspielbaren Tracks.",
  });
  try {
    extractSetFromPlaylist([], "X", { durationMinutes: 60 });
  } catch (error) {
    assert.equal((error as { key?: string }).key, "analysis.extract.noTracks");
  }
});

test("fitToSlot moves tracks with a reason in the given language", () => {
  const phases = ["open", "open", "open", "lift", "lift", "lift", "rise", "rise", "peak", "peak", "peak", "release"] as const;
  const tracks = phases.map((phase, i) => track(`t${i}`, { phase, energyLevel: 6 }));
  const draft = { ...DEFAULT_SET, durationMinutes: 30, tracks };
  const de = fitToSlot(draft);
  const en = fitToSlot(draft, tEn);
  assert.ok(de.moved > 0);
  assert.ok(de.draft.tracks.some((item) => item.why === "Beim Kürzen auf den Slot unter Alternativen gelegt"));
  assert.ok(en.draft.tracks.some((item) => item.why === "Moved to Alternatives when trimming to the slot"));
});

test("set prose has translated twins and German exports stay untouched", () => {
  assert.deepEqual(arcGuideFor(tDe), ARC_GUIDE);
  assert.deepEqual(prepPrinciplesFor(tDe), PREP_PRINCIPLES);
  assert.deepEqual(extractStepsFor(tDe), EXTRACT_STEPS);
  assert.equal(arcGuideFor(tEn).length, ARC_GUIDE.length);
  assert.equal(prepPrinciplesFor(tEn).length, PREP_PRINCIPLES.length);
  assert.equal(extractStepsFor(tEn).length, EXTRACT_STEPS.length);
  assert.notEqual(arcGuideFor(tEn)[0].focus, ARC_GUIDE[0].focus);
  assert.equal(extractStepsFor(tEn)[0].title, "1. Pack to the brief duration");
});

test("trackCount and phaseWindowLabel", () => {
  assert.equal(trackCount(1), "1 Track");
  assert.equal(trackCount(3), "3 Tracks");
  assert.equal(trackCount(1, tEn), "1 track");
  assert.equal(trackCount(3, tEn), "3 tracks");
  assert.equal(phaseWindowLabel(60, "open"), "0–10 min");
  assert.equal(phaseWindowLabel(60, "open", tEn), "0–10 min");
});
