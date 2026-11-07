"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/react";
import { beatsFromBpm, nearestDownbeat, type AnlzBeat } from "@/lib/anlz-cues";
import { CUE_SLOT_COUNT, cueColor, cueLetter, type TrackCue } from "@/lib/set";
import {
  waveformBands,
  zoomAround,
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

function laneHeight(height: number, lane: boolean): number {
  return lane ? Math.round(height * 0.16) : 0;
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
    for (let index = start; index < end && index < count; index += 1) {
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
    ctx.strokeStyle = "rgba(0,0,0,0.72)";
    ctx.lineWidth = downbeat ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x, waveTop);
    ctx.lineTo(x, waveBottom);
    ctx.stroke();
    ctx.strokeStyle = downbeat
      ? fromFile
        ? "rgba(255,255,255,0.96)"
        : "rgba(190,190,190,0.32)"
      : fromFile
        ? "rgba(255,255,255,0.42)"
        : "rgba(190,190,190,0.14)";
    ctx.lineWidth = downbeat && fromFile ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(x, waveTop);
    ctx.lineTo(x, waveBottom);
    ctx.stroke();
    if (laneH > 2) {
      ctx.setLineDash([]);
      if (downbeat) {
        ctx.fillStyle = fromFile ? "#fff" : "rgba(210,210,210,0.4)";
        ctx.fillRect(x - 1.5, 1, 3, laneH - 3);
      } else {
        ctx.fillStyle = fromFile ? "rgba(255,255,255,0.45)" : "rgba(190,190,190,0.18)";
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
  beats,
  bpm,
  fallback,
  gridNote,
  cues,
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
  /** Rekordbox PQTZ times. Null when that grid is not loaded. */
  beats: readonly AnlzBeat[] | null;
  bpm: string;
  /** Faint BPM sketch only after the analysis file was checked and had no grid. */
  fallback: boolean;
  gridNote: string | null;
  cues: TrackCue[];
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
  const [hold, setHold] = useState(false);
  const dragRef = useRef<{ slot: number; timeMs: number } | null>(null);
  const dragMoved = useRef(false);
  const playTimer = useRef<number | null>(null);
  const grabRef = useRef<{ x: number; time: number; playRatio: number; moved: boolean } | null>(null);
  const zoomRef = useRef(1);
  const viewRef = useRef(0);
  const playingRef = useRef(playing);
  const holdRef = useRef(false);
  const gridRef = useRef<{ marks: readonly AnlzBeat[]; fromFile: boolean }>({ marks: [], fromFile: false });
  const drawRef = useRef<{ marks: readonly AnlzBeat[]; fromFile: boolean }>({ marks: [], fromFile: false });
  const span = duration > 0 ? duration : 0;
  const spanRef = useRef(span);
  const timeRef = useRef(currentTime);
  const fromFile = Boolean(beats && beats.length > 0);
  const quantize = useMemo(() => (fromFile && beats ? beats : []), [fromFile, beats]);
  const drawn = useMemo(
    () => (fromFile && beats ? beats : fallback ? beatsFromBpm(Number.parseFloat(bpm), span * 1000) : []),
    [fromFile, beats, fallback, bpm, span],
  );
  useEffect(() => {
    spanRef.current = span;
    timeRef.current = currentTime;
    zoomRef.current = zoom;
    viewRef.current = viewStart;
    gridRef.current = { marks: quantize, fromFile };
    drawRef.current = { marks: drawn, fromFile };
  }, [span, currentTime, zoom, viewStart, quantize, fromFile, drawn]);

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
      const start = viewRef.current;
      const spanView = 1 / zoomRef.current;
      drawBands(canvas, bands, start, spanView, true);
      drawBeatMarks(canvas, drawRef.current.marks, spanRef.current, start, spanView, drawRef.current.fromFile, true);
      if (overview) {
        drawBands(overview, bands, 0, 1, false);
        drawBeatMarks(overview, drawRef.current.marks, spanRef.current, 0, 1, drawRef.current.fromFile, false);
      }
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(stage);
    if (overview?.parentElement) observer.observe(overview.parentElement);
    return () => observer.disconnect();
  }, [bands, zoom, viewStart, beats, bpm, duration, fallback]);

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
      let start = viewRef.current;
      let anchor = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      if (playingRef.current && spanRef.current > 0) {
        const play = timeRef.current / spanRef.current;
        const windowSpan = 1 / zoomNow;
        start = Math.min(Math.max(0, play - windowSpan / 2), 1 - windowSpan);
        anchor = 0.5;
      }
      const next = zoomAround(start, zoomNow, anchor, zoomNow * factor);
      zoomRef.current = next.zoom;
      viewRef.current = next.start;
      setZoom(next.zoom);
      setViewStart(next.start);
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [src]);

  useEffect(() => {
    if (holdRef.current || zoom <= 1 || span <= 0) return;
    const play = currentTime / span;
    const windowSpan = 1 / zoom;
    const startNow = viewRef.current;
    const inside = play >= startNow + windowSpan * 0.12 && play <= startNow + windowSpan * 0.88;
    if (!playing && inside) return;
    const start = Math.min(Math.max(0, play - windowSpan / 2), 1 - windowSpan);
    if (Math.abs(start - startNow) < 0.0004) return;
    viewRef.current = start;
    setViewStart(start);
  }, [playing, hold, zoom, currentTime, span]);

  const viewSpan = 1 / zoom;
  const shown = drag ? cues.map((cue) => (cue.slot === drag.slot ? { ...cue, timeMs: drag.timeMs } : cue)) : cues;

  function timeAt(clientX: number): number {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || span <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return (viewRef.current + ratio / zoomRef.current) * span;
  }

  function place(seconds: number): number {
    if (span <= 0) return 0;
    return ((seconds / span - viewStart) / viewSpan) * 100;
  }

  function changeZoom(factor: number) {
    let start = viewStart;
    let anchor = 0.5;
    if (span > 0) {
      const play = currentTime / span;
      if (playing) {
        start = Math.min(Math.max(0, play - viewSpan / 2), 1 - viewSpan);
      } else {
        const inside = play >= viewStart && play <= viewStart + viewSpan;
        anchor = inside ? (play - viewStart) / viewSpan : 0.5;
      }
    }
    const next = zoomAround(start, zoom, anchor, zoom * factor);
    zoomRef.current = next.zoom;
    viewRef.current = next.start;
    setZoom(next.zoom);
    setViewStart(next.start);
  }

  function seekOverview(clientX: number) {
    const rect = overviewRef.current?.parentElement?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || span <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * span);
    if (zoomRef.current > 1) {
      const windowSpan = 1 / zoomRef.current;
      const start = Math.min(Math.max(0, ratio - windowSpan / 2), 1 - windowSpan);
      viewRef.current = start;
      setViewStart(start);
    }
  }

  function setPad(slot: number) {
    const existing = cues.find((cue) => cue.slot === slot);
    if (existing) {
      playCue(existing.timeMs / 1000);
      return;
    }
    if (span <= 0) return;
    const timeMs = nearestDownbeat(Math.round(currentTime * 1000), quantize);
    onCues([...cues, { slot, timeMs, name: cueLetter(slot) }]);
  }

  function rename(slot: number, name: string) {
    onCues(cues.map((cue) => (cue.slot === slot ? { ...cue, name: name.slice(0, 24) } : cue)));
  }

  function remove(slot: number) {
    onCues(cues.filter((cue) => cue.slot !== slot));
  }

  const playhead = place(currentTime);
  const zoomLabel = zoom < 1.2 ? "1×" : `${Math.round(zoom)}×`;
  const windowLeft = viewStart * 100;
  const windowWidth = viewSpan * 100;
  const overviewPlay = span > 0 ? (currentTime / span) * 100 : 0;

  return (
    <div className="preview-wave">
      <div className="preview-wave-times">
        <span>{formatTime(currentTime)}</span>
        <span className="preview-wave-zoom">
          <button type="button" aria-label={t("crates.player.zoomOut")} disabled={zoom <= WAVE_ZOOM_MIN} onClick={() => changeZoom(0.5)}>
            −
          </button>
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
          <button type="button" aria-label={t("crates.player.zoomIn")} disabled={zoom >= WAVE_ZOOM_MAX} onClick={() => changeZoom(2)}>
            +
          </button>
        </span>
        <span>{formatTime(span)}</span>
      </div>
      <div
        className="preview-wave-overview"
        onPointerDown={(event) => {
          seekOverview(event.clientX);
        }}
      >
        <canvas ref={overviewRef} aria-hidden="true" />
        {zoom > 1.05 ? (
          <span className="preview-wave-window" style={{ left: `${windowLeft}%`, width: `${windowWidth}%` }} />
        ) : null}
        <span className="preview-playhead" style={{ left: `${overviewPlay}%` }} />
      </div>
      <div
        ref={stageRef}
        className={zoom > 1 ? "preview-wave-stage is-zoomed" : "preview-wave-stage"}
        title={t("crates.player.zoomWheel")}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest(".preview-cue-mark")) return;
          holdRef.current = true;
          setHold(true);
          const playRatio = span > 0 ? (currentTime / span - viewRef.current) * zoomRef.current : 0.5;
          grabRef.current = { x: event.clientX, time: currentTime, playRatio, moved: false };
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
          const visible = span / zoomRef.current;
          const nextTime = Math.min(span, Math.max(0, grab.time - (dx / rect.width) * visible));
          if (zoomRef.current > 1) {
            const start = nextTime / span - grab.playRatio / zoomRef.current;
            const limit = 1 - 1 / zoomRef.current;
            const clamped = Math.min(Math.max(0, start), limit);
            viewRef.current = clamped;
            setViewStart(clamped);
          }
          onSeek(nextTime);
        }}
        onPointerUp={(event) => {
          const grab = grabRef.current;
          grabRef.current = null;
          holdRef.current = false;
          setHold(false);
          if (!grab || grab.moved) return;
          onSeek(timeAt(event.clientX));
        }}
        onPointerCancel={() => {
          grabRef.current = null;
          holdRef.current = false;
          setHold(false);
        }}
      >
        <canvas ref={canvasRef} aria-label={t("crates.player.seek")} />
        <span className="preview-playhead" style={{ left: `${playhead}%` }} />
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
              const next = { slot: cue.slot, timeMs: cue.timeMs };
              dragRef.current = next;
              setDrag(next);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const active = dragRef.current;
              if (!active || active.slot !== cue.slot) return;
              dragMoved.current = true;
              const next = { slot: cue.slot, timeMs: Math.round(timeAt(event.clientX) * 1000) };
              dragRef.current = next;
              setDrag(next);
            }}
            onPointerUp={(event) => {
              const active = dragRef.current;
              if (!active || active.slot !== cue.slot) return;
              const timeMs = nearestDownbeat(Math.round(timeAt(event.clientX) * 1000), gridRef.current.marks);
              dragRef.current = null;
              setDrag(null);
              if (dragMoved.current) onCues(cues.map((item) => (item.slot === cue.slot ? { ...item, timeMs } : item)));
              else onPlay(cue.timeMs / 1000);
            }}
          >
            <i />
            <em>{cueLetter(cue.slot)}</em>
          </button>
        ))}
      </div>
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
              )}
              {cue ? (
                <button
                  type="button"
                  className="preview-cue-x"
                  aria-label={t("crates.player.cueDelete", { letter })}
                  onClick={() => remove(slot)}
                >
                  ×
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
      {gridNote ? <p className="preview-cue-note">{gridNote}</p> : null}
      {notice ? <p className="preview-cue-note">{notice}</p> : null}
    </div>
  );
}
