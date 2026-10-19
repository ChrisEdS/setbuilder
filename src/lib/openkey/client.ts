import { energyAnalysisWindow } from "./energy";
import type { Analysis } from "./types";

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

export async function decodeAudio(
  file: File,
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await file.arrayBuffer());
    const samples = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const data = decoded.getChannelData(channel);
      for (let i = 0; i < decoded.length; i++) samples[i] += data[i];
    }
    if (decoded.numberOfChannels > 1) {
      for (let i = 0; i < samples.length; i++) samples[i] /= decoded.numberOfChannels;
    }
    return { samples, sampleRate: decoded.sampleRate };
  } finally {
    await audioContext.close();
  }
}

export async function analyzeFile(file: File): Promise<Analysis> {
  const decoded = await decodeAudio(file);
  return analyzeSamples(decoded.samples, decoded.sampleRate);
}

/** Energy Level 1–10 from a stick file (Essentia in a worker). */
export async function analyzeFileEnergy(file: File): Promise<number> {
  const decoded = await decodeAudio(file);
  const view = energyAnalysisWindow(decoded.samples, decoded.sampleRate);
  // Copy the window. Transferring a subarray would pin the whole decoded file.
  const samples = new Float32Array(view.length);
  samples.set(view);
  const analysis = await analyzeSamples(samples, decoded.sampleRate, "energy");
  if (!Number.isInteger(analysis.energy) || analysis.energy < 1 || analysis.energy > 10) {
    throw new Error("Energy analysis returned no level");
  }
  return analysis.energy;
}
