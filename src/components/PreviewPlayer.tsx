"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { trackFilePath } from "@/lib/export-booth";
import { mixJoin } from "@/lib/harmonic";
import { playerEmbed, type PlayableTrack } from "@/lib/player";
import { useI18n } from "@/lib/i18n/react";
import { Tip } from "@/components/Hint";
import { TrackArt } from "@/components/TrackArt";
import {
  getStickFilesEpoch,
  isPlayableStickAudio,
  lookupStickAudio,
  stickAudioBaseName,
  subscribeStickFiles,
} from "@/lib/stick-audio";
import {
  getPreviewTransportSnapshot,
  reportPreviewPlayback,
  subscribePreviewTransport,
} from "@/lib/preview-transport";
import { resolveTrackAudio } from "@/lib/stick-file";
import { performanceTracks, type SetTrack } from "@/lib/set";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function useStickFilesEpoch() {
  return useSyncExternalStore(subscribeStickFiles, getStickFilesEpoch, () => 0);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type PlayTrack = PlayableTrack &
  Partial<Pick<SetTrack, "filePath" | "note" | "uri" | "source" | "keyCamelot" | "bpm" | "role">>;

type Props = {
  tracks: PlayTrack[];
  currentId: string | null;
  onChange: (id: string) => void;
  onClose: () => void;
};

type LocalIssue = "missing" | "unsupported" | "error" | null;

type PlayerPlace = { x: number; y: number };

const PLAYER_MARGIN = 8;

function clampPlace(x: number, y: number, width: number, height: number): PlayerPlace {
  const maxX = Math.max(PLAYER_MARGIN, window.innerWidth - width - PLAYER_MARGIN);
  const maxY = Math.max(PLAYER_MARGIN, window.innerHeight - height - PLAYER_MARGIN);
  return {
    x: Math.round(Math.min(maxX, Math.max(PLAYER_MARGIN, x))),
    y: Math.round(Math.min(maxY, Math.max(PLAYER_MARGIN, y))),
  };
}

function initialAudio(filePath: string, fileBase: string, title: string): {
  src: string | null;
  issue: LocalIssue;
} {
  if (!filePath) return { src: null, issue: null };
  const quick = lookupStickAudio(filePath, fileBase || title);
  if (quick.kind === "url") return { src: quick.url, issue: null };
  if (quick.kind === "unsupported") return { src: null, issue: "unsupported" };
  return { src: null, issue: null };
}

function PreviewDock({
  track,
  tracks,
  stickEpoch,
  place,
  onPlace,
  onChange,
  onClose,
}: {
  track: PlayTrack;
  tracks: PlayTrack[];
  stickEpoch: number;
  place: PlayerPlace | null;
  onPlace: (place: PlayerPlace) => void;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const seekId = useId();
  const filePath = trackFilePath(track);
  const fileBase = stickAudioBaseName(filePath);
  const seed = initialAudio(filePath, fileBase, track.name);
  const [src, setSrc] = useState<string | null>(seed.src);
  const [localIssue, setLocalIssue] = useState<LocalIssue>(seed.issue);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const transport = useSyncExternalStore(
    subscribePreviewTransport,
    getPreviewTransportSnapshot,
    getPreviewTransportSnapshot,
  );
  const seenPauseToken = useRef(transport.pauseToken);
  const seenPlayToken = useRef(transport.playToken);

  useEffect(() => {
    reportPreviewPlayback(track.id, playing);
    return () => reportPreviewPlayback(null, false);
  }, [track.id, playing]);

  useEffect(() => {
    if (transport.pauseToken === seenPauseToken.current) return;
    seenPauseToken.current = transport.pauseToken;
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.pause();
    setPlaying(false);
  }, [transport.pauseToken, src]);

  useEffect(() => {
    if (transport.playToken === seenPlayToken.current) return;
    seenPlayToken.current = transport.playToken;
    const audio = audioRef.current;
    if (!audio || !src) return;
    void audio.play().then(
      () => setPlaying(true),
      () => {
        setPlaying(false);
        setLocalIssue("error");
      },
    );
  }, [transport.playToken, src]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const quick = filePath
      ? lookupStickAudio(filePath, fileBase || track.name)
      : ({ kind: "missing" } as const);

    void (async () => {
      if (!filePath) return;
      try {
        const resolved = await resolveTrackAudio(filePath);
        if (cancelled) return;
        if (!resolved) {
          if (quick.kind === "missing") setLocalIssue("missing");
          return;
        }
        const path = resolved.relativePath || resolved.file.name || filePath;
        if (!isPlayableStickAudio(path) && !isPlayableStickAudio(resolved.file.name)) {
          setLocalIssue("unsupported");
          setSrc(null);
          return;
        }
        if (resolved.file.size <= 0) {
          setLocalIssue("missing");
          setSrc(null);
          return;
        }
        objectUrl = URL.createObjectURL(resolved.file);
        setLocalIssue(null);
        setSrc(objectUrl);
      } catch {
        if (!cancelled && quick.kind !== "url") setLocalIssue("error");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filePath, fileBase, stickEpoch, track.name]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.load();
    void audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, [src]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    function fit() {
      if (!place || !card) return;
      const rect = card.getBoundingClientRect();
      const next = clampPlace(place.x, place.y, rect.width, rect.height);
      if (next.x !== place.x || next.y !== place.y) onPlace(next);
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(card);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [place, onPlace]);

  const embed = playerEmbed(track);
  const hasStickLabel = Boolean(filePath) && (Boolean(src) || localIssue != null);
  const lane = performanceTracks(tracks as SetTrack[]);
  const sequence = lane.some((item) => item.id === track.id) ? lane : tracks;
  const seqIndex = sequence.findIndex((item) => item.id === track.id);
  const prev = seqIndex > 0 ? sequence[seqIndex - 1] : null;
  const next =
    seqIndex >= 0 && seqIndex < sequence.length - 1
      ? sequence[seqIndex + 1]
      : null;
  const nextJoin = next
    ? mixJoin(
        { keyCamelot: track.keyCamelot || "", bpm: track.bpm || "" },
        { keyCamelot: next.keyCamelot || "", bpm: next.bpm || "" },
        t,
      )
    : null;

  function onDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      id: event.pointerId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
    };
    setDragging(true);
    onPlace(clampPlace(rect.left, rect.top, rect.width, rect.height));
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const card = cardRef.current;
    if (!drag || drag.id !== event.pointerId || !card) return;
    const rect = card.getBoundingClientRect();
    onPlace(
      clampPlace(event.clientX - drag.dx, event.clientY - drag.dy, rect.width, rect.height),
    );
  }

  function onDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) {
      void audio.play().then(
        () => setPlaying(true),
        () => {
          setPlaying(false);
          setLocalIssue("error");
        },
      );
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  const placed = place
    ? ({
        "--player-x": `${place.x}px`,
        "--player-y": `${place.y}px`,
        "--player-bottom": "auto",
        "--player-right": "auto",
      } as CSSProperties)
    : undefined;

  return (
    <aside
      ref={cardRef}
      className={dragging ? "preview-player is-dragging" : "preview-player"}
      style={placed}
      aria-label={t("crates.player.ariaLabel")}
    >
      <div className="preview-dock">
        <Tip className="preview-close-slot" text={t("crates.player.closeTip")} end>
          <button
            type="button"
            className="preview-close"
            onClick={onClose}
            aria-label={t("crates.player.close")}
          >
            ✕
          </button>
        </Tip>
        <div className="preview-now">
          <div
            className="preview-drag"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <TrackArt
              url={track.imageUrl}
              className="preview-art"
              fallbackClassName="preview-art fallback"
            />
            <div className="preview-meta">
              <strong title={track.name}>{track.name}</strong>
              <span>
                {(track.artists ?? []).join(", ") || "—"}
                {track.keyCamelot ? ` · ${track.keyCamelot}` : ""}
                {track.bpm ? ` · ${track.bpm}` : ""}
                {hasStickLabel ? " · Stick" : embed ? ` · ${embed.label}` : ""}
              </span>
              {nextJoin ? (
                <em className={`mix-join harm-${nextJoin.relation}`}>
                  {t("crates.player.then", { join: nextJoin.label })}
                </em>
              ) : null}
            </div>
          </div>
          <div className="preview-transport">
            <Tip text={t("crates.player.prevTip")} disabled={!prev}>
              <button
                type="button"
                className="player-skip"
                disabled={!prev}
                onClick={() => prev && onChange(prev.id)}
                aria-label={t("crates.player.prev")}
              >
                ‹
              </button>
            </Tip>
            {src ? (
              <Tip text={playing ? t("crates.player.pauseTip") : t("crates.player.playTip")}>
                <button
                  type="button"
                  className="player-play"
                  onClick={togglePlay}
                  aria-label={playing ? t("crates.player.pause") : t("crates.player.play")}
                >
                  {playing ? "❚❚" : "▶"}
                </button>
              </Tip>
            ) : (
              <span className="player-play is-disabled" aria-hidden="true">
                ▶
              </span>
            )}
            <Tip text={t("crates.player.nextTip")} disabled={!next}>
              <button
                type="button"
                className="player-skip"
                disabled={!next}
                onClick={() => next && onChange(next.id)}
                aria-label={t("crates.player.next")}
              >
                ›
              </button>
            </Tip>
          </div>
        </div>

        {src ? (
          <div className="preview-seek">
            <audio
              ref={audioRef}
              className="preview-audio-hidden"
              src={src}
              preload="auto"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
              onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
              onEnded={() => {
                setPlaying(false);
                if (next) onChange(next.id);
              }}
              onError={() => {
                setLocalIssue("error");
                setSrc(null);
              }}
            />
            <span className="preview-time">{formatTime(currentTime)}</span>
            <input
              id={seekId}
              className="preview-range"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              aria-label={t("crates.player.seek")}
              onChange={(event) => {
                const nextTime = Number(event.currentTarget.value);
                const audio = audioRef.current;
                if (audio) audio.currentTime = nextTime;
                setCurrentTime(nextTime);
              }}
            />
            <span className="preview-time">{formatTime(duration)}</span>
          </div>
        ) : embed ? (
          <iframe
            key={embed.src}
            title={t("crates.player.iframeTitle", { label: embed.label })}
            src={embed.src}
            width="100%"
            height={embed.height}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="eager"
          />
        ) : (
          <p className="player-fallback">
            {localIssue === "unsupported"
              ? t("crates.player.unsupportedFormat")
              : localIssue === "error"
                ? t("crates.player.loadFailed")
                : localIssue === "missing" && track.source === "rekordbox"
                  ? t("crates.player.pickStick")
                  : t("crates.player.noEmbed")}
            {track.externalUrl ? (
              <>
                {" "}
                <a href={track.externalUrl} target="_blank" rel="noreferrer">
                  {t("crates.player.openSource")}
                </a>
              </>
            ) : null}
          </p>
        )}
      </div>
    </aside>
  );
}

export function PreviewPlayer({ tracks, currentId, onChange, onClose }: Props) {
  const isClient = useIsClient();
  const stickEpoch = useStickFilesEpoch();
  const [place, setPlace] = useState<PlayerPlace | null>(null);
  const track = tracks.find((item) => item.id === currentId) ?? null;
  if (!isClient || !track) return null;

  return createPortal(
    <PreviewDock
      key={`${track.id}:${stickEpoch}`}
      track={track}
      tracks={tracks}
      stickEpoch={stickEpoch}
      place={place}
      onPlace={setPlace}
      onChange={onChange}
      onClose={onClose}
    />,
    document.body,
  );
}
