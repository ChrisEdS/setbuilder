import assert from "node:assert/strict";
import test from "node:test";
import {
  bassAtTicks,
  beatTempo,
  downbeatTimes,
  extendFourFour,
  foldBeatTicks,
  gridFromDownbeats,
  gridFromTicks,
  onsetAtTicks,
  stabilizeBeatTicks,
} from "./beatgrid.ts";

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
