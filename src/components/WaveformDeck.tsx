"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Tip } from "@/components/Hint";
import { useI18n } from "@/lib/i18n/react";
import {
  beatsFromBpm,
  GRID_NUDGE_MS,
  placeFirstDownbeat,
  snapCueTime,
  structureCues,
  type AnlzBeat,
  type StructureCueLabel,
  type AnlzPhrase,
  type PhraseName,
} from "@/lib/anlz-cues";
import type { MessageKey } from "@/lib/i18n/core";
import { CUE_SLOT_COUNT, cueColor, cueLetter, type TrackCue } from "@/lib/set";
import {
  waveformBands,
  fitLead,
  trackLead,
  waveformWindow,
  zoomWindow,
  WAVE_ZOOM_MAX,
  WAVE_ZOOM_MIN,
  type WaveformBands,
} from "@/lib/waveform";

const BUCKETS = 1400;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const secs = whole % 60;
  const minutes = Math.floor(whole / 60) % 60;
  const hours = Math.floor(whole / 3600);
  const clock = `${minutes}:${secs.toString().padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}` : clock;
}

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

function prepareCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, width, height);
  return ctx;
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

const STRUCTURE_KEY: Record<StructureCueLabel, MessageKey> = {
  start: "crates.player.structure.start",
  entry: "crates.player.structure.entry",
  verse: "crates.player.structure.verse",
  drop: "crates.player.structure.drop",
  dropEnd: "crates.player.structure.dropEnd",
  drop2: "crates.player.structure.drop2",
  break: "crates.player.structure.break",
  outro: "crates.player.structure.outro",
};

/** Flat phrase ribbon. Each name is one color, clearer than the wave and quieter than the saturated A–H cue flags. */
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

/** Share of the deck given to the beat-grid lane. Cue flags sit just under it. */
const WAVE_LANE = 0.16;

function laneHeight(height: number, lane: boolean): number {
  return lane ? Math.round(height * WAVE_LANE) : 0;
}

function drawBands(
  canvas: HTMLCanvasElement,
  bands: WaveformBands | null,
  viewStart: number,
  viewSpan: number,
  lane: boolean,
) {
  const ctx = prepareCanvas(canvas);
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const laneH = laneHeight(height, lane);
  if (laneH > 0) {
    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(0, 0, width, laneH);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(0, laneH - 1, width, 1);
  }
  if (!bands || bands.low.length === 0) return;
  const count = bands.low.length;
  let loudest = 0.2;
  for (let index = 0; index < count; index += 1) {
    loudest = Math.max(loudest, bands.low[index] ?? 0, bands.mid[index] ?? 0, bands.high[index] ?? 0);
  }
  const gain = Math.min(3, 0.92 / loudest);
  const from = viewStart * count;
  const covered = Math.max(viewSpan * count, 1 / width);
  const waveH = height - laneH;
  const mid = laneH + waveH / 2;
  const room = (waveH / 2) * 0.78;
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
    ctx.fillStyle = "#f97316";
    ctx.fillRect(x, mid - lowH, 1, lowH * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(x, mid - midH, 1, midH * 2);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(x, mid - highH, 1, highH * 2);
  }
}

function drawBeatMarks(
  canvas: HTMLCanvasElement,
  beats: readonly AnlzBeat[],
  duration: number,
  viewStart: number,
  viewSpan: number,
  fromFile: boolean,
  lane: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !beats.length || duration <= 0) return;
  const width = canvas.width;
  const height = canvas.height;
  const laneH = laneHeight(height, lane);
  const durationMs = duration * 1000;
  const startMs = viewStart * durationMs;
  const endMs = (viewStart + viewSpan) * durationMs;
  const spanMs = Math.max(1, endMs - startMs);
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((beats[mid]?.timeMs ?? 0) < startMs) lo = mid + 1;
    else hi = mid;
  }
  const step = beats.length > 1 ? Math.abs((beats[1]?.timeMs ?? 0) - (beats[0]?.timeMs ?? 0)) : 500;
  const pixelsPerBeat = (step / spanMs) * width;
  ctx.save();
  for (let index = Math.max(0, lo - 1); index < beats.length; index += 1) {
    const beat = beats[index];
    if (!beat || beat.timeMs > endMs) break;
    const downbeat = beat.beat === 1;
    if (!downbeat && pixelsPerBeat < 6) continue;
    const x = ((beat.timeMs - startMs) / spanMs) * width;
    const waveTop = downbeat ? laneH : laneH + (height - laneH) * (fromFile ? 0.22 : 0.34);
    const waveBottom = height - (downbeat ? 2 : height * 0.08);
    ctx.setLineDash(fromFile ? [] : [2, 5]);
    ctx.strokeStyle = downbeat
      ? fromFile
        ? "rgba(255,255,255,0.34)"
        : "rgba(190,190,190,0.24)"
      : fromFile
        ? "rgba(255,255,255,0.14)"
        : "rgba(190,190,190,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, waveTop);
    ctx.lineTo(x, waveBottom);
    ctx.stroke();
    if (laneH > 2) {
      ctx.setLineDash([]);
      if (downbeat) {
        ctx.fillStyle = fromFile ? "rgba(255,255,255,0.92)" : "rgba(210,210,210,0.5)";
        ctx.fillRect(x - 1, 1, 2, laneH - 3);
      } else {
        ctx.fillStyle = fromFile ? "rgba(255,255,255,0.55)" : "rgba(190,190,190,0.22)";
        ctx.fillRect(x - 0.5, laneH * 0.48, 1, laneH * 0.42);
      }
    }
  }
  ctx.restore();
}

export function WaveformDeck({
  src,
  currentTime,
  duration,
  playing,
  mediaRef,
  beats,
  bpm,
  fallback,
  gridNote,
  gridReadingNote,
  cues,
  cueSession,
  quantize,
  onQuantize,
  showGrid,
  onShowGrid,
  light,
  onLight,
  phrases,
  phrasesReady,
  phraseNote,
  onShiftGrid,
  onAnalyzeGrid,
  onUndoGrid,
  analyzingGrid,
  canUndoGrid,
  canAnalyzeGrid,
  onSeek,
  onPlay,
  onPause,
  onCues,
  notice,
}: {
  src: string;
  currentTime: number;
  duration: number;
  playing: boolean;
  /** Live file playback. The playhead reads this while the track is running. */
  mediaRef: RefObject<HTMLAudioElement | null>;
  /** Rekordbox PQTZ times. Null when that grid is not loaded. */
  beats: readonly AnlzBeat[] | null;
  bpm: string;
  /** Faint BPM sketch only after the analysis file was checked and had no grid. */
  fallback: boolean;
  gridNote: string | null;
  /** Shown while this track's beatgrid read is still running, including in light mode. */
  gridReadingNote: string | null;
  cues: TrackCue[];
  cueSession: string;
  quantize: boolean;
  onQuantize: (on: boolean) => void;
  showGrid: boolean;
  onShowGrid: (on: boolean) => void;
  light: boolean;
  onLight: (on: boolean) => void;
  phrases: readonly AnlzPhrase[] | null;
  /** False while the phrase read for this track is still running. */
  phrasesReady: boolean;
  phraseNote: string | null;
  onShiftGrid: (deltaMs: number) => void;
  onAnalyzeGrid: () => void;
  onUndoGrid: () => void;
  analyzingGrid: boolean;
  canUndoGrid: boolean;
  canAnalyzeGrid: boolean;
  onSeek: (seconds: number) => void;
  onPlay: (seconds: number) => void;
  onPause: () => void;
  onCues: (cues: TrackCue[]) => void;
  notice: string | null;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overviewRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const playheadRef = useRef<HTMLSpanElement>(null);
  const overviewPlayRef = useRef<HTMLSpanElement>(null);
  const [bands, setBands] = useState<WaveformBands | null>(null);
  const [zoom, setZoom] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const [waveSrc, setWaveSrc] = useState(src);
  if (src !== waveSrc) {
    setWaveSrc(src);
    setBands(null);
    setZoom(1);
    setViewStart(0);
  }
  const [drag, setDrag] = useState<{ slot: number; timeMs: number } | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [cueUndo, setCueUndo] = useState<TrackCue[] | null>(null);
  const [structureNote, setStructureNote] = useState<string | null>(null);
  const [undoSession, setUndoSession] = useState(cueSession);
  if (cueSession !== undoSession) {
    setUndoSession(cueSession);
    setCueUndo(null);
    setStructureNote(null);
  }
  const dragRef = useRef<{ slot: number; timeMs: number } | null>(null);
  const dragMoved = useRef(false);
  const playTimer = useRef<number | null>(null);
  const grabRef = useRef<{ x: number; time: number; playRatio: number; moved: boolean } | null>(null);
  const zoomRef = useRef(1);
  const viewRef = useRef(0);
  const padRef = useRef(0);
  const firstRef = useRef(0);
  const playingRef = useRef(playing);
  const holdRef = useRef(false);
  const gridRef = useRef<{ marks: readonly AnlzBeat[]; fromFile: boolean; quantize: boolean }>({
    marks: [],
    fromFile: false,
    quantize: true,
  });
  const drawRef = useRef<{ marks: readonly AnlzBeat[]; fromFile: boolean }>({ marks: [], fromFile: false });
  const span = duration > 0 ? duration : 0;
  const spanRef = useRef(span);
  const timeRef = useRef(currentTime);
  const fromFile = Boolean(beats && beats.length > 0);
  const gridMarks = useMemo(() => (fromFile && beats ? beats : []), [fromFile, beats]);
  const drawn = useMemo(
    () => (fromFile && beats ? beats : fallback ? beatsFromBpm(Number.parseFloat(bpm), span * 1000) : []),
    [fromFile, beats, fallback, bpm, span],
  );
  useEffect(() => {
    spanRef.current = span;
    if (!playing) timeRef.current = currentTime;
    zoomRef.current = zoom;
    viewRef.current = viewStart;
    const lead = trackLead(drawn, bpm);
    padRef.current = span > 0 ? lead.pad / span : 0;
    firstRef.current = span > 0 ? lead.first / span : 0;
    gridRef.current = { marks: gridMarks, fromFile, quantize };
    drawRef.current = { marks: drawn, fromFile };
  }, [span, currentTime, playing, zoom, viewStart, gridMarks, fromFile, quantize, drawn, bpm]);

  function playCue(seconds: number) {
    if (playTimer.current) window.clearTimeout(playTimer.current);
    playTimer.current = window.setTimeout(() => onPlay(seconds), 180);
  }

  useEffect(() => {
    if (!src) return;
    let cancel = false;
    const context = new AudioContext();
    void (async () => {
      try {
        const response = await fetch(src);
        const buffer = await response.arrayBuffer();
        const audio = await context.decodeAudioData(buffer.slice(0));
        const buckets = Math.min(24_000, Math.max(BUCKETS, Math.floor(audio.duration * 180)));
        const next = waveformBands(mixdown(audio), audio.sampleRate, buckets);
        if (!cancel) setBands(next);
      } catch {
        if (!cancel) setBands(null);
      } finally {
        void context.close();
      }
    })();
    return () => {
      cancel = true;
      void context.close();
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overview = overviewRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const paint = () => {
      const win = waveformWindow(zoomRef.current, viewRef.current, padRef.current);
      const start = win.start;
      const spanView = win.span;
      const grid = !light;
      drawBands(canvas, bands, start, spanView, grid);
      if (grid && showGrid) {
        drawBeatMarks(canvas, drawRef.current.marks, spanRef.current, start, spanView, drawRef.current.fromFile, true);
      }
      if (overview && grid) {
        drawBands(overview, bands, 0, 1, false);
        if (showGrid) drawBeatMarks(overview, drawRef.current.marks, spanRef.current, 0, 1, drawRef.current.fromFile, false);
      }
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(stage);
    if (overview?.parentElement) observer.observe(overview.parentElement);
    return () => observer.disconnect();
  }, [bands, zoom, viewStart, beats, bpm, duration, fallback, light, showGrid]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = stage!.getBoundingClientRect();
      if (rect.width <= 0) return;
      const zoomNow = zoomRef.current;
      const factor = Math.exp(-event.deltaY * 0.0016);
      const pad = padRef.current;
      const shown = waveformWindow(zoomNow, viewRef.current, pad);
      let start = shown.start;
      const spanView = shown.span;
      let anchor = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      if (playingRef.current && spanRef.current > 0) {
        const play = timeRef.current / spanRef.current;
        start = Math.min(Math.max(-pad, play - spanView / 2), Math.max(-pad, 1 - spanView));
        anchor = 0.5;
      }
      const nextZoom = Math.min(WAVE_ZOOM_MAX, Math.max(WAVE_ZOOM_MIN, zoomNow * factor));
      const nextSpan = 1 / nextZoom;
      const anchorTime = start + anchor * spanView;
      const nextStart = nextZoom <= 1 ? 0 : fitLead(zoomWindow(start, spanView, anchor, nextSpan, -pad), nextSpan, anchorTime, -pad, firstRef.current);
      zoomRef.current = nextZoom;
      viewRef.current = nextStart;
      setZoom(nextZoom);
      setViewStart(nextStart);
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [src]);

  const lead = trackLead(drawn, bpm);
  const padRatio = span > 0 ? lead.pad / span : 0;
  const firstRatio = span > 0 ? lead.first / span : 0;

  useLayoutEffect(() => {
    function paintClock(seconds: number) {
      const durationSpan = spanRef.current;
      const winNow = waveformWindow(zoomRef.current, viewRef.current, padRef.current);
      const left = durationSpan <= 0 ? 0 : ((seconds / durationSpan - winNow.start) / winNow.span) * 100;
      if (playheadRef.current) playheadRef.current.style.left = `${left}%`;
      if (overviewPlayRef.current) {
        overviewPlayRef.current.style.left = durationSpan > 0 ? `${(seconds / durationSpan) * 100}%` : "0%";
      }
      if (elapsedRef.current) elapsedRef.current.textContent = formatTime(seconds);
    }
    function follow(seconds: number) {
      if (holdRef.current || zoomRef.current <= 1 || spanRef.current <= 0) return;
      const play = seconds / spanRef.current;
      const windowSpan = 1 / zoomRef.current;
      const startNow = viewRef.current;
      const inside = play >= startNow + windowSpan * 0.12 && play <= startNow + windowSpan * 0.88;
      if (inside) return;
      const pad = padRef.current;
      const centered = Math.min(Math.max(-pad, play - windowSpan / 2), Math.max(-pad, 1 - windowSpan));
      const start = fitLead(centered, windowSpan, play, -pad, firstRef.current);
      if (Math.abs(start - startNow) < 0.0004) return;
      viewRef.current = start;
      setViewStart(start);
    }
    if (!playing) {
      timeRef.current = currentTime;
      paintClock(currentTime);
      follow(currentTime);
      return;
    }
    let frame = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const node = mediaRef.current;
      const time = node && Number.isFinite(node.currentTime) ? node.currentTime : timeRef.current;
      timeRef.current = time;
      paintClock(time);
      follow(time);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [playing, currentTime, viewStart, zoom, span, padRatio, light, mediaRef]);

  useEffect(() => {
    function typing(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target instanceof HTMLInputElement) {
        const type = target.type;
        return type !== "button" && type !== "checkbox" && type !== "radio" && type !== "file";
      }
      return false;
    }
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.repeat) return;
      if (typing(event.target)) return;
      const raw = event.code.startsWith("Digit") ? event.code.slice(5) : event.code.startsWith("Numpad") ? event.code.slice(6) : "";
      const number = Number(raw);
      if (!raw || number < 1 || number > CUE_SLOT_COUNT) return;
      event.preventDefault();
      const slot = number - 1;
      const existing = cues.find((cue) => cue.slot === slot);
      if (existing) {
        onPlay(existing.timeMs / 1000);
        return;
      }
      if (spanRef.current <= 0) return;
      setStructureNote(null);
      const timeMs = snapCueTime(Math.round(timeRef.current * 1000), gridRef.current.marks, gridRef.current.quantize);
      onCues([...cues, { slot, timeMs, name: cueLetter(slot) }]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cues, onCues, onPlay]);

  const win = waveformWindow(zoom, viewStart, padRatio);
  const shown = drag ? cues.map((cue) => (cue.slot === drag.slot ? { ...cue, timeMs: drag.timeMs } : cue)) : cues;

  function timeAt(clientX: number): number {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || span <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const visible = waveformWindow(zoomRef.current, viewRef.current, padRef.current);
    return Math.min(span, Math.max(0, (visible.start + ratio * visible.span) * span));
  }

  function place(seconds: number): number {
    if (span <= 0) return 0;
    return ((seconds / span - win.start) / win.span) * 100;
  }

  function phraseBox(phrase: AnlzPhrase, zoomed: boolean): { left: string; width: string } | null {
    if (span <= 0) return null;
    const start = phrase.timeMs / 1000 / span;
    const end = phrase.endMs / 1000 / span;
    if (!zoomed) return { left: `${start * 100}%`, width: `${Math.max(0.3, (end - start) * 100)}%` };
    const left = (start - win.start) / win.span;
    const right = (end - win.start) / win.span;
    if (right <= 0 || left >= 1) return null;
    const clamped = Math.max(0, left);
    return { left: `${clamped * 100}%`, width: `${(Math.min(1, right) - clamped) * 100}%` };
  }

  function changeZoom(factor: number) {
    const shown = waveformWindow(zoom, viewStart, padRatio);
    let start = shown.start;
    let anchor = 0.5;
    if (span > 0) {
      const play = timeRef.current / span;
      if (playing) {
        start = Math.min(Math.max(-padRatio, play - shown.span / 2), Math.max(-padRatio, 1 - shown.span));
      } else {
        const inside = play >= shown.start && play <= shown.start + shown.span;
        anchor = inside ? (play - shown.start) / shown.span : 0.5;
      }
    }
    const nextZoom = Math.min(WAVE_ZOOM_MAX, Math.max(WAVE_ZOOM_MIN, zoom * factor));
    const nextSpan = 1 / nextZoom;
    const anchorTime = start + anchor * shown.span;
    const nextStart = nextZoom <= 1 ? 0 : fitLead(zoomWindow(start, shown.span, anchor, nextSpan, -padRatio), nextSpan, anchorTime, -padRatio, firstRatio);
    zoomRef.current = nextZoom;
    viewRef.current = nextStart;
    setZoom(nextZoom);
    setViewStart(nextStart);
  }

  function seekOverview(clientX: number) {
    const rect = overviewRef.current?.parentElement?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || span <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * span);
    if (zoomRef.current > 1) {
      const windowSpan = 1 / zoomRef.current;
      const pad = padRef.current;
      const centered = Math.min(Math.max(-pad, ratio - windowSpan / 2), Math.max(-pad, 1 - windowSpan));
      const start = fitLead(centered, windowSpan, ratio, -pad, firstRef.current);
      viewRef.current = start;
      setViewStart(start);
    }
  }

  function forgetStructureNote() {
    if (structureNote) setStructureNote(null);
  }

  function setPad(slot: number) {
    const existing = cues.find((cue) => cue.slot === slot);
    if (existing) {
      playCue(existing.timeMs / 1000);
      return;
    }
    forgetStructureNote();
    if (span <= 0) return;
    const timeMs = snapCueTime(Math.round(timeRef.current * 1000), gridMarks, quantize);
    onCues([...cues, { slot, timeMs, name: cueLetter(slot) }]);
  }

  function rename(slot: number, name: string) {
    forgetStructureNote();
    onCues(cues.map((cue) => (cue.slot === slot ? { ...cue, name: name.slice(0, 24) } : cue)));
  }

  function remove(slot: number) {
    forgetStructureNote();
    onCues(cues.filter((cue) => cue.slot !== slot));
  }

  function placeStructure() {
    if (!phrasesReady) return;
    const next = structureCues(phrases, gridMarks, quantize);
    if (!next.length) {
      const alreadyExplained = !light && Boolean(phraseNote || gridNote);
      if (!alreadyExplained) setStructureNote(t("crates.player.structureMissing"));
      return;
    }
    const named = next.map((cue) => ({ slot: cue.slot, timeMs: cue.timeMs, name: t(STRUCTURE_KEY[cue.label]) }));
    if (named.length === cues.length && named.every((cue) => cues.some((item) => item.slot === cue.slot && item.timeMs === cue.timeMs && item.name === cue.name))) {
      return;
    }
    setCueUndo((current) => current ?? cues.map((cue) => ({ ...cue })));
    setStructureNote(null);
    onCues(named);
  }

  function undoStructure() {
    if (!cueUndo) return;
    onCues(cueUndo.map((cue) => ({ ...cue })));
    setCueUndo(null);
    setStructureNote(null);
  }

  function toggleLight() {
    onLight(!light);
  }

  const playhead = place(currentTime);
  const zoomLabel = zoom < 1.2 ? "1×" : `${Math.round(zoom)}×`;
  const windowLeft = Math.max(0, win.start) * 100;
  const windowWidth = (Math.min(1, win.start + win.span) - Math.max(0, win.start)) * 100;
  const overviewPlay = span > 0 ? (currentTime / span) * 100 : 0;

  return (
    <div className="preview-wave">
      <div className="preview-wave-tools">
        <div className="preview-clock">
          <span ref={elapsedRef} className="preview-clock-now">{formatTime(currentTime)}</span>
          <span className="preview-clock-total">{formatTime(span)}</span>
        </div>
        <div className="preview-tool-group">
          <Tip text={t("crates.player.lightTip")}>
            <button type="button" aria-pressed={light} aria-label={t("crates.player.light")} onClick={toggleLight}>
              {t("crates.player.light")}
            </button>
          </Tip>
          <Tip text={t("crates.player.zoomOut")} disabled={zoom <= WAVE_ZOOM_MIN}>
            <button type="button" aria-label={t("crates.player.zoomOut")} disabled={zoom <= WAVE_ZOOM_MIN} onClick={() => changeZoom(0.5)}>
              −
            </button>
          </Tip>
          <Tip text={t("crates.player.zoomReset")} disabled={zoom <= WAVE_ZOOM_MIN}>
            <button
              type="button"
              aria-label={t("crates.player.zoomReset")}
              disabled={zoom <= WAVE_ZOOM_MIN}
              onClick={() => {
                zoomRef.current = 1;
                viewRef.current = 0;
                setZoom(1);
                setViewStart(0);
              }}
            >
              {zoomLabel}
            </button>
          </Tip>
          <Tip text={t("crates.player.zoomIn")} disabled={zoom >= WAVE_ZOOM_MAX}>
            <button type="button" aria-label={t("crates.player.zoomIn")} disabled={zoom >= WAVE_ZOOM_MAX} onClick={() => changeZoom(2)}>
              +
            </button>
          </Tip>
        </div>
        <div className="preview-tool-group">
          <Tip text={t("crates.player.structureTip")} disabled={!phrasesReady}>
            <button type="button" aria-label={t("crates.player.structure")} disabled={!phrasesReady} onClick={placeStructure}>
              {t("crates.player.structure")}
            </button>
          </Tip>
          <Tip text={t("crates.player.structureUndoTip")} disabled={!cueUndo}>
            <button type="button" aria-label={t("crates.player.structureUndo")} disabled={!cueUndo} onClick={undoStructure}>
              {t("crates.player.structureUndo")}
            </button>
          </Tip>
        </div>
        {light ? null : (
          <div className="preview-tool-group">
            <Tip text={t("crates.player.gridAnalyzeTip")} disabled={!canAnalyzeGrid}>
              <button
                type="button"
                aria-label={t("crates.player.gridAnalyze")}
                disabled={!canAnalyzeGrid}
                onClick={onAnalyzeGrid}
              >
                {t("crates.player.gridAnalyze")}
              </button>
            </Tip>
            <Tip text={t("crates.player.gridAnalyzeUndoTip")} disabled={!canUndoGrid || analyzingGrid}>
              <button
                type="button"
                aria-label={t("crates.player.gridAnalyzeUndo")}
                disabled={!canUndoGrid || analyzingGrid}
                onClick={onUndoGrid}
              >
                {t("crates.player.gridAnalyzeUndo")}
              </button>
            </Tip>
            <Tip text={t("crates.player.gridLinesTip")}>
              <button type="button" aria-pressed={showGrid} aria-label={t("crates.player.gridLines")} onClick={() => onShowGrid(!showGrid)}>
                {t("crates.player.gridLines")}
              </button>
            </Tip>
            <Tip text={t("crates.player.quantize")}>
              <button type="button" aria-pressed={quantize} aria-label={t("crates.player.quantize")} onClick={() => onQuantize(!quantize)}>
                Q
              </button>
            </Tip>
            <Tip text={t("crates.player.gridEarlier")} disabled={!fromFile}>
              <button type="button" aria-label={t("crates.player.gridEarlier")} disabled={!fromFile} onClick={() => onShiftGrid(-GRID_NUDGE_MS)}>
                −5
              </button>
            </Tip>
            <Tip text={t("crates.player.gridLater")} disabled={!fromFile}>
              <button type="button" aria-label={t("crates.player.gridLater")} disabled={!fromFile} onClick={() => onShiftGrid(GRID_NUDGE_MS)}>
                +5
              </button>
            </Tip>
            <Tip text={t("crates.player.gridToPlayhead")} disabled={!fromFile}>
              <button
                type="button"
                aria-label={t("crates.player.gridToPlayhead")}
                disabled={!fromFile}
                onClick={() => {
                  const marks = gridRef.current.marks;
                  const playMs = Math.round(timeRef.current * 1000);
                  onShiftGrid(playMs - snapCueTime(playMs, marks, true));
                }}
              >
                1
              </button>
            </Tip>
            <Tip text={t("crates.player.gridDownbeatTip")} disabled={!fromFile}>
              <button
                type="button"
                aria-label={t("crates.player.gridDownbeat")}
                disabled={!fromFile}
                onClick={() => {
                  const marks = gridRef.current.marks;
                  const playMs = Math.round(timeRef.current * 1000);
                  const next = placeFirstDownbeat(marks, playMs);
                  const first = marks[0];
                  const moved = next?.[0];
                  if (!first || !moved) return;
                  onShiftGrid(moved.timeMs - first.timeMs);
                }}
              >
                {t("crates.player.gridDownbeat")}
              </button>
            </Tip>
          </div>
        )}
      </div>
      {light ? null : (
      <div
        className="preview-wave-overview"
        onPointerDown={(event) => {
          seekOverview(event.clientX);
        }}
      >
        <canvas ref={overviewRef} aria-hidden="true" />
        {phrases?.map((phrase) => {
          const box = phraseBox(phrase, false);
          if (!box) return null;
          return (
            <i
              key={`over-${phrase.beat}`}
              className="preview-phrase"
              title={t(PHRASE_KEY[phrase.name])}
              style={{ ...box, background: PHRASE_COLOR[phrase.name] }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onPlay(phrase.timeMs / 1000);
              }}
            />
          );
        })}
        {zoom > 1.05 ? (
          <span className="preview-wave-window" style={{ left: `${windowLeft}%`, width: `${windowWidth}%` }} />
        ) : null}
        <span ref={overviewPlayRef} className="preview-playhead" style={{ left: `${overviewPlay}%` }} />
      </div>
      )}
      <div
        ref={stageRef}
        className={["preview-wave-stage", zoom > 1 ? "is-zoomed" : "", light ? "is-light" : ""].filter(Boolean).join(" ")}
        style={{ "--wave-lane": light ? "0%" : `${WAVE_LANE * 100}%` } as CSSProperties}
        title={t("crates.player.zoomWheel")}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest(".preview-cue-mark")) return;
          holdRef.current = true;
          const visible = waveformWindow(zoomRef.current, viewRef.current, padRef.current);
          const playRatio = span > 0 && visible.span > 0 ? (timeRef.current / span - visible.start) / visible.span : 0.5;
          grabRef.current = { x: event.clientX, time: timeRef.current, playRatio, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const grab = grabRef.current;
          if (!grab || span <= 0) return;
          const dx = event.clientX - grab.x;
          if (Math.abs(dx) > 3 && !grab.moved) {
            grab.moved = true;
            onPause();
          }
          if (!grab.moved) return;
          const rect = stageRef.current?.getBoundingClientRect();
          if (!rect || rect.width <= 0) return;
          const visibleWindow = waveformWindow(zoomRef.current, viewRef.current, padRef.current);
          const visible = visibleWindow.span * span;
          const nextTime = Math.min(span, Math.max(0, grab.time - (dx / rect.width) * visible));
          if (zoomRef.current > 1) {
            const pad = padRef.current;
            const start = nextTime / span - grab.playRatio * visibleWindow.span;
            const limit = Math.max(-pad, 1 - 1 / zoomRef.current);
            const clamped = Math.min(Math.max(-pad, start), limit);
            viewRef.current = clamped;
            setViewStart(clamped);
          }
          onSeek(nextTime);
        }}
        onPointerUp={(event) => {
          const grab = grabRef.current;
          grabRef.current = null;
          holdRef.current = false;
          if (!grab || grab.moved) return;
          onSeek(timeAt(event.clientX));
        }}
        onPointerCancel={() => {
          grabRef.current = null;
          holdRef.current = false;
        }}
      >
        <canvas ref={canvasRef} aria-label={t("crates.player.seek")} />
        {light
          ? null
          : phrases?.map((phrase) => {
          const box = phraseBox(phrase, true);
          if (!box) return null;
          return (
            <i
              key={`zoom-${phrase.beat}`}
              className="preview-phrase"
              title={t(PHRASE_KEY[phrase.name])}
              style={{ ...box, background: PHRASE_COLOR[phrase.name] }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onPlay(phrase.timeMs / 1000);
              }}
            />
          );
        })}
        <span ref={playheadRef} className="preview-playhead" style={{ left: `${playhead}%` }} />
        {shown.map((cue) => (
          <button
            key={cue.slot}
            type="button"
            className="preview-cue-mark"
            style={{ left: `${place(cue.timeMs / 1000)}%`, color: cueColor(cue.slot) }}
            title={cue.name || t("crates.player.cueName", { letter: cueLetter(cue.slot) })}
            onPointerDown={(event) => {
              event.stopPropagation();
              dragMoved.current = false;
              event.currentTarget.setPointerCapture(event.pointerId);
              if (light) return;
              const next = { slot: cue.slot, timeMs: cue.timeMs };
              dragRef.current = next;
              setDrag(next);
            }}
            onPointerMove={(event) => {
              if (light) return;
              const active = dragRef.current;
              if (!active || active.slot !== cue.slot) return;
              dragMoved.current = true;
              const next = { slot: cue.slot, timeMs: Math.round(timeAt(event.clientX) * 1000) };
              dragRef.current = next;
              setDrag(next);
            }}
            onPointerUp={(event) => {
              if (light) {
                onPlay(cue.timeMs / 1000);
                return;
              }
              const active = dragRef.current;
              if (!active || active.slot !== cue.slot) return;
              const timeMs = snapCueTime(Math.round(timeAt(event.clientX) * 1000), gridMarks, quantize);
              dragRef.current = null;
              setDrag(null);
              if (dragMoved.current) {
                forgetStructureNote();
                onCues(cues.map((item) => (item.slot === cue.slot ? { ...item, timeMs } : item)));
              }
              else onPlay(cue.timeMs / 1000);
            }}
          >
            <i />
            <em>
              <span>{cueLetter(cue.slot)}</span>
            </em>
          </button>
        ))}
      </div>
      {light ? null : (
      <div className="preview-cue-row" role="group" aria-label={t("crates.player.cueName", { letter: "A–H" })}>
        {Array.from({ length: CUE_SLOT_COUNT }, (_, slot) => {
          const cue = cues.find((item) => item.slot === slot);
          const letter = cueLetter(slot);
          return (
            <span
              key={slot}
              className={cue ? "preview-cue-pad is-set" : "preview-cue-pad"}
              style={cue ? { borderColor: cueColor(slot), color: cueColor(slot) } : undefined}
            >
              {editing === slot && cue ? (
                <input
                  value={cue.name}
                  placeholder={letter}
                  aria-label={t("crates.player.cueRename", { letter })}
                  autoFocus
                  onChange={(event) => rename(slot, event.currentTarget.value)}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setEditing(null);
                  }}
                />
              ) : (
                <Tip
                  as="span"
                  text={cue ? t("crates.player.cuePadPlay", { letter }) : t("crates.player.cuePadSet", { letter })}
                >
                  <button
                    type="button"
                    className="preview-cue-jump"
                    aria-label={cue ? t("crates.player.cuePadPlay", { letter }) : t("crates.player.cuePadSet", { letter })}
                    onClick={() => setPad(slot)}
                    onDoubleClick={() => {
                      if (!cue) return;
                      if (playTimer.current) window.clearTimeout(playTimer.current);
                      setEditing(slot);
                    }}
                  >
                    {letter}
                  </button>
                </Tip>
              )}
              {cue ? (
                <Tip as="span" text={t("crates.player.cueDelete", { letter })}>
                  <button
                    type="button"
                    className="preview-cue-x"
                    aria-label={t("crates.player.cueDelete", { letter })}
                    onClick={() => remove(slot)}
                  >
                    ×
                  </button>
                </Tip>
              ) : null}
            </span>
          );
        })}
      </div>
      )}
      {structureNote ? <p className="preview-cue-note">{structureNote}</p> : null}
      {gridReadingNote ? <p className="preview-cue-note">{gridReadingNote}</p> : null}
      {!light && gridNote ? <p className="preview-cue-note">{gridNote}</p> : null}
      {!light && phraseNote ? <p className="preview-cue-note">{phraseNote}</p> : null}
      {notice ? <p className="preview-cue-note">{notice}</p> : null}
    </div>
  );
}
