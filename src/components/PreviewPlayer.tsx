"use client";

import {
  useEffect,
  useLayoutEffect,
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
import { ActionIcon } from "@/components/ActionIcon";
import { playerNeighbors } from "@/lib/player-queue";
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
import { OverlapField } from "@/components/OverlapField";
import { WaveformDeck } from "@/components/WaveformDeck";
import { hasKnownEnergy } from "@/lib/energy";
import {
  formatGridReadingNote,
  readRememberedBeatGrid,
  readRememberedHotCues,
  readRememberedPhrases,
  readStickBeatGridDetail,
  readStickHotCues,
  readStickPhrases,
  rekordboxTrackId,
  saveStickAnalyzedGrid,
  saveStickBeatGrid,
  saveStickHotCues,
  subscribeStickIndexProgress,
  type StickIndexWalk,
} from "@/lib/stick-cues";
import { analyzeSourceGrid } from "@/lib/analyze-grid";
import { barJump, phrasesOnGrid, shiftBeatTimes, type AnlzBeat, type AnlzPhrase } from "@/lib/anlz-cues";
import {
  getStickHandleEpoch,
  loadPersistedStickHandle,
  stickPermission,
  subscribeStickHandle,
} from "@/lib/stick-session";
import { savedVolumeHandle } from "@/lib/stick-volume-client";
import type { DirLike } from "@/lib/rekordbox-stick-write";
import {
  BLEND_MS,
  TRANSITIONS,
  performanceTracks,
  type SetTrack,
  type TrackCue,
  type TransitionVerb,
} from "@/lib/set";
import { transitionHint, transitionLabel } from "@/lib/i18n/domain";

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

function useStickHandleEpoch() {
  return useSyncExternalStore(subscribeStickHandle, getStickHandleEpoch, () => 0);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type PlayTrack = PlayableTrack &
  Partial<
    Pick<
      SetTrack,
      | "filePath"
      | "note"
      | "comment"
      | "transition"
      | "uri"
      | "source"
      | "keyCamelot"
      | "bpm"
      | "role"
      | "overlapMs"
      | "durationMs"
      | "energyLevel"
      | "energySource"
      | "cues"
    >
  >;

type Rehearsal = {
  onTransition: (id: string, value: TransitionVerb) => void;
  onOverlap: (id: string, overlapMs: number) => void;
  onNote: (id: string, value: string) => void;
};

export type PlayerTrackActions = {
  trackIds: readonly string[];
  pinnedIds?: readonly string[];
  keptIds?: readonly string[];
  excludedIds?: readonly string[];
  unsortedIds?: readonly string[];
  openerId?: string | null;
  closerId?: string | null;
  onPin: (id: string) => void;
  onKeep: (id: string) => void;
  onExclude: (id: string) => void;
  onUnsort: (id: string) => void;
  onDelete: (id: string) => void;
  onOpener: (id: string) => void;
  onCloser: (id: string) => void;
};

type Props = {
  tracks: PlayTrack[];
  currentId: string | null;
  onChange: (id: string) => void;
  onClose: () => void;
  blendMs?: number;
  rehearsal?: Rehearsal | null;
  actions?: PlayerTrackActions | null;
  /** Fired when stick-backed preview audio fails after it had a playable source. */
  onStickMediaLost?: () => void;
  onCues?: (id: string, cues: TrackCue[]) => void;
};

function listed(ids: readonly string[] | undefined, id: string): boolean {
  return Boolean(ids?.includes(id));
}

function TrackMarks({
  id,
  actions,
}: {
  id: string;
  actions: PlayerTrackActions;
}) {
  const { t } = useI18n();
  const marks: { key: string; text: string; className?: string }[] = [];
  if (actions.openerId === id) marks.push({ key: "opener", text: t("crates.player.markOpener") });
  if (actions.closerId === id) marks.push({ key: "closer", text: t("crates.player.markCloser") });
  if (listed(actions.keptIds, id)) marks.push({ key: "keep", text: t("crates.player.markKeep") });
  if (listed(actions.pinnedIds, id)) marks.push({ key: "pin", text: t("crates.player.markPin") });
  if (listed(actions.unsortedIds, id)) {
    marks.push({ key: "unsort", text: t("crates.player.markUnsorted"), className: "is-free" });
  }
  if (listed(actions.excludedIds, id)) {
    marks.push({ key: "out", text: t("crates.player.markExcluded"), className: "is-out" });
  }
  if (!marks.length) return null;
  return (
    <span className="preview-marks">
      {marks.map((mark) => (
        <span key={mark.key} className={mark.className}>
          {mark.text}
        </span>
      ))}
    </span>
  );
}

function TrackActions({
  id,
  name,
  actions,
}: {
  id: string;
  name: string;
  actions: PlayerTrackActions;
}) {
  const { t } = useI18n();
  if (!actions.trackIds.includes(id)) return null;
  const pinned = listed(actions.pinnedIds, id);
  const kept = listed(actions.keptIds, id);
  const excluded = listed(actions.excludedIds, id);
  const unsorted = listed(actions.unsortedIds, id);
  const opener = actions.openerId === id;
  const closer = actions.closerId === id;
  const buttons = [
    {
      key: "exclude",
      icon: "exclude" as const,
      pressed: excluded,
      label: excluded ? t("crates.player.include") : t("crates.player.exclude"),
      tip: excluded ? t("crates.player.includeTip") : t("crates.player.excludeTip"),
      onClick: () => actions.onExclude(id),
    },
    {
      key: "keep",
      icon: "keep" as const,
      pressed: kept,
      label: kept ? t("crates.player.keepClear") : t("crates.player.keep"),
      tip: kept ? t("crates.player.keepClearTip") : t("crates.player.keepTip"),
      onClick: () => actions.onKeep(id),
    },
    {
      key: "pin",
      icon: "pin" as const,
      pressed: pinned,
      label: pinned ? t("crates.player.unpin") : t("crates.player.pin"),
      tip: pinned ? t("crates.player.unpinTip") : t("crates.player.pinTip"),
      onClick: () => actions.onPin(id),
    },
    {
      key: "unsort",
      icon: "unsort" as const,
      pressed: unsorted,
      label: unsorted ? t("crates.player.unsortClear") : t("crates.player.unsort"),
      tip: unsorted ? t("crates.player.unsortClearTip") : t("crates.player.unsortTip"),
      onClick: () => actions.onUnsort(id),
    },
    {
      key: "opener",
      icon: "opener" as const,
      pressed: opener,
      label: opener ? t("crates.player.openerClear") : t("crates.player.opener"),
      tip: opener ? t("crates.player.openerClearTip") : t("crates.player.openerTip"),
      onClick: () => actions.onOpener(id),
    },
    {
      key: "closer",
      icon: "closer" as const,
      pressed: closer,
      label: closer ? t("crates.player.closerClear") : t("crates.player.closer"),
      tip: closer ? t("crates.player.closerClearTip") : t("crates.player.closerTip"),
      onClick: () => actions.onCloser(id),
    },
    {
      key: "delete",
      icon: "remove" as const,
      pressed: false,
      danger: true,
      label: t("crates.player.delete"),
      tip: t("crates.player.deleteTip"),
      onClick: () => actions.onDelete(id),
    },
  ];
  return (
    <div
      className="preview-actions"
      role="group"
      aria-label={t("crates.player.actions", { name })}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {buttons.map((button) => (
        <Tip key={button.key} text={button.tip}>
          <button
            type="button"
            className={button.danger ? "is-danger" : undefined}
            aria-pressed={button.key === "delete" ? undefined : button.pressed}
            aria-label={button.label}
            onClick={(event) => {
              event.stopPropagation();
              button.onClick();
            }}
          >
            <ActionIcon name={button.icon} />
          </button>
        </Tip>
      ))}
    </div>
  );
}

type LocalIssue = "missing" | "unsupported" | "error" | null;

type PlayerPlace = { x: number; y: number };

const PLAYER_MARGIN = 8;
const MIN_PLAYER_H = 220;

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
  width,
  height,
  blendMs,
  onPlace,
  onWidth,
  onHeight,
  onChange,
  onClose,
  onStickMediaLost,
  rehearsal,
  actions,
  onCues,
}: {
  track: PlayTrack;
  tracks: PlayTrack[];
  stickEpoch: number;
  place: PlayerPlace | null;
  width: number | null;
  height: number | null;
  blendMs: number;
  onPlace: (place: PlayerPlace) => void;
  onWidth: (width: number) => void;
  onHeight: (height: number) => void;
  onChange: (id: string) => void;
  onClose: () => void;
  onStickMediaLost?: () => void;
  rehearsal?: Rehearsal | null;
  actions?: PlayerTrackActions | null;
  onCues?: (id: string, cues: TrackCue[]) => void;
}) {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{ id: number; startX: number; startW: number } | null>(null);
  const resizeYRef = useRef<{ id: number; startY: number; startH: number; top: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [cueNotice, setCueNotice] = useState<string | null>(null);
  const [fileBeats, setFileBeats] = useState<AnlzBeat[] | null>(null);
  const [gridMissing, setGridMissing] = useState(false);
  const [gridReading, setGridReading] = useState(false);
  const [indexWalk, setIndexWalk] = useState<StickIndexWalk | null>(null);
  const [phrases, setPhrases] = useState<AnlzPhrase[] | null>(null);
  const [phrasesMissing, setPhrasesMissing] = useState(false);
  const [quantize, setQuantize] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [light, setLight] = useState(false);
  const [gridNotice, setGridNotice] = useState<string | null>(null);
  const [gridAnalyzing, setGridAnalyzing] = useState(false);
  const [gridUndo, setGridUndo] = useState<AnlzBeat[] | null | undefined>(undefined);
  const beatsRef = useRef<AnlzBeat[] | null>(null);
  const phrasesRef = useRef<AnlzPhrase[] | null>(null);
  const shifting = useRef(false);
  const analyzing = useRef(false);
  const analyzeToken = useRef(0);
  const openTrack = useRef(track.id);
  useEffect(() => {
    beatsRef.current = fileBeats;
    phrasesRef.current = phrases;
    openTrack.current = track.id;
  }, [fileBeats, phrases, track.id]);
  const stickHandleEpoch = useStickHandleEpoch();
  const filePath = trackFilePath(track);
  const fileBase = stickAudioBaseName(filePath);
  const seed = initialAudio(filePath, fileBase, track.name);
  const [src, setSrc] = useState<string | null>(seed.src);
  const [localIssue, setLocalIssue] = useState<LocalIssue>(seed.issue);
  const [playing, setPlaying] = useState(false);
  const hadStickSrc = useRef(Boolean(seed.src && filePath));
  const stickLostRef = useRef(onStickMediaLost);
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
    stickLostRef.current = onStickMediaLost;
  }, [onStickMediaLost]);

  const onCuesRef = useRef(onCues);
  const cueTimer = useRef<number | null>(null);
  const trackKey = track.id;
  const trackUri = track.uri;
  const cuesKnown = Boolean(track.cues);
  useEffect(() => {
    onCuesRef.current = onCues;
  }, [onCues]);
  useEffect(
    () => () => {
      if (cueTimer.current) window.clearTimeout(cueTimer.current);
    },
    [],
  );
  const gridRequest = `${trackKey}\0${trackUri ?? ""}\0${stickEpoch}\0${stickHandleEpoch}\0${filePath}`;
  const gridRequestRef = useRef(gridRequest);
  const [gridRequestSeen, setGridRequestSeen] = useState(gridRequest);
  if (gridRequest !== gridRequestSeen) {
    setGridRequestSeen(gridRequest);
    setFileBeats(null);
    setGridMissing(false);
    setGridReading(false);
    setIndexWalk(null);
    setPhrases(null);
    setPhrasesMissing(false);
    setGridNotice(null);
    setGridAnalyzing(false);
    setGridUndo(undefined);
  }
  useLayoutEffect(() => {
    gridRequestRef.current = gridRequest;
    analyzeToken.current += 1;
    analyzing.current = false;
  }, [gridRequest]);
  useEffect(() => {
    const pdbId = rekordboxTrackId({ id: trackKey, uri: trackUri }) ?? 0;
    const request = gridRequest;
    let cancel = false;
    let active: DirLike | null = null;
    const walks = new Map<DirLike, StickIndexWalk>();
    const stoppers: Array<() => void> = [];
    const showWalk = () => {
      if (cancel || gridRequestRef.current !== request) return;
      setIndexWalk(active ? (walks.get(active) ?? null) : null);
    };
    const listen = (root: DirLike) => {
      if (cancel) return;
      stoppers.push(
        subscribeStickIndexProgress(root, (walk) => {
          if (walk) walks.set(root, walk);
          else walks.delete(root);
          if (root === active) showWalk();
        }),
      );
    };
    // A read that finishes in this turn never paints the note. A real wait does.
    const showTimer = window.setTimeout(() => {
      if (!cancel) setGridReading(true);
    }, 0);
    void (async () => {
      try {
        const roots: DirLike[] = [];
        const volume = savedVolumeHandle();
        if (volume) {
          roots.push(volume);
          listen(volume);
        }
        try {
          const persisted = await loadPersistedStickHandle();
          if (
            persisted &&
            persisted !== volume &&
            !cancel &&
            (await stickPermission(persisted, "read", false))
          ) {
            roots.push(persisted);
            listen(persisted);
          }
        } catch {
          /* the saved volume is still tried above */
        }
        let found: AnlzBeat[] | null = null;
        let root: DirLike | null = null;
        // Only true when USBANLZ (or remembered ANLZ) matched this track.
        // A path miss must not paint "No Rekordbox beatgrid".
        let sawFile = false;
        for (const candidate of roots) {
          if (cancel) return;
          active = candidate;
          showWalk();
          try {
            const read = await readStickBeatGridDetail(candidate, pdbId, filePath);
            if (read.located) sawFile = true;
            if (read.beats?.length) {
              found = read.beats;
              root = candidate;
              break;
            }
          } catch {
            /* this folder could not be read; try the next one */
          }
        }
        if ((!found || found.length === 0) && !cancel) {
          try {
            const remembered = await readRememberedBeatGrid(pdbId, filePath);
            if (remembered?.length) {
              found = remembered;
              sawFile = true;
            }
          } catch {
            /* remembered files are unreadable */
          }
        }
        if (cancel) return;
        if (found?.length) {
          let phraseList = null as AnlzPhrase[] | null;
          try {
            if (root && !cancel) phraseList = await readStickPhrases(root, pdbId, found, filePath);
            if ((!phraseList || phraseList.length === 0) && !cancel) {
              phraseList = await readRememberedPhrases(pdbId, found, filePath);
            }
          } catch {
            phraseList = null;
          }
          if (cancel) return;
          setFileBeats(found);
          setGridMissing(false);
          setPhrases(phraseList);
          setPhrasesMissing(!phraseList?.length);
          return;
        }
        // A path miss is not the same as a file with no PQTZ tag.
        if (!sawFile) return;
        setFileBeats(null);
        setGridMissing(true);
        setPhrases(null);
        setPhrasesMissing(false);
      } finally {
        window.clearTimeout(showTimer);
        if (!cancel && gridRequestRef.current === request) {
          setGridReading(false);
          setIndexWalk(null);
        }
      }
    })();
    return () => {
      cancel = true;
      window.clearTimeout(showTimer);
      for (const stop of stoppers) stop();
    };
  }, [gridRequest, trackKey, trackUri, stickEpoch, stickHandleEpoch, filePath]);
  useEffect(() => {
    if (cuesKnown) return;
    const pdbId = rekordboxTrackId({ id: trackKey, uri: trackUri }) ?? 0;
    let cancel = false;
    void (async () => {
      let found: Awaited<ReturnType<typeof readStickHotCues>> = null;
      const root = await loadPersistedStickHandle();
      if (root && !cancel && (await stickPermission(root, "read", false))) {
        found = await readStickHotCues(root, pdbId, filePath);
      }
      if ((!found || found.length === 0) && !cancel) found = await readRememberedHotCues(pdbId, filePath);
      if (cancel || !found?.length) return;
      onCuesRef.current?.(
        trackKey,
        found.map((cue) => ({ slot: cue.slot, timeMs: cue.timeMs, name: cue.name })),
      );
    })();
    return () => {
      cancel = true;
    };
  }, [cuesKnown, trackKey, trackUri, stickEpoch, filePath]);

  function commitCues(next: TrackCue[]) {
    onCues?.(track.id, next);
    const pdbId = rekordboxTrackId(track) ?? 0;
    const setOnly = t("crates.player.cueSetOnly");
    const rejected = t("crates.player.cueRejected");
    if (cueTimer.current) window.clearTimeout(cueTimer.current);
    cueTimer.current = window.setTimeout(() => {
      cueTimer.current = null;
      void (async () => {
        const root = await loadPersistedStickHandle();
        if (!root || !(await stickPermission(root, "readwrite", true))) {
          setCueNotice(setOnly);
          return;
        }
        const status = await saveStickHotCues(root, pdbId, next, filePath);
        setCueNotice(status === "written" ? null : status === "rejected" ? rejected : setOnly);
      })();
    }, 400);
  }

  function shiftGrid(deltaMs: number) {
    if (shifting.current || analyzing.current || !deltaMs) return;
    const current = beatsRef.current;
    if (!current) return;
    const next = shiftBeatTimes(current, deltaMs);
    if (!next) return;
    const previous = current;
    const previousPhrases = phrasesRef.current;
    const moved = previousPhrases ? phrasesOnGrid(previousPhrases, next) : null;
    beatsRef.current = next;
    if (moved) phrasesRef.current = moved;
    setFileBeats(next);
    if (moved) setPhrases(moved);
    const pdbId = rekordboxTrackId(track) ?? 0;
    const shiftTrack = track.id;
    const kept = t("crates.player.gridSetOnly");
    const rejected = t("crates.player.gridRejected");
    shifting.current = true;
    void (async () => {
      try {
        const root = await loadPersistedStickHandle();
        if (openTrack.current !== shiftTrack) return;
        if (!root || !(await stickPermission(root, "readwrite", true))) {
          setGridNotice(kept);
          return;
        }
        const status = await saveStickBeatGrid(root, pdbId, deltaMs, filePath);
        if (status === "written") {
          setGridNotice(null);
          return;
        }
        if (status === "rejected") {
          beatsRef.current = previous;
          phrasesRef.current = previousPhrases;
          setFileBeats(previous);
          setPhrases(previousPhrases);
          setGridNotice(rejected);
          return;
        }
        setGridNotice(kept);
      } finally {
        shifting.current = false;
      }
    })();
  }

  function applyGrid(next: AnlzBeat[] | null, missing: boolean) {
    beatsRef.current = next;
    setFileBeats(next);
    setGridMissing(missing);
  }

  function analyzeGrid() {
    if (analyzing.current || shifting.current || !src) return;
    analyzing.current = true;
    const token = analyzeToken.current + 1;
    analyzeToken.current = token;
    const analyzeTrack = track.id;
    const kept = t("crates.player.gridSetOnly");
    const rejected = t("crates.player.gridRejected");
    const failed = t("crates.player.gridAnalyzeFailed");
    setGridAnalyzing(true);
    setGridNotice(null);
    void (async () => {
      try {
        const grid = await analyzeSourceGrid(src);
        if (analyzeToken.current !== token || openTrack.current !== analyzeTrack) return;
        const current = beatsRef.current;
        const previous = current ? current.map((beat) => ({ ...beat })) : null;
        const first = gridUndo === undefined;
        if (first) setGridUndo(previous);
        applyGrid(grid, false);
        const pdbId = rekordboxTrackId(track) ?? 0;
        const root = await loadPersistedStickHandle();
        if (analyzeToken.current !== token || openTrack.current !== analyzeTrack) return;
        if (!root || !(await stickPermission(root, "readwrite", true))) {
          setGridNotice(kept);
          return;
        }
        const status = await saveStickAnalyzedGrid(root, pdbId, grid, filePath);
        if (analyzeToken.current !== token || openTrack.current !== analyzeTrack) return;
        if (status === "written") {
          setGridNotice(null);
          return;
        }
        if (status === "rejected") {
          applyGrid(previous, previous == null);
          if (first) setGridUndo(undefined);
          setGridNotice(rejected);
          return;
        }
        setGridNotice(kept);
      } catch {
        if (analyzeToken.current !== token || openTrack.current !== analyzeTrack) return;
        setGridNotice(failed);
      } finally {
        if (analyzeToken.current === token) {
          analyzing.current = false;
          setGridAnalyzing(false);
        }
      }
    })();
  }

  function undoAnalyzedGrid() {
    if (gridUndo === undefined || analyzing.current || shifting.current) return;
    const snapshot = gridUndo;
    const shown = beatsRef.current ? beatsRef.current.map((beat) => ({ ...beat })) : null;
    const undoTrack = track.id;
    setGridUndo(undefined);
    if (snapshot == null) {
      applyGrid(null, true);
      setGridNotice(null);
      return;
    }
    applyGrid(snapshot, false);
    const pdbId = rekordboxTrackId(track) ?? 0;
    const kept = t("crates.player.gridSetOnly");
    const rejected = t("crates.player.gridRejected");
    shifting.current = true;
    void (async () => {
      try {
        const root = await loadPersistedStickHandle();
        if (openTrack.current !== undoTrack) return;
        if (!root || !(await stickPermission(root, "readwrite", true))) {
          setGridNotice(kept);
          return;
        }
        const status = await saveStickAnalyzedGrid(root, pdbId, snapshot, filePath);
        if (openTrack.current !== undoTrack) return;
        if (status === "written") {
          setGridNotice(null);
          return;
        }
        if (status === "rejected") {
          applyGrid(shown, shown == null);
          setGridUndo(snapshot);
          setGridNotice(rejected);
          return;
        }
        setGridNotice(kept);
      } finally {
        shifting.current = false;
      }
    })();
  }

  useEffect(() => {
    reportPreviewPlayback(track.id, playing);
    return () => reportPreviewPlayback(null, false);
  }, [track.id, playing]);

  useEffect(() => {
    function onStickWillEject() {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      setPlaying(false);
      setSrc(null);
      hadStickSrc.current = false;
    }
    window.addEventListener("setbuilder-stick-will-eject", onStickWillEject);
    return () => window.removeEventListener("setbuilder-stick-will-eject", onStickWillEject);
  }, []);

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
    if (quick.kind === "url") hadStickSrc.current = true;

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
        hadStickSrc.current = true;
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
  const neighbors = playerNeighbors(tracks, actions?.excludedIds, track.id);
  const prev = neighbors.prev;
  const next = neighbors.next;
  const inPerformance = lane.some((item) => item.id === track.id);
  const inSet = Boolean(actions?.trackIds.includes(track.id));
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

  function onResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const card = cardRef.current;
    if (!card) return;
    resizeRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startW: card.getBoundingClientRect().width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  }

  function onResizeMove(event: ReactPointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current;
    if (!resize || resize.id !== event.pointerId) return;
    const max = window.innerWidth - PLAYER_MARGIN * 2;
    const next = resize.startW + (event.clientX - resize.startX);
    onWidth(Math.round(Math.min(max, Math.max(22 * 16, next))));
  }

  function onResizeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (resizeRef.current?.id !== event.pointerId) return;
    resizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onResizeYStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    resizeYRef.current = {
      id: event.pointerId,
      startY: event.clientY,
      startH: rect.height,
      top: rect.top,
    };
    if (!place) onPlace(clampPlace(rect.left, rect.top, rect.width, rect.height));
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  }

  function onResizeYMove(event: ReactPointerEvent<HTMLDivElement>) {
    const resize = resizeYRef.current;
    if (!resize || resize.id !== event.pointerId) return;
    const max = Math.max(MIN_PLAYER_H, window.innerHeight - resize.top - PLAYER_MARGIN);
    const next = resize.startH + (event.clientY - resize.startY);
    onHeight(Math.round(Math.min(max, Math.max(MIN_PLAYER_H, next))));
  }

  function onResizeYEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (resizeYRef.current?.id !== event.pointerId) return;
    resizeYRef.current = null;
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

  const deckClock = useRef({
    time: 0,
    duration: 0,
    bpm: "",
    beats: null as AnlzBeat[] | null,
    trackMs: 0,
  });
  useEffect(() => {
    const clock = deckClock.current;
    clock.time = currentTime;
    clock.duration = duration;
    clock.bpm = track.bpm || "";
    clock.beats = fileBeats;
    clock.trackMs = track.durationMs ?? 0;
  }, [currentTime, duration, track.bpm, fileBeats, track.durationMs]);

  useEffect(() => {
    function typing(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.getAttribute("role") === "slider") return true;
      if (target instanceof HTMLButtonElement) return true;
      if (target instanceof HTMLInputElement) {
        const type = target.type;
        return type !== "button" && type !== "checkbox" && type !== "radio" && type !== "file";
      }
      return false;
    }
    function spanSeconds(audio: HTMLAudioElement | null): number {
      const clock = deckClock.current;
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
      if (clock.duration > 0) return clock.duration;
      return clock.trackMs > 0 ? clock.trackMs / 1000 : 0;
    }
    function place(seconds: number, audio: HTMLAudioElement | null) {
      const span = spanSeconds(audio);
      if (span <= 0) return;
      const next = Math.min(span, Math.max(0, seconds));
      if (audio && src) audio.currentTime = next;
      setCurrentTime(next);
    }
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      if (typing(event.target)) return;
      const audio = audioRef.current;
      if (event.code === "Space") {
        if (event.repeat || !audio || !src) return;
        event.preventDefault();
        if (audio.paused) {
          void audio.play().then(
            () => setPlaying(true),
            () => setPlaying(false),
          );
        } else {
          audio.pause();
          setPlaying(false);
        }
        return;
      }
      if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
      const span = spanSeconds(audio);
      if (span <= 0) return;
      event.preventDefault();
      const clock = deckClock.current;
      const marks = clock.beats ?? [];
      const nowMs = (audio && src ? audio.currentTime : clock.time) * 1000;
      const nextMs = barJump(nowMs, span * 1000, marks, event.code === "ArrowRight" ? 1 : -1);
      place(nextMs / 1000, audio);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src]);

  const placed = {
    ...(place
      ? {
          "--player-x": `${place.x}px`,
          "--player-y": `${place.y}px`,
          "--player-bottom": "auto",
          "--player-right": "auto",
        }
      : {}),
    ...(width ? { "--player-w": `${width}px` } : {}),
    ...(height ? { "--player-h": `${height}px` } : {}),
  } as CSSProperties;

  return (
    <aside
      ref={cardRef}
      className={["preview-player", dragging ? "is-dragging" : "", light ? "is-light" : ""]
        .filter(Boolean)
        .join(" ")}
      style={placed}
      aria-label={t("crates.player.ariaLabel")}
    >
      <div className="preview-dock">
        <div className="preview-body">
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
                {(track.durationMs ?? 0) > 0 ? ` · ${formatTime((track.durationMs ?? 0) / 1000)}` : ""}
                {hasKnownEnergy(track)
                  ? ` · ${t("crates.player.energy", { level: track.energyLevel ?? 0 })}`
                  : ""}
                {hasStickLabel ? " · Stick" : embed ? ` · ${embed.label}` : ""}
              </span>
              {nextJoin && !rehearsal ? (
                <em className={`mix-join harm-${nextJoin.relation}`}>
                  {t("crates.player.then", { join: nextJoin.label })}
                </em>
              ) : null}
              {actions && inSet ? <TrackMarks id={track.id} actions={actions} /> : null}
            </div>
          </div>
          <div className="preview-chrome">
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
            <Tip text={t("crates.player.closeTip")}>
              <button
                type="button"
                className="preview-close"
                onClick={onClose}
                aria-label={t("crates.player.close")}
              >
                ×
              </button>
            </Tip>
          </div>
          {actions && inSet ? (
            <TrackActions id={track.id} name={track.name} actions={actions} />
          ) : null}
        </div>
        </div>

        {src || (track.durationMs ?? 0) > 0 ? (
          <div className="preview-seek">
            {src ? (
              <audio
                ref={audioRef}
                className="preview-audio-hidden"
                src={src}
                preload="auto"
                onPlay={() => setPlaying(true)}
                onPause={() => {
                  setPlaying(false);
                  setCurrentTime(audioRef.current?.currentTime ?? 0);
                }}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
                onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
                onEnded={() => {
                  setPlaying(false);
                  setCurrentTime(audioRef.current?.currentTime ?? 0);
                  if (next) onChange(next.id);
                }}
                onError={() => {
                  setLocalIssue("error");
                  setSrc(null);
                  if (filePath && hadStickSrc.current) stickLostRef.current?.();
                }}
              />
            ) : null}
            <WaveformDeck
              src={src ?? ""}
              currentTime={currentTime}
              duration={duration || (track.durationMs ?? 0) / 1000}
              playing={playing}
              mediaRef={audioRef}
              beats={fileBeats}
              bpm={track.bpm || ""}
              fallback={gridMissing}
              gridNote={gridMissing ? t("crates.player.gridMissing") : null}
              gridReadingNote={
                gridAnalyzing
                  ? t("crates.player.gridAnalyzing")
                  : gridReading && !gridMissing
                    ? formatGridReadingNote(indexWalk, {
                        reading: t("crates.player.gridReading"),
                        first: t("crates.player.gridReadingFirst"),
                        withPercent: (percent) =>
                          t("crates.player.gridReadingFirstPercent", { percent }),
                      })
                    : null
              }
              cues={track.cues ?? []}
              cueSession={track.id}
              quantize={quantize}
              onQuantize={setQuantize}
              showGrid={showGrid}
              onShowGrid={setShowGrid}
              light={light}
              onLight={setLight}
              phrases={phrases}
              phrasesReady={gridMissing || phrasesMissing || phrases !== null}
              phraseNote={phrasesMissing ? t("crates.player.phrasesMissing") : null}
              onShiftGrid={shiftGrid}
              onAnalyzeGrid={analyzeGrid}
              onUndoGrid={undoAnalyzedGrid}
              analyzingGrid={gridAnalyzing}
              canUndoGrid={gridUndo !== undefined}
              canAnalyzeGrid={Boolean(src) && !gridAnalyzing && !gridReading}
              notice={gridNotice ?? cueNotice}
              onPause={() => {
                const audio = audioRef.current;
                if (audio) audio.pause();
                setPlaying(false);
              }}
              onSeek={(nextTime) => {
                const audio = audioRef.current;
                if (audio) audio.currentTime = nextTime;
                setCurrentTime(nextTime);
              }}
              onPlay={(nextTime) => {
                const audio = audioRef.current;
                if (audio) {
                  audio.currentTime = nextTime;
                  void audio.play().then(
                    () => setPlaying(true),
                    () => setPlaying(false),
                  );
                }
                setCurrentTime(nextTime);
              }}
              onCues={commitCues}
            />
            {src ? null : (
              <p className="player-fallback">
                {localIssue === "unsupported"
                  ? t("crates.player.unsupportedFormat")
                  : localIssue === "error"
                    ? t("crates.player.loadFailed")
                    : t("crates.player.pickStick")}
              </p>
            )}
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
        {rehearsal && (inPerformance || inSet) ? (
          <div className="preview-rehearse">
            <div className="preview-join">
              {(
                [
                  ["before", prev, t("crates.player.joinBefore")],
                  ["now", track, t("crates.player.joinNow")],
                  ["after", next, t("crates.player.joinAfter")],
                ] as const
              ).map(([role, item, label]) => {
                const meta = item
                  ? [item.keyCamelot, item.bpm].filter(Boolean).join(" · ")
                  : "";
                return (
                  <div
                    key={role}
                    className={role === "now" ? "preview-join-card is-now" : "preview-join-card"}
                    aria-current={role === "now" ? "true" : undefined}
                  >
                    <button
                      type="button"
                      className="preview-join-main"
                      disabled={!item || role === "now"}
                      onClick={() => item && role !== "now" && onChange(item.id)}
                    >
                      <small>{label}</small>
                      <strong>{item?.name || t("crates.player.rehearseEdge")}</strong>
                      <em>{meta || t("crates.player.rehearseEdge")}</em>
                      {role === "after" && nextJoin ? (
                        <b className={`mix-join harm-${nextJoin.relation}`}>{nextJoin.label}</b>
                      ) : null}
                      {item && actions ? <TrackMarks id={item.id} actions={actions} /> : null}
                    </button>
                    {item && actions && role !== "now" ? (
                      <TrackActions id={item.id} name={item.name} actions={actions} />
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="preview-plan">
              <label className="preview-plan-row">
                <span>{t("crates.player.planned")}</span>
                <select
                  className="preview-transition"
                  aria-label={t("crates.player.transition")}
                  title={transitionHint(t, track.transition ?? "unset")}
                  value={track.transition ?? "unset"}
                  onChange={(event) => {
                    const next = event.currentTarget.value as TransitionVerb;
                    if ((track.transition ?? "unset") === next) return;
                    rehearsal.onTransition(track.id, next);
                  }}
                >
                  {TRANSITIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {transitionLabel(t, item.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="preview-length">
                <span>{t("crates.player.length")}</span>
                <OverlapField
                  className="preview-overlap"
                  transition={track.transition}
                  overlapMs={track.overlapMs}
                  blendMs={blendMs}
                  durationMs={track.durationMs}
                  title={t("crates.player.overlapTitle")}
                  ariaLabel={t("crates.player.length")}
                  onCommit={(ms) => rehearsal.onOverlap(track.id, ms)}
                />
              </label>
              <label className="preview-note-field">
                <span>{t("crates.player.note")}</span>
                <input
                  className="preview-note"
                  type="text"
                  value={track.comment || ""}
                  placeholder={t("crates.player.notePlaceholder")}
                  title={t("crates.player.note")}
                  onChange={(event) => rehearsal.onNote(track.id, event.currentTarget.value)}
                />
              </label>
            </div>
          </div>
        ) : null}
        </div>
        <div
          className="preview-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("crates.player.resize")}
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
        />
        <div
          className="preview-resize-y"
          role="separator"
          aria-orientation="horizontal"
          aria-label={t("crates.player.resizeHeight")}
          onPointerDown={onResizeYStart}
          onPointerMove={onResizeYMove}
          onPointerUp={onResizeYEnd}
          onPointerCancel={onResizeYEnd}
        />
      </div>
    </aside>
  );
}

export function PreviewPlayer({
  tracks,
  currentId,
  onChange,
  onClose,
  blendMs = BLEND_MS,
  rehearsal,
  actions,
  onStickMediaLost,
  onCues,
}: Props) {
  const isClient = useIsClient();
  const stickEpoch = useStickFilesEpoch();
  const [place, setPlace] = useState<PlayerPlace | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [heightFor, setHeightFor] = useState(currentId);
  if (currentId !== heightFor) {
    setHeightFor(currentId);
    setHeight(null);
  }
  const track = tracks.find((item) => item.id === currentId) ?? null;
  if (!isClient || !track) return null;

  return createPortal(
    <PreviewDock
      key={`${track.id}:${stickEpoch}`}
      track={track}
      tracks={tracks}
      stickEpoch={stickEpoch}
      place={place}
      width={width}
      height={height}
      blendMs={blendMs}
      onPlace={setPlace}
      onWidth={setWidth}
      onHeight={setHeight}
      onChange={onChange}
      onClose={onClose}
      onStickMediaLost={onStickMediaLost}
      rehearsal={rehearsal}
      actions={actions}
      onCues={onCues}
    />,
    document.body,
  );
}
