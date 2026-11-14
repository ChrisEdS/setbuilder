import assert from "node:assert/strict";
import test from "node:test";
import {
  bassAtTicks,
  beatTempo,
  compareBeatGrids,
  downbeatTimes,
  extendFourFour,
  foldBeatTicks,
  gridFromDownbeats,
  gridFromTicks,
  lockedFourFour,
  onsetAtTicks,
  stabilizeBeatTicks,
} from "./beatgrid.ts";
import type { AnlzBeat } from "./anlz-cues.ts";

test("the stronger bass phase becomes beat 1 and the tempo follows the gap", () => {
  const ticks = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];
  const bass = [0, 0, 10, 0, 0, 0, 10, 0];
  const grid = gridFromTicks(ticks, bass);
  assert.deepEqual(
    grid.map((beat) => [beat.timeMs, beat.beat]),
    [
      [0, 3],
      [500, 4],
      [1000, 1],
      [1500, 2],
      [2000, 3],
      [2500, 4],
      [3000, 1],
      [3500, 2],
    ],
  );
});

test("equal bass leaves the first tick as beat 1 and drops a tick that goes backwards", () => {
  const ticks = [0, 500, 400, 1000, 1500, 2000, 2500, 3000, 3500];
  const grid = gridFromTicks(ticks, []);
  assert.equal(grid[0]?.beat, 1);
  assert.equal(grid[0]?.timeMs, 0);
  assert.equal(grid[1]?.timeMs, 500);
  assert.equal(grid[2]?.timeMs, 1000);
  assert.equal(grid.find((beat) => beat.timeMs === 400), undefined);
});

test("half a second between beats is 120 BPM", () => {
  assert.equal(beatTempo(500), 12_000);
  assert.equal(beatTempo(0), 65535);
});

test("fewer than eight rising ticks is not a grid", () => {
  assert.deepEqual(gridFromTicks([0, 500, 1000], [1, 1, 1]), []);
});

test("a low tone measures more bass than a high tone at the same tick", () => {
  const rate = 8000;
  const samples = new Float32Array(rate);
  for (let index = 0; index < samples.length; index += 1) {
    const low = Math.sin((2 * Math.PI * 80 * index) / rate);
    const high = Math.sin((2 * Math.PI * 3000 * index) / rate);
    samples[index] = index < rate / 2 ? low : high;
  }
  const [low, high] = bassAtTicks(samples, rate, [250, 750]);
  assert.ok((low ?? 0) > (high ?? 0));
});

test("empty ticks stay an empty grid", () => {
  assert.deepEqual(gridFromDownbeats([], [0, 2000]), []);
  assert.deepEqual(gridFromTicks([], [1, 1]), []);
});

test("the first downbeat lands on beat 1 and the tick times stay", () => {
  const ticks = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];
  const grid = gridFromDownbeats(ticks, [1000, 3000]);
  assert.equal(grid.find((beat) => beat.timeMs === 1000)?.beat, 1);
  assert.equal(grid[0]?.beat, 3);
  assert.deepEqual(
    grid.map((beat) => beat.timeMs),
    ticks,
  );
});

test("kick on 1 plus snare on 2 and 4 locks the 4/4 phase", () => {
  const ticks = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];
  const bass = [10, 0, 6, 0, 10, 0, 6, 0];
  const onset = [4, 8, 2, 8, 4, 8, 2, 8];
  const downbeats = downbeatTimes(ticks, bass, onset);
  assert.deepEqual(downbeats, [0, 2000]);
  const grid = gridFromDownbeats(ticks, downbeats);
  assert.equal(grid[0]?.beat, 1);
  assert.equal(grid[1]?.beat, 2);
  assert.equal(grid[2]?.beat, 3);
  assert.equal(grid[3]?.beat, 4);
});

test("double-time ticks fold to a mixable 120 BPM pulse", () => {
  const ticks: number[] = [];
  const bass: number[] = [];
  for (let index = 0; index < 16; index += 1) {
    ticks.push(index * 250);
    bass.push(index % 2 === 0 ? 10 : 1);
  }
  const folded = foldBeatTicks(ticks, bass, ticks.map(() => 1));
  assert.equal(folded[0], 0);
  assert.equal(folded[1], 500);
  assert.equal(folded.length, 8);
});

test("a missed tick is filled so the bar stays locked", () => {
  const ticks = [0, 500, 1000, 1500, 2500, 3000, 3500, 4000];
  const stable = stabilizeBeatTicks(ticks);
  assert.ok(stable.includes(2000));
  assert.equal(stable[1] - stable[0], 500);
});

test("the 4/4 grid continues to the end of the file", () => {
  const ticks = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500];
  const grid = extendFourFour(
    ticks.map((timeMs, index) => ({ timeMs, beat: (index % 4) + 1 })),
    5500,
  );
  assert.equal(grid[0]?.timeMs, 0);
  assert.equal(grid[0]?.beat, 3);
  assert.equal(grid[1]?.beat, 4);
  assert.equal(grid[2]?.beat, 1);
  assert.equal(grid[grid.length - 1]?.timeMs, 5500);
});

test("a click measures more onset than a steady low tone at the same tick", () => {
  const rate = 8000;
  const samples = new Float32Array(rate);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * 80 * index) / rate);
  }
  const clickAt = Math.round(0.75 * rate);
  for (let index = clickAt - 20; index <= clickAt + 20; index += 1) {
    samples[index] = index % 2 === 0 ? 1 : -1;
  }
  const [low, click] = onsetAtTicks(samples, rate, [250, 750]);
  assert.ok((click ?? 0) > (low ?? 0));
});

function gridAt(start: number, gap: number, count: number): AnlzBeat[] {
  return Array.from({ length: count }, (_, index) => ({
    timeMs: start + index * gap,
    beat: (index % 4) + 1,
  }));
}

test("an identical grid matches BPM, beat 1, and has no drift", () => {
  const grid = gridAt(0, 500, 24);
  const report = compareBeatGrids(grid, grid);
  assert.equal(report?.referenceBpm, 120);
  assert.equal(report?.candidateBpm, 120);
  assert.equal(report?.bpmDelta, 0);
  assert.equal(report?.downbeatOffsetMs, 0);
  assert.equal(report?.phaseShift, 0);
  assert.equal(report?.errorStartMs, 0);
  assert.equal(report?.errorMiddleMs, 0);
  assert.equal(report?.errorEndMs, 0);
  assert.equal(report?.fitsMix, true);
});

test("a steady 15 ms offset still fits a mix", () => {
  const report = compareBeatGrids(gridAt(0, 500, 24), gridAt(15, 500, 24));
  assert.equal(report?.downbeatOffsetMs, 15);
  assert.equal(report?.phaseShift, 0);
  assert.equal(report?.bpmDelta, 0);
  assert.equal(report?.errorStartMs, 15);
  assert.equal(report?.errorEndMs, 15);
  assert.equal(report?.fitsMix, true);
});

test("beat 1 landing on the next beat is a phase shift of 1", () => {
  const report = compareBeatGrids(gridAt(0, 500, 24), gridAt(500, 500, 24));
  assert.equal(report?.phaseShift, 1);
  assert.equal(report?.downbeatOffsetMs, 500);
  assert.equal(report?.fitsMix, false);
});

test("a grid that walks away by the end does not fit", () => {
  const reference = gridAt(0, 500, 30);
  const candidate = reference.map((beat, index) => ({
    timeMs: beat.timeMs + (index >= 20 ? 40 : 0),
    beat: beat.beat,
  }));
  const report = compareBeatGrids(reference, candidate);
  assert.equal(report?.bpmDelta, 0);
  assert.equal(report?.phaseShift, 0);
  assert.equal(report?.errorStartMs, 0);
  assert.ok((report?.errorEndMs ?? 0) > (report?.errorStartMs ?? 0));
  assert.equal(report?.fitsMix, false);
});

test("half tempo is reported as a BPM difference", () => {
  const report = compareBeatGrids(gridAt(0, 500, 24), gridAt(0, 1000, 12));
  assert.equal(report?.referenceBpm, 120);
  assert.equal(report?.candidateBpm, 60);
  assert.equal(report?.bpmDelta, -60);
  assert.equal(report?.fitsMix, false);
});

test("two beats are not enough to compare", () => {
  assert.equal(compareBeatGrids(gridAt(0, 500, 1), gridAt(0, 500, 8)), null);
});

test("a late tick does not pull the constant grid off the stored BPM", () => {
  const ticks = [0, 500, 1000, 1600, 2000, 2500, 3000, 3500];
  const grid = lockedFourFour(ticks, 3500, ticks.map(() => 1), [], { bpm: 120 });
  assert.deepEqual(
    grid.map((beat) => beat.timeMs),
    [0, 500, 1000, 1500, 2000, 2500, 3000, 3500],
  );
  assert.equal(grid[0]?.beat, 1);
});

test("the stored BPM doubles a half-time pulse", () => {
  const ticks = Array.from({ length: 8 }, (_, index) => index * 690);
  const grid = lockedFourFour(ticks, 5000, [], [], { bpm: 174 });
  assert.equal((grid[1]?.timeMs ?? 0) - (grid[0]?.timeMs ?? 0), 345);
  assert.equal(grid[0]?.timeMs, 0);
  assert.equal(grid[0]?.beat, 1);
});

test("one loud off-beat does not move beat 1 when the other bars agree", () => {
  const ticks = Array.from({ length: 16 }, (_, index) => index * 500);
  const bass = ticks.map((_, index) => (index % 4 === 0 ? 10 : index === 1 ? 20 : 0));
  const grid = lockedFourFour(ticks, 7500, bass, [], { bpm: 120 });
  assert.equal(grid.find((beat) => beat.timeMs === 0)?.beat, 1);
  assert.equal(grid.find((beat) => beat.timeMs === 500)?.beat, 2);
});

test("a tracker that starts late does not invent beats back to zero", () => {
  const ticks = Array.from({ length: 8 }, (_, index) => 4000 + index * 500);
  const grid = lockedFourFour(ticks, 8000, [], [], { bpm: 120 });
  assert.equal(grid[0]?.timeMs, 3500);
  assert.ok(grid.every((beat) => beat.timeMs >= 3500));
});

test("a Rekordbox downbeat keeps beat 1 when the tracker starts later", () => {
  const ticks = Array.from({ length: 8 }, (_, index) => 4000 + index * 500);
  const reference = gridAt(0, 500, 17);
  const grid = lockedFourFour(ticks, 8000, [], [], { bpm: 120, reference });
  assert.equal(grid[0]?.timeMs, 0);
  assert.equal(grid[0]?.beat, 1);
  assert.equal(grid.find((beat) => beat.timeMs === 4000)?.beat, 1);
});

test("the Rekordbox phase stays beat 1 when a later kick is louder", () => {
  const ticks = Array.from({ length: 8 }, (_, index) => index * 500);
  const bass = [0, 30, 0, 0, 0, 30, 0, 0];
  const reference = gridAt(0, 500, 8);
  const grid = lockedFourFour(ticks, 3500, bass, [], { bpm: 120, reference });
  assert.equal(grid.find((beat) => beat.timeMs === 0)?.beat, 1);
  assert.equal(grid.find((beat) => beat.timeMs === 500)?.beat, 2);
});
