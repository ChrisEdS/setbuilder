import {
  buildPcmWav,
  findMp3Frame,
  id3v2Size,
  mp3WindowRange,
  parseAiffLayout,
  parseWavLayout,
  pcmWindowRange,
  probeMp3,
  sniffAudio,
  swapEndianPcm,
  type ByteRange,
} from "./decode-window";
import {
  ENERGY_ANALYSIS_RATE,
  energyAnalysisWindow,
  energyWindowPrefix,
  resampleLinear,
} from "./energy";
import type { Analysis } from "./types";

/** Above this, decoding the whole file is what makes every club track throw. */
const WHOLE_FILE_LIMIT = 16 * 1024 * 1024;

type WorkerResponse = {
  id: number;
  result?: Analysis;
  error?: string;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (value: Analysis) => void; reject: (error: Error) => void }
>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (event.data.error) request.reject(new Error(event.data.error));
    else if (event.data.result) request.resolve(event.data.result);
    else request.reject(new Error("Analysis returned no result"));
  };
  worker.onerror = (event) => {
    const message = event.message || "Analysis failed to start";
    for (const request of pending.values()) request.reject(new Error(message));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function analyzeSamples(
  samples: Float32Array,
  sampleRate: number,
  kind: "full" | "energy" = "full",
): Promise<Analysis> {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, samples, sampleRate, kind }, [samples.buffer]);
  });
}

function asDecodeError(error: unknown): Error {
  const detail = error instanceof Error ? error.message.trim() : "";
  return new Error(detail ? `Audio decoder failed: ${detail}` : "Audio decoder failed");
}

async function readBytes(file: Blob, start: number, end: number): Promise<Uint8Array> {
  const safeStart = Math.max(0, Math.min(start, file.size));
  const safeEnd = Math.max(safeStart, Math.min(end, file.size));
  if (safeEnd === safeStart) return new Uint8Array();
  return new Uint8Array(await file.slice(safeStart, safeEnd).arrayBuffer());
}

function mixdown(decoded: AudioBuffer): { samples: Float32Array; sampleRate: number } {
  const samples = new Float32Array(decoded.length);
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const data = decoded.getChannelData(channel);
    for (let i = 0; i < decoded.length; i++) samples[i] += data[i];
  }
  if (decoded.numberOfChannels > 1) {
    for (let i = 0; i < samples.length; i++) samples[i] /= decoded.numberOfChannels;
  }
  return { samples, sampleRate: decoded.sampleRate };
}

async function decodeBuffer(
  bytes: Uint8Array,
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const audioContext = new AudioContext();
  try {
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    const decoded = await audioContext.decodeAudioData(copy);
    return mixdown(decoded);
  } catch (error) {
    throw asDecodeError(error);
  } finally {
    await audioContext.close();
  }
}

export async function decodeAudio(
  file: File,
): Promise<{ samples: Float32Array; sampleRate: number }> {
  return decodeBuffer(await readBytes(file, 0, file.size));
}

async function decodeWholeIfSmall(
  file: File,
): Promise<{ samples: Float32Array; sampleRate: number; positioned: boolean }> {
  if (file.size > WHOLE_FILE_LIMIT) throw new Error("Decoding failed");
  const decoded = await decodeAudio(file);
  return { ...decoded, positioned: false };
}

async function decodeWavWindow(
  file: File,
  head: Uint8Array,
): Promise<{ samples: Float32Array; sampleRate: number; positioned: boolean } | null> {
  let prefix = head;
  let layout = parseWavLayout(prefix);
  if (!layout && file.size > prefix.length) {
    prefix = await readBytes(file, 0, Math.min(file.size, 1024 * 1024));
    layout = parseWavLayout(prefix);
  }
  if (!layout) return null;
  if (layout.dataOffset + layout.dataSize > file.size) return null;
  const dataBytes = layout.dataSize;
  const range = pcmWindowRange(layout.dataOffset, dataBytes, layout.sampleRate, layout.blockAlign);
  if (!range) return null;
  const pcm = await readBytes(file, range.start, range.end);
  if (pcm.length < layout.blockAlign) return null;
  const wav = buildPcmWav({
    channels: layout.channels,
    sampleRate: layout.sampleRate,
    bitsPerSample: layout.bitsPerSample || layout.blockAlign * 8 / layout.channels,
    pcm,
    format: layout.format,
  });
  const decoded = await decodeBuffer(wav);
  return { ...decoded, positioned: range.positioned };
}

async function decodeAiffWindow(
  file: File,
  head: Uint8Array,
): Promise<{ samples: Float32Array; sampleRate: number; positioned: boolean } | null> {
  let prefix = head;
  let layout = parseAiffLayout(prefix);
  if (!layout && file.size > prefix.length) {
    prefix = await readBytes(file, 0, Math.min(file.size, 1024 * 1024));
    layout = parseAiffLayout(prefix);
  }
  if (!layout) return null;
  const bytesPerSample = Math.ceil(layout.bitsPerSample / 8);
  const blockAlign = layout.channels * bytesPerSample;
  const dataBytes = Math.min(layout.dataSize, Math.max(0, file.size - layout.dataOffset));
  const range = pcmWindowRange(layout.dataOffset, dataBytes, layout.sampleRate, blockAlign);
  if (!range) return null;
  let pcm = await readBytes(file, range.start, range.end);
  if (pcm.length < blockAlign) return null;
  if (!layout.littleEndian && bytesPerSample > 1) pcm = swapEndianPcm(pcm, bytesPerSample);
  const wav = buildPcmWav({
    channels: layout.channels,
    sampleRate: layout.sampleRate,
    bitsPerSample: layout.bitsPerSample,
    pcm,
  });
  const decoded = await decodeBuffer(wav);
  return { ...decoded, positioned: range.positioned };
}

async function decodeMp3Window(
  file: File,
  head: Uint8Array,
): Promise<{ samples: Float32Array; sampleRate: number; positioned: boolean } | null> {
  const audioStart = Math.min(file.size, id3v2Size(head));
  let probeBytes = head.subarray(Math.min(audioStart, head.length));
  if (probeBytes.length < 8 * 1024 && audioStart < file.size) {
    probeBytes = await readBytes(file, audioStart, Math.min(file.size, audioStart + 128 * 1024));
  }
  const probe = probeMp3(probeBytes, file.size, audioStart);
  if (!probe) return null;
  const range: ByteRange | null = mp3WindowRange(probe, file.size);
  if (!range) return decodeWholeIfSmall(file);
  const chunk = await readBytes(file, range.start, range.end);
  const aligned = findMp3Frame(chunk, 0);
  const frames = aligned > 0 ? chunk.subarray(aligned) : chunk;
  if (frames.length < 4) return null;
  const decoded = await decodeBuffer(frames);
  return { ...decoded, positioned: true };
}

/**
 * Decode only the energy window (45s from 20% for a long file).
 * `positioned` means the buffer already starts at that window.
 */
export async function decodeEnergyWindow(
  file: File,
): Promise<{ samples: Float32Array; sampleRate: number; positioned: boolean }> {
  const head = await readBytes(file, 0, Math.min(file.size, 64 * 1024));
  const kind = sniffAudio(head, file.name || "");
  const sliced =
    kind === "wav"
      ? await decodeWavWindow(file, head)
      : kind === "aiff"
        ? await decodeAiffWindow(file, head)
        : kind === "mp3"
          ? await decodeMp3Window(file, head)
          : null;
  if (sliced) return sliced;
  // A format we cannot slice must not go through AudioContext whole. That is
  // what made every club track throw before a level could be stored.
  throw new Error("Could not isolate the energy window in this file");
}

/** Energy Level 1–10 from a stick file (Essentia in a worker). */
export async function analyzeFileEnergy(file: File): Promise<number> {
  const decoded = await decodeEnergyWindow(file);
  const view = decoded.positioned
    ? energyWindowPrefix(decoded.samples, decoded.sampleRate)
    : energyAnalysisWindow(decoded.samples, decoded.sampleRate);
  // Fold 48/96 kHz device output down before the worker. The WASM heap is
  // sized for 45s at 44.1 kHz; a higher rate is what makes every file throw.
  const rated = resampleLinear(view, decoded.sampleRate, ENERGY_ANALYSIS_RATE);
  // Copy the window. Transferring a subarray would pin the whole decoded file.
  const samples = new Float32Array(rated.length);
  samples.set(rated);
  const analysis = await analyzeSamples(samples, ENERGY_ANALYSIS_RATE, "energy");
  if (!Number.isInteger(analysis.energy) || analysis.energy < 1 || analysis.energy > 10) {
    throw new Error("Energy analysis returned no level");
  }
  return analysis.energy;
}
