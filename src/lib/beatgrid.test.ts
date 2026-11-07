import assert from "node:assert/strict";
import test from "node:test";
import { bassAtTicks, beatTempo, gridFromTicks } from "./beatgrid.ts";

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
