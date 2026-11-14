import { bassAtTicks, lockedFourFour, onsetAtTicks, type GridLockHint } from "./beatgrid";
import type { AnlzBeat } from "./anlz-cues";
import { ENERGY_ANALYSIS_RATE, resampleLinear } from "./openkey/energy";
import { analyzeBeatTicks } from "./openkey/client";

function mixdown(decoded: AudioBuffer): Float32Array {
  const samples = new Float32Array(decoded.length);
  for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
    const data = decoded.getChannelData(channel);
    for (let index = 0; index < decoded.length; index += 1) samples[index] += data[index] ?? 0;
  }
  if (decoded.numberOfChannels > 1) {
    for (let index = 0; index < samples.length; index += 1) samples[index] /= decoded.numberOfChannels;
  }
  return samples;
}

function djGrid(
  samples: Float32Array,
  sampleRate: number,
  ticksMs: readonly number[],
  durationMs: number,
  hint?: GridLockHint,
): AnlzBeat[] {
  const bass = bassAtTicks(samples, sampleRate, ticksMs);
  const onset = onsetAtTicks(samples, sampleRate, ticksMs);
  return lockedFourFour(ticksMs, durationMs, bass, onset, hint);
}

/** Decode the loaded file again and build a 4/4 beat grid. Throws when there are no ticks. */
export async function analyzeSourceGrid(src: string, hint?: GridLockHint): Promise<AnlzBeat[]> {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Could not read the audio");
  const bytes = await response.arrayBuffer();
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(bytes.slice(0));
    const mixed = mixdown(decoded);
    const samples = resampleLinear(mixed, decoded.sampleRate, ENERGY_ANALYSIS_RATE);
    const ticks = await analyzeBeatTicks(samples, ENERGY_ANALYSIS_RATE);
    const durationMs = Math.round((decoded.length / decoded.sampleRate) * 1000);
    const grid = djGrid(samples, ENERGY_ANALYSIS_RATE, ticks, durationMs, hint);
    if (!grid.length) throw new Error("Could not find beats");
    return grid;
  } finally {
    await context.close();
  }
}
