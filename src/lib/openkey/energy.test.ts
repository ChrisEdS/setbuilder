import assert from "node:assert/strict";
import test from "node:test";
import { energyFromFeatures, highFrequencyRatio } from "./energy.ts";

const quiet = { hfRatio: 0, onsetsPerSec: 0, danceability: 0, dynamicComplexity: 0 };

test("energyFromFeatures maps the bottom and top of the fixed ranges", () => {
  assert.equal(energyFromFeatures(quiet), 1);
  assert.equal(
    energyFromFeatures({
      hfRatio: 0.18,
      onsetsPerSec: 5.5,
      danceability: 2.2,
      dynamicComplexity: 10,
    }),
    10,
  );
});

test("energyFromFeatures clamps values outside the ranges", () => {
  assert.equal(
    energyFromFeatures({
      hfRatio: 1,
      onsetsPerSec: 20,
      danceability: 3,
      dynamicComplexity: 30,
    }),
    10,
  );
});

test("energyFromFeatures ignores a danceability value blown up by a flat signal", () => {
  assert.equal(energyFromFeatures({ ...quiet, danceability: 12 }), 1);
  assert.equal(energyFromFeatures({ ...quiet, danceability: 400 }), 1);
});

test("energyFromFeatures places a peak-time club track near 7 and a sparser groove near 4", () => {
  const peak = energyFromFeatures({
    hfRatio: 0.11,
    onsetsPerSec: 4.2,
    danceability: 1.7,
    dynamicComplexity: 5,
  });
  const groove = energyFromFeatures({
    hfRatio: 0.06,
    onsetsPerSec: 2.2,
    danceability: 1,
    dynamicComplexity: 3,
  });
  assert.equal(peak, 7);
  assert.equal(groove, 4);
  assert.equal(
    peak,
    energyFromFeatures({
      hfRatio: 0.11,
      onsetsPerSec: 4.2,
      danceability: 1.7,
      dynamicComplexity: 5,
    }),
  );
});

test("highFrequencyRatio keeps a low sine below bright noise", () => {
  const sampleRate = 44100;
  const sine = new Float32Array(sampleRate);
  for (let i = 0; i < sine.length; i++) {
    sine[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
  const noise = new Float32Array(sampleRate);
  let seed = 1;
  for (let i = 0; i < noise.length; i++) {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    noise[i] = (((value ^ (value >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }

  const sineRatio = highFrequencyRatio(sine, sampleRate);
  const noiseRatio = highFrequencyRatio(noise, sampleRate);
  assert.equal(energyFromFeatures({ ...quiet, hfRatio: sineRatio }), 1);
  assert.ok(noiseRatio > sineRatio);
});
