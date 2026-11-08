import assert from "node:assert/strict";
import test from "node:test";
import type { AnlzBeat } from "./anlz-cues.ts";
import {
  GRID_BPM_MAX,
  GRID_BPM_MIN,
  GRID_HOLD_DELAY_MS,
  GRID_HOLD_FIRST_MS,
  GRID_HOLD_MIN_MS,
  GRID_SLIDE_COARSE_MS,
  GRID_SLIDE_FINE_MS,
  cloneGrid,
  flagGrid,
  gridBpm,
  gridDragDeltaMs,
  gridsEqual,
  nextGridHoldDelay,
  scaleGridTempo,
  slideGrid,
  snapGrid,
} from "./beatgrid-edit.ts";

function gaps(beats: readonly AnlzBeat[]): number[] {
  const found: number[] = [];
  for (let index = 1; index < beats.length; index += 1) {
    found.push((beats[index]?.timeMs ?? 0) - (beats[index - 1]?.timeMs ?? 0));
  }
  return found;
}

const variable: AnlzBeat[] = [
  { timeMs: 1000, beat: 1 },
  { timeMs: 1400, beat: 2 },
  { timeMs: 2000, beat: 3 },
  { timeMs: 2400, beat: 4 },
  { timeMs: 3100, beat: 1 },
  { timeMs: 3500, beat: 2 },
];

test("a slide of 1 ms and 10 ms moves every beat by that delta and keeps gaps", () => {
  assert.equal(GRID_SLIDE_FINE_MS, 1);
  assert.equal(GRID_SLIDE_COARSE_MS, 10);
  const fine = slideGrid(variable, GRID_SLIDE_FINE_MS);
  const coarse = slideGrid(variable, -GRID_SLIDE_COARSE_MS);
  assert.ok(fine);
  assert.ok(coarse);
  assert.deepEqual(
    fine.map((beat) => beat.timeMs),
    variable.map((beat) => beat.timeMs + 1),
  );
  assert.deepEqual(
    coarse.map((beat) => beat.timeMs),
    variable.map((beat) => beat.timeMs - 10),
  );
  assert.deepEqual(
    fine.map((beat) => beat.beat),
    variable.map((beat) => beat.beat),
  );
  assert.deepEqual(gaps(fine), gaps(variable));
  assert.deepEqual(gaps(coarse), gaps(variable));
  assert.equal(slideGrid(variable, -5000), null);
});

test("flag makes the nearest beat beat 1 and lands it on the playhead", () => {
  const flagged = flagGrid(variable, 1900);
  assert.ok(flagged);
  const landed = flagged.find((beat) => beat.timeMs === 1900);
  assert.equal(landed?.beat, 1);
  assert.deepEqual(gaps(flagged), gaps(variable));
  assert.deepEqual(
    flagged.map((beat) => beat.beat),
    [3, 4, 1, 2, 3, 4],
  );
  assert.equal(flagGrid([{ timeMs: 0, beat: 1 }], -20), null);
});

test("snap moves the nearest beat onto the playhead without rotating the phase", () => {
  const snapped = snapGrid(variable, 1900);
  assert.ok(snapped);
  assert.equal(snapped.find((beat) => beat.beat === 3)?.timeMs, 1900);
  assert.deepEqual(
    snapped.map((beat) => beat.beat),
    variable.map((beat) => beat.beat),
  );
  assert.deepEqual(gaps(snapped), gaps(variable));
});

test("half and double keep the current downbeat time and stay inside the DJ range", () => {
  assert.equal(GRID_BPM_MIN, 40);
  assert.equal(GRID_BPM_MAX, 300);
  const halved = scaleGridTempo(variable, 0.5, 1000);
  assert.ok(halved);
  assert.equal(halved.find((beat) => beat.timeMs === 1000)?.beat, 1);
  assert.ok((gridBpm(halved) ?? 0) < (gridBpm(variable) ?? 0));
  assert.deepEqual(gaps(halved), [1000, 1100]);

  const doubled = scaleGridTempo(variable, 2, 1000);
  assert.ok(doubled);
  assert.equal(doubled.find((beat) => beat.timeMs === 1000)?.beat, 1);
  assert.ok((gridBpm(doubled) ?? 0) > (gridBpm(variable) ?? 0));
  const doubledGaps = gaps(doubled);
  assert.ok(new Set(doubledGaps).size > 1);

  const fast: AnlzBeat[] = [
    { timeMs: 0, beat: 1 },
    { timeMs: 300, beat: 2 },
    { timeMs: 600, beat: 3 },
    { timeMs: 900, beat: 4 },
  ];
  assert.equal(scaleGridTempo(fast, 2, 0), null);
  const slow: AnlzBeat[] = [
    { timeMs: 0, beat: 1 },
    { timeMs: 1200, beat: 2 },
    { timeMs: 2400, beat: 3 },
    { timeMs: 3600, beat: 4 },
  ];
  assert.equal(scaleGridTempo(slow, 0.5, 0), null);
  const doubledSlow = scaleGridTempo(slow, 2, 0);
  assert.equal(doubledSlow?.find((beat) => beat.timeMs === 0)?.beat, 1);
});

test("reset restores the session anchor taken before the first edit", () => {
  const anchor = cloneGrid(variable);
  let grid = cloneGrid(variable);
  let stored: AnlzBeat[] | null = null;
  const edit = (next: AnlzBeat[] | null) => {
    if (!next) return;
    if (!stored) stored = cloneGrid(grid);
    grid = next;
  };
  edit(slideGrid(grid, GRID_SLIDE_COARSE_MS));
  edit(slideGrid(grid, -GRID_SLIDE_FINE_MS));
  edit(flagGrid(grid, 1900));
  edit(scaleGridTempo(grid, 2, 1900));
  assert.ok(stored);
  assert.ok(gridsEqual(stored, anchor));
  assert.equal(gridsEqual(grid, anchor), false);
  grid = cloneGrid(stored);
  stored = null;
  assert.ok(gridsEqual(grid, anchor));
  assert.equal(stored, null);
});

test("a lane drag slides by the visible milliseconds per pixel", () => {
  assert.equal(gridDragDeltaMs(10, 1000, 10_000), 100);
  assert.equal(gridDragDeltaMs(-4, 200, 5000), -100);
  assert.equal(gridDragDeltaMs(8, 0, 5000), 0);
  assert.equal(GRID_HOLD_DELAY_MS, 350);
  assert.equal(GRID_HOLD_FIRST_MS, 90);
  assert.equal(nextGridHoldDelay(GRID_HOLD_FIRST_MS), 72);
  assert.equal(nextGridHoldDelay(GRID_HOLD_MIN_MS), GRID_HOLD_MIN_MS);
});
