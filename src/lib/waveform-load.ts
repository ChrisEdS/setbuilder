import { waveformBands, type WaveformBands } from "@/lib/waveform";

/**
 * One decode per source. Opening the join unmounts the single player; that
 * used to close the AudioContext mid-decode, so both strips stayed black.
 * The promise is shared and is not cancelled on unmount.
 */
export type LoadedWaveform = {
  bands: WaveformBands;
  durationMs: number;
};

const cache = new Map<string, Promise<LoadedWaveform | null>>();

function mixdown(buffer: AudioBuffer): Float32Array {
  const first = buffer.getChannelData(0);
  if (buffer.numberOfChannels < 2) return first;
  const second = buffer.getChannelData(1);
  const mixed = new Float32Array(first.length);
  for (let index = 0; index < first.length; index += 1) {
    mixed[index] = ((first[index] ?? 0) + (second[index] ?? 0)) * 0.5;
  }
  return mixed;
}

async function decodeWaveformBands(bytes: ArrayBuffer): Promise<LoadedWaveform | null> {
  const context = new AudioContext();
  try {
    if (context.state === "suspended") await context.resume().catch(() => undefined);
    const audio = await context.decodeAudioData(bytes.slice(0));
    const buckets = Math.min(24_000, Math.max(1400, Math.floor(audio.duration * 180)));
    return {
      bands: waveformBands(mixdown(audio), audio.sampleRate, buckets),
      durationMs: audio.duration * 1000,
    };
  } catch {
    return null;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export function loadWaveformBands(
  key: string,
  read: () => Promise<ArrayBuffer>,
): Promise<LoadedWaveform | null> {
  const existing = cache.get(key);
  if (existing) return existing;
  const job = read()
    .then((bytes) => decodeWaveformBands(bytes))
    .catch(() => null)
    .then((bands) => {
      if (!bands) cache.delete(key);
      return bands;
    });
  cache.set(key, job);
  return job;
}

export async function readAudioSource(src: string): Promise<ArrayBuffer> {
  const response = await fetch(src);
  if (!response.ok) throw new Error("waveform");
  return response.arrayBuffer();
}
