"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { barJump, shiftBeatTimes, type AnlzBeat, type AnlzPhrase, type PhraseName } from "@/lib/anlz-cues";
import { Tip } from "@/components/Hint";
import type { MessageKey } from "@/lib/i18n/core";
import { useI18n } from "@/lib/i18n/react";
import {
  cueStartMs,
  driftCorrection,
  outgoingStartMs,
  equalPowerGains,
  expectedIncomingMs,
  gridSyncRate,
  joinPlan,
  JOIN_PLAYHEAD,
  JOIN_SEEK_MS,
  JOIN_ZOOM_MAX,
  mixBarsLeft,
  mixClock,
  overlapFromEndDrag,
  phraseAt,
  quantizeSlipMs,
  sharedJoinView,
  slipStartMs,
  syncedIncomingRate,
  syncRate,
  type JoinPlan,
} from "@/lib/join";
import { playedBpm } from "@/lib/pitch";
import { resolveTrackAudio } from "@/lib/stick-file";
import { isPlayableStickAudio } from "@/lib/stick-audio";
import {
  readRememberedBeatGrid,
  readRememberedHotCues,
  readRememberedPhrases,
  readStickBeatGridDetail,
  readStickHotCues,
  readStickPhrases,
  rekordboxTrackId,
} from "@/lib/stick-cues";
import { loadPersistedStickHandle } from "@/lib/stick-session";
import { savedVolumeHandle } from "@/lib/stick-volume-client";
import { loadWaveformBands, readAudioSource } from "@/lib/waveform-load";
import { WAVE_ZOOM_MIN, type WaveformBands } from "@/lib/waveform";
import { cueColor, cueLetter } from "@/lib/set";

export type JoinHandle = {
  toggle: () => void;
  cue: () => void;
  jumpBar: (direction: 1 | -1) => void;
};

type Props = {
  outgoingSrc: string;
  outgoingName: string;
  outgoingId: string;
  outgoingUri?: string;
  outgoingPath: string;
  outgoingDurationMs: number;
  outgoingBpm: string;
  outgoingBeats: readonly AnlzBeat[] | null;
  outgoingPhrases?: readonly AnlzPhrase[] | null;
  outgoingCues?: readonly { slot: number; timeMs: number }[];
  incomingId: string;
  incomingUri?: string;
  incomingName: string;
  incomingPath: string;
  incomingBpm: string;
  incomingCues?: readonly { slot: number; timeMs: number }[];
  stickEpoch: number;
  overlapMs: number;
  onOverlap: (ms: number) => void;
  pitchPercent: number;
  masterTempo: boolean;
  commandRef: RefObject<JoinHandle | null>;
  onPlaying: (playing: boolean) => void;
};

type Armed = {
  outStartMs: number;
  inStartMs: number;
  outRate: number;
  inRate: number;
  overlapMs: number;
};

type ZoomedView = { startMs: number; endMs: number };

type Gesture =
  | { kind: "edge"; x: number; overlap: number; width: number; span: number; moved: boolean }
  | { kind: "slip"; side: "out" | "in"; x: number; start: number; width: number; span: number; moved: boolean };

function holdPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    /* move and up still arrive while the pointer stays over the wave */
  }
}

function releasePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
  const node = event.currentTarget;
  try {
    if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
  } catch {
    /* already released */
  }
}

type JoinGraph = {
  ctx: AudioContext;
  outGain: GainNode;
  inGain: GainNode;
};

/** One graph per pair of elements. Strict mode runs the effect twice on the same nodes. */
const joinGraphs = new WeakMap<HTMLAudioElement, JoinGraph>();
let joinGraphEpoch = 0;

function attachJoinGraph(out: HTMLAudioElement, inn: HTMLAudioElement): JoinGraph | null {
  const existing = joinGraphs.get(out);
  if (existing && joinGraphs.get(inn) === existing) return existing;
  if (joinGraphs.has(out) || joinGraphs.has(inn)) return null;
  const ctx = new AudioContext();
  const outGain = ctx.createGain();
  const inGain = ctx.createGain();
  try {
    ctx.createMediaElementSource(out).connect(outGain).connect(ctx.destination);
    ctx.createMediaElementSource(inn).connect(inGain).connect(ctx.destination);
  } catch {
    void ctx.close();
    return null;
  }
  out.volume = 1;
  inn.volume = 1;
  const graph = { ctx, outGain, inGain };
  joinGraphs.set(out, graph);
  joinGraphs.set(inn, graph);
  return graph;
}

function fileBpm(value: string): number {
  const bpm = Number.parseFloat(value);
  return Number.isFinite(bpm) ? bpm : 0;
}

function prepare(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  // A 0-size box must not be baked into the bitmap. That 1px buffer then
  // stretches over the strip and the orange/blue peaks never cover a pixel.
  if (cssWidth < 8 || cssHeight < 8) return null;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(cssWidth * dpr);
  const height = Math.floor(cssHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return ctx;
}

function drawBeats(
  ctx: CanvasRenderingContext2D,
  beats: readonly AnlzBeat[] | null,
  viewStartMs: number,
  viewEndMs: number,
  width: number,
  height: number,
  face: "top" | "bottom",
) {
  if (!beats?.length || !(viewEndMs > viewStartMs)) return;
  const span = viewEndMs - viewStartMs;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((beats[mid]?.timeMs ?? 0) < viewStartMs) lo = mid + 1;
    else hi = mid;
  }
  const first = beats[0]?.timeMs ?? 0;
  const second = beats[1]?.timeMs ?? first + 500;
  const pixelsPerBeat = (Math.abs(second - first) / span) * width;
  const dpr = window.devicePixelRatio || 1;
  const tick = Math.max(1, dpr);
  const tri = 5 * dpr;
  for (let index = Math.max(0, lo - 1); index < beats.length; index += 1) {
    const beat = beats[index];
    if (!beat || beat.timeMs > viewEndMs) break;
    if (beat.timeMs < viewStartMs) continue;
    const downbeat = beat.beat === 1;
    if (!downbeat && pixelsPerBeat < 6) continue;
    const x = ((beat.timeMs - viewStartMs) / span) * width;
    if (downbeat) {
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x, 0, tick, height);
      ctx.beginPath();
      if (face === "top") {
        ctx.moveTo(x - tri, 0);
        ctx.lineTo(x + tri, 0);
        ctx.lineTo(x, tri);
      } else {
        ctx.moveTo(x - tri, height);
        ctx.lineTo(x + tri, height);
        ctx.lineTo(x, height - tri);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(x, 0, tick, height);
    }
  }
}

function downbeatXs(
  beats: readonly AnlzBeat[] | null,
  view: ZoomedView,
  width: number,
): number[] {
  if (!beats?.length || !(view.endMs > view.startMs) || !(width > 0)) return [];
  const span = view.endMs - view.startMs;
  const xs: number[] = [];
  for (const beat of beats) {
    if (beat.beat !== 1) continue;
    if (beat.timeMs < view.startMs || beat.timeMs > view.endMs) continue;
    xs.push(((beat.timeMs - view.startMs) / span) * width);
  }
  return xs;
}

function drawChain(
  canvas: HTMLCanvasElement,
  outBeats: readonly AnlzBeat[] | null,
  inBeats: readonly AnlzBeat[] | null,
  outView: ZoomedView,
  inView: ZoomedView,
) {
  const ctx = prepare(canvas);
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const outXs = downbeatXs(outBeats, outView, width);
  const inXs = downbeatXs(inBeats, inView, width);
  if (!outXs.length || !inXs.length) return;
  for (const outX of outXs) {
    let best = inXs[0] ?? outX;
    let dist = Math.abs(best - outX);
    for (const inX of inXs) {
      const gap = Math.abs(inX - outX);
      if (gap < dist) {
        best = inX;
        dist = gap;
      }
    }
    const locked = dist <= Math.max(2, width * 0.008);
    ctx.strokeStyle = locked ? "rgba(239,68,68,0.88)" : "rgba(248,113,113,0.45)";
    ctx.lineWidth = locked ? Math.max(1.5, width / 400) : Math.max(1, width / 500);
    ctx.beginPath();
    ctx.moveTo(outX, 0);
    ctx.lineTo(best, height);
    ctx.stroke();
  }
}

function drawWindow(
  canvas: HTMLCanvasElement,
  bands: WaveformBands | null,
  durationMs: number,
  viewStartMs: number,
  viewEndMs: number,
  beats?: readonly AnlzBeat[] | null,
  face: "top" | "bottom" = "top",
) {
  const ctx = prepare(canvas);
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, width, height);
  const span = viewEndMs - viewStartMs;
  if (bands && bands.low.length > 0 && durationMs > 0 && span > 0) {
    const count = bands.low.length;
    let loudest = 0.2;
    for (let index = 0; index < count; index += 1) {
      loudest = Math.max(loudest, bands.low[index] ?? 0, bands.mid[index] ?? 0, bands.high[index] ?? 0);
    }
    const gain = Math.min(3, 0.92 / loudest);
    const from = (viewStartMs / durationMs) * count;
    const covered = Math.max((span / durationMs) * count, 1 / width);
    const mid = height / 2;
    const room = (height / 2) * 0.78;
    for (let x = 0; x < width; x += 1) {
      const start = Math.floor(from + (x / width) * covered);
      const end = Math.max(start + 1, Math.ceil(from + ((x + 1) / width) * covered));
      let low = 0;
      let body = 0;
      let high = 0;
      for (let index = Math.max(0, start); index < end && index < count; index += 1) {
        low = Math.max(low, bands.low[index] ?? 0);
        body = Math.max(body, bands.mid[index] ?? 0);
        high = Math.max(high, bands.high[index] ?? 0);
      }
      const lowH = Math.min(room, low * gain * room);
      const midH = Math.min(room, body * gain * room);
      const highH = Math.min(room, high * gain * room);
      if (lowH >= 0.5) {
        ctx.fillStyle = "#f97316";
        ctx.fillRect(x, mid - lowH, 1, Math.max(1, lowH * 2));
      }
      if (midH >= 0.5) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(x, mid - midH, 1, Math.max(1, midH * 2));
      }
      if (highH >= 0.5) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillRect(x, mid - highH, 1, Math.max(1, highH * 2));
      }
    }
  }
  if (beats) drawBeats(ctx, beats, viewStartMs, viewEndMs, width, height, face);
}

function shadeStyle(startFraction: number, endFraction: number): CSSProperties | null {
  const start = Math.max(0, Math.min(1, startFraction));
  const end = Math.max(0, Math.min(1, endFraction));
  if (!(end > start) || !(end > JOIN_PLAYHEAD - 0.001)) return null;
  return { left: `${start * 100}%`, width: `${(end - start) * 100}%` };
}

function fractionOf(timeMs: number, view: ZoomedView): number {
  const span = view.endMs - view.startMs;
  if (!(span > 0)) return 0;
  return (timeMs - view.startMs) / span;
}

function placeOverlay(node: HTMLElement | null, left: number | null, width?: number) {
  if (!node) return;
  if (left == null) {
    node.style.display = "none";
    return;
  }
  node.style.display = "";
  node.style.left = `${left * 100}%`;
  if (width != null) node.style.width = `${Math.max(0, width) * 100}%`;
}

function markStyle(startMs: number, durationMs: number): CSSProperties {
  const left = durationMs > 0 ? (startMs / durationMs) * 100 : 0;
  return { left: `${Math.min(100, Math.max(0, left))}%` };
}

function windowStyle(view: ZoomedView, durationMs: number): CSSProperties {
  const left = durationMs > 0 ? Math.max(0, view.startMs / durationMs) : 0;
  const right = durationMs > 0 ? Math.min(1, view.endMs / durationMs) : 0;
  return { left: `${left * 100}%`, width: `${Math.max(0.4, (right - left) * 100)}%` };
}

function cueTone(slot: number): CSSProperties {
  return { ["--cue-color"]: cueColor(slot) } as CSSProperties;
}

function WaveCues({
  cues,
  view,
  activeMs,
  onJump,
  label,
  tip,
}: {
  cues?: readonly { slot: number; timeMs: number }[];
  view: ZoomedView;
  activeMs: number | null;
  onJump: (timeMs: number) => void;
  label: (letter: string) => string;
  tip: string;
}) {
  const marks = (cues ?? [])
    .filter((cue) => Number.isFinite(cue.timeMs))
    .slice()
    .sort((a, b) => a.slot - b.slot);
  if (!marks.length) return null;
  const span = view.endMs - view.startMs;
  return (
    <>
      {marks.map((cue) => {
        const letter = cueLetter(cue.slot);
        const pressed = activeMs != null && Math.abs(activeMs - cue.timeMs) < 1;
        const left = span > 0 ? ((cue.timeMs - view.startMs) / span) * 100 : 0;
        const hidden = span > 0 && (cue.timeMs < view.startMs || cue.timeMs > view.endMs);
        return (
          <button
            key={cue.slot}
            type="button"
            className="preview-cue-mark"
            aria-pressed={pressed}
            aria-label={label(letter)}
            title={tip}
            data-time-ms={String(cue.timeMs)}
            style={{ left: `${left}%`, display: hidden ? "none" : undefined, ...cueTone(cue.slot) }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onJump(cue.timeMs);
            }}
          >
            <i />
            <em>
              <span>{letter}</span>
            </em>
          </button>
        );
      })}
    </>
  );
}

function placeWaveCues(root: HTMLElement | null, view: ZoomedView) {
  if (!root) return;
  for (const node of root.querySelectorAll<HTMLElement>("[data-time-ms]")) {
    const time = Number(node.dataset.timeMs);
    if (!Number.isFinite(time)) continue;
    const frac = fractionOf(time, view);
    if (frac < 0 || frac > 1) {
      node.style.display = "none";
    } else {
      node.style.display = "";
      node.style.left = `${frac * 100}%`;
    }
  }
}

function OverviewCues({
  cues,
  durationMs,
  activeMs,
  onJump,
  label,
  tip,
}: {
  cues?: readonly { slot: number; timeMs: number }[];
  durationMs: number;
  activeMs: number | null;
  onJump: (timeMs: number) => void;
  label: (letter: string) => string;
  tip: string;
}) {
  if (!(durationMs > 0)) return null;
  const marks = (cues ?? [])
    .filter((cue) => Number.isFinite(cue.timeMs))
    .slice()
    .sort((a, b) => a.slot - b.slot);
  if (!marks.length) return null;
  return (
    <>
      {marks.map((cue) => {
        const letter = cueLetter(cue.slot);
        const pressed = activeMs != null && Math.abs(activeMs - cue.timeMs) < 1;
        const left = Math.min(100, Math.max(0, (cue.timeMs / durationMs) * 100));
        return (
          <button
            key={cue.slot}
            type="button"
            className="preview-join-cue"
            aria-pressed={pressed}
            aria-label={label(letter)}
            title={tip}
            data-letter={letter}
            style={{ left: `${left}%`, "--cue": cueColor(cue.slot) } as CSSProperties}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onJump(cue.timeMs);
            }}
          >
            {letter}
          </button>
        );
      })}
    </>
  );
}

const PHRASE_KEY: Record<PhraseName, MessageKey> = {
  intro: "crates.player.phrase.intro",
  intro1: "crates.player.phrase.intro1",
  intro2: "crates.player.phrase.intro2",
  up1: "crates.player.phrase.up1",
  up2: "crates.player.phrase.up2",
  up3: "crates.player.phrase.up3",
  down: "crates.player.phrase.down",
  chorus: "crates.player.phrase.chorus",
  chorus1: "crates.player.phrase.chorus1",
  chorus2: "crates.player.phrase.chorus2",
  outro: "crates.player.phrase.outro",
  outro1: "crates.player.phrase.outro1",
  outro2: "crates.player.phrase.outro2",
  verse1: "crates.player.phrase.verse1",
  verse2: "crates.player.phrase.verse2",
  verse3: "crates.player.phrase.verse3",
  verse4: "crates.player.phrase.verse4",
  verse5: "crates.player.phrase.verse5",
  verse6: "crates.player.phrase.verse6",
  bridge: "crates.player.phrase.bridge",
};

const PHRASE_COLOR: Record<PhraseName, string> = {
  intro: "#3e76b3",
  intro1: "#326394",
  intro2: "#5c94c8",
  up1: "#c47a3c",
  up2: "#a8642c",
  up3: "#d4965e",
  down: "#9eb33a",
  chorus: "#c44e76",
  chorus1: "#d47894",
  chorus2: "#a43c60",
  outro: "#6e59b2",
  outro1: "#8a78c4",
  outro2: "#6454a4",
  verse1: "#4a9a6c",
  verse2: "#3d8860",
  verse3: "#347854",
  verse4: "#62b084",
  verse5: "#2c6848",
  verse6: "#7ec49e",
  bridge: "#3c8498",
};

async function loadStickGrid(
  id: string,
  uri: string | undefined,
  filePath: string,
): Promise<{ beats: AnlzBeat[] | null; phrases: AnlzPhrase[] | null }> {
  const pdbId = rekordboxTrackId({ id, uri }) ?? 0;
  let beats: AnlzBeat[] | null = await readRememberedBeatGrid(pdbId, filePath).catch(() => null);
  const root = savedVolumeHandle() ?? (await loadPersistedStickHandle().catch(() => null));
  if (!beats?.length && root) {
    const read = await readStickBeatGridDetail(root, pdbId, filePath).catch(() => null);
    if (read?.beats?.length) beats = read.beats;
  }
  let phrases: AnlzPhrase[] | null = null;
  if (beats?.length) {
    phrases = await readRememberedPhrases(pdbId, beats, filePath).catch(() => null);
    if (!phrases && root) {
      phrases = await readStickPhrases(root, pdbId, beats, filePath).catch(() => null);
    }
  }
  return { beats: beats?.length ? beats : null, phrases };
}

function phraseBox(phrase: AnlzPhrase, durationMs: number): CSSProperties | null {
  if (!(durationMs > 0)) return null;
  const left = Math.max(0, phrase.timeMs / durationMs);
  const right = Math.min(1, phrase.endMs / durationMs);
  if (!(right > left)) return null;
  return { left: `${left * 100}%`, width: `${Math.max(0.3, (right - left) * 100)}%`, background: PHRASE_COLOR[phrase.name] };
}

export function JoinDeck({
  outgoingSrc,
  outgoingName,
  outgoingId,
  outgoingUri,
  outgoingPath,
  outgoingDurationMs,
  outgoingBpm,
  outgoingBeats,
  outgoingPhrases,
  outgoingCues,
  incomingId,
  incomingUri,
  incomingName,
  incomingPath,
  incomingBpm,
  incomingCues,
  stickEpoch,
  overlapMs,
  onOverlap,
  pitchPercent,
  masterTempo,
  commandRef,
  onPlaying,
}: Props) {
  const { t } = useI18n();
  const outRef = useRef<HTMLAudioElement | null>(null);
  const inRef = useRef<HTMLAudioElement | null>(null);
  const outCanvas = useRef<HTMLCanvasElement | null>(null);
  const inCanvas = useRef<HTMLCanvasElement | null>(null);
  const armed = useRef<Armed | null>(null);
  const graphRef = useRef<JoinGraph | null>(null);
  const planRef = useRef<JoinPlan | null>(null);
  const onPlayingRef = useRef(onPlaying);
  const muteOut = useRef(false);
  const muteIn = useRef(false);
  const readyIn = useRef(false);
  const syncing = useRef(false);
  const crossRef = useRef(0);
  const zoomRef = useRef(1);
  const gesture = useRef<Gesture | null>(null);
  const outOverview = useRef<HTMLCanvasElement | null>(null);
  const inOverview = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const outShadeRef = useRef<HTMLSpanElement | null>(null);
  const inShadeRef = useRef<HTMLSpanElement | null>(null);
  const outEndRef = useRef<HTMLSpanElement | null>(null);
  const outMarkRef = useRef<HTMLSpanElement | null>(null);
  const inMarkRef = useRef<HTMLSpanElement | null>(null);
  const outWindowRef = useRef<HTMLSpanElement | null>(null);
  const inWindowRef = useRef<HTMLSpanElement | null>(null);
  const outWaveRef = useRef<HTMLDivElement | null>(null);
  const inWaveRef = useRef<HTMLDivElement | null>(null);
  const chainCanvas = useRef<HTMLCanvasElement | null>(null);
  const barsRef = useRef<HTMLSpanElement | null>(null);
  const phraseRef = useRef<HTMLSpanElement | null>(null);
  const crossInputRef = useRef<HTMLInputElement | null>(null);
  const crossHeld = useRef(false);
  const outBeatsRef = useRef(outgoingBeats);
  const inBeatsRef = useRef<readonly AnlzBeat[] | null>(null);
  const outPhrasesRef = useRef(outgoingPhrases ?? null);
  const inPhrasesRef = useRef<readonly AnlzPhrase[] | null>(null);
  const wallOverlapRef = useRef(0);
  const heardRef = useRef(0);
  const outPlayedRef = useRef<number | null>(null);
  const tRef = useRef(t);
  const [incomingSrc, setIncomingSrc] = useState<string | null>(null);
  const [incomingIssue, setIncomingIssue] = useState(false);
  const [incomingBeats, setIncomingBeats] = useState<AnlzBeat[] | null>(null);
  const [incomingPhrases, setIncomingPhrases] = useState<AnlzPhrase[] | null>(null);
  const [localOutBeats, setLocalOutBeats] = useState<AnlzBeat[] | null>(null);
  const [localOutPhrases, setLocalOutPhrases] = useState<AnlzPhrase[] | null>(null);
  const outGrid = outgoingBeats?.length ? outgoingBeats : localOutBeats;
  const outPhraseList = outgoingPhrases?.length ? outgoingPhrases : localOutPhrases;
  const [outBands, setOutBands] = useState<WaveformBands | null>(null);
  const [inBands, setInBands] = useState<WaveformBands | null>(null);
  const [sync, setSync] = useState(true);
  const [inCueMs, setInCueMs] = useState<number | null>(null);
  const [outCueMs, setOutCueMs] = useState<number | null>(null);
  const [inFree, setInFree] = useState(false);
  const [cross, setCross] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [cueTrack, setCueTrack] = useState(incomingId);
  if (cueTrack !== incomingId) {
    setCueTrack(incomingId);
    setInCueMs(null);
    setOutCueMs(null);
    setInFree(false);
    setZoom(1);
  }
  const [outMuted, setOutMuted] = useState(false);
  const [inMuted, setInMuted] = useState(false);
  const [incomingDurationMs, setIncomingDurationMs] = useState(0);
  const [stickInCues, setStickInCues] = useState<readonly { slot: number; timeMs: number }[] | null>(null);
  const [stickOutCues, setStickOutCues] = useState<readonly { slot: number; timeMs: number }[] | null>(null);

  const outBpm = fileBpm(outgoingBpm);
  const inBpm = fileBpm(incomingBpm);
  const canSync =
    syncRate(outBpm, pitchPercent, inBpm) != null ||
    gridSyncRate(outGrid, incomingBeats, 0, 0, outBpm, inBpm, pitchPercent) != null;
  const shownInCues = incomingCues?.length ? incomingCues : (stickInCues ?? undefined);
  const shownOutCues = outgoingCues?.length ? outgoingCues : (stickOutCues ?? undefined);
  const chosenIn = inCueMs ?? cueStartMs(shownInCues);
  const plan = joinPlan({
    outgoingDurationMs,
    overlapMs,
    incomingCueMs: chosenIn,
    outgoingAnchorMs: outCueMs,
    outgoingBpm: outBpm,
    incomingBpm: inBpm,
    pitchPercent,
    sync: sync && canSync,
    incomingLocked: inFree,
    outgoingBeats: outGrid,
    incomingBeats,
    outgoingPhrases: outPhraseList,
    incomingPhrases,
  });
  const heardMs = Math.max(0, plan.outViewEndMs - plan.outStartMs);
  const wallOverlap = plan.outRate > 0 ? heardMs / plan.outRate : heardMs;
  const outView = sharedJoinView(plan.outStartMs, plan.outRate, wallOverlap, zoom);
  const inView = sharedJoinView(plan.inStartMs, plan.inRate, wallOverlap, zoom);
  const outSpan = outView.endMs - outView.startMs;
  const inSpan = inView.endMs - inView.startMs;
  const outEndFraction = outSpan > 0 ? (plan.outStartMs + heardMs - outView.startMs) / outSpan : 1;
  const inEndFraction = inSpan > 0 ? (plan.inStartMs + wallOverlap * plan.inRate - inView.startMs) / inSpan : 1;
  const outBandsRef = useRef(outBands);
  const inBandsRef = useRef(inBands);
  const viewRef = useRef({ out: outView, inn: inView });
  useEffect(() => {
    onPlayingRef.current = onPlaying;
    muteOut.current = outMuted;
    muteIn.current = inMuted;
    readyIn.current = Boolean(incomingSrc);
    planRef.current = plan;
    syncing.current = sync && canSync;
    crossRef.current = cross;
    zoomRef.current = zoom;
    viewRef.current = { out: outView, inn: inView };
    outBandsRef.current = outBands;
    inBandsRef.current = inBands;
    outBeatsRef.current = outGrid;
    inBeatsRef.current = incomingBeats;
    outPhrasesRef.current = outPhraseList ?? null;
    inPhrasesRef.current = incomingPhrases;
    wallOverlapRef.current = wallOverlap;
    heardRef.current = heardMs;
    outPlayedRef.current = playedBpm(outBpm, pitchPercent);
    tRef.current = t;
  });

  useEffect(() => {
    const out = outRef.current;
    const inn = inRef.current;
    if (!out || !inn) return;
    const graph = attachJoinGraph(out, inn);
    const epoch = ++joinGraphEpoch;
    graphRef.current = graph;
    return () => {
      graphRef.current = null;
      window.setTimeout(() => {
        if (epoch !== joinGraphEpoch || !graph) return;
        void graph.ctx.close();
        joinGraphs.delete(out);
        joinGraphs.delete(inn);
      }, 0);
    };
  }, []);

  useEffect(() => {
    const out = outRef.current;
    if (!out || !outgoingSrc) return;
    out.src = outgoingSrc;
    out.load();
  }, [outgoingSrc]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const resolved = await resolveTrackAudio(incomingPath);
        if (cancelled) return;
        if (!resolved) {
          setIncomingIssue(true);
          setIncomingSrc(null);
          return;
        }
        const path = resolved.relativePath || resolved.file.name || incomingPath;
        if (!isPlayableStickAudio(path) && !isPlayableStickAudio(resolved.file.name)) {
          setIncomingIssue(true);
          setIncomingSrc(null);
          return;
        }
        objectUrl = URL.createObjectURL(resolved.file);
        setIncomingIssue(false);
        setIncomingSrc(objectUrl);
      } catch {
        if (!cancelled) setIncomingIssue(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [incomingPath, stickEpoch]);

  useEffect(() => {
    const inn = inRef.current;
    if (!inn || !incomingSrc) return;
    inn.src = incomingSrc;
    inn.load();
  }, [incomingSrc]);

  useEffect(() => {
    let cancel = false;
    void loadStickGrid(incomingId, incomingUri, incomingPath).then(({ beats, phrases }) => {
      if (cancel) return;
      setIncomingBeats(beats);
      setIncomingPhrases(phrases);
    });
    return () => {
      cancel = true;
    };
  }, [incomingId, incomingUri, incomingPath, stickEpoch]);

  useEffect(() => {
    if (outgoingBeats?.length) return;
    let cancel = false;
    void loadStickGrid(outgoingId, outgoingUri, outgoingPath).then(({ beats, phrases }) => {
      if (cancel) return;
      setLocalOutBeats(beats);
      setLocalOutPhrases(phrases);
    });
    return () => {
      cancel = true;
    };
  }, [outgoingBeats, outgoingId, outgoingUri, outgoingPath, stickEpoch]);

  useEffect(() => {
    if (incomingCues?.length) return;
    let cancel = false;
    const pdbId = rekordboxTrackId({ id: incomingId, uri: incomingUri }) ?? 0;
    void (async () => {
      try {
        const volume = savedVolumeHandle();
        let found: Awaited<ReturnType<typeof readStickHotCues>> = null;
        if (volume) found = await readStickHotCues(volume, pdbId, incomingPath).catch(() => null);
        if (!found?.length) {
          const persisted = await loadPersistedStickHandle().catch(() => null);
          if (persisted && persisted !== volume) {
            found = await readStickHotCues(persisted, pdbId, incomingPath).catch(() => null);
          }
        }
        if (!found?.length) found = await readRememberedHotCues(pdbId, incomingPath).catch(() => null);
        if (!cancel) setStickInCues(found ?? []);
      } catch {
        if (!cancel) setStickInCues([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [incomingCues, incomingId, incomingUri, incomingPath, stickEpoch]);

  useEffect(() => {
    if (outgoingCues?.length) return;
    let cancel = false;
    const pdbId = rekordboxTrackId({ id: outgoingId, uri: outgoingUri }) ?? 0;
    void (async () => {
      try {
        const volume = savedVolumeHandle();
        let found: Awaited<ReturnType<typeof readStickHotCues>> = null;
        if (volume) found = await readStickHotCues(volume, pdbId, outgoingPath).catch(() => null);
        if (!found?.length) {
          const persisted = await loadPersistedStickHandle().catch(() => null);
          if (persisted && persisted !== volume) {
            found = await readStickHotCues(persisted, pdbId, outgoingPath).catch(() => null);
          }
        }
        if (!found?.length) found = await readRememberedHotCues(pdbId, outgoingPath).catch(() => null);
        if (!cancel) setStickOutCues(found ?? []);
      } catch {
        if (!cancel) setStickOutCues([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [outgoingCues, outgoingId, outgoingUri, outgoingPath, stickEpoch]);

  useEffect(() => {
    const audio = outRef.current;
    const inn = inRef.current;
    if (audio) {
      audio.playbackRate = plan.outRate;
      if ("preservesPitch" in audio) audio.preservesPitch = masterTempo;
    }
    if (inn && !armed.current) {
      inn.playbackRate = plan.inRate;
      if ("preservesPitch" in inn) inn.preservesPitch = masterTempo;
    }
  }, [plan.outRate, plan.inRate, masterTempo]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const out = outRef.current;
      const inn = inRef.current;
      const running = armed.current;
      const current = planRef.current;
      const wall = wallOverlapRef.current;
      const zoomNow = zoomRef.current;
      let nowOut = current?.outStartMs ?? 0;
      let nowIn = current?.inStartMs ?? 0;
      if (out && inn && running) {
        const elapsed = (out.currentTime * 1000 - running.outStartMs) / running.outRate;
        const span = running.overlapMs / running.outRate;
        const expected = expectedIncomingMs(running.inStartMs, Math.max(0, elapsed), running.inRate);
        nowOut = running.outStartMs + Math.max(0, elapsed) * running.outRate;
        nowIn = expected;
        viewRef.current = {
          out: sharedJoinView(nowOut, running.outRate, wall, zoomNow),
          inn: sharedJoinView(nowIn, running.inRate, wall, zoomNow),
        };
        if (!out.paused) {
          const progress = span > 0 ? Math.min(1, Math.max(0, elapsed / span)) : 0;
          const mix = crossHeld.current ? crossRef.current : progress;
          if (!crossHeld.current && crossInputRef.current) {
            crossInputRef.current.value = String(mix);
            crossRef.current = mix;
          }
          const gains = equalPowerGains(mix);
          const graph = graphRef.current;
          if (graph) {
            graph.outGain.gain.value = muteOut.current ? 0 : gains.outgoing;
            graph.inGain.gain.value = muteIn.current ? 0 : gains.incoming;
          }
          const actual = inn.currentTime * 1000;
          if (syncing.current && !inn.paused) {
            const corrected = driftCorrection(actual, expected);
            if (corrected != null) inn.currentTime = corrected / 1000;
          }
          const drift = expected - inn.currentTime * 1000;
          inn.playbackRate = syncedIncomingRate(running.inRate, syncing.current ? drift : 0, 0);
          if (span > 0 && elapsed >= span) {
            out.pause();
            inn.pause();
            armed.current = null;
            onPlayingRef.current(false);
          }
        }
      } else if (current) {
        nowOut = current.outStartMs;
        nowIn = current.inStartMs;
        viewRef.current = {
          out: sharedJoinView(current.outStartMs, current.outRate, wall, zoomNow),
          inn: sharedJoinView(current.inStartMs, current.inRate, wall, zoomNow),
        };
      }
      const shown = viewRef.current;
      const outCanvasNode = outCanvas.current;
      const inCanvasNode = inCanvas.current;
      if (current && outCanvasNode) {
        drawWindow(
          outCanvasNode,
          outBandsRef.current,
          outgoingDurationMs,
          shown.out.startMs,
          shown.out.endMs,
          outBeatsRef.current,
          "bottom",
        );
      }
      if (current && inCanvasNode) {
        drawWindow(
          inCanvasNode,
          inBandsRef.current,
          incomingDurationMs,
          shown.inn.startMs,
          shown.inn.endMs,
          inBeatsRef.current,
          "top",
        );
      }
      placeWaveCues(outWaveRef.current, shown.out);
      placeWaveCues(inWaveRef.current, shown.inn);
      const chainNode = chainCanvas.current;
      if (chainNode) drawChain(chainNode, outBeatsRef.current, inBeatsRef.current, shown.out, shown.inn);
      const remainWall = running
        ? Math.max(0, running.overlapMs / running.outRate - Math.max(0, (nowOut - running.outStartMs) / running.outRate))
        : wall;
      const barsBpm = outPlayedRef.current ?? 0;
      if (barsRef.current && barsBpm > 0) {
        barsRef.current.textContent = `${mixBarsLeft(remainWall, barsBpm)} · ${mixClock(remainWall)}`;
      }
      const outPhrase = phraseAt(outPhrasesRef.current, nowOut);
      const inPhrase = phraseAt(inPhrasesRef.current, nowIn);
      if (phraseRef.current) {
        if (outPhrase && inPhrase) {
          const left = mixBarsLeft(Math.max(0, outPhrase.endMs - nowOut), barsBpm);
          const tr = tRef.current;
          phraseRef.current.textContent = tr("crates.player.joinPhrase", {
            outgoing: tr(PHRASE_KEY[outPhrase.name]),
            bars: String(left),
            incoming: tr(PHRASE_KEY[inPhrase.name]),
          });
          phraseRef.current.style.display = "";
        } else {
          phraseRef.current.style.display = "none";
        }
      }
      const mixOutEnd = current ? current.outStartMs + heardRef.current : 0;
      const mixInEnd = current ? current.inStartMs + wall * (current.inRate || 1) : 0;
      const outStartFrac = fractionOf(current?.outStartMs ?? 0, shown.out);
      const outEndFrac = fractionOf(mixOutEnd, shown.out);
      const inStartFrac = fractionOf(current?.inStartMs ?? 0, shown.inn);
      const inEndFrac = fractionOf(mixInEnd, shown.inn);
      const outShade = shadeStyle(outStartFrac, outEndFrac);
      const inShade = shadeStyle(inStartFrac, inEndFrac);
      if (outShade) {
        placeOverlay(outShadeRef.current, Number.parseFloat(String(outShade.left)) / 100, Number.parseFloat(String(outShade.width)) / 100);
      } else placeOverlay(outShadeRef.current, null);
      if (inShade) {
        placeOverlay(inShadeRef.current, Number.parseFloat(String(inShade.left)) / 100, Number.parseFloat(String(inShade.width)) / 100);
      } else placeOverlay(inShadeRef.current, null);
      placeOverlay(
        outEndRef.current,
        outEndFrac > JOIN_PLAYHEAD && outEndFrac <= 1 ? outEndFrac : null,
      );
      if (outgoingDurationMs > 0) placeOverlay(outMarkRef.current, Math.min(1, Math.max(0, nowOut / outgoingDurationMs)));
      if (incomingDurationMs > 0) placeOverlay(inMarkRef.current, Math.min(1, Math.max(0, nowIn / incomingDurationMs)));
      if (zoomNow > 1.05) {
        const outLeft = outgoingDurationMs > 0 ? Math.max(0, shown.out.startMs / outgoingDurationMs) : 0;
        const outRight = outgoingDurationMs > 0 ? Math.min(1, shown.out.endMs / outgoingDurationMs) : 0;
        const inLeft = incomingDurationMs > 0 ? Math.max(0, shown.inn.startMs / incomingDurationMs) : 0;
        const inRight = incomingDurationMs > 0 ? Math.min(1, shown.inn.endMs / incomingDurationMs) : 0;
        placeOverlay(outWindowRef.current, outLeft, Math.max(0.004, outRight - outLeft));
        placeOverlay(inWindowRef.current, inLeft, Math.max(0.004, inRight - inLeft));
      } else {
        placeOverlay(outWindowRef.current, null);
        placeOverlay(inWindowRef.current, null);
      }
      const outOverviewNode = outOverview.current;
      const inOverviewNode = inOverview.current;
      if (outOverviewNode) {
        drawWindow(outOverviewNode, outBandsRef.current, outgoingDurationMs, 0, outgoingDurationMs);
      }
      if (inOverviewNode && incomingDurationMs > 0) {
        drawWindow(inOverviewNode, inBandsRef.current, incomingDurationMs, 0, incomingDurationMs);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [incomingDurationMs, outgoingDurationMs]);

  useEffect(() => {
    const out = outRef.current;
    const inn = inRef.current;
    return () => {
      out?.pause();
      inn?.pause();
      onPlayingRef.current(false);
    };
  }, []);

  useEffect(() => {
    if (!outgoingSrc) return;
    let cancel = false;
    void loadWaveformBands(outgoingSrc, () => readAudioSource(outgoingSrc)).then((loaded) => {
      if (cancel || !loaded) return;
      outBandsRef.current = loaded.bands;
      setOutBands(loaded.bands);
    });
    return () => {
      cancel = true;
    };
  }, [outgoingSrc]);

  useEffect(() => {
    if (!incomingSrc) return;
    let cancel = false;
    void loadWaveformBands(incomingSrc, () => readAudioSource(incomingSrc)).then((loaded) => {
      if (cancel || !loaded) return;
      inBandsRef.current = loaded.bands;
      setIncomingDurationMs((current) => (current > 0 ? current : loaded.durationMs));
      setInBands(loaded.bands);
    });
    return () => {
      cancel = true;
    };
  }, [incomingSrc]);

  const toggle = useCallback(() => {
    const out = outRef.current;
    const inn = inRef.current;
    const current = planRef.current;
    if (!out || !inn || !current || !readyIn.current) return;
    if (!out.paused) {
      out.pause();
      inn.pause();
      onPlayingRef.current(false);
      return;
    }
    const resume = armed.current;
    void (async () => {
      const graph = graphRef.current;
      if (graph?.ctx.state === "suspended") await graph.ctx.resume();
      out.playbackRate = current.outRate;
      inn.playbackRate = current.inRate;
      if ("preservesPitch" in out) out.preservesPitch = masterTempo;
      if ("preservesPitch" in inn) inn.preservesPitch = masterTempo;
      if (!resume) {
        if (!(heardRef.current > 0) && !(overlapMs > 0)) return;
        out.currentTime = current.outStartMs / 1000;
        inn.currentTime = current.inStartMs / 1000;
        armed.current = {
          outStartMs: current.outStartMs,
          inStartMs: current.inStartMs,
          outRate: current.outRate,
          inRate: current.inRate,
          overlapMs: heardRef.current > 0 ? heardRef.current : overlapMs,
        };
      }
      const graphNow = graphRef.current;
      if (graphNow) {
        const mix = equalPowerGains(crossHeld.current ? crossRef.current : 0);
        graphNow.outGain.gain.value = muteOut.current ? 0 : mix.outgoing;
        graphNow.inGain.gain.value = muteIn.current ? 0 : mix.incoming;
      }
      try {
        await Promise.all([out.play(), inn.play()]);
        onPlayingRef.current(true);
      } catch {
        if (!resume) armed.current = null;
        onPlayingRef.current(false);
      }
    })();
  }, [masterTempo, overlapMs]);

  const releaseFader = useCallback(() => {
    crossHeld.current = false;
    crossRef.current = 0;
    setCross(0);
    if (crossInputRef.current) crossInputRef.current.value = "0";
  }, []);

  const cuePress = useCallback(() => {
    const out = outRef.current;
    const inn = inRef.current;
    const current = planRef.current;
    if (!out || !inn || !current) return;
    if (!out.paused) {
      out.pause();
      inn.pause();
      out.currentTime = current.outStartMs / 1000;
      inn.currentTime = current.inStartMs / 1000;
      armed.current = null;
      releaseFader();
      onPlayingRef.current(false);
      return;
    }
    const running = armed.current;
    const nowOut = out.currentTime * 1000;
    const startOut = running ? running.outStartMs : current.outStartMs;
    if (Math.abs(nowOut - startOut) <= JOIN_SEEK_MS) return;
    const nowIn = inn.currentTime * 1000;
    armed.current = null;
    setOutCueMs(nowOut);
    setInFree(true);
    setInCueMs(nowIn);
  }, [releaseFader]);

  const nudgeIncomingGrid = useCallback((deltaMs: number) => {
    setIncomingBeats((beats) => {
      if (!beats?.length) return beats;
      return shiftBeatTimes(beats, deltaMs) ?? beats;
    });
  }, []);

  const jumpBar = useCallback((direction: 1 | -1) => {
    const out = outRef.current;
    const inn = inRef.current;
    const current = planRef.current;
    if (!out || !inn || !current) return;
    const running = armed.current;
    const nowOut = running ? out.currentTime * 1000 : current.outStartMs;
    const nowIn = running ? inn.currentTime * 1000 : current.inStartMs;
    const nextOut = barJump(nowOut, outgoingDurationMs, outBeatsRef.current ?? [], direction);
    const nextIn = barJump(nowIn, incomingDurationMs, inBeatsRef.current ?? [], direction);
    if (running) {
      out.currentTime = nextOut / 1000;
      inn.currentTime = nextIn / 1000;
      return;
    }
    setOutCueMs(nextOut);
    setInFree(true);
    setInCueMs(nextIn);
  }, [incomingDurationMs, outgoingDurationMs]);

  useImperativeHandle(commandRef, () => ({ toggle, cue: cuePress, jumpBar }), [toggle, cuePress, jumpBar]);

  function durationOf(side: "out" | "in"): number {
    return side === "out" ? outgoingDurationMs : incomingDurationMs;
  }

  function seekSide(side: "out" | "in", timeMs: number) {
    const running = armed.current;
    const node = side === "out" ? outRef.current : inRef.current;
    if (!node) return;
    node.currentTime = Math.max(0, timeMs) / 1000;
    if (running) {
      armed.current = side === "out" ? { ...running, outStartMs: timeMs } : { ...running, inStartMs: timeMs };
    }
  }

  function placeStart(side: "out" | "in", timeMs: number, snap = false) {
    let next = slipStartMs(timeMs, 0, 1, 0, durationOf(side));
    if (snap && syncing.current) {
      const bpm = side === "out" ? outBpm : inBpm;
      const beats = side === "out" ? outBeatsRef.current : inBeatsRef.current;
      next = quantizeSlipMs(next, beats, bpm, durationOf(side));
    }
    if (side === "out") setOutCueMs(next);
    else {
      setInFree(true);
      setInCueMs(next);
    }
    seekSide(side, next);
  }

  function jumpCue(side: "out" | "in", timeMs: number) {
    if (side === "out") {
      const nextOut = outCueMs === timeMs ? null : timeMs;
      setOutCueMs(nextOut);
      seekSide("out", nextOut ?? outgoingStartMs(outgoingDurationMs, overlapMs));
      return;
    }
    setInFree(false);
    setInCueMs(timeMs);
    seekSide("in", timeMs);
  }

  function onWaveDown(side: "out" | "in", event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = planRef.current;
    const view = side === "out" ? viewRef.current.out : viewRef.current.inn;
    const start = side === "out" ? (current?.outStartMs ?? 0) : (current?.inStartMs ?? 0);
    gesture.current = {
      kind: "slip",
      side,
      x: event.clientX,
      start,
      width: rect.width,
      span: view.endMs - view.startMs,
      moved: false,
    };
    holdPointer(event);
  }

  function onEndDown(event: ReactPointerEvent<HTMLSpanElement>) {
    if (event.button !== 0) return;
    event.stopPropagation();
    const rect = outCanvas.current?.getBoundingClientRect();
    const view = viewRef.current.out;
    gesture.current = {
      kind: "edge",
      x: event.clientX,
      overlap: overlapMs,
      width: rect?.width ?? 1,
      span: view.endMs - view.startMs,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* move and up still arrive while the pointer stays over the handle */
    }
  }

  function onWaveMove(event: ReactPointerEvent<HTMLElement>) {
    const held = gesture.current;
    if (!held || held.width <= 0) return;
    const delta = event.clientX - held.x;
    if (!held.moved) {
      if (Math.abs(delta) <= 3) return;
      held.moved = true;
    }
    if (held.kind === "edge") {
      onOverlap(Math.round(overlapFromEndDrag(held.overlap, delta, held.width, held.span, outgoingDurationMs)));
      return;
    }
    placeStart(
      held.side,
      slipStartMs(held.start, delta, held.width, held.span, durationOf(held.side)),
      !event.shiftKey,
    );
  }

  function onWaveUp(event: ReactPointerEvent<HTMLElement>) {
    gesture.current = null;
    if (event.currentTarget instanceof HTMLCanvasElement) releasePointer(event as ReactPointerEvent<HTMLCanvasElement>);
    else {
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
    }
  }

  function onOverviewDown(side: "out" | "in", event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const duration = durationOf(side);
    if (!(duration > 0) || rect.width <= 0) return;
    placeStart(side, ((event.clientX - rect.left) / rect.width) * duration, !event.shiftKey);
  }

  function changeZoom(factor: number) {
    const next = Math.min(JOIN_ZOOM_MAX, Math.max(WAVE_ZOOM_MIN, zoomRef.current * factor));
    zoomRef.current = next;
    setZoom(next);
  }

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1 / 1.15 : 1.15;
      const next = Math.min(JOIN_ZOOM_MAX, Math.max(WAVE_ZOOM_MIN, zoomRef.current * factor));
      zoomRef.current = next;
      setZoom(next);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  const syncTip = !sync
    ? t("crates.player.joinSyncOff")
    : plan.phase
      ? t("crates.player.joinSyncTip")
      : t("crates.player.joinSyncTempo");
  const outPlayed = playedBpm(outBpm, pitchPercent);
  const inPlayed = sync && canSync ? outPlayed : inBpm > 0 ? inBpm : null;
  const outPhraseNow = phraseAt(outPhraseList, plan.outStartMs);
  const inPhraseNow = phraseAt(incomingPhrases, plan.inStartMs);

  return (
    <div className="preview-join-deck">
      <audio ref={outRef} className="preview-audio-hidden" preload="auto" />
      <audio
        ref={inRef}
        className="preview-audio-hidden"
        preload="auto"
        onLoadedMetadata={() => setIncomingDurationMs((inRef.current?.duration ?? 0) * 1000)}
      />
      <div className="preview-join-tools">
        <button
          type="button"
          aria-pressed={sync && canSync}
          disabled={!canSync}
          title={syncTip}
          onClick={() => setSync((on) => !on)}
        >
          {t("crates.player.joinSync")}
        </button>
        <Tip text={t("crates.player.joinReturnTip")}>
          <button
            type="button"
            aria-label={t("crates.player.joinReturn")}
            onClick={cuePress}
          >
            {t("crates.player.joinReturn")}
          </button>
        </Tip>
        {outPlayed != null && inPlayed != null ? (
          <span className="preview-join-bpm" title={plan.phase ? t("crates.player.joinPhaseTip") : syncTip}>
            {t("crates.player.joinBpm", { outgoing: String(outPlayed), incoming: String(inPlayed) })}
          </span>
        ) : null}
        {outPlayed != null ? (
          <span
            className="preview-join-bars"
            ref={barsRef}
            title={t("crates.player.joinBarsTip")}
          >
            {t("crates.player.joinBars", {
              bars: String(mixBarsLeft(wallOverlap, outPlayed)),
              clock: mixClock(wallOverlap),
            })}
          </span>
        ) : null}
        <span
          className="preview-join-phrase-now"
          ref={phraseRef}
          title={t("crates.player.joinPhraseTip")}
          style={{ display: outPhraseNow && inPhraseNow ? undefined : "none" }}
        >
          {outPhraseNow && inPhraseNow
            ? t("crates.player.joinPhrase", {
                outgoing: t(PHRASE_KEY[outPhraseNow.name]),
                bars: String(mixBarsLeft(Math.max(0, outPhraseNow.endMs - plan.outStartMs), outPlayed ?? 0)),
                incoming: t(PHRASE_KEY[inPhraseNow.name]),
              })
            : null}
        </span>
        <input
          ref={crossInputRef}
          className="preview-join-cross"
          type="range"
          min={0}
          max={1}
          step="any"
          defaultValue={0}
          aria-label={t("crates.player.joinCross")}
          title={t("crates.player.joinCrossTip")}
          onPointerDown={() => {
            crossHeld.current = true;
          }}
          onChange={(event) => {
            const next = Number(event.currentTarget.value);
            crossHeld.current = true;
            crossRef.current = next;
            setCross(next);
          }}
        />
        <span className="preview-join-grid">
          <Tip text={t("crates.player.joinGridBackTip")} disabled={!incomingBeats?.length}>
            <button
              type="button"
              aria-label={t("crates.player.joinGridBack")}
              disabled={!incomingBeats?.length}
              onClick={(event) => nudgeIncomingGrid(event.shiftKey ? -10 : -1)}
            >
              −
            </button>
          </Tip>
          <em>ms</em>
          <Tip text={t("crates.player.joinGridFwdTip")} disabled={!incomingBeats?.length}>
            <button
              type="button"
              aria-label={t("crates.player.joinGridFwd")}
              disabled={!incomingBeats?.length}
              onClick={(event) => nudgeIncomingGrid(event.shiftKey ? 10 : 1)}
            >
              +
            </button>
          </Tip>
        </span>
        <Tip text={t("crates.player.zoomOut")} disabled={zoom <= WAVE_ZOOM_MIN}>
          <button type="button" aria-label={t("crates.player.zoomOut")} disabled={zoom <= WAVE_ZOOM_MIN} onClick={() => changeZoom(0.5)}>
            −
          </button>
        </Tip>
        <Tip text={t("crates.player.zoomReset")} disabled={zoom <= WAVE_ZOOM_MIN}>
          <button type="button" aria-label={t("crates.player.zoomReset")} disabled={zoom <= WAVE_ZOOM_MIN} onClick={() => changeZoom(WAVE_ZOOM_MIN / zoomRef.current)}>
            {zoom < 1.2 ? "1×" : `${Math.round(zoom)}×`}
          </button>
        </Tip>
        <Tip text={t("crates.player.zoomIn")} disabled={zoom >= JOIN_ZOOM_MAX}>
          <button type="button" aria-label={t("crates.player.zoomIn")} disabled={zoom >= JOIN_ZOOM_MAX} onClick={() => changeZoom(2)}>
            +
          </button>
        </Tip>
      </div>
      <div className="preview-join-stage" ref={stageRef}>
      <div className="preview-join-strip">
        <button
          type="button"
          aria-pressed={!outMuted}
          title={t("crates.player.joinMute", { name: outgoingName })}
          onClick={() => setOutMuted((on) => !on)}
        >
          {outgoingName}
        </button>
        <div className="preview-join-body">
          <div className="preview-join-wave" ref={outWaveRef}>
            <canvas
              ref={outCanvas}
              aria-label={t("crates.player.joinSlip")}
              onPointerDown={(event) => onWaveDown("out", event)}
              onPointerMove={onWaveMove}
              onPointerUp={onWaveUp}
              onPointerCancel={onWaveUp}
            />
            <WaveCues
              cues={shownOutCues}
              view={outView}
              activeMs={plan.outStartMs}
              onJump={(timeMs) => jumpCue("out", timeMs)}
              label={(letter) => t("crates.player.joinCue", { letter })}
              tip={t("crates.player.joinCueTip")}
            />
            <span className="preview-join-shade" ref={outShadeRef} style={shadeStyle(JOIN_PLAYHEAD, outEndFraction) ?? undefined} />
            <span className="preview-join-playhead" />
            <span
              className="preview-join-end"
              ref={outEndRef}
              style={{
                left: `${outEndFraction * 100}%`,
                display: outEndFraction > JOIN_PLAYHEAD && outEndFraction <= 1 ? undefined : "none",
              }}
              aria-label={t("crates.player.joinEdge")}
              onPointerDown={onEndDown}
              onPointerMove={onWaveMove}
              onPointerUp={onWaveUp}
              onPointerCancel={onWaveUp}
            />
          </div>
        </div>
      </div>
      <div className="preview-join-chain">
        <canvas ref={chainCanvas} aria-hidden="true" />
        <span className="preview-join-playhead" />
      </div>
      <div className="preview-join-strip">
        <button
          type="button"
          aria-pressed={!inMuted}
          title={t("crates.player.joinMute", { name: incomingName })}
          onClick={() => setInMuted((on) => !on)}
        >
          {incomingName}
        </button>
        <div className="preview-join-body">
          <div className="preview-join-wave" ref={inWaveRef}>
            <canvas
              ref={inCanvas}
              aria-label={t("crates.player.joinSlip")}
              onPointerDown={(event) => onWaveDown("in", event)}
              onPointerMove={onWaveMove}
              onPointerUp={onWaveUp}
              onPointerCancel={onWaveUp}
            />
            <WaveCues
              cues={shownInCues}
              view={inView}
              activeMs={plan.inStartMs}
              onJump={(timeMs) => jumpCue("in", timeMs)}
              label={(letter) => t("crates.player.joinCue", { letter })}
              tip={t("crates.player.joinCueTip")}
            />
            <span className="preview-join-shade" ref={inShadeRef} style={shadeStyle(JOIN_PLAYHEAD, inEndFraction) ?? undefined} />
            <span className="preview-join-playhead" />
          </div>
        </div>
      </div>
      <div className="preview-join-strip">
        <span aria-hidden="true" />
        <div
            className="preview-join-overview"
            aria-label={t("crates.player.joinOverview")}
            onPointerDown={(event) => onOverviewDown("out", event)}
          >
            <canvas ref={outOverview} aria-hidden="true" />
            {(outPhraseList ?? []).map((phrase) => {
              const box = phraseBox(phrase, outgoingDurationMs);
              if (!box) return null;
              return (
                <i
                  key={`out-${phrase.beat}`}
                  className="preview-phrase"
                  title={t(PHRASE_KEY[phrase.name])}
                  style={box}
                />
              );
            })}
            <span
              className="preview-join-window"
              ref={outWindowRef}
              style={{
                ...windowStyle(outView, outgoingDurationMs),
                display: zoom > 1.05 ? undefined : "none",
              }}
            />
            {outgoingDurationMs > 0 ? (
              <span className="preview-join-mark" ref={outMarkRef} style={markStyle(plan.outStartMs, outgoingDurationMs)} />
            ) : null}
            <OverviewCues
              cues={shownOutCues}
              durationMs={outgoingDurationMs}
              activeMs={plan.outStartMs}
              onJump={(timeMs) => jumpCue("out", timeMs)}
              label={(letter) => t("crates.player.joinCue", { letter })}
              tip={t("crates.player.joinCueTip")}
            />
          </div>
      </div>
      <div className="preview-join-strip">
        <span aria-hidden="true" />
        <div
            className="preview-join-overview"
            aria-label={t("crates.player.joinOverview")}
            onPointerDown={(event) => onOverviewDown("in", event)}
          >
            <canvas ref={inOverview} aria-hidden="true" />
            {(incomingPhrases ?? []).map((phrase) => {
              const box = phraseBox(phrase, incomingDurationMs);
              if (!box) return null;
              return (
                <i
                  key={`in-${phrase.beat}`}
                  className="preview-phrase"
                  title={t(PHRASE_KEY[phrase.name])}
                  style={box}
                />
              );
            })}
            <span
              className="preview-join-window"
              ref={inWindowRef}
              style={{
                ...windowStyle(inView, incomingDurationMs),
                display: zoom > 1.05 ? undefined : "none",
              }}
            />
            {incomingDurationMs > 0 ? (
              <span className="preview-join-mark" ref={inMarkRef} style={markStyle(plan.inStartMs, incomingDurationMs)} />
            ) : null}
            <OverviewCues
              cues={shownInCues}
              durationMs={incomingDurationMs}
              activeMs={plan.inStartMs}
              onJump={(timeMs) => jumpCue("in", timeMs)}
              label={(letter) => t("crates.player.joinCue", { letter })}
              tip={t("crates.player.joinCueTip")}
            />
          </div>
      </div>
      </div>
      {incomingIssue ? <p className="player-fallback">{t("crates.player.joinNeedStick")}</p> : null}
    </div>
  );
}
