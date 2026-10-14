// essentia.js is AGPL-3.0. That license applies if this app is distributed.
// Use the web WASM build — the .es.js build pulls Node `fs` and breaks Turbopack.
import Essentia from "essentia.js/dist/essentia.js-core.es.js";
import { loadEssentiaWasm } from "./essentia-wasm";
import { energyFromFeatures, highFrequencyRatio } from "./energy";
import { isLowConfidence, keyLabel, mixesWith, openKeyCode } from "./openKey";
import type { Analysis } from "./types";

type VectorFloat = { delete?: () => void };
type EssentiaModule = {
  arrayToVector(input: Float32Array): VectorFloat;
  KeyExtractor(
    audio: VectorFloat,
    averageDetuningCorrection: boolean,
    frameSize: number,
    hopSize: number,
    hpcpSize: number,
    maxFrequency: number,
    maximumSpectralPeaks: number,
    minFrequency: number,
    pcpThreshold: number,
    profileType: string,
    sampleRate: number,
    spectralPeaksThreshold: number,
    tuningFrequency: number,
    weightType: string,
    windowType: string,
  ): { key: string; scale: string; strength: number };
  PercivalBpmEstimator(
    signal: VectorFloat,
    frameSize: number,
    frameSizeOSS: number,
    hopSize: number,
    hopSizeOSS: number,
    maxBPM: number,
    minBPM: number,
    sampleRate: number,
  ): { bpm: number };
  OnsetRate(signal: VectorFloat): { onsetRate: number; onsets?: VectorFloat };
  Danceability(
    signal: VectorFloat,
    maxTau: number,
    minTau: number,
    sampleRate: number,
    tauMultiplier: number,
  ): { danceability: number; dfa?: VectorFloat };
  DynamicComplexity(
    signal: VectorFloat,
    frameSize: number,
    sampleRate: number,
  ): { dynamicComplexity: number; loudness?: number };
  Resample(
    signal: VectorFloat,
    inputSampleRate: number,
    outputSampleRate: number,
    quality: number,
  ): { signal: VectorFloat };
};

const EssentiaCtor = Essentia as unknown as new (wasm: unknown) => EssentiaModule;
let essentia: EssentiaModule | null = null;
let libraryPromise: Promise<EssentiaModule> | null = null;

async function library(): Promise<EssentiaModule> {
  if (essentia) return essentia;
  libraryPromise ??= (async () => {
    const wasm = await loadEssentiaWasm();
    essentia = new EssentiaCtor(wasm);
    return essentia;
  })();
  return libraryPromise;
}

function release(vector: VectorFloat | null): void {
  try {
    vector?.delete?.();
  } catch {
    // The wasm vector is already gone.
  }
}

/**
 * Energy is the product for SETFORM. Key/BPM are best-effort and must not
 * block energy when Essentia returns an unrecognized key.
 */
async function analyze(samples: Float32Array, sampleRate: number): Promise<Analysis> {
  if (samples.length === 0) throw new Error("This file has no audio to analyze");

  const engine = await library();
  const energy = trackEnergy(engine, samples, sampleRate);

  let keyLabelValue: string | null = null;
  let openKey: string | null = null;
  let strength = 0;
  let uncertain = true;
  let bpm: number | null = null;
  let related: string[] = [];

  const keySignal = engine.arrayToVector(samples);
  const bpmSignal = engine.arrayToVector(samples);
  try {
    try {
      const key = engine.KeyExtractor(
        keySignal,
        true,
        4096,
        4096,
        12,
        3500,
        60,
        25,
        0.2,
        "bgate",
        sampleRate,
        0.0001,
        440,
        "cosine",
        "hann",
      );
      const code = openKeyCode(key.key, key.scale);
      if (code) {
        keyLabelValue = keyLabel(key.key, key.scale);
        openKey = code;
        strength = Number(key.strength);
        uncertain = isLowConfidence(strength);
        related = mixesWith(code);
      }
    } catch {
      // Unrecognized or failed key — energy still stands.
    }
    try {
      const tempo = engine.PercivalBpmEstimator(
        bpmSignal,
        1024,
        2048,
        128,
        128,
        210,
        50,
        sampleRate,
      );
      const value = Number(tempo.bpm);
      bpm = Number.isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : null;
    } catch {
      // BPM is optional for SETFORM energy writes.
    }
  } finally {
    release(keySignal);
    release(bpmSignal);
  }

  return {
    keyLabel: keyLabelValue,
    openKey,
    strength,
    uncertain,
    bpm,
    energy,
    mixesWith: related,
  };
}

function trackEnergy(engine: EssentiaModule, samples: Float32Array, sampleRate: number): number {
  const hfRatio = highFrequencyRatio(samples, sampleRate);
  const rhythm = { onsetsPerSec: 0, danceability: 0, dynamicComplexity: 0 };
  let prepared: PreparedSignal | null = null;
  try {
    prepared = signalAt44100(engine, samples, sampleRate);
    const onsets = engine.OnsetRate(prepared.signal);
    rhythm.onsetsPerSec = finite(onsets.onsetRate);
    release(onsets.onsets ?? null);
    const dance = engine.Danceability(prepared.signal, 8800, 310, 44100, 1.1);
    rhythm.danceability = finite(dance.danceability);
    release(dance.dfa ?? null);
    const dynamics = engine.DynamicComplexity(prepared.signal, 0.2, 44100);
    rhythm.dynamicComplexity = finite(dynamics.dynamicComplexity);
  } catch {
    // A missing rhythm estimate still leaves the spectral ratio.
  } finally {
    prepared?.release();
  }
  return energyFromFeatures({ hfRatio, ...rhythm });
}

type PreparedSignal = {
  signal: VectorFloat;
  release: () => void;
};

function signalAt44100(
  engine: EssentiaModule,
  samples: Float32Array,
  sampleRate: number,
): PreparedSignal {
  const original = engine.arrayToVector(samples);
  if (Math.round(sampleRate) === 44100) {
    return { signal: original, release: () => release(original) };
  }
  try {
    const resampled = engine.Resample(original, sampleRate, 44100, 1).signal;
    return {
      signal: resampled,
      release: () => {
        release(resampled);
        release(original);
      },
    };
  } catch (error) {
    release(original);
    throw error;
  }
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

type WorkerScope = {
  onmessage:
    | ((event: MessageEvent<{ id: number; samples: Float32Array; sampleRate: number }>) => void)
    | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, samples, sampleRate } = event.data;
  void (async () => {
    try {
      scope.postMessage({ id, result: await analyze(samples, sampleRate) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      scope.postMessage({ id, error: message });
    }
  })();
};
