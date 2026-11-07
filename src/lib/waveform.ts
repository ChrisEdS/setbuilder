export const WAVE_ZOOM_MIN = 1;
export const WAVE_ZOOM_MAX = 64;

/**
 * Zoom the visible window while keeping the time under `anchor` (0–1 across the
 * current window) fixed. The window always stays inside the track.
 */
export function zoomAround(
  start: number,
  zoom: number,
  anchor: number,
  nextZoom: number,
): { start: number; zoom: number } {
  const clamped = Math.min(WAVE_ZOOM_MAX, Math.max(WAVE_ZOOM_MIN, nextZoom));
  const span = 1 / Math.max(WAVE_ZOOM_MIN, zoom);
  const time = start + Math.min(1, Math.max(0, anchor)) * span;
  const nextSpan = 1 / clamped;
  const nextStart = Math.min(Math.max(0, time - Math.min(1, Math.max(0, anchor)) * nextSpan), 1 - nextSpan);
  return { start: nextStart, zoom: clamped };
}

export type WaveformPeaks = {
  low: Float32Array;
  high: Float32Array;
};

export type WaveformBands = {
  low: Float32Array;
  mid: Float32Array;
  high: Float32Array;
};

/**
 * One pass over the decoded samples. A slow filter keeps the kick and bass,
 * a faster one keeps the body, and what is left is the top. Each band is 0–1.
 */
export function waveformBands(samples: Float32Array, sampleRate: number, buckets: number): WaveformBands {
  const count = Math.max(1, Math.floor(buckets));
  const low = new Float32Array(count);
  const mid = new Float32Array(count);
  const high = new Float32Array(count);
  if (samples.length === 0 || !(sampleRate > 0)) return { low, mid, high };
  const lowCoeff = 1 - Math.exp((-2 * Math.PI * 160) / sampleRate);
  const midCoeff = 1 - Math.exp((-2 * Math.PI * 2400) / sampleRate);
  let lowState = 0;
  let midState = 0;
  const span = samples.length / count;
  for (let bucket = 0; bucket < count; bucket += 1) {
    const start = Math.floor(bucket * span);
    const end = Math.min(samples.length, Math.max(start + 1, Math.floor((bucket + 1) * span)));
    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    let lowPeak = 0;
    let highPeak = 0;
    for (let index = start; index < end; index += 1) {
      const sample = samples[index] ?? 0;
      lowState += lowCoeff * (sample - lowState);
      midState += midCoeff * (sample - midState);
      const lowSample = lowState;
      const midSample = midState - lowState;
      const highSample = sample - midState;
      lowEnergy += lowSample * lowSample;
      midEnergy += midSample * midSample;
      highEnergy += highSample * highSample;
      lowPeak = Math.max(lowPeak, Math.abs(lowSample));
      highPeak = Math.max(highPeak, Math.abs(highSample));
    }
    const width = Math.max(1, end - start);
    low[bucket] = Math.min(1, Math.max(Math.sqrt(lowEnergy / width), lowPeak * 0.85));
    mid[bucket] = Math.min(1, Math.sqrt(midEnergy / width));
    high[bucket] = Math.min(1, Math.max(Math.sqrt(highEnergy / width), highPeak * 0.65));
  }
  return { low, mid, high };
}

/**
 * Overview peaks for a stick preview. `low` is the body of each bucket,
 * `high` is the loudest sample. Both are 0–1.
 */
export function waveformPeaks(samples: Float32Array, buckets: number): WaveformPeaks {
  const count = Math.max(1, Math.floor(buckets));
  const low = new Float32Array(count);
  const high = new Float32Array(count);
  if (samples.length === 0) return { low, high };
  const span = samples.length / count;
  for (let i = 0; i < count; i += 1) {
    const start = Math.floor(i * span);
    const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * span)));
    let min = 0;
    let max = 0;
    let energy = 0;
    for (let j = start; j < end; j += 1) {
      const sample = samples[j] ?? 0;
      if (sample < min) min = sample;
      if (sample > max) max = sample;
      energy += sample * sample;
    }
    const width = Math.max(1, end - start);
    low[i] = Math.min(1, Math.sqrt(energy / width));
    high[i] = Math.min(1, Math.max(Math.abs(min), max));
  }
  return { low, high };
}
