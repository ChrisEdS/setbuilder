import assert from "node:assert/strict";
import test from "node:test";
import { distributeRoles, fitToSlot } from "./extract-set.ts";
import { tEn } from "./i18n/core.ts";
import { DEFAULT_SET, PHASES } from "./set.ts";

const mk = (i: number, phase: string, energy?: number) => ({
  id: `t${i}`, name: `T${i}`, artists: ["A"], album: "", durationMs: 6 * 60_000, uri: "", externalUrl: "",
  imageUrl: null, phase, role: "groove", transition: "unset", bpm: "124", keyCamelot: "8A",
  note: "", why: "", safetyAlt: "", energyLevel: energy, source: "rekordbox",
});
test("slot fit trims to the brief and prefers tracks in the phase band", () => {
  const energies = [3,5,4, 5,6,5, 6,7,8,6, 7,9,5,9,8,4, 5,4,6];
  const phases = ["open","open","open","lift","lift","lift","rise","rise","rise","rise","peak","peak","peak","peak","peak","peak","release","release","release"];
  const tracks = energies.map((e,i)=>mk(i,phases[i],e));
  const draft: any = { ...DEFAULT_SET, durationMinutes: 60, tracks };
  const r = fitToSlot(draft);
  const kept = r.draft.tracks.filter((t:any)=>t.role!=="safety");
  assert.ok(r.afterMs < r.beforeMs);
  assert.ok(r.afterMs <= 60*60_000*1.2);
  assert.equal(kept[0].id, "t0");
  assert.equal(kept[kept.length-1].id, "t18");
  for (const t of kept.filter((t:any)=>t.phase==="peak")) assert.ok(t.energyLevel >= 8, "peak keeps 8+");
  assert.equal(r.moved, r.draft.tracks.filter((t:any)=>t.role==="safety").length);
});

test("roles name the phase pivot with labels, and drop legacy machine notes", () => {
  const tracks = [mk(0, "open", 4), mk(1, "lift", 5), mk(2, "lift", 5)];
  tracks[2].note = "lift/groove · Übergang: long-blend · Nachbar-Key (±1)";
  tracks[1].note = "Vocal erst ab 1:30";
  const draft: any = { ...DEFAULT_SET, tracks };
  const de = distributeRoles(draft);
  assert.equal(de.tracks[1].role, "bridge");
  assert.equal(de.tracks[1].why, "Phasen-Pivot Open → Lift");
  assert.equal(de.tracks[1].note, "Vocal erst ab 1:30");
  assert.equal(de.tracks[2].note, "");
  const en = distributeRoles(draft, tEn);
  assert.equal(en.tracks[1].why, "Phase pivot Open → Lift");
});
