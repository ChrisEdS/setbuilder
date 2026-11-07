import type { AnlzBeat } from "./anlz-cues";

const MIN_BEATS = 8;

/** Rekordbox stores BPM × 100. The last beat reuses the previous gap. */
export function beatTempo(gapMs: number): number {
  const gap = Number.isFinite(gapMs) ? Math.max(1, Math.round(gapMs)) : 1;
  return Math.min(65535, Math.max(1, Math.round(6_000_000 / gap)));
}

/**
 * A dynamic grid from beat ticks. Each beat keeps its own time. The tempo is
 * the gap to the next tick. Which tick is beat 1 is the phase whose ticks
 * carry the most bass. Equal bass leaves the first tick as beat 1.
 */
export function gridFromTicks(ticksMs: readonly number[], bass: readonly number[]): AnlzBeat[] {
  const ticks: number[] = [];
  const weight: number[] = [];
  for (let index = 0; index < ticksMs.length; index += 1) {
    const time = Math.round(ticksMs[index] ?? NaN);
    if (!Number.isFinite(time) || time < 0 || time > 0xffffffff) continue;
    const previous = ticks[ticks.length - 1];
    if (previous != null && time <= previous) continue;
    ticks.push(time);
    const level = bass[index];
    weight.push(Number.isFinite(level) && level > 0 ? level : 0);
    if (ticks.length >= 100_000) break;
  }
  if (ticks.length < MIN_BEATS) return [];
  let phase = 0;
  let best = -1;
  for (let candidate = 0; candidate < 4; candidate += 1) {
    let score = 0;
    for (let index = candidate; index < weight.length; index += 4) score += weight[index] ?? 0;
    if (score > best) {
      best = score;
      phase = candidate;
    }
  }
  const beats: AnlzBeat[] = [];
  for (let index = 0; index < ticks.length; index += 1) {
    const timeMs = ticks[index] ?? 0;
    beats.push({ timeMs, beat: ((index - phase) % 4 + 4) % 4 + 1 });
  }
  return beats;
}

/** Mean absolute level of a simple low-pass around one tick. */
export function bassAtTicks(
  samples: Float32Array,
  sampleRate: number,
  ticksMs: readonly number[],
): number[] {
  const rate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 44100;
  const window = Math.max(1, Math.round(rate * 0.05));
  const alpha = 1 - Math.exp((-2 * Math.PI * 150) / rate);
  return ticksMs.map((tick) => {
    const center = Math.round((tick / 1000) * rate);
    const start = Math.max(0, center - window);
    const end = Math.min(samples.length, center + window);
    if (end <= start) return 0;
    let low = 0;
    let sum = 0;
    for (let index = start; index < end; index += 1) {
      low += alpha * ((samples[index] ?? 0) - low);
      sum += Math.abs(low);
    }
    return sum / (end - start);
  });
}
