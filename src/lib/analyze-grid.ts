import { bassAtTicks, gridFromTicks } from "./beatgrid";
import type { AnlzBeat } from "./anlz-cues";
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

/** Decode the loaded file again and build a dynamic beat grid. Throws when there are no ticks. */
export async function analyzeSourceGrid(src: string): Promise<AnlzBeat[]> {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Could not read the audio");
  const bytes = await response.arrayBuffer();
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(bytes.slice(0));
    const samples = mixdown(decoded);
    const ticks = await analyzeBeatTicks(samples, decoded.sampleRate);
    const grid = gridFromTicks(ticks, bassAtTicks(samples, decoded.sampleRate, ticks));
    if (!grid.length) throw new Error("Could not find beats");
    return grid;
  } finally {
    await context.close();
  }
}
