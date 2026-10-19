/**
 * Fixed 1–10 intensity score for electronic music.
 * A steady 126 BPM club track should land around 7.
 * A sparser groove should land around 4.
 * The same features always produce the same integer.
 */
const ONSET_LOW = 0.8;
const ONSET_HIGH = 5.5;
const DANCE_LOW = 0.4;
const DANCE_HIGH = 2.2;
// Essentia danceability is 1 / mean DFA slope. A 126 BPM kick loop measures
// about 6. A pure sine collapses the slope and the value jumps past 100.
// Reject only that explosion. Values inside the musical range still clamp
// at DANCE_HIGH, so a club groove saturates instead of being thrown away.
const DANCE_LIMIT = 20;
/** Body of a long file used for energy. Full tracks blow the WASM heap and
 *  their silent intros pull a club record down to 1. */
export const ENERGY_WINDOW_SECONDS = 45;
export const ENERGY_WINDOW_START = 0.2;
/** Rate Essentia hears. Device AudioContext rates (48/96 kHz) are folded down to this. */
export const ENERGY_ANALYSIS_RATE = 44100;
const HF_LOW = 0.03;
const HF_HIGH = 0.18;
const DYNAMIC_LOW = 2;
const DYNAMIC_HIGH = 10;

const FRAME = 2048;
const HOP = 1024;
const HF_HZ = 5000;

export type EnergyFeatures = {
  hfRatio: number;
  onsetsPerSec: number;
  danceability: number;
  dynamicComplexity: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scale(value: number, low: number, high: number): number {
  return clamp((value - low) / (high - low), 0, 1);
}

function usableDanceability(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > DANCE_LIMIT) return 0;
  return value;
}

/**
 * The part of a file energy should hear: the whole clip when it is short,
 * otherwise 45 seconds starting a fifth of the way in (past the intro).
 */
export function energyAnalysisWindow(
  samples: Float32Array,
  sampleRate: number,
): Float32Array {
  if (sampleRate <= 0 || samples.length === 0) return samples;
  const span = energySampleSpan(samples.length, sampleRate);
  if (!span) return samples;
  return samples.subarray(span.start, span.start + span.count);
}

/**
 * First 45 seconds of a buffer that already starts at the energy window.
 * Applying energyAnalysisWindow again would skip another 20%.
 */
export function energyWindowPrefix(
  samples: Float32Array,
  sampleRate: number,
): Float32Array {
  if (sampleRate <= 0 || samples.length === 0) return samples;
  const span = Math.floor(ENERGY_WINDOW_SECONDS * sampleRate);
  if (span <= 0 || samples.length <= span) return samples;
  return samples.subarray(0, span);
}

/**
 * Sample range matching energyAnalysisWindow, in frames of `sampleRate`.
 * Null when the whole clip is already the window.
 */
/**
 * Linear resample onto `toRate`. Same rate returns the input unchanged.
 * Energy only needs 44.1 kHz; a 96 kHz window is what overflows the WASM heap.
 */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (samples.length === 0 || fromRate <= 0 || toRate <= 0) return samples;
  if (Math.round(fromRate) === Math.round(toRate)) return samples;
  const outLength = Math.max(1, Math.round((samples.length * toRate) / fromRate));
  const out = new Float32Array(outLength);
  const scale = (samples.length - 1) / Math.max(1, outLength - 1);
  const last = samples.length - 1;
  for (let i = 0; i < outLength; i++) {
    const pos = i * scale;
    const index = Math.min(last, Math.floor(pos));
    const next = Math.min(last, index + 1);
    const frac = pos - index;
    out[i] = samples[index] + (samples[next] - samples[index]) * frac;
  }
  return out;
}

export function energySampleSpan(
  totalFrames: number,
  sampleRate: number,
): { start: number; count: number } | null {
  if (sampleRate <= 0 || totalFrames <= 0) return null;
  const count = Math.floor(ENERGY_WINDOW_SECONDS * sampleRate);
  if (count <= 0 || totalFrames <= count) return null;
  const start = Math.min(
    totalFrames - count,
    Math.floor(totalFrames * ENERGY_WINDOW_START),
  );
  return { start: Math.max(0, start), count };
}

export function energyFromFeatures(features: EnergyFeatures): number {
  const drive = scale(features.onsetsPerSec, ONSET_LOW, ONSET_HIGH);
  const dance = scale(usableDanceability(features.danceability), DANCE_LOW, DANCE_HIGH);
  const hf = scale(features.hfRatio, HF_LOW, HF_HIGH);
  const movement = scale(features.dynamicComplexity, DYNAMIC_LOW, DYNAMIC_HIGH);
  const score = 0.4 * drive + 0.35 * dance + 0.15 * hf + 0.1 * movement;
  return clamp(Math.round(1 + score * 9), 1, 10);
}

const hann = new Float32Array(FRAME);
for (let i = 0; i < FRAME; i++) {
  hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME - 1)));
}

function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const swapRe = re[i];
      re[i] = re[j];
      re[j] = swapRe;
      const swapIm = im[i];
      im[i] = im[j];
      im[j] = swapIm;
    }
  }

  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wlenRe = Math.cos(angle);
    const wlenIm = Math.sin(angle);
    for (let i = 0; i < n; i += length) {
      let wRe = 1;
      let wIm = 0;
      const half = length >> 1;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nextRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextRe;
      }
    }
  }
}

export function highFrequencyRatio(input: Float32Array, sampleRate: number): number {
  if (input.length === 0 || sampleRate <= 0) return 0;

  const samples = input.length >= FRAME ? input : padded(input);
  const re = new Float32Array(FRAME);
  const im = new Float32Array(FRAME);
  const binHz = sampleRate / FRAME;
  const hfBin = Math.min(FRAME / 2, Math.max(1, Math.ceil(HF_HZ / binHz)));
  let hfSum = 0;
  let frames = 0;

  for (let start = 0; start + FRAME <= samples.length; start += HOP) {
    for (let i = 0; i < FRAME; i++) {
      re[i] = samples[start + i] * hann[i];
      im[i] = 0;
    }
    fft(re, im);

    let lowPower = 0;
    let highPower = 0;
    for (let bin = 1; bin < FRAME / 2; bin++) {
      const power = re[bin] * re[bin] + im[bin] * im[bin];
      if (bin >= hfBin) highPower += power;
      else lowPower += power;
    }
    const totalPower = lowPower + highPower;
    if (totalPower > 1e-12) hfSum += highPower / totalPower;
    frames += 1;
  }

  return frames > 0 ? hfSum / frames : 0;
}

function padded(input: Float32Array): Float32Array {
  const samples = new Float32Array(FRAME);
  samples.set(input);
  return samples;
}
