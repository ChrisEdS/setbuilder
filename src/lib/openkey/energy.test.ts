import assert from "node:assert/strict";
import test from "node:test";
import {
  ENERGY_ANALYSIS_RATE,
  ENERGY_WINDOW_SECONDS,
  energyAnalysisWindow,
  energyFromFeatures,
  energySampleSpan,
  energyWindowPrefix,
  highFrequencyRatio,
  resampleLinear,
} from "./energy.ts";

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
  // A pure 440 Hz sine measures around 164. A kick loop measures around 6.
  assert.equal(energyFromFeatures({ ...quiet, danceability: 164 }), 1);
  assert.equal(energyFromFeatures({ ...quiet, danceability: 400 }), 1);
});

test("a measured four-on-the-floor loop is a club level, not Energy 1", () => {
  // Essentia on a 126 BPM kick + hat loop: ~4.2 onsets/s, danceability ~6,
  // almost nothing above 5 kHz, dynamic complexity ~4.
  // Danceability above 3.5 used to be discarded, which floored this at 1–4.
  assert.equal(
    energyFromFeatures({
      hfRatio: 0.012,
      onsetsPerSec: 4.2,
      danceability: 6,
      dynamicComplexity: 4.1,
    }),
    7,
  );
});

test("energyAnalysisWindow keeps a short clip and takes the body of a long one", () => {
  const short = new Float32Array(1000);
  short[0] = 3;
  assert.equal(energyAnalysisWindow(short, 44100), short);

  const rate = 1000;
  const long = new Float32Array(100 * rate);
  for (let i = 0; i < long.length; i++) long[i] = i;
  const windowed = energyAnalysisWindow(long, rate);
  assert.equal(windowed.length, ENERGY_WINDOW_SECONDS * rate);
  assert.equal(windowed[0], 20 * rate);
});

test("energyWindowPrefix keeps the start of an already-positioned buffer", () => {
  const rate = 1000;
  const samples = new Float32Array(80 * rate);
  for (let i = 0; i < samples.length; i++) samples[i] = i;
  const prefix = energyWindowPrefix(samples, rate);
  assert.equal(prefix.length, ENERGY_WINDOW_SECONDS * rate);
  assert.equal(prefix[0], 0);
  assert.equal(prefix[prefix.length - 1], ENERGY_WINDOW_SECONDS * rate - 1);
});

test("energySampleSpan matches the 45s body window", () => {
  const rate = 1000;
  const span = energySampleSpan(100 * rate, rate);
  assert.ok(span);
  assert.equal(span.start, 20 * rate);
  assert.equal(span.count, ENERGY_WINDOW_SECONDS * rate);
  assert.equal(energySampleSpan(10 * rate, rate), null);
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

test("resampleLinear folds a 96 kHz window down to the analysis rate", () => {
  const input = new Float32Array(96000);
  input[10] = 1;
  assert.equal(resampleLinear(input, 44100, ENERGY_ANALYSIS_RATE), input);
  const out = resampleLinear(input, 96000, ENERGY_ANALYSIS_RATE);
  assert.equal(out.length, ENERGY_ANALYSIS_RATE);
  assert.ok(out.some((sample) => sample > 0));
});
