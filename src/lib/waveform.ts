export const WAVE_ZOOM_MIN = 1;
export const WAVE_ZOOM_MAX = 64;

/** Bars of empty view before the first downbeat, so beat 1 can be lined up. */
export const WAVE_LEAD_BARS = 3;

/** Seconds before time 0, and the first downbeat. The downbeat then sits WAVE_LEAD_BARS in. */
export function trackLead(beats: readonly { timeMs: number; beat: number }[], bpm: string): { pad: number; first: number } {
  let bar = 2;
  let first = 0;
  let seen = false;
  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    if (!beat || beat.beat !== 1) continue;
    if (!seen) {
      first = beat.timeMs / 1000;
      seen = true;
      continue;
    }
    bar = Math.max(0.4, beat.timeMs / 1000 - first);
    break;
  }
  if (!seen) {
    const tempo = Number.parseFloat(bpm);
    if (tempo >= 40 && tempo <= 240) bar = 240 / tempo;
  }
  return { pad: Math.max(0, bar * WAVE_LEAD_BARS - first), first };
}

/** Share of a zoomed window left in front of the downbeat when the anchor sits on it. */
const WAVE_LEAD_MARGIN = 0.12;

/**
 * A zoomed window keeps the span it was given. It is not rewound to the start
 * of the lead. Lead before the first downbeat shows only for the slice already
 * in frame. When the anchor is on that downbeat and the slice would hide it
 * against the right edge, only a short margin of lead stays in view. A window
 * past the downbeat is left alone. Scrolling can still reach the rest of the lead.
 */
export function fitLead(start: number, span: number, anchorTime: number, origin: number, first: number): number {
  if (!(span > 0) || !Number.isFinite(start)) return start;
  const earliest = Number.isFinite(origin) ? origin : start;
  if (!Number.isFinite(first) || start > first || first > start + span) return start;
  if (!Number.isFinite(anchorTime)) return Math.max(earliest, start);
  const next = Math.max(earliest, start);
  const onDownbeat = Math.abs(anchorTime - first) <= Math.max(span * 0.02, 1e-9);
  if (!onDownbeat || !(next < first)) return next;
  const room = Math.max(0, first - earliest);
  const margin = Math.min(span * WAVE_LEAD_MARGIN, room);
  const readable = first - margin;
  return next < readable ? readable : next;
}

/**
 * Visible fraction of the track. Zoom 1 shows the whole track plus the lead
 * before time 0. A closer view can scroll back to that lead, and no further.
 */
export function waveformWindow(zoom: number, viewStart: number, pad: number): { start: number; span: number } {
  const lead = Number.isFinite(pad) && pad > 0 ? pad : 0;
  if (zoom <= WAVE_ZOOM_MIN) return { start: -lead, span: 1 + lead };
  const span = 1 / Math.min(WAVE_ZOOM_MAX, zoom);
  const limit = Math.max(-lead, 1 - span);
  return { start: Math.min(Math.max(-lead, viewStart), limit), span };
}

/** Next left edge. `minStart` may be negative so the lead before time 0 stays reachable. */
export function zoomWindow(start: number, span: number, anchor: number, nextSpan: number, minStart: number): number {
  const clampedAnchor = Math.min(1, Math.max(0, anchor));
  const time = start + clampedAnchor * span;
  const next = time - clampedAnchor * nextSpan;
  const limit = Math.max(minStart, 1 - nextSpan);
  return Math.min(Math.max(minStart, next), limit);
}

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
