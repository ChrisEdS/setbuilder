"use client";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import {
  createTranslate,
  errorText,
  localizeWhy,
  phaseHint,
  phaseLabel,
  roleHint,
  roleLabel,
  slotHint,
  slotLabel,
  transitionHint,
  transitionLabel,
  type Translate,
} from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { ConnectionSetup } from "@/components/ConnectionSetup";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";
import { Hint, Tip } from "@/components/Hint";
import { EnergyPath } from "@/components/EnergyPath";
import { HarmonicPath } from "@/components/HarmonicPath";
import { LibraryBrowser, LibraryPanel } from "@/components/LibraryPanel";
import { StickSetList, type StickStatusSlice } from "@/components/RekordboxStick";
import { GigReadyDialog } from "@/components/GigReadyDialog";
import { PlaylistLoadDialog } from "@/components/PlaylistLoadDialog";
import { ResetSetDialog } from "@/components/ResetSetDialog";
import { StickDisconnectDialog } from "@/components/StickDisconnectDialog";
import { AppUpdateCard } from "@/components/AppUpdateCard";
import { OverlapField } from "@/components/OverlapField";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import {
  getPreviewTransportSnapshot,
  requestPreviewPause,
  requestPreviewResume,
  subscribePreviewTransport,
} from "@/lib/preview-transport";
import { PlaceInSetMenu } from "@/components/PlaceInSetMenu";
import { ReplaceMenu } from "@/components/ReplaceMenu";
import { SetGuideDrawer } from "@/components/SetGuideDrawer";
import { clearBodyScrollLock } from "@/lib/ui-scroll-lock";
import type { LibraryRow } from "@/components/LibraryPanel";
import {
  draftWithPlaylistPool,
  historyPoolCount,
  libraryTrackToSetTrack,
  mediaPathsForDraft,
  playlistPoolForDraft,
  readRekordboxStick,
  rehydrateStickCovers,
  reshufflePoolForDraft,
  sourcePoolFromStickLibrary,
  stickLibraryPoolCount,
  stickLibraryRows,
  type RekordboxStickSet,
  type StickTrack,
} from "@/lib/rekordbox-stick";
import {
  hydrateStickMedia,
  loadPersistedStickHandle,
  pickAndRememberStick,
  readStickFromHandle,
  stickPermission,
} from "@/lib/stick-session";
import { probeStickAlive } from "@/lib/stick-alive";
import {
  getStickFilesEpoch,
  rememberStickFiles,
  stickFileCount,
  stickFileInSession,
  subscribeStickFiles,
} from "@/lib/stick-audio";
import {
  applyCoverUrls,
  applyEnergyLevels,
  applyMeasuredEnergy,
  applyRereadEnergyLevels,
  ensureStickWriteAccess,
  energyTagFromFile,
  missingCoversFromFiles,
  missingEnergyFromFiles,
  isWritableMp3,
  resolveTrackAudio,
  writeVerifiedStickFileBytes,
} from "@/lib/stick-file";
import { analyzeFileEnergy } from "@/lib/openkey/client";
import {
  enqueueWork,
  getWorkQueueSnapshot,
  yieldToUi,
  type WorkJob,
} from "@/lib/work-queue";
import { useLiveWorkQueue, workQueueStatus } from "@/lib/work-queue-react";
import { applyPlaylistLoad, undoPlaylistLoad } from "@/lib/playlist-load";
import { writeEnergy } from "@/lib/openkey/writeEnergy";
import {
  decodeStoredDraft,
  encodeStoredDraft,
  normalizeDraftTrack,
  uniqueIncomingDraftTracks,
} from "@/lib/draft-codec";
import { ActionIcon } from "@/components/ActionIcon";
import { TrackArt } from "@/components/TrackArt";
import { bestPhaseFor } from "@/lib/plan-b";
import {
  SetEnergyMenu,
  SetMenus,
  SetReshuffleMenu,
  SetSortMenu,
  SetTools,
  TrackEnergyMenu,
  type PoolOffer,
  type ReshuffleSource,
} from "@/components/SetTakeaway";
import { StickWriteDialog } from "@/components/StickWriteDialog";
import { RoleCrates } from "@/components/RoleCrates";
import {
  boothFileName,
  buildM3u,
  buildRekordboxXml,
  downloadText,
} from "@/lib/export-booth";
import { openSetPdfExport } from "@/lib/export-pdf";
import { pickStreamingMatch } from "@/lib/match-link";
import { swapIntoSlot } from "@/lib/replace-track";
import { CAMELOT_CODES, mixJoin, relationHint, trackDetailsSummary } from "@/lib/harmonic";
import {
  alternativesPulledIntoPerformance,
  distributeRoles,
  fillWithBestMatches,
  fitToSlot,
  reorderDraft,
  reshuffleDraftFromPool,
  undoTrimToSlot,
  type TrimRestore,
} from "@/lib/extract-set";
import {
  applySetAnchors,
  clearCloser,
  clearOpener,
  pinCloser,
  pinOpener,
  normalizeExcludedIds,
  placeInPerformance,
  toggleExclude,
  toggleKeepPin,
  withoutEndPins,
} from "@/lib/set-anchors";
import { energyStatusLine, hasKnownEnergy } from "@/lib/energy";
import { assessGigReady } from "@/lib/gig-ready";
import type { StickHealth } from "@/lib/stick-health";
import type { SetSortTechnique } from "@/lib/sort-set";
import { looksLikeMusicLink, sourceLabel } from "@/lib/music-link";
import {
  DEFAULT_SET,
  PHASES,
  SLOT_KINDS,
  TRACK_ROLES,
  TRANSITIONS,
  arcGuideFor,
  extractStepsFor,
  prepPrinciplesFor,
  type SetDraft,
  type SetPhaseId,
  type SetSlotKind,
  type SetTrack,
  type SourcePoolTrack,
  type TrackRole,
  type TransitionVerb,
  BLEND_PRESETS,
  artistLine,
  blendMsOf,
  exportSetText,
  formatDuration,
  performanceTracks,
  transitionOverlapPatch,
  phaseDurationMs,
  phaseWindowLabel,
  playedTotalMs,
  trackPlayedMs,
  setPositionById,
  trackCount,
} from "@/lib/set";
import {
  DRAFT_EVENT,
  DRAFT_STORAGE_KEY as STORAGE_KEY,
  DRAFT_STORAGE_KEY_LEGACY,
  DRAFT_STORAGE_KEY_V3_LEGACY,
  readLocal,
  SETUPS_EVENT,
  SETUPS_STORAGE_KEY as SETUPS_KEY,
  SETUPS_STORAGE_KEY_LEGACY,
  writeLocal,
} from "@/lib/storage-keys";

function MixJoinLine({ tracks, track }: { tracks: SetTrack[]; track: SetTrack }) {
  const { t } = useI18n();
  const index = tracks.findIndex((item) => item.id === track.id);
  const join = index > 0 ? mixJoin(tracks[index - 1], track, t) : null;
  if (!join) return null;
  return (
    <p
      className={`mix-join harm-${join.relation}`}
      title={relationHint(join.relation, t)}
    >
      {join.label}
    </p>
  );
}

type SearchTrack = {
  id: string;
  name: string;
  uri: string;
  durationMs: number;
  artists: string[];
  album: string;
  imageUrl: string | null;
  externalUrl: string;
  source?: "spotify" | "tidal" | "soundcloud" | "beatport" | "manual";
};

/** Brief duration in minutes: a short warm-up up to an all-nighter. */
const MIN_DURATION = 20;
const MAX_DURATION = 480;

type SavedSetup = {
  id: string;
  name: string;
  savedAt: string;
  draft: SetDraft;
};

let cachedRaw: string | null | undefined;
let cachedDraft: SetDraft = DEFAULT_SET;
/** Whether the last draft write reached storage (quota, private mode …). */
let draftPersisted = true;

function normalizeTrack(track: SetTrack): SetTrack {
  return normalizeDraftTrack(track) ?? track;
}

function readStoredDraft(): SetDraft {
  // Storage refused the last write: the session copy is the truth.
  if (!draftPersisted) return cachedDraft;
  try {
    const raw =
      readLocal(STORAGE_KEY, DRAFT_STORAGE_KEY_LEGACY) ??
      localStorage.getItem(DRAFT_STORAGE_KEY_V3_LEGACY);
    if (raw === cachedRaw) return cachedDraft;
    cachedRaw = raw;
    if (!raw) {
      cachedDraft = DEFAULT_SET;
      return cachedDraft;
    }
    const parsed = decodeStoredDraft(raw);
    if (!parsed) {
      cachedDraft = DEFAULT_SET;
      return cachedDraft;
    }
    cachedDraft = parsed;
    const cleanRaw = JSON.stringify(cachedDraft);
    if (cleanRaw !== raw) {
      writeLocal(STORAGE_KEY, cleanRaw);
      cachedRaw = cleanRaw;
    }
    return cachedDraft;
  } catch {
    cachedDraft = DEFAULT_SET;
    return cachedDraft;
  }
}

function subscribeDraft(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(DRAFT_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(DRAFT_EVENT, handler);
  };
}

type AuthNote = { status: "ok" | "error"; code: string };

// Only the raw result of the OAuth return is cached; the text is made at render time in the current language.
let authNoteCache: AuthNote | null | undefined;

function readAuthNote(): AuthNote | null {
  if (authNoteCache !== undefined) return authNoteCache;
  const params = new URLSearchParams(window.location.search);
  const auth = params.get("auth");
  if (auth === "ok") {
    authNoteCache = { status: "ok", code: "" };
  } else if (auth === "error") {
    authNoteCache = { status: "error", code: params.get("message") || "" };
  } else {
    authNoteCache = null;
  }
  return authNoteCache;
}

function authFailureText(code: string, t: Translate): string {
  if (!code) return t("builder.auth.spotifyFailed", { message: t("common.unknown") });
  if (code === "invalid_state") return t("builder.auth.invalidState");
  if (code === "tidal_state") return t("builder.auth.tidalState");
  if (code.startsWith("tidal_")) {
    return t("builder.auth.tidalFailed", { error: code.slice("tidal_".length) });
  }
  return t("builder.auth.spotifyFailed", { message: code });
}

function authNoteText(note: AuthNote, t: Translate): string {
  return note.status === "ok" ? t("builder.auth.ok") : authFailureText(note.code, t);
}

const EMPTY_SETUPS: SavedSetup[] = [];
let setupsRaw: string | null = null;
let setupsSnap: SavedSetup[] = EMPTY_SETUPS;

function readSetupsSnapshot(): SavedSetup[] {
  let raw = "[]";
  try {
    raw = readLocal(SETUPS_KEY, SETUPS_STORAGE_KEY_LEGACY) || "[]";
  } catch {
    // storage blocked: no saved setups
  }
  if (raw === setupsRaw) return setupsSnap;
  setupsRaw = raw;
  try {
    const parsed = JSON.parse(raw) as SavedSetup[];
    setupsSnap = Array.isArray(parsed) ? parsed : [];
  } catch {
    setupsSnap = [];
  }
  return setupsSnap;
}

function subscribeSetups(onStoreChange: () => void) {
  window.addEventListener(SETUPS_EVENT, onStoreChange);
  return () => window.removeEventListener(SETUPS_EVENT, onStoreChange);
}

function writeSetups(setups: SavedSetup[]): boolean {
  const raw = JSON.stringify(setups);
  let stored = true;
  try {
    writeLocal(SETUPS_KEY, raw);
  } catch {
    stored = false;
  }
  // The list follows the change either way; the caller says when it did not persist.
  setupsRaw = raw;
  setupsSnap = setups;
  window.dispatchEvent(new Event(SETUPS_EVENT));
  return stored;
}

function persistDraft(draft: SetDraft) {
  const raw = encodeStoredDraft(draft);
  try {
    writeLocal(STORAGE_KEY, raw);
    draftPersisted = true;
  } catch {
    // The set keeps working for this session; the UI is told below.
    draftPersisted = false;
  }
  cachedRaw = raw;
  cachedDraft = draft;
  window.dispatchEvent(new Event(DRAFT_EVENT));
}

type NoticeScope =
  | "connect"
  | "settings"
  | "library"
  | "crate"
  | "playlist"
  | "beatport"
  | "export";

/** Skip status paints that would redraw the whole page on every file. */
function shouldPaint(stamp: { at: number }, final: boolean): boolean {
  const now = Date.now();
  if (!final && now - stamp.at < 400) return false;
  stamp.at = now;
  return true;
}

function historyLibraryRows(sets: RekordboxStickSet[]): LibraryRow[] {
  const rows: LibraryRow[] = [];
  for (const set of sets) {
    if (set.kind !== "history") continue;
    for (const track of set.tracks) {
      rows.push({
        artist: track.artist,
        title: track.title,
        key: track.keyCamelot || track.keyRaw,
        bpm: track.bpm,
        energy: track.energyLevel,
        stick: track,
      });
    }
  }
  return rows;
}

function poolOffer(count: number, performanceCount: number): PoolOffer {
  if (count < 2) return { ready: false, reason: "missing" };
  if (count <= performanceCount) return { ready: false, reason: "small" };
  return { ready: true, count };
}

export function SetBuilder() {
  const { t } = useI18n();
  const draft = useSyncExternalStore(
    subscribeDraft,
    readStoredDraft,
    () => DEFAULT_SET,
  );
  const [activePhase, setActivePhase] = useState<SetPhaseId>("open");
  const [activeRole, setActiveRole] = useState<TrackRole>("anchor");
  const [query, setQuery] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addTab, setAddTab] = useState<"search" | "link" | "manual" | "auto">(
    "link",
  );
  const [crateView, setCrateView] = useState<"list" | "roles" | "keys">("list");
  const [stickOpen, setStickOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [rehearsal, setRehearsal] = useState(false);
  const [stickHealth, setStickHealth] = useState<StickHealth | null>(null);
  const [pendingTake, setPendingTake] = useState<"stick" | "pdf" | "copy" | "xml" | "m3u" | null>(
    null,
  );
  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");
  const [manualLink, setManualLink] = useState("");
  const [tidalPlaylists, setTidalPlaylists] = useState<
    Array<{ id: string; name: string; trackCount: number | null }>
  >([]);
  const [crateSource, setCrateSource] = useState<string | null>(null);
  const [results, setResults] = useState<SearchTrack[]>([]);
  const [notice, setNotice] = useState<(FieldNotice & { scope: NoticeScope }) | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const setups = useSyncExternalStore(
    subscribeSetups,
    readSetupsSnapshot,
    () => EMPTY_SETUPS,
  );
  const [selectedSetup, setSelectedSetup] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [tidalConnected, setTidalConnected] = useState<boolean | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const previewTransport = useSyncExternalStore(
    subscribePreviewTransport,
    getPreviewTransportSnapshot,
    getPreviewTransportSnapshot,
  );
  const [libraryPreview, setLibraryPreview] = useState<SetTrack | null>(null);
  const [libraryRows, setLibraryRows] = useState<LibraryRow[]>([]);
  const [stickSets, setStickSets] = useState<RekordboxStickSet[]>([]);
  const devLibraryLoaded = useRef(false);
  const [matchingLinks, setMatchingLinks] = useState(false);
  const [analyzingEnergy, setAnalyzingEnergy] = useState(false);
  const workQueue = useLiveWorkQueue();
  const liveJobs = workQueue.jobs;
  const energyPendingIds = workQueue.energyPendingIds;
  const energyBusy =
    analyzingEnergy || workQueue.energyBusy;
  const [stickReady, setStickReady] = useState(false);
  const [stickLostOpen, setStickLostOpen] = useState(false);
  const stickLostOpenRef = useRef(false);
  stickLostOpenRef.current = stickLostOpen;
  const resumePreviewAfterStick = useRef(false);
  const stickGoneStreak = useRef(0);
  const chooseStickRef = useRef<(() => void) | null>(null);
  // Long work (stick read, tag scan, sort) keeps the status line up until it finishes.
  const statusHold = useRef(0);
  const [statusHeld, setStatusHeld] = useState(false);
  const stickJob = useRef(0);
  const energyJob = useRef(0);
  const saveSetupAnchor = useRef<HTMLLabelElement>(null);
  const [pendingStickSet, setPendingStickSet] = useState<RekordboxStickSet | null>(
    null,
  );
  const [replaceUndo, setReplaceUndo] = useState<SetDraft | null>(null);
  const [trimUndo, setTrimUndo] = useState<TrimRestore[] | null>(null);
  /** Full draft before the last Sortieren that actually changed order. */
  const [sortUndo, setSortUndo] = useState<SetDraft | null>(null);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  const [exchangeFor, setExchangeFor] = useState<string | null>(null);
  const [placeFor, setPlaceFor] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  /** Setliste: tracks whose key, BPM, energy and comment fields are open */
  const [openDetails, setOpenDetails] = useState<Set<string>>(() => new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<TrackRole | "all">("all");
  // Notes from ConnectionSetup: the two known ones are kept as a kind and shown in the current language.
  const [settingsNote, setSettingsNote] = useState<
    "ready" | "missing" | { raw: string } | null
  >(null);
  // null = not touched yet: then a failed OAuth return opens the fold so the fix is in view.
  const [settingsOpenState, setSettingsOpen] = useState<boolean | null>(null);
  /** What the duration field shows while it is being edited (null = the draft value). */
  const [durationText, setDurationText] = useState<string | null>(null);
  /** Debounce fit/fill after the brief minutes change, so typing 120 does not fit on 12. */
  const durationFitTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (durationFitTimer.current != null) {
        window.clearTimeout(durationFitTimer.current);
      }
    };
  }, []);

  // Drop a body overflow:hidden left by a drawer that never unlocked (HMR / nested close).
  useEffect(() => {
    if (
      document.body.style.overflow === "hidden" &&
      !document.querySelector(".replace-layer, .guide-layer")
    ) {
      clearBodyScrollLock();
    }
  }, []);

  // Native selects change their value when the wheel crosses them. The listener
  // exists only while the pointer is on a select, so the rest of the page can
  // scroll on the compositor thread. Lists keep their own scroll and chain to
  // the page at the ends (overscroll-behavior: auto).
  useEffect(() => {
    let select: HTMLSelectElement | null = null;

    function pixels(event: WheelEvent, delta: number) {
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * window.innerHeight;
      return delta;
    }

    function onWheel(event: WheelEvent) {
      if (!select) return;
      event.preventDefault();
      if (document.activeElement === select) select.blur();
      window.scrollBy({
        top: pixels(event, event.deltaY),
        left: pixels(event, event.deltaX),
      });
    }

    function detach() {
      if (!select) return;
      document.removeEventListener("wheel", onWheel, { capture: true });
      select = null;
    }

    function onOver(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const next = target.closest("select");
      if (
        !(next instanceof HTMLSelectElement) ||
        next.closest("dialog, .stick-dialog")
      ) {
        detach();
        return;
      }
      if (select === next) return;
      detach();
      select = next;
      document.addEventListener("wheel", onWheel, { capture: true, passive: false });
    }

    function onOut(event: Event) {
      if (!select) return;
      const related = event instanceof MouseEvent ? event.relatedTarget : null;
      if (related instanceof Node && select.contains(related)) return;
      detach();
    }

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    return () => {
      detach();
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
    };
  }, []);

  // Feedback like "+ Titel → Peak / Anchor" is a toast: it follows the scroll and fades after a while.
  // Longer texts (the rekordbox import steps) stay long enough to be read.
  // Energy batch progress and other long work must not fade while they are still running.
  useEffect(() => {
    if (!status || analyzingEnergy || statusHeld) return;
    const timer = window.setTimeout(
      () => setStatus(null),
      Math.min(24000, 6000 + status.length * 50),
    );
    return () => window.clearTimeout(timer);
  }, [status, analyzingEnergy, statusHeld]);

  const displayedStatus = workQueueStatus(liveJobs, t) ?? status;

  const persisted = useSyncExternalStore(
    subscribeDraft,
    () => draftPersisted,
    () => true,
  );

  function noteSettings(note: string) {
    const known = (["ready", "missing"] as const).find((kind) => {
      const key =
        kind === "ready" ? "builder.settings.spotifyReady" : "builder.settings.spotifyMissing";
      return note === createTranslate("de")(key) || note === createTranslate("en")(key);
    });
    // Missing Spotify credentials are optional (rekordbox works without), so they neither
    // open the section nor show up as a warning in its header.
    setSettingsNote(known === "missing" ? null : (known ?? { raw: note }));
  }

  const settingsNoteText =
    settingsNote === null
      ? t("builder.settings.default")
      : settingsNote === "ready"
        ? t("builder.settings.spotifyReady")
        : settingsNote === "missing"
          ? t("builder.settings.spotifyMissing")
          : settingsNote.raw;

  function fail(scope: NoticeScope, text: string, hint: string) {
    setNotice({ scope, text, hint });
    setStatus(null);
    if (scope === "connect" || scope === "settings") setSettingsOpen(true);
  }

  function clearNotice() {
    setNotice(null);
  }

  function localNotice(scope: NoticeScope): FieldNotice | null {
    if (!notice || notice.scope !== scope) return null;
    return notice;
  }
  const authNoteRaw = useSyncExternalStore(
    () => () => {},
    readAuthNote,
    () => null,
  );
  const authNote = authNoteRaw ? authNoteText(authNoteRaw, t) : null;
  const settingsOpen = settingsOpenState ?? authNoteRaw?.status === "error";
  const [myPlaylists, setMyPlaylists] = useState<
    Array<{
      id: string;
      name: string;
      owner: string;
      trackCount: number;
      owned: boolean;
      externalUrl: string;
    }>
  >([]);

  useEffect(() => {
    if (!window.location.search.includes("auth=")) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("auth");
    url.searchParams.delete("message");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const handle = await loadPersistedStickHandle().catch(() => null);
      if (cancelled) return;
      setStickReady(!!handle || stickFileCount() > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [libraryRows.length, draft.tracks.length]);

  useEffect(() => {
    let cancelled = false;
    let held = false;
    let job = 0;
    function finish(message: string | null) {
      if (!held) return;
      held = false;
      // A newer stick job owns the banner. Releasing this hold must not clear it.
      if (cancelled || stickJob.current !== job) cancelWork();
      else endWork(message);
    }
    void queueHeavy(async () => {
      const handle = await loadPersistedStickHandle();
      if (!handle || cancelled) return;
      if (!(await stickPermission(handle, "read", false))) return;
      if (cancelled) return;
      job = ++stickJob.current;
      beginWork(t("builder.stick.reading"));
      held = true;
      try {
        const stick = await readStickFromHandle(handle);
        if (cancelled || stickJob.current !== job) {
          finish(null);
          return;
        }
        setLibraryRows(stickLibraryRows(stick.library, stick.sets));
        await mergeStickFilesIntoDraft(stick.library, (done, total) => {
          if (!cancelled && stickJob.current === job && total > 0) {
            setStatus(t("builder.stick.tags", { done, total }));
          }
        });
        if (cancelled || stickJob.current !== job) {
          finish(null);
          return;
        }
        setStickReady(true);
        const targets = readStoredDraft().tracks.filter(
          (track) => Boolean(track.filePath?.trim()) && !hasKnownEnergy(track),
        );
        if (targets.length) {
          finish(null);
          await runEnergyScan(targets, {
            write: false,
            writeRoot: null,
            reuseTags: true,
            root: handle,
            active: () => !cancelled && stickJob.current === job,
          });
        } else {
          finish(t("builder.stick.ready"));
        }
      } catch {
        finish(null);
      }
    }, {
      operation: "stick-reconnect",
      key: "startup",
      label: t("builder.work.stickReconnect"),
    });
    return () => {
      cancelled = true;
      energyJob.current += 1;
      finish(null);
    };
    // Once on launch: reconnect a stick this browser already allowed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (devLibraryLoaded.current || libraryRows.length > 0) return;
    if (sessionStorage.getItem("setbuilder-dev-library") !== "1") return;
    devLibraryLoaded.current = true;
    void fetch("/dev-ui-test-library.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((rows: LibraryRow[] | null) => {
        if (rows?.length) setLibraryRows(rows);
      })
      .catch(() => undefined);
  }, [libraryRows.length]);

  function queueHeavy(run: () => Promise<void>, job: WorkJob): Promise<void> {
    return enqueueWork(run, job);
  }

  function beginWork(message: string) {
    statusHold.current += 1;
    setStatusHeld(true);
    setStatus(message);
  }

  function endWork(message: string | null) {
    statusHold.current = Math.max(0, statusHold.current - 1);
    setStatusHeld(statusHold.current > 0);
    setStatus(message);
  }

  function cancelWork() {
    statusHold.current = Math.max(0, statusHold.current - 1);
    setStatusHeld(statusHold.current > 0);
  }

  /**
   * Covers and tag energy for the current draft. Never writes an older snapshot
   * back: file reads take long enough that the user may already have edited.
   */
  async function mergeStickFilesIntoDraft(
    library: StickTrack[],
    onProgress?: (done: number, total: number) => void,
  ) {
    const handle = await loadPersistedStickHandle().catch(() => null);
    if (handle) {
      await hydrateStickMedia(
        handle,
        mediaPathsForDraft(readStoredDraft(), library),
      );
    }
    const base = readStoredDraft();
    const covered = library.length ? rehydrateStickCovers(base, library) : base;
    if (covered !== base) setDraft(covered);
    const levels = await missingEnergyFromFiles(
      readStoredDraft().tracks,
      handle,
      onProgress,
    );
    const covers = await missingCoversFromFiles(readStoredDraft().tracks, handle);
    setDraft((current) =>
      applyCoverUrls(applyEnergyLevels(current, levels), covers),
    );
  }

  function showStickMerge(library: StickTrack[], done: string | null) {
    const key = library.map((track) => track.filePath || track.id).join("|");
    if (
      getWorkQueueSnapshot().jobs.some(
        (queued) =>
          queued.operation === "stick-merge" &&
          queued.key === key &&
          (queued.status === "queued" || queued.status === "running"),
      )
    ) {
      return;
    }
    const job = ++stickJob.current;
    beginWork(t("builder.stick.reading"));
    void queueHeavy(async () => {
      const current = () => stickJob.current === job;
      try {
        await mergeStickFilesIntoDraft(library, (doneCount, total) => {
          if (current() && total > 0) {
            setStatus(t("builder.stick.tags", { done: doneCount, total }));
          }
        });
        if (!current()) {
          cancelWork();
          return;
        }
        const targets = readStoredDraft().tracks.filter(
          (track) => Boolean(track.filePath?.trim()) && !hasKnownEnergy(track),
        );
        if (targets.length) {
          cancelWork();
          await runEnergyScan(targets, {
            write: false,
            writeRoot: null,
            reuseTags: true,
            root: null,
            active: current,
          });
        } else {
          endWork(done);
        }
      } catch {
        if (!current()) cancelWork();
        else endWork(done);
      }
    }, {
      operation: "stick-merge",
      key,
      label: t("builder.work.stickMerge"),
    });
  }

  function applyLoadedStickSet(
    set: RekordboxStickSet,
    mode: "replace" | "merge",
  ) {
    const current = readStoredDraft();
    const loaded = applyPlaylistLoad(current, set, mode, t);
    setReplaceUndo(loaded.undo);
    const keyed = set.tracks.filter((track) => track.keyCamelot).length;
    const minutes = set.tracks.reduce((sum, track) => sum + track.durationMs, 0);
    const kind = t(
      set.kind === "history" ? "library.stick.history" : "library.stick.playlist",
    );
    const message =
      t(
        mode === "merge"
          ? "builder.playlist.merged"
          : "library.stick.applied",
        {
          kind,
          name: set.name,
          tracks: trackCount(set.tracks.length, t),
        },
      ) +
      (keyed ? ` · ${t("library.stick.withKey", { count: keyed })}` : "") +
      (minutes ? ` · ${formatDuration(minutes)}` : "") +
      (set.missing
        ? ` · ${t("library.stick.unmatched", { count: set.missing })}`
        : "");
    setDraft(loaded.draft);
    setPendingStickSet(null);
    clearNotice();
    const library = libraryRows.flatMap((row) => (row.stick ? [row.stick] : []));
    showStickMerge(library, message);
  }

  function openStickPicker() {
    const section = document.getElementById("library-section");
    if (section instanceof HTMLDetailsElement) section.open = true;
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    chooseStickRef.current?.();
  }

  function requestStickSet(set: RekordboxStickSet) {
    if (!set.tracks.length) return;
    if (readStoredDraft().tracks.length === 0) {
      applyLoadedStickSet(set, "replace");
      return;
    }
    setPendingStickSet(set);
  }

  function setDraft(updater: SetDraft | ((current: SetDraft) => SetDraft)) {
    // Always read the store — never the render closure. The stick-reconnect
    // effect and rapid Sortieren clicks would otherwise rewrite a stale draft.
    const current = readStoredDraft();
    const next = typeof updater === "function" ? updater(current) : updater;
    if (next === current) return;
    persistDraft(next);
  }

  async function refreshAuthStatus() {
    try {
      const response = await fetch("/api/auth/status");
      const data = (await response.json()) as {
        connected?: boolean;
        redirectUri?: string;
      };
      const connected = Boolean(data.connected);
      setSpotifyConnected(connected);
      if (connected) await loadMyPlaylists();
      else setMyPlaylists([]);
      const tidalRes = await fetch("/api/auth/tidal/status");
      const tidal = (await tidalRes.json()) as { connected?: boolean };
      setTidalConnected(Boolean(tidal.connected));
      if (tidal.connected) {
        const listRes = await fetch("/api/tidal/playlists");
        const list = (await listRes.json()) as {
          playlists?: Array<{ id: string; name: string; trackCount: number | null }>;
        };
        if (listRes.ok) setTidalPlaylists(list.playlists ?? []);
      } else {
        setTidalPlaylists([]);
      }
    } catch {
      setSpotifyConnected(false);
    }
  }

  async function loadMyPlaylists() {
    try {
      const response = await fetch("/api/playlists");
      const data = (await response.json()) as {
        owned?: Array<{
          id: string;
          name: string;
          owner: string;
          trackCount: number;
          owned: boolean;
          externalUrl: string;
        }>;
        error?: string;
      };
      if (!response.ok) return;
      setMyPlaylists(data.owned ?? []);
    } catch {
      // picker is optional
    }
  }

  // Once on launch: which services are connected. The OAuth return itself is shown by
  // the banner above (readAuthNote).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) await refreshAuthStatus();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function extractFromPlaylist() {
    const url = playlistUrl.trim();
    if (!url) {
      fail(
        "playlist",
        t("builder.fail.playlistMissing"),
        t("builder.fail.playlistMissingHint"),
      );
      return;
    }

    clearNotice();
    beginWork(t("builder.status.extracting"));
    setIsExtracting(true);
    let settled = false;
    const settle = (message: string | null) => {
      if (settled) return;
      settled = true;
      endWork(message);
    };
    try {
      const tidalPlaylist = playlistUrl.toLowerCase().includes("tidal.com");
      const response = await fetch(tidalPlaylist ? "/api/playlist/tidal" : "/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          durationMinutes: draft.durationMinutes,
          blendMs: draft.blendMs,
          title: draft.title,
          vibe: draft.vibe,
          venue: draft.venue,
          slot: draft.slot,
          slotKind: draft.slotKind,
          audience: draft.audience,
          gear: draft.gear,
          notes: draft.notes,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        code?: string;
        draft?: SetDraft;
        playlist?: {
          name: string;
          imported: number;
          selected: number;
          trackCount: number;
          tidalMatched?: number;
          tidalKeyed?: number;
        };
      };

      if (response.status === 401 || data.code === "AUTH_REQUIRED") {
        setSpotifyConnected(false);
        settle(null);
        fail(
          "playlist",
          t("builder.fail.spotifyAuth"),
          t("builder.fail.spotifyAuthHint"),
        );
        return;
      }
      if (!response.ok || !data.draft) {
        throw new Error(data.error || t("builder.fail.extract"));
      }

      setDraft({
        ...data.draft,
        notes: data.draft.notes ?? draft.notes,
      });
      setRoleFilter("all");
      const performanceCount = (data.draft.tracks ?? []).filter(
        (track) => track.role !== "safety",
      ).length;
      const safetyCount = (data.draft.tracks ?? []).filter(
        (track) => track.role === "safety",
      ).length;
      const tidalMatched = data.playlist?.tidalMatched ?? 0;
      const tidalKeyed = data.playlist?.tidalKeyed ?? 0;
      settle(
        t(
          tidalMatched === 0
            ? "builder.status.extractedTidalNone"
            : tidalKeyed > 0
              ? "builder.status.extractedTidalKeyed"
              : "builder.status.extractedTidalPopular",
          {
            name: data.playlist?.name ?? t("builder.crate.playlistFallback"),
            performance: performanceCount,
            safety: safetyCount,
            pool: data.playlist?.imported ?? "?",
            keyed: tidalKeyed,
            matched: tidalMatched,
          },
        ),
      );
      await refreshAuthStatus();
    } catch (err) {
      settle(null);
      fail(
        "playlist",
        errorText(err, t, "builder.fail.extract"),
        t("builder.fail.extractHint"),
      );
    } finally {
      setIsExtracting(false);
    }
  }

  const mainTracks = useMemo(
    () => performanceTracks(draft.tracks),
    [draft.tracks],
  );
  const midPinnedCount = useMemo(() => {
    const pins = withoutEndPins(draft.pinnedIds, draft.openerId, draft.closerId);
    if (!pins?.length) return 0;
    const inPerf = new Set(mainTracks.map((track) => track.id));
    return pins.filter((id) => inPerf.has(id)).length;
  }, [draft.pinnedIds, draft.openerId, draft.closerId, mainTracks]);
  const blendMs = blendMsOf(draft.blendMs);
  const filledMs = playedTotalMs(draft.tracks, blendMs);
  const plannedJoins = mainTracks.some((track) => track.transition && track.transition !== "unset");
  const mixLabel = plannedJoins ? t("builder.list.mixPlanned") : formatDuration(blendMs);
  const targetMs = draft.durationMinutes * 60_000;
  const activeGuide = arcGuideFor(t).find((item) => item.phase === activePhase);

  const visibleTimeline = useMemo(() => {
    if (!draft.tracks.length) return [];
    if (roleFilter === "all") return mainTracks;
    return draft.tracks.filter((track) => track.role === roleFilter);
  }, [draft.tracks, mainTracks, roleFilter]);

  const resolvedPlaylistPool = useMemo(
    () => playlistPoolForDraft(draft, stickSets),
    [draft, stickSets],
  );
  const playlistPoolCount = resolvedPlaylistPool.length;
  // Counts only. Building the pool looks up a cover for every library row, and
  // that used to run on every keystroke in the set.
  const reshuffleOffers = useMemo(() => {
    const performanceCount = mainTracks.length;
    const collectionCount = stickLibraryPoolCount(libraryRows);
    const historyCount = historyPoolCount(stickSets);
    // Prefer the resolved playlist pool (stored or live stick) for "Different".
    const playlistReady =
      playlistPoolCount >= 2 && playlistPoolCount > performanceCount;
    const stickReady = collectionCount >= 2 && collectionCount > performanceCount;
    return {
      different: playlistReady
        ? { ready: true as const, count: playlistPoolCount, fromStick: false }
        : stickReady
          ? { ready: true as const, count: collectionCount, fromStick: true }
          : poolOffer(Math.max(playlistPoolCount, collectionCount), performanceCount),
      // Ready whenever a playlist pool exists — load-as-set may equal the
      // performance until trim; reshuffle still re-packs to the slot.
      playlist:
        playlistPoolCount >= 2
          ? ({ ready: true as const, count: playlistPoolCount } satisfies PoolOffer)
          : ({ ready: false, reason: "missing" } satisfies PoolOffer),
      collection: poolOffer(collectionCount, performanceCount),
      history: poolOffer(historyCount, performanceCount),
    };
  }, [mainTracks.length, playlistPoolCount, libraryRows, stickSets]);

  const positions = useMemo(
    () => setPositionById(draft.tracks),
    [draft.tracks],
  );

  function runSearch(nextQuery = query) {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) {
      fail(
        "crate",
        t("builder.fail.queryShort"),
        t("builder.fail.queryShortHint"),
      );
      return;
    }

    if (looksLikeMusicLink(trimmed)) {
      setAddTab("link");
      setLinkUrl(trimmed);
      void importCrateLink(trimmed);
      return;
    }

    clearNotice();
    setStatus(null);
    setCrateSource(null);
    setHasSearched(true);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&market=DE`,
        );
        const data = (await response.json()) as {
          tracks?: SearchTrack[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || t("builder.fail.search"));
        setResults(data.tracks ?? []);
        if ((data.tracks ?? []).length === 0) {
          setStatus(t("builder.status.noHits"));
        }
      } catch (err) {
        setResults([]);
        fail(
          "crate",
          errorText(err, t, "builder.fail.search"),
          t("builder.fail.searchHint"),
        );
      }
    });
  }

  async function loadTidalCrate(playlistId: string, label?: string) {
    if (!playlistId) return;
    clearNotice();
    setStatus(null);
    setHasSearched(true);
    setAddTab("link");
    startTransition(async () => {
      try {
        const response = await fetch("/api/crate/tidal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId }),
        });
        const data = (await response.json()) as {
          label?: string;
          tracks?: SearchTrack[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || t("builder.fail.tidalPlaylist"));
        const tracks = data.tracks ?? [];
        setResults(tracks);
        setCrateSource(
          t("builder.crate.source", {
            kind: "Tidal",
            label: data.label || label || t("builder.crate.playlistFallback"),
          }),
        );
        setStatus(
          t("builder.status.tidalPlaylistLoaded", { tracks: trackCount(tracks.length, t) }),
        );
      } catch (err) {
        setResults([]);
        fail(
          "crate",
          errorText(err, t, "builder.fail.tidalPlaylist"),
          t("builder.fail.tidalPlaylistHint"),
        );
      }
    });
  }

  async function importCrateLink(rawUrl = linkUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      fail(
        "crate",
        t("builder.fail.linkMissing"),
        t("builder.fail.linkMissingHint"),
      );
      return;
    }
    const lower = trimmed.toLowerCase();
    if (lower.includes("beatport.com") || lower.includes("soundcloud.com")) {
      const store = lower.includes("soundcloud.com") ? "SoundCloud" : "Beatport";
      setHasSearched(true);
      clearNotice();
      setStatus(null);
      startTransition(async () => {
        try {
          const response = await fetch("/api/resolve-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: trimmed }),
          });
          const data = (await response.json()) as {
            label?: string;
            message?: string;
            tracks?: SearchTrack[];
            error?: string;
          };
          if (!response.ok) {
            throw new Error(data.error || t("builder.fail.storeLink", { store }));
          }
          const tracks = data.tracks ?? [];
          setResults(tracks);
          setCrateSource(data.label ? `${store}: ${data.label}` : store);
          setStatus(
            data.message ||
              (tracks.length
                ? t("builder.status.storeLoaded", { store })
                : t("builder.status.noTracksInLink")),
          );
        } catch (err) {
          setResults([]);
          setCrateSource(null);
          fail(
            "crate",
            errorText(err, t) || t("builder.fail.storeLink", { store }),
            t("builder.fail.storeLinkHint"),
          );
        }
      });
      return;
    }

    if (lower.includes("tidal.com")) {
      setHasSearched(true);
      startTransition(async () => {
        try {
          const response = await fetch("/api/crate/tidal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: trimmed }),
          });
          const data = (await response.json()) as {
            label?: string;
            tracks?: SearchTrack[];
            error?: string;
          };
          if (!response.ok) throw new Error(data.error || t("builder.fail.tidalLink"));
          setResults(data.tracks ?? []);
          setCrateSource(
            t("builder.crate.source", {
              kind: "Tidal",
              label: data.label || t("builder.crate.playlistFallback"),
            }),
          );
          setStatus(
            t("builder.status.tidalLinkLoaded", {
              tracks: trackCount((data.tracks ?? []).length, t),
            }),
          );
        } catch (err) {
          setResults([]);
          fail(
            "crate",
            errorText(err, t, "builder.fail.tidalLink"),
            t("builder.fail.tidalLinkHint"),
          );
        }
      });
      return;
    }

    clearNotice();
    setStatus(null);
    setHasSearched(true);
    startTransition(async () => {
      try {
        const response = await fetch("/api/crate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = (await response.json()) as {
          kind?: "track" | "playlist" | "album";
          label?: string;
          tracks?: SearchTrack[];
          error?: string;
          code?: string;
        };
        if (!response.ok) {
          if (data.code === "AUTH_REQUIRED") {
            setSpotifyConnected(false);
          }
          throw new Error(data.error || t("builder.fail.crateLink"));
        }
        const tracks = data.tracks ?? [];
        setResults(tracks);
        setCrateSource(
          data.kind && data.label
            ? t("builder.crate.source", {
                kind: t(
                  data.kind === "track"
                    ? "builder.crate.kind.track"
                    : data.kind === "album"
                      ? "builder.crate.kind.album"
                      : "builder.crate.kind.playlist",
                ),
                label: data.label,
              })
            : null,
        );
        setStatus(
          tracks.length === 1
            ? t("builder.status.trackLoaded")
            : t("builder.status.tracksLoaded", { tracks: trackCount(tracks.length, t) }),
        );
      } catch (err) {
        setResults([]);
        setCrateSource(null);
        fail(
          "crate",
          errorText(err, t, "builder.fail.crateLink"),
          t("builder.fail.crateLinkHint"),
        );
      }
    });
  }

  function addTrack(track: SearchTrack) {
    if (draft.tracks.some((item) => item.id === track.id)) {
      setStatus(t("builder.status.alreadyIn"));
      return;
    }

    const next: SetTrack = {
      id: track.id,
      name: track.name,
      artists: track.artists,
      album: track.album,
      durationMs: track.durationMs,
      uri: track.uri,
      externalUrl: track.externalUrl,
      imageUrl: track.imageUrl,
      phase: activePhase,
      role: activeRole,
      transition: "unset",
      bpm: "",
      keyCamelot: "",
      note: "",
      comment: "",
      source: track.source ?? "spotify",
      safetyAlt: "",
    };

    setDraft((current) => ({
      ...current,
      tracks: [...current.tracks, next],
    }));
    setStatus(
      t("builder.status.added", {
        name: track.name,
        phase: phaseLabel(t, activePhase),
        role: roleLabel(t, activeRole),
      }),
    );
  }

  function addTracksBulk(incoming: SetTrack[]) {
    setDraft((current) => {
      const fresh = uniqueIncomingDraftTracks(
        current.tracks.map((track) => track.id),
        incoming,
      );
      if (!fresh.length) return current;
      return { ...current, tracks: [...current.tracks, ...fresh] };
    });
  }

  function addAllResults() {
    const fresh = results.filter(
      (track) => !draft.tracks.some((item) => item.id === track.id),
    );
    if (!fresh.length) {
      setStatus(t("builder.status.allAlreadyIn"));
      return;
    }
    const mapped: SetTrack[] = fresh.map((track) => ({
      id: track.id,
      name: track.name,
      artists: track.artists,
      album: track.album,
      durationMs: track.durationMs,
      uri: track.uri,
      externalUrl: track.externalUrl,
      imageUrl: track.imageUrl,
      phase: activePhase,
      role: activeRole,
      transition: "unset" as const,
      bpm: "",
      keyCamelot: "",
      note: "",
      comment: "",
      source: track.source ?? "spotify",
      safetyAlt: "",
    }));
    setDraft((current) => ({
      ...current,
      tracks: [...current.tracks, ...mapped],
    }));
    setStatus(
      t("builder.status.addedMany", {
        tracks: trackCount(mapped.length, t),
        phase: phaseLabel(t, activePhase),
        role: roleLabel(t, activeRole),
      }),
    );
  }

  function addManualEntry() {
    const name = manualTitle.trim();
    if (!name) {
      fail(
        "crate",
        t("builder.fail.titleMissing"),
        t("builder.fail.titleMissingHint"),
      );
      return;
    }
    const link = manualLink.trim();
    const id = `manual:${Date.now().toString(36)}`;
    addTracksBulk([
      {
        id,
        name,
        artists: [manualArtist.trim() || "Unknown"],
        album: "Manual",
        durationMs: 0,
        uri: link || id,
        externalUrl: link,
        imageUrl: null,
        phase: activePhase,
        role: activeRole,
        transition: "unset",
        bpm: "",
        keyCamelot: "",
        note: "",
        comment: "",
        source: "manual",
        safetyAlt: "",
      },
    ]);
    setManualTitle("");
    setManualArtist("");
    setManualLink("");
    clearNotice();
    setStatus(
      t("builder.status.added", {
        name,
        phase: phaseLabel(t, activePhase),
        role: roleLabel(t, activeRole),
      }),
    );
  }

  function addLibraryTrack(incoming: SetTrack, afterId?: string) {
    // An Alternative whose energy contradicts the chosen phase goes to the phase it fits.
    const track =
      incoming.role === "safety"
        ? { ...incoming, phase: bestPhaseFor(incoming, draft.tracks) }
        : incoming;
    const same = draft.tracks.some(
      (item) =>
        item.id === track.id ||
        (item.name.toLowerCase() === track.name.toLowerCase() &&
          item.artists.join(",").toLowerCase() === track.artists.join(",").toLowerCase()),
    );
    if (same) {
      setStatus(t("builder.status.alreadyInNamed", { name: track.name }));
      return;
    }
    setDraft((current) => {
      const fresh = uniqueIncomingDraftTracks(
        current.tracks.map((item) => item.id),
        [track],
      );
      if (!fresh.length) return current;
      if (!afterId) return { ...current, tracks: [...current.tracks, ...fresh] };
      const at = current.tracks.findIndex((item) => item.id === afterId);
      if (at < 0) return { ...current, tracks: [...current.tracks, ...fresh] };
      const tracks = current.tracks.slice();
      tracks.splice(at + 1, 0, ...fresh);
      return { ...current, tracks };
    });
    const after = afterId ? draft.tracks.find((item) => item.id === afterId) : null;
    setStatus(
      after
        ? t("builder.status.addedAfter", {
            name: track.name,
            after: after.name,
            phase: phaseLabel(t, track.phase),
            role: roleLabel(t, track.role),
          })
        : t("builder.status.added", {
            name: track.name,
            phase: phaseLabel(t, track.phase),
            role: roleLabel(t, track.role),
          }),
    );
  }

  function setPhaseNote(phase: SetPhaseId, value: string) {
    setDraft((current) => {
      const next = { ...current.phaseNote };
      if (value.trim()) next[phase] = value;
      else delete next[phase];
      return { ...current, phaseNote: Object.keys(next).length ? next : undefined };
    });
  }

  function fillPlanB(picks: { row: LibraryRow; phase: SetPhaseId }[]) {
    if (!picks.length) return;
    addTracksBulk(picks.map(({ row, phase }) => libraryTrackToSetTrack(row, phase, "safety", t)));
    const counts = PHASES.map((phase) => ({
      label: phaseLabel(t, phase.id),
      n: picks.filter((pick) => pick.phase === phase.id).length,
    })).filter((item) => item.n > 0);
    setStatus(
      t("builder.status.planBFilled", {
        count: picks.length,
        parts: counts.map((item) => `${item.label} ${item.n}`).join(", "),
      }),
    );
  }

  function openLibrary() {
    const section = document.getElementById("library-section");
    if (section instanceof HTMLDetailsElement) section.open = true;
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function playLibraryTrack(track: SetTrack) {
    if (previewTransport.trackId === track.id && previewTransport.playing) {
      requestPreviewPause();
      return;
    }
    if (
      focusTrackId === track.id &&
      previewTransport.trackId === track.id &&
      !previewTransport.playing
    ) {
      requestPreviewResume();
      return;
    }
    setLibraryPreview(track);
    setFocusTrackId(track.id);
  }

  function toggleTrackPreview(track: SetTrack) {
    if (previewTransport.trackId === track.id && previewTransport.playing) {
      requestPreviewPause();
      return;
    }
    if (
      focusTrackId === track.id &&
      previewTransport.trackId === track.id &&
      !previewTransport.playing
    ) {
      requestPreviewResume();
      return;
    }
    setFocusTrackId(track.id);
  }

  function rehearseTrack(track: SetTrack) {
    setRehearsal(true);
    setFocusTrackId(track.id);
  }

  function patchTrack(id: string, patch: Partial<SetTrack>) {
    setDraft((current) => {
      const tracks = current.tracks.map((track) =>
        track.id === id ? { ...track, ...patch } : track,
      );
      const stampsEnergy = "energyLevel" in patch || "energySource" in patch;
      const filePath = stampsEnergy
        ? current.tracks.find((track) => track.id === id)?.filePath?.trim() || ""
        : "";
      const sourcePool = stampsEnergy
        ? current.sourcePool?.map((track) =>
            track.id === id || (filePath && track.filePath?.trim() === filePath)
              ? {
                  ...track,
                  energyLevel: "energyLevel" in patch ? patch.energyLevel : track.energyLevel,
                  energySource: "energySource" in patch ? patch.energySource : track.energySource,
                }
              : track,
          )
        : current.sourcePool;
      const demoted = patch.role === "safety";
      const promoted = patch.role && patch.role !== "safety";
      return {
        ...current,
        openerId: demoted && current.openerId === id ? null : current.openerId,
        closerId: demoted && current.closerId === id ? null : current.closerId,
        pinnedIds: demoted
          ? withoutEndPins(current.pinnedIds?.filter((item) => item !== id), null, null)
          : current.pinnedIds,
        excludedIds: promoted
          ? normalizeExcludedIds(current.excludedIds?.filter((item) => item !== id))
          : current.excludedIds,
        tracks,
        sourcePool,
      };
    });
  }

  function removeTrack(id: string) {
    setFocusTrackId((current) => (current === id ? null : current));
    setDraft((current) => ({
      ...current,
      openerId: current.openerId === id ? null : current.openerId,
      closerId: current.closerId === id ? null : current.closerId,
      pinnedIds: withoutEndPins(current.pinnedIds?.filter((item) => item !== id), null, null),
      excludedIds: normalizeExcludedIds(current.excludedIds?.filter((item) => item !== id)),
      tracks: current.tracks.filter((track) => track.id !== id),
    }));
  }

  /** Put an Alternative into the performance before or after a playlist track. */
  function placeAlternative(altId: string, relativeId: string, side: "before" | "after") {
    const alt = draft.tracks.find((track) => track.id === altId);
    const relative = draft.tracks.find((track) => track.id === relativeId);
    if (!alt || !relative) return;
    setDraft((current) =>
      placeInPerformance(current, altId, {
        beforeId: side === "before" ? relativeId : null,
        afterId: side === "after" ? relativeId : null,
      }),
    );
    setPlaceFor(null);
    setStatus(
      t(side === "before" ? "builder.status.placedBefore" : "builder.status.placedAfter", {
        name: alt.name,
        relative: relative.name,
      }),
    );
  }

  /** Arrow buttons swap with the neighbour the list shows, not with a hidden Alternative. */
  function moveTrack(id: string, direction: -1 | 1) {
    const index = visibleTimeline.findIndex((track) => track.id === id);
    const neighbour = index < 0 ? undefined : visibleTimeline[index + direction];
    if (!neighbour) return;
    reorderTrack(id, neighbour.id);
  }

  function reorderTrack(activeId: string, overId: string) {
    if (!activeId || activeId === overId) return;
    setDraft((current) => {
      const from = current.tracks.findIndex((track) => track.id === activeId);
      const to = current.tracks.findIndex((track) => track.id === overId);
      if (from < 0 || to < 0) return current;
      const tracks = [...current.tracks];
      const [item] = tracks.splice(from, 1);
      tracks.splice(to, 0, item);
      // Pins stay at the ends after a manual drag / arrow move.
      return applySetAnchors({ ...current, tracks });
    });
  }

  async function copyExport() {
    const text = exportSetText(draft, t);
    try {
      await navigator.clipboard.writeText(text);
      clearNotice();
      setStatus(t("builder.status.copied"));
    } catch {
      // Clipboard blocked (permissions, insecure context): hand the text over as a file.
      downloadText(boothFileName(draft.title, "txt"), text, "text/plain");
      fail("export", t("builder.fail.copy"), t("builder.fail.copyHint"));
    }
  }

  function exportPdf() {
    try {
      openSetPdfExport(draft, t);
      setStatus(t("builder.status.pdf"));
    } catch (err) {
      fail(
        "export",
        errorText(err, t, "builder.fail.pdf"),
        t("builder.fail.pdfHint"),
      );
    }
  }

  function exportM3u() {
    downloadText(
      boothFileName(draft.title, "m3u"),
      buildM3u(draft, t),
      "audio/x-mpegurl",
    );
    setStatus(t("builder.status.m3u"));
  }

  function exportRekordbox() {
    downloadText(
      "SETBUILDER-rekordbox.xml",
      buildRekordboxXml(draft, t),
      "application/xml",
    );
    setStatus(t("builder.status.rekordbox"));
  }

  const onStickStatus = useCallback((status: StickStatusSlice | null) => {
    setStickHealth((current) => {
      const next = status?.health ?? null;
      if (!next) return current ? null : current;
      if (
        current &&
        current.verdict === next.verdict &&
        current.pioneer === next.pioneer &&
        current.libraryAside === next.libraryAside
      ) {
        return current;
      }
      return next;
    });
  }, []);

  function confirmTake() {
    const kind = pendingTake;
    setPendingTake(null);
    if (kind === "stick") setStickOpen(true);
    else if (kind === "pdf") exportPdf();
    else if (kind === "copy") void copyExport();
    else if (kind === "xml") exportRekordbox();
    else if (kind === "m3u") exportM3u();
  }

  const stickFilesEpoch = useSyncExternalStore(
    subscribeStickFiles,
    getStickFilesEpoch,
    () => 0,
  );

  const pendingChecks = useMemo(() => {
    // Epoch bumps after rememberStickFiles / hydrateStickMedia; keep it read so
    // fileInSession results refresh when the session store changes.
    void stickFilesEpoch;
    return pendingTake
      ? assessGigReady({
          tracks: draft.tracks,
          action:
            pendingTake === "stick"
              ? "stick"
              : pendingTake === "xml" || pendingTake === "m3u"
                ? "desk"
                : "booth",
          fileInSession: stickFileInSession,
          health: stickHealth,
        })
      : [];
  }, [pendingTake, draft.tracks, stickHealth, stickFilesEpoch]);

  /** Re-pick the stick folder so gig-ready file paths match this session again. */
  async function reselectStickForGigReady() {
    const existing = await loadPersistedStickHandle();
    const handle =
      existing && (await stickPermission(existing, "read", true))
        ? existing
        : await pickAndRememberStick("read");
    if (!handle) return;
    await enqueueWork(
      async () => {
        const stick = await readStickFromHandle(handle);
        await hydrateStickMedia(handle, mediaPathsForDraft(draft, stick.library));
        setLibraryRows(stickLibraryRows(stick.library, stick.sets));
        setStickReady(true);
      },
      {
        operation: "stick-reconnect",
        key: `gig-ready:${draft.title}`,
        label: t("builder.work.stickReconnect"),
        target: handle.name,
      },
    );
  }

  async function reselectStickFilesForGigReady(files: File[]) {
    if (!files.length) return;
    await enqueueWork(
      async () => {
        const stick = await readRekordboxStick(files);
        rememberStickFiles(files);
        setLibraryRows(stickLibraryRows(stick.library, stick.sets));
        setStickReady(true);
      },
      {
        operation: "stick-reconnect",
        key: `gig-ready-files:${files[0]?.webkitRelativePath.split("/")[0] ?? "stick"}`,
        label: t("builder.work.stickReconnect"),
        target: files[0]?.webkitRelativePath.split("/")[0],
      },
    );
  }

  const stickLostQuietUntil = useRef(0);

  function reportStickLost(fromPreview: boolean) {
    if (stickLostOpenRef.current) return;
    if (!stickReady && stickFileCount() === 0) return;
    if (!fromPreview && Date.now() < stickLostQuietUntil.current) return;
    if (fromPreview || getPreviewTransportSnapshot().playing) {
      resumePreviewAfterStick.current = true;
      requestPreviewPause();
    }
    setStickLostOpen(true);
  }

  function afterStickRestored() {
    setStickReady(true);
    setStatus(t("builder.stickLost.restored"));
    stickGoneStreak.current = 0;
    if (!resumePreviewAfterStick.current) return;
    resumePreviewAfterStick.current = false;
    window.setTimeout(() => requestPreviewResume(), 80);
  }

  async function restoreStickFromHandle(
    handle: Awaited<ReturnType<typeof loadPersistedStickHandle>>,
    key: string,
  ): Promise<boolean> {
    if (!handle) return false;
    await enqueueWork(
      async () => {
        const stick = await readStickFromHandle(handle);
        await hydrateStickMedia(
          handle,
          mediaPathsForDraft(readStoredDraft(), stick.library),
        );
        setLibraryRows(stickLibraryRows(stick.library, stick.sets));
        afterStickRestored();
      },
      {
        operation: "stick-reconnect",
        key,
        label: t("builder.work.stickReconnect"),
        target: handle.name,
      },
    );
    return true;
  }

  async function autoReconnectLostStick(): Promise<boolean> {
    const existing = await loadPersistedStickHandle().catch(() => null);
    if (!existing) return false;
    if (!(await stickPermission(existing, "read", true))) return false;
    if ((await probeStickAlive()) !== "alive") return false;
    return restoreStickFromHandle(existing, `stick-lost-auto:${draft.title}`);
  }

  async function reconnectLostStick(): Promise<boolean> {
    const existing = await loadPersistedStickHandle().catch(() => null);
    const handle =
      existing && (await stickPermission(existing, "read", true))
        ? existing
        : await pickAndRememberStick("read");
    if (!handle) return false;
    return restoreStickFromHandle(handle, `stick-lost:${draft.title}`);
  }

  async function reconnectLostStickFiles(files: File[]): Promise<boolean> {
    if (!files.length) return false;
    await enqueueWork(
      async () => {
        const stick = await readRekordboxStick(files);
        rememberStickFiles(files);
        setLibraryRows(stickLibraryRows(stick.library, stick.sets));
        afterStickRestored();
      },
      {
        operation: "stick-reconnect",
        key: `stick-lost-files:${files[0]?.webkitRelativePath.split("/")[0] ?? "stick"}`,
        label: t("builder.work.stickReconnect"),
        target: files[0]?.webkitRelativePath.split("/")[0],
      },
    );
    return true;
  }

  useEffect(() => {
    if (!stickReady && stickFileCount() === 0) {
      stickGoneStreak.current = 0;
      return;
    }
    let cancelled = false;
    const samplePath =
      draft.tracks.find((track) => track.filePath?.trim())?.filePath?.trim() ??
      "";

    async function tick() {
      if (cancelled || stickLostOpenRef.current) return;
      const state = await probeStickAlive(samplePath);
      if (cancelled || stickLostOpenRef.current) return;
      if (state === "alive" || state === "idle") {
        stickGoneStreak.current = 0;
        return;
      }
      stickGoneStreak.current += 1;
      const playingStick = getPreviewTransportSnapshot().playing;
      // Preview path opens immediately via onStickMediaLost; poll needs two hits.
      if (playingStick || stickGoneStreak.current >= 2) {
        reportStickLost(false);
      }
    }

    const id = window.setInterval(() => void tick(), 4000);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
    // stickReady / file epoch / whether the draft still has stick paths.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickReady, stickFilesEpoch, draft.tracks.length]);

  function replaceTrack(targetId: string, replacementId: string) {
    setDraft((current) => {
      const tracks = swapIntoSlot(current.tracks, targetId, replacementId, t);
      const openerId = current.openerId === targetId ? replacementId : current.openerId;
      const closerId = current.closerId === targetId ? replacementId : current.closerId;
      return {
        ...current,
        openerId,
        closerId,
        pinnedIds: withoutEndPins(
          current.pinnedIds?.map((item) => (item === targetId ? replacementId : item)),
          openerId,
          closerId,
        ),
        // Replacement enters the performance — drop exclude on both ids.
        excludedIds: normalizeExcludedIds(
          current.excludedIds?.filter(
            (item) => item !== targetId && item !== replacementId,
          ),
        ),
        tracks,
      };
    });
    setReplaceFor(null);
    setExchangeFor(null);
    setStatus(t("builder.status.replaced"));
  }

  function replaceFromLibrary(targetId: string, row: LibraryRow) {
    const target = draft.tracks.find((track) => track.id === targetId);
    if (!target) return;
    const incoming = libraryTrackToSetTrack(row, target.phase, target.role, t);
    setDraft((current) => {
      const tracks = swapIntoSlot(
        [...current.tracks, incoming],
        targetId,
        incoming.id,
        t,
      );
      const openerId = current.openerId === targetId ? incoming.id : current.openerId;
      const closerId = current.closerId === targetId ? incoming.id : current.closerId;
      return {
        ...current,
        openerId,
        closerId,
        pinnedIds: withoutEndPins(
          current.pinnedIds?.map((item) => (item === targetId ? incoming.id : item)),
          openerId,
          closerId,
        ),
        excludedIds: normalizeExcludedIds(
          current.excludedIds?.filter((item) => item !== targetId && item !== incoming.id),
        ),
        tracks,
      };
    });
    setReplaceFor(null);
    setExchangeFor(null);
    setStatus(
      t("builder.status.replacedFromLibrary", { name: incoming.name, target: target.name }),
    );
  }

  function replaceFromPool(targetId: string, poolTrack: SourcePoolTrack) {
    const target = draft.tracks.find((track) => track.id === targetId);
    if (!target) return;
    const incoming: SetTrack = {
      id: poolTrack.id,
      name: poolTrack.name,
      artists: poolTrack.artists,
      album: poolTrack.album,
      durationMs: poolTrack.durationMs,
      uri: poolTrack.uri,
      externalUrl: poolTrack.externalUrl,
      imageUrl: poolTrack.imageUrl,
      phase: target.phase,
      role: target.role,
      transition: "unset",
      bpm: poolTrack.bpm || poolTrack.catalogBpm || "",
      keyCamelot: poolTrack.keyCamelot || poolTrack.catalogKey || "",
      energy: poolTrack.energy,
      energyLevel: poolTrack.energyLevel,
      energySource: poolTrack.energySource,
      filePath: poolTrack.filePath,
      source: poolTrack.source,
      note: "",
      comment: "",
      why: "",
      safetyAlt: "",
    };
    setDraft((current) => {
      const existing = current.tracks.find((track) => track.id === incoming.id);
      const tracks = swapIntoSlot(
        existing ? current.tracks : [...current.tracks, incoming],
        targetId,
        incoming.id,
        t,
      );
      const openerId = current.openerId === targetId ? incoming.id : current.openerId;
      const closerId = current.closerId === targetId ? incoming.id : current.closerId;
      return {
        ...current,
        openerId,
        closerId,
        pinnedIds: withoutEndPins(
          current.pinnedIds?.map((item) => (item === targetId ? incoming.id : item)),
          openerId,
          closerId,
        ),
        excludedIds: normalizeExcludedIds(
          current.excludedIds?.filter((item) => item !== targetId && item !== incoming.id),
        ),
        tracks,
      };
    });
    setReplaceFor(null);
    setExchangeFor(null);
    setStatus(
      t("builder.status.replacedFromLibrary", { name: incoming.name, target: target.name }),
    );
  }

  function playLibraryRow(row: LibraryRow) {
    playLibraryTrack(libraryTrackToSetTrack(row, "open", "groove", t));
  }

  async function matchStreamingLinks() {
    const pending = draft.tracks.filter(
      (track) => !track.externalUrl && track.name.trim(),
    );
    if (!pending.length) {
      setStatus(t("builder.status.allHaveLinks"));
      return;
    }
    setMatchingLinks(true);
    setStatus(t("builder.status.searchingLinks", { done: 0, total: pending.length }));
    const patches = new Map<
      string,
      { externalUrl: string; imageUrl: string | null }
    >();
    let found = 0;
    let failed = 0;
    let firstError = "";
    try {
      for (let i = 0; i < pending.length; i += 4) {
        const chunk = pending.slice(i, i + 4);
        await Promise.all(
          chunk.map(async (track) => {
            const artist = track.artists.filter(
              (name) => name && name !== "Unknown" && name !== "Tidal",
            );
            const query = `${artist.join(" ")} ${track.name}`.trim();
            const response = await fetch(
              `/api/search?q=${encodeURIComponent(query)}&market=DE`,
            );
            if (!response.ok) {
              failed += 1;
              if (!firstError) {
                const body = (await response.json().catch(() => null)) as {
                  error?: string;
                } | null;
                firstError = body?.error ?? "";
              }
              return;
            }
            const data = (await response.json()) as {
              tracks?: Array<{
                name: string;
                artists: string[];
                externalUrl: string;
                imageUrl: string | null;
              }>;
            };
            const match = pickStreamingMatch(
              { name: track.name, artists: track.artists },
              data.tracks ?? [],
            );
            if (!match) return;
            found += 1;
            patches.set(track.id, {
              externalUrl: match.externalUrl,
              imageUrl: match.imageUrl,
            });
          }),
        );
        setStatus(
          t("builder.status.searchingLinks", {
            done: Math.min(i + 4, pending.length),
            total: pending.length,
          }),
        );
      }
      // The search itself failed (e.g. no credentials): say so instead of "no match".
      if (failed === pending.length) {
        throw new Error(firstError || t("builder.fail.spotifySearch"));
      }
      setDraft((current) => ({
        ...current,
        tracks: current.tracks.map((track) => {
          const patch = patches.get(track.id);
          if (!patch) return track;
          // Keep an existing cover (e.g. from the stick) unless Spotify has one.
          return {
            ...track,
            externalUrl: patch.externalUrl,
            imageUrl: patch.imageUrl ?? track.imageUrl,
          };
        }),
      }));
      setStatus(
        found
          ? t("builder.status.linksSet", { found, missing: pending.length - found })
          : t("builder.status.noLink"),
      );
    } catch (err) {
      fail(
        "library",
        errorText(err, t, "builder.fail.spotifySearch"),
        t("builder.fail.spotifySearchHint"),
      );
    } finally {
      setMatchingLinks(false);
    }
  }

  function openSaveSetup() {
    setSettingsOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        saveSetupAnchor.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function saveSetup() {
    const name = draft.title.trim() || t("builder.setups.fallbackName");
    if (name !== draft.title) {
      setDraft((current) => ({ ...current, title: name }));
    }
    const nextDraft = name === draft.title ? draft : { ...draft, title: name };
    const nextSetup: SavedSetup = {
      id:
        setups.find((item) => item.name === name)?.id ||
        `setup-${Date.now().toString(36)}`,
      name,
      savedAt: new Date().toISOString(),
      draft: nextDraft,
    };
    const next = [
      nextSetup,
      ...setups.filter((item) => item.id !== nextSetup.id && item.name !== name),
    ];
    const stored = writeSetups(next);
    setSelectedSetup(nextSetup.id);
    if (!stored) {
      fail("settings", t("builder.fail.setupStorage"), t("builder.fail.setupStorageHint"));
      return;
    }
    clearNotice();
    setStatus(t("builder.status.setupSaved", { name }));
  }

  function loadSetup(id = selectedSetup) {
    const setup = setups.find((item) => item.id === id);
    if (!setup) return;
    const next = {
      ...DEFAULT_SET,
      ...setup.draft,
      title: setup.draft.title?.trim() || setup.name,
      tracks: (setup.draft.tracks ?? []).map(normalizeTrack),
    };
    setDraft(next);
    setFocusTrackId(null);
    const needsStick =
      !stickReady && next.tracks.some((track) => track.filePath?.trim());
    setStatus(
      t(
        needsStick
          ? "builder.status.setupNeedsStick"
          : "builder.status.setupLoaded",
        { name: next.title },
      ),
    );
  }

  function deleteSetup() {
    const setup = setups.find((item) => item.id === selectedSetup);
    if (!setup) return;
    const next = setups.filter((item) => item.id !== setup.id);
    writeSetups(next);
    setSelectedSetup("");
    setStatus(t("builder.status.setupDeleted", { name: setup.name }));
  }

  function downloadSetup() {
    const title = draft.title.trim() || "setform";
    const name = title.replace(/[^\w\-]+/g, "-");
    const blob = new Blob(
      [JSON.stringify({ name: title, draft }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.setbuilder.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(t("builder.status.fileDownloaded"));
  }

  function uploadSetup(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as {
          name?: string;
          draft?: SetDraft;
          title?: string;
          tracks?: SetTrack[];
        };
        const incoming = parsed.draft ?? (parsed.tracks ? (parsed as SetDraft) : null);
        if (!incoming?.tracks || !incoming.title) {
          throw new Error(t("builder.fail.notSetup"));
        }
        const name = incoming.title.trim() || parsed.name || t("builder.setups.fallbackName");
        setDraft({
          ...DEFAULT_SET,
          ...incoming,
          title: name,
          tracks: incoming.tracks.map(normalizeTrack),
        });
        setStatus(t("builder.status.setupFromFile", { name }));
      } catch (err) {
        fail(
          "settings",
          errorText(err, t, "builder.fail.file"),
          t("builder.fail.fileHint"),
        );
      }
    };
    reader.onerror = () => {
      fail("settings", t("builder.fail.file"), t("builder.fail.fileHint"));
    };
    reader.readAsText(file);
  }

  function resetSet() {
    setResetOpen(true);
  }

  function confirmReset() {
    setResetOpen(false);
    setDraft(DEFAULT_SET);
    setSortUndo(null);
    setTrimUndo(null);
    setReplaceUndo(null);
    setFocusTrackId(null);
    setSelectedSetup("");
    setStatus(t("builder.status.reset"));
  }

  function sortSet(technique: SetSortTechnique) {
    beginWork(t("builder.status.sorting"));
    window.setTimeout(() => {
      try {
        const current = readStoredDraft();
        if (technique === "perfectPins") {
          const pins = withoutEndPins(
            current.pinnedIds,
            current.openerId,
            current.closerId,
          );
          const inPerf = new Set(
            current.tracks
              .filter((track) => track.role !== "safety")
              .map((track) => track.id),
          );
          const count = pins?.filter((id) => inPerf.has(id)).length ?? 0;
          if (count < 2) {
            endWork(t("builder.status.sorted.perfectPinsNeed"));
            return;
          }
        }
        const next = reorderDraft(current, technique);
        const changed = next.tracks.some(
          (track, index) => track.id !== current.tracks[index]?.id,
        );
        const pulled = alternativesPulledIntoPerformance(current, next);
        if (changed || pulled > 0) {
          setSortUndo(current);
        }
        setDraft(next);
        const sorted = t(`builder.status.sorted.${technique}`);
        endWork(
          pulled > 0
            ? `${sorted} ${t("builder.status.sorted.pulled", { count: pulled })}`
            : changed
              ? sorted
              : t("builder.status.sorted.unchanged"),
        );
      } catch {
        endWork(null);
      }
    }, 0);
  }

  function undoSort() {
    const snapshot = sortUndo;
    if (!snapshot) return;
    setDraft(snapshot);
    setSortUndo(null);
    setStatus(t("builder.sort.undoDone"));
  }

  function reshuffleFrom(source: ReshuffleSource) {
    const current = readStoredDraft();
    const performance = performanceTracks(current.tracks);
    const choice = (() => {
      if (source === "different") {
        const playlist = playlistPoolForDraft(current, stickSets);
        if (playlist.length >= 2 && playlist.length > performance.length) {
          return { pool: playlist, fromStick: false as const, keepPlaylistPool: true };
        }
        const fallback = reshufflePoolForDraft(current, libraryRows);
        if (!fallback) return null;
        return {
          ...fallback,
          keepPlaylistPool: !fallback.fromStick,
        };
      }
      if (source === "playlist") {
        const pool = playlistPoolForDraft(current, stickSets);
        if (pool.length < 2) return null;
        return { pool, fromStick: false as const, keepPlaylistPool: true };
      }
      const pool = sourcePoolFromStickLibrary(
        source === "history" ? historyLibraryRows(stickSets) : libraryRows,
        performance,
      );
      if (pool.length < 2 || pool.length <= performance.length) return null;
      return { pool, fromStick: true as const, keepPlaylistPool: false };
    })();
    if (!choice) {
      setStatus(t("builder.status.reshuffle.unavailable"));
      return;
    }
    const confirmKey =
      source === "history"
        ? "builder.pool.historyConfirm"
        : source === "collection"
          ? "builder.pool.collectionConfirm"
          : choice.fromStick
            ? "builder.tool.reshuffleConfirmStick"
            : "builder.tool.reshuffleConfirm";
    if (!window.confirm(t(confirmKey, { pool: choice.pool.length }))) {
      return;
    }
    beginWork(t("builder.status.reshuffling"));
    const pool = choice.pool;
    const keepPlaylistPool = choice.keepPlaylistPool;
    window.setTimeout(() => {
      try {
        const next = reshuffleDraftFromPool(
          { ...current, sourcePool: pool },
          t,
        );
        // Stick library/history draws must not overwrite a stored playlist pool.
        setDraft(
          keepPlaylistPool
            ? next
            : { ...next, sourcePool: current.sourcePool },
        );
        setSortUndo(null);
        setFocusTrackId(null);
        endWork(
          t("builder.status.reshuffle.done", {
            pool: pool.length,
            tracks: next.tracks.filter((track) => track.role !== "safety").length,
          }),
        );
      } catch {
        endWork(null);
      }
    }, 0);
  }

  async function runEnergyScan(
    targets: SetTrack[],
    options: {
      /** Write the level into the MP3. Background scans only update the draft. */
      write: boolean;
      /** Directory with write permission. Null keeps the draft update and counts a skip. */
      writeRoot: Awaited<ReturnType<typeof loadPersistedStickHandle>>;
      /** Read root. Falls back to the remembered stick when null. */
      root: Awaited<ReturnType<typeof loadPersistedStickHandle>>;
      reuseTags: boolean;
      active?: () => boolean;
    },
  ) {
    const job = ++energyJob.current;
    setAnalyzingEnergy(true);
    let done = 0;
    let skipped = 0;
    let errors = 0;
    let setCount = 0;
    let written = 0;
    let lastLevel: number | null = null;
    const reasons = new Map<string, number>();
    const total = targets.length;
    const alive = () => energyJob.current === job && (options.active?.() ?? true);
    // Declared before `line`: the first paint reads it immediately.
    const paint = { at: 0 };

    const line = (final: boolean) => {
      if (!alive() || !shouldPaint(paint, final)) return;
      if (final && total === 1 && lastLevel != null && errors === 0) {
        setStatus(
          t(written > 0 ? "builder.energy.oneWritten" : "builder.energy.one", {
            name: targets[0]?.name ?? "",
            level: lastLevel,
          }),
        );
        return;
      }
      const base = final
        ? t(options.write ? "builder.energy.done" : "builder.energy.measured", {
            set: setCount,
            written,
            skipped,
            errors,
          })
        : t("builder.energy.progress", { done, total, skipped, errors });
      setStatus(energyStatusLine(base, reasons));
    };
    line(false);

    const pending = new Map<
      string,
      { energy: number; source: "tag" | "measured"; filePath: string }
    >();
    const batchSize = total === 1 ? 1 : total > 24 ? 16 : 8;

    function flush(force: boolean) {
      if (pending.size === 0) return;
      // A newer scan must not throw away levels this one already finished.
      // Those fill gaps only, so they cannot overwrite the newer result.
      if (!force && (!alive() || pending.size < batchSize)) return;
      const batch = new Map(pending);
      pending.clear();
      const mode = alive() ? "replace" : "fill";
      setDraft((current) => applyMeasuredEnergy(current, batch, mode));
    }

    const remember = (
      id: string,
      energy: number,
      source: "tag" | "measured",
      filePath: string,
    ) => {
      lastLevel = energy;
      pending.set(id, { energy, source, filePath });
      flush(false);
    };

    try {
      for (const track of targets) {
        if (!alive()) return;
        const path = track.filePath!.trim();
        try {
          const resolved = await resolveTrackAudio(path, options.writeRoot ?? options.root);
          if (!alive()) return;
          if (!resolved) {
            skipped += 1;
            done += 1;
            line(false);
            await yieldToUi();
            continue;
          }

          const latest = readStoredDraft().tracks.find((item) => item.id === track.id);
          if (options.reuseTags && latest && hasKnownEnergy(latest)) {
            done += 1;
            line(false);
            await yieldToUi();
            continue;
          }

          if (options.reuseTags) {
            const tagged = await energyTagFromFile(resolved.file);
            if (tagged != null) {
              remember(track.id, tagged, "tag", path);
              setCount += 1;
              done += 1;
              line(false);
              await yieldToUi();
              continue;
            }
            if (!alive()) return;
          }

          const energy = await analyzeFileEnergy(resolved.file);
          remember(track.id, energy, "measured", path);
          if (!alive()) return;
          setCount += 1;

          if (options.write && isWritableMp3(resolved.file, path) && resolved.handle && options.writeRoot) {
            const bytes = new Uint8Array(await resolved.file.arrayBuffer());
            const tagged = writeEnergy(bytes, energy);
            await writeVerifiedStickFileBytes(resolved.handle, tagged);
            if (!alive()) return;
            written += 1;
          } else if (options.write) {
            skipped += 1;
          }
        } catch (error) {
          errors += 1;
          const raw = error instanceof Error ? error.message : String(error);
          const message =
            !raw.trim() ||
            raw.includes("Exception catching is disabled") ||
            raw === "Could not measure energy from this file"
              ? t("builder.energy.measureFailed")
              : raw.trim();
          reasons.set(message, (reasons.get(message) ?? 0) + 1);
        }
        done += 1;
        line(false);
        await yieldToUi();
      }
      flush(true);
      line(true);
    } finally {
      flush(true);
      if (energyJob.current === job) setAnalyzingEnergy(false);
    }
  }

  function energyTargets() {
    const withPath = readStoredDraft().tracks.filter((track) => track.filePath?.trim());
    return {
      withPath,
      missing: withPath.filter((track) => !hasKnownEnergy(track)),
      known: withPath.filter((track) => hasKnownEnergy(track)),
    };
  }

  async function stickForEnergy() {
    const stick = await loadPersistedStickHandle().catch(() => null);
    if (!stick && stickFileCount() === 0) {
      setStatus(t("builder.energy.noStick"));
      return undefined;
    }
    return stick;
  }

  async function readEnergyTags() {
    const { withPath } = energyTargets();
    if (!withPath.length) {
      setStatus(t("builder.energy.noFile"));
      return;
    }
    setAnalyzingEnergy(true);
    await queueHeavy(
      () => readEnergyTagsNow(withPath),
      {
        operation: "energy-tags",
        key: withPath.map((track) => track.filePath || track.id).join("|"),
        label: t("builder.work.energyTags"),
        target: trackCount(withPath.length, t),
      },
    ).finally(() => setAnalyzingEnergy(false));
  }

  async function readEnergyTagsNow(withPath: SetTrack[]) {
    const job = ++energyJob.current;
    setAnalyzingEnergy(true);
    const alive = () => energyJob.current === job;
    try {
      const stick = await stickForEnergy();
      if (stick === undefined) return;
      const levels = new Map<string, number>();
      let done = 0;
      const paint = { at: 0 };
      setStatus(t("builder.energy.tags", { done: 0, total: withPath.length }));
      for (const track of withPath) {
        if (!alive()) return;
        const path = track.filePath!.trim();
        try {
          const resolved = await resolveTrackAudio(path, stick);
          if (resolved) {
            const energy = await energyTagFromFile(resolved.file);
            if (energy != null) levels.set(track.id, energy);
          }
        } catch {
          // An unreadable file keeps the level already in the set.
        }
        done += 1;
        if (alive() && shouldPaint(paint, done === withPath.length)) {
          setStatus(t("builder.energy.tags", { done, total: withPath.length }));
        }
        await yieldToUi();
      }
      if (!alive()) return;
      setDraft(applyRereadEnergyLevels(readStoredDraft(), levels));
      setStatus(t("builder.energy.tagsDone", { found: levels.size, total: withPath.length }));
    } finally {
      if (alive()) setAnalyzingEnergy(false);
    }
  }

  async function measureEnergy(mode: "missing" | "all") {
    const { withPath, missing } = energyTargets();
    if (!withPath.length) {
      setStatus(t("builder.energy.noFile"));
      return;
    }
    const targets = mode === "missing" ? missing : withPath;
    if (!targets.length) {
      setStatus(t("builder.energy.noneMissing"));
      return;
    }
    const stick = await stickForEnergy();
    if (stick === undefined) return;
    setAnalyzingEnergy(true);
    await queueHeavy(
      () =>
        runEnergyScan(targets, {
          write: false,
          writeRoot: null,
          reuseTags: mode === "missing",
          root: stick,
        }),
      {
        operation: "energy-measure",
        key: `${mode}:${targets.map((track) => track.filePath || track.id).join("|")}`,
        label: t(
          mode === "missing"
            ? "builder.work.energyMissing"
            : "builder.work.energyAll",
        ),
        target: trackCount(targets.length, t),
      },
    ).finally(() => setAnalyzingEnergy(false));
  }

  async function writeEnergyToFiles() {
    const { known } = energyTargets();
    if (!known.length) {
      setStatus(t("builder.energy.noneKnown"));
      return;
    }
    const stick = await stickForEnergy();
    if (stick === undefined || !stick) {
      setStatus(t("builder.energy.noStick"));
      return;
    }
    const writeRoot = await ensureStickWriteAccess(stick);
    if (!writeRoot) {
      setStatus(t("builder.energy.denied"));
      return;
    }
    setAnalyzingEnergy(true);
    await queueHeavy(
      () => writeEnergyNow(known, writeRoot),
      {
        operation: "energy-write",
        key: known.map((track) => track.filePath || track.id).join("|"),
        label: t("builder.work.energyWrite"),
        target: trackCount(known.length, t),
      },
    ).finally(() => setAnalyzingEnergy(false));
  }

  async function writeEnergyNow(
    known: SetTrack[],
    writeRoot: NonNullable<Awaited<ReturnType<typeof loadPersistedStickHandle>>>,
  ) {
    const job = ++energyJob.current;
    setAnalyzingEnergy(true);
    const alive = () => energyJob.current === job;
    let written = 0;
    let skipped = 0;
    try {
      let done = 0;
      const paint = { at: 0 };
      setStatus(t("builder.energy.writeProgress", { done: 0, total: known.length, written: 0 }));
      for (const track of known) {
        if (!alive()) return;
        const path = track.filePath!.trim();
        const level = track.energyLevel;
        try {
          const resolved = await resolveTrackAudio(path, writeRoot);
          if (
            resolved?.handle &&
            level != null &&
            isWritableMp3(resolved.file, path)
          ) {
            const bytes = new Uint8Array(await resolved.file.arrayBuffer());
            await writeVerifiedStickFileBytes(resolved.handle, writeEnergy(bytes, level));
            written += 1;
          } else {
            skipped += 1;
          }
        } catch {
          skipped += 1;
        }
        done += 1;
        if (alive() && shouldPaint(paint, done === known.length)) {
          setStatus(t("builder.energy.writeProgress", { done, total: known.length, written }));
        }
        await yieldToUi();
      }
      if (alive()) setStatus(t("builder.energy.writeDone", { written, skipped }));
    } finally {
      if (alive()) setAnalyzingEnergy(false);
    }
  }

  async function recalculateTrackEnergy(track: SetTrack) {
    if (!track.filePath?.trim()) return;
    setAnalyzingEnergy(true);
    await queueHeavy(async () => {
      let started = false;
      try {
        const stick = await loadPersistedStickHandle().catch(() => null);
        if (!stick && stickFileCount() === 0) {
          setStatus(t("builder.energy.noStick"));
          return;
        }
        const writeRoot =
          stick && (await stickPermission(stick, "readwrite", false)) ? stick : null;
        started = true;
        await runEnergyScan([track], {
          write: writeRoot != null,
          writeRoot,
          reuseTags: false,
          root: stick,
        });
      } finally {
        if (!started) setAnalyzingEnergy(false);
      }
    }, {
      operation: "energy-track",
      key: track.id,
      label: t("builder.work.energyTrack"),
      target: track.name,
    }).finally(() => setAnalyzingEnergy(false));
  }

  function fitSlot() {
    setDraft((current) => {
      const resolved = draftWithPlaylistPool(current, stickSets);
      const result = fitToSlot(resolved, t);
      const slotMs = current.durationMinutes * 60_000;
      const under = result.beforeMs < slotMs;
      if (!result.moved && !result.added) {
        if (result.beforeMs > slotMs * 1.05) {
          setStatus(t("builder.status.fitStuck"));
        } else if (under) {
          setStatus(t("builder.status.fillStuck"));
        } else {
          setStatus(t("builder.status.fits"));
        }
        return resolved;
      }
      setTrimUndo(result.restore.length ? result.restore : null);
      if (result.moved && result.added) {
        setStatus(
          t("builder.status.fitAdjusted", {
            before: formatDuration(result.beforeMs),
            after: formatDuration(result.afterMs),
            moved: trackCount(result.moved, t),
            added: trackCount(result.added, t),
          }),
        );
      } else if (result.added) {
        setStatus(
          t("builder.status.filled", {
            before: formatDuration(result.beforeMs),
            after: formatDuration(result.afterMs),
            added: trackCount(result.added, t),
          }),
        );
      } else {
        setStatus(
          t("builder.status.trimmed", {
            before: formatDuration(result.beforeMs),
            after: formatDuration(result.afterMs),
            kept: trackCount(result.kept, t),
            moved: trackCount(result.moved, t),
          }),
        );
      }
      return result.draft;
    });
  }

  /** After the brief minutes change: same path as „Auf Slot setzen“ when over/under. */
  function queueFitForNewDuration(minutes: number) {
    if (durationFitTimer.current != null) {
      window.clearTimeout(durationFitTimer.current);
    }
    durationFitTimer.current = window.setTimeout(() => {
      durationFitTimer.current = null;
      const current = readStoredDraft();
      if (current.durationMinutes !== minutes || !current.tracks.length) return;
      const filled = playedTotalMs(current.tracks, blendMsOf(current.blendMs));
      const slotMs = minutes * 60_000;
      // Same idle band as the Fit button — leave a fitting cast alone.
      if (filled <= slotMs * 1.05 && filled >= slotMs) return;
      fitSlot();
    }, 450);
  }

  function commitDurationMinutes(minutes: number) {
    const clamped = Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(minutes)));
    setDraft((c) =>
      c.durationMinutes === clamped ? c : { ...c, durationMinutes: clamped },
    );
    queueFitForNewDuration(clamped);
  }

  function fillBestMatches() {
    setDraft((current) => {
      const resolved = draftWithPlaylistPool(current, stickSets);
      const result = fillWithBestMatches(resolved, t);
      if (!result.added) {
        if (result.idle === "unfit") setStatus(t("builder.status.fillNoMatch"));
        else if (result.idle === "full") setStatus(t("builder.status.fits"));
        else setStatus(t("builder.status.fillStuck"));
        return resolved;
      }
      setTrimUndo(result.restore.length ? result.restore : null);
      setStatus(
        t("builder.status.filled", {
          before: formatDuration(result.beforeMs),
          after: formatDuration(result.afterMs),
          added: trackCount(result.added, t),
        }),
      );
      return result.draft;
    });
  }

  function undoTrim() {
    const snapshot = trimUndo;
    if (!snapshot?.length) return;
    setDraft((current) => undoTrimToSlot(current, snapshot));
    setTrimUndo(null);
    setStatus(t("builder.trim.undoDone"));
  }

  function assignRoles() {
    setDraft((current) => {
      setStatus(t("builder.status.roles"));
      return distributeRoles(current, t);
    });
  }

  function renderSetups() {
    return (
      <section className="setups-bar" aria-label={t("builder.setups.aria")}>
        <div className="panel-head">
          <h2>{t("builder.settings.title")}</h2>
          <p>{t("builder.setups.intro")}</p>
        </div>

        <div className="setups-zone">
          <h3 className="setups-zone-title">{t("builder.setups.sectionServices")}</h3>
          <ConnectionSetup onStatus={noteSettings} />
          <FieldNoticeView notice={localNotice("connect")} />
        </div>

        <div className="setups-zone">
          <h3 className="setups-zone-title">{t("builder.setups.sectionBrief")}</h3>
          <div className="setups-toolbar">
            <label ref={saveSetupAnchor} className="setup-field setups-toolbar-name">
              <span>{t("builder.setups.name")}</span>
              <div className="setups-inline">
                <input
                  value={draft.title}
                  placeholder={t("builder.brief.titlePlaceholder")}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  aria-label={t("builder.setups.nameAria")}
                />
                <button type="button" className="btn" onClick={saveSetup}>
                  {t("common.save")}
                </button>
              </div>
            </label>

            <label className="setup-field setups-toolbar-load">
              <span>{t("builder.setups.stored")}</span>
              <div className="setups-inline">
                <select
                  value={selectedSetup}
                  onChange={(event) => setSelectedSetup(event.target.value)}
                  aria-label={t("builder.setups.selectAria")}
                >
                  <option value="">{t("builder.setups.choose")}</option>
                  {setups.map((setup) => (
                    <option key={setup.id} value={setup.id}>
                      {setup.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={!selectedSetup}
                  onClick={() => loadSetup()}
                >
                  {t("common.load")}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={!selectedSetup}
                  onClick={deleteSetup}
                >
                  {t("common.delete")}
                </button>
              </div>
            </label>

            <div className="setup-field setups-toolbar-file">
              <span>{t("builder.setups.fileTitle")}</span>
              <div className="setups-inline setups-inline-wrap">
                <button type="button" className="btn ghost" onClick={downloadSetup}>
                  {t("builder.setups.download")}
                </button>
                <label className="btn ghost file-btn">
                  {t("common.open")}
                  <input
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(event) => {
                      uploadSetup(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn ghost danger"
                  title={t("library.menu.resetHint")}
                  onClick={resetSet}
                >
                  {t("library.menu.reset")}
                </button>
              </div>
              <p className="setups-toolbar-hint">{t("builder.setups.fileHint")}</p>
            </div>
          </div>
          <FieldNoticeView notice={localNotice("settings")} />
        </div>

        <AppUpdateCard variant="strip" />
      </section>
    );
  }

  function renderConnection() {
    const spotifyState =
      spotifyConnected === null
        ? t("builder.conn.checking")
        : spotifyConnected
          ? t("builder.conn.connected")
          : t("builder.conn.notConnected");
    const tidalState =
      tidalConnected === null
        ? t("builder.conn.checking")
        : tidalConnected
          ? t("builder.conn.connected")
          : t("builder.conn.notConnected");
    const body = (
      <div className="crate-connect builder-card builder-stack">
        <div className="crate-connect-row">
        <div className="import-actions">
          {spotifyConnected ? (
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                setSpotifyConnected(false);
                setMyPlaylists([]);
                setStatus(t("builder.conn.spotifyDisconnected"));
              }}
            >
              {t("builder.conn.disconnectSpotify")}
            </button>
          ) : (
            <a className="button-link" href="/api/auth/login">
              {t("builder.conn.connectSpotify")}
            </a>
          )}
          {tidalConnected ? (
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                await fetch("/api/auth/tidal/logout", { method: "POST" });
                setTidalConnected(false);
                setStatus(t("builder.conn.tidalDisconnected"));
              }}
            >
              {t("builder.conn.disconnectTidal")}
            </button>
          ) : (
            <a className="button-link tidal-login" href="/api/auth/tidal/login">
              {t("builder.conn.connectTidal")}
            </a>
          )}
        </div>
        <p className="panel-inline-status builder-status">
          {t("builder.conn.state", { spotify: spotifyState, tidal: tidalState })}
        </p>
        </div>
        {spotifyConnected && tidalConnected ? null : (
          <p className="builder-note">{t("builder.conn.hint")}</p>
        )}
      </div>
    );
    // Nothing connected: keep the buttons out of the way until someone wants them.
    if (spotifyConnected === false && tidalConnected === false) {
      return (
        <details className="explain-fold nested optional-connect">
          <summary>
            <span>{t("builder.conn.optional")}</span>
            <em className="fold-toggle" />
          </summary>
          <div className="explain-body">{body}</div>
        </details>
      );
    }
    return body;
  }

  // Demotions: still Alternatives, restore remembers a performance role + place.
  // Fills: currently in the performance, restore would park them as Alternatives.
  // Never show a fill's alt-array index as "Platz 74".
  const trimUndoLive =
    trimUndo?.filter((item) => {
      if (item.role === "safety") return false;
      const track = draft.tracks.find((row) => row.id === item.id);
      return track?.role === "safety";
    }) ?? [];
  const fillUndoLive =
    trimUndoLive.length > 0
      ? []
      : (trimUndo?.filter((item) => {
          if (item.role !== "safety") return false;
          const track = draft.tracks.find((row) => row.id === item.id);
          return Boolean(track && track.role !== "safety");
        }) ?? []);

  return (
    <div className="set-shell">
      {authNote ? <p className="banner status">{authNote}</p> : null}
      <header className="hero">
        <div className="hero-bar">
          <p className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="brand-mark"
              src="/logo.svg"
              alt=""
              width={36}
              height={36}
            />
            SETBUILDER
          </p>
          <div className="topbar">
            <div className="set-switch" role="group" aria-label={t("builder.setups.topAria")}>
              <label className="set-switch-pick">
                <span>{t("builder.setups.topLabel")}</span>
                <select
                  value={selectedSetup}
                  onChange={(event) => {
                    const id = event.target.value;
                    setSelectedSetup(id);
                    if (id) loadSetup(id);
                  }}
                  aria-label={t("builder.setups.selectAria")}
                  disabled={setups.length === 0}
                >
                  <option value="">
                    {setups.length === 0
                      ? t("builder.setups.topEmpty")
                      : t("builder.setups.topChoose")}
                  </option>
                  {setups.map((setup) => (
                    <option key={setup.id} value={setup.id}>
                      {setup.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn ghost"
                title={t("library.menu.resetHint")}
                onClick={resetSet}
              >
                {t("builder.setups.scratch")}
              </button>
            </div>
            <LanguageSwitch />
          </div>
        </div>
        <div className="hero-work">
        <div className="hero-copy">
          <h1>{t("builder.hero.title")}</h1>
          <p className="hero-manifesto-lead">{t("builder.hero.manifestoLead")}</p>
        </div>
        <div className="hero-meta" aria-label={t("builder.brief.aria")}>
          <label className="hero-meta-title">
            <span>{t("builder.brief.title")}</span>
            <input
              value={draft.title}
              placeholder={t("builder.brief.titlePlaceholder")}
              onChange={(e) =>
                setDraft((c) => ({ ...c, title: e.target.value }))
              }
            />
          </label>
          <Tip text={t("builder.brief.durationHint")}>
            <label>
              <span>{t("builder.brief.duration")}</span>
              <input
                type="number"
                min={MIN_DURATION}
                max={MAX_DURATION}
                inputMode="numeric"
                value={durationText ?? draft.durationMinutes}
                onChange={(e) => {
                  // Let the field go empty while typing; the draft follows valid values.
                  const text = e.target.value;
                  setDurationText(text);
                  const minutes = Number(text);
                  if (
                    text &&
                    Number.isFinite(minutes) &&
                    minutes >= MIN_DURATION &&
                    minutes <= MAX_DURATION
                  ) {
                    commitDurationMinutes(minutes);
                  }
                }}
                onBlur={() => {
                  const minutes = Number(durationText);
                  if (
                    durationText !== null &&
                    durationText !== "" &&
                    Number.isFinite(minutes)
                  ) {
                    commitDurationMinutes(minutes);
                  }
                  setDurationText(null);
                }}
              />
            </label>
          </Tip>
          <label>
            <span>{t("builder.brief.blend")}</span>
            <select
              value={blendMs}
              title={t("builder.brief.blendHint")}
              onChange={(event) => {
                const next = blendMsOf(Number(event.target.value));
                setDraft((current) => ({ ...current, blendMs: next }));
              }}
            >
              {BLEND_PRESETS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms === 30_000
                    ? t("builder.brief.blend.30000")
                    : ms === 60_000
                      ? t("builder.brief.blend.60000")
                      : ms === 240_000
                        ? t("builder.brief.blend.240000")
                        : t("builder.brief.blend.120000")}
                </option>
              ))}
            </select>
          </label>
          <details className="hero-meta-more">
            <summary>
              <span className="hero-meta-more-label">{t("builder.brief.more")}</span>
              <Hint className="hero-meta-more-hint" text={t("builder.brief.moreHint")} />
            </summary>
            <div className="hero-meta-more-grid">
              <label>
                <span>{t("builder.brief.vibe")}</span>
                <input
                  value={draft.vibe}
                  placeholder={t("builder.brief.vibePlaceholder")}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, vibe: e.target.value }))
                  }
                />
              </label>
              <label>
                <span>{t("builder.brief.venue")}</span>
                <input
                  value={draft.venue}
                  placeholder={t("builder.brief.venuePlaceholder")}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, venue: e.target.value }))
                  }
                />
              </label>
              <label>
                <span>{t("builder.brief.slotKind")}</span>
                <select
                  value={draft.slotKind ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const slotKind = (
                      value === "warmup" ||
                      value === "support" ||
                      value === "peaktime" ||
                      value === "closing"
                        ? value
                        : undefined
                    ) as SetSlotKind | undefined;
                    setDraft((c) => ({ ...c, slotKind }));
                  }}
                >
                  <option value="">{t("builder.brief.slotKindEmpty")}</option>
                  {SLOT_KINDS.map((kind) => (
                    <option key={kind.id} value={kind.id} title={slotHint(t, kind.id)}>
                      {slotLabel(t, kind.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("builder.brief.audience")}</span>
                <input
                  value={draft.audience}
                  placeholder={t("builder.brief.audiencePlaceholder")}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, audience: e.target.value }))
                  }
                />
              </label>
              <label>
                <span>{t("builder.brief.gear")}</span>
                <input
                  value={draft.gear}
                  placeholder={t("builder.brief.gearPlaceholder")}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, gear: e.target.value }))
                  }
                />
              </label>
              <label className="hero-meta-notes">
                <span>{t("builder.brief.notes")}</span>
                <textarea
                  rows={2}
                  value={draft.notes ?? ""}
                  placeholder={t("builder.brief.notesPlaceholder")}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, notes: e.target.value }))
                  }
                />
              </label>
            </div>
          </details>
        </div>
        </div>
      </header>

      {!persisted ? (
        <p className="banner error" role="alert">
          {t("builder.storage.blocked")}
        </p>
      ) : null}

      {displayedStatus ? (
        <p className="banner status" role="status" aria-live="polite" aria-busy={statusHeld || energyBusy}>
          {displayedStatus}
        </p>
      ) : null}

      <AppUpdateCard variant="banner" />

      <PlaylistLoadDialog
        open={pendingStickSet !== null}
        name={pendingStickSet?.name ?? ""}
        onClose={() => setPendingStickSet(null)}
        onReplace={() => {
          if (pendingStickSet) applyLoadedStickSet(pendingStickSet, "replace");
        }}
        onMerge={() => {
          if (pendingStickSet) applyLoadedStickSet(pendingStickSet, "merge");
        }}
      />

      {replaceUndo ? (
        <div className="stick-reload" role="status">
          <div>
            <strong>{t("builder.playlist.replacedTitle")}</strong>
            <p>{t("builder.playlist.replacedBody")}</p>
          </div>
          <div className="stick-reload-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setDraft((current) => undoPlaylistLoad(current, replaceUndo));
                setReplaceUndo(null);
                setStatus(t("builder.playlist.undoDone"));
              }}
            >
              {t("builder.playlist.undo")}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setReplaceUndo(null)}
            >
              {t("builder.playlist.dismiss")}
            </button>
          </div>
        </div>
      ) : null}

      <details id="library-section" className="explain-fold section-fold" open>
        <summary>
          <span>{t("builder.library.title")}</span>
          <em>
            {mainTracks.length
              ? t("builder.library.keys", {
                  done: mainTracks.filter((track) => track.keyCamelot).length,
                  total: mainTracks.length,
                })
              : t("builder.library.firstStep")}
          </em>
        </summary>
        <LibraryPanel
          draft={draft}
          rows={libraryRows}
          onRows={(rows) => {
            setLibraryRows(rows);
            const library = rows.flatMap((row) => (row.stick ? [row.stick] : []));
            showStickMerge(library, t("builder.stick.ready"));
          }}
          onApply={(next, message) => {
            setDraft(next);
            clearNotice();
            const library = libraryRows.flatMap((row) => (row.stick ? [row.stick] : []));
            showStickMerge(library, message);
          }}
          onStickSets={setStickSets}
          onStickStatus={onStickStatus}
          chooseStick={chooseStickRef}
        />
      </details>

      <details className="explain-fold section-fold" open>
        <summary
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("button")) {
              event.preventDefault();
            }
          }}
        >
          <span className="build-section-title">
            {t("builder.build.title")}
            <button
              type="button"
              className="build-guide-open"
              aria-expanded={guideOpen}
              aria-controls="set-guide"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setGuideOpen(true);
              }}
            >
              {t("builder.guide.title")}
            </button>
          </span>
          <em>
            {t("builder.build.summary", {
              performance: mainTracks.length,
              safety: draft.tracks.length - mainTracks.length,
            })}
          </em>
        </summary>
        {guideOpen ? <SetGuideDrawer onClose={() => setGuideOpen(false)} /> : null}
        <section className="crate-workspace" aria-label={t("builder.build.title")}>
          <div className="panel-head">
            <div>
              <h2>{t("builder.build.title")}</h2>
            </div>
          </div>

          <div className="library-panel stick-sets-host">
            {stickSets.length > 0 ? (
              <StickSetList
                sets={stickSets}
                onTake={requestStickSet}
              />
            ) : (
              <section className="library-browser stick-sets builder-card" aria-label={t("builder.playlist.title")}>
                <h3 className="library-browser-title">
                  <span className="library-browser-heading">{t("builder.playlist.title")}</span>
                </h3>
                <p className="builder-note">{t("builder.playlist.empty")}</p>
              </section>
            )}
          </div>

          <details className="explain-fold nested crate-add">
            <summary>
              <span>{t("builder.add.title")}</span>
              <em className="fold-toggle" />
            </summary>
            <div className="explain-body crate-add-body">
              {libraryRows.length > 0 ? (
                <LibraryBrowser
                  draft={draft}
                  rows={libraryRows}
                  onAddTrack={addLibraryTrack}
                  onPlayTrack={playLibraryTrack}
                  playingId={previewTransport.playing ? previewTransport.trackId : null}
                />
              ) : (
                <p className="builder-note">{t("builder.add.empty")}</p>
              )}
              <details className="explain-fold nested crate-add-backup">
                <summary>
                  <span>{t("builder.add.backup")}</span>
                  <em className="fold-toggle" />
                </summary>
                <div className="explain-body">
                  <p className="builder-note">{t("builder.add.backupNote")}</p>
              {addTab === "auto" ? null : (
                <div className="add-target">
                  <span className="add-target-label">{t("builder.add.target")}</span>
                  <select
                    value={activePhase}
                    onChange={(event) =>
                      setActivePhase(event.target.value as SetPhaseId)
                    }
                    aria-label={t("builder.add.phaseAria")}
                  >
                    {PHASES.map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phaseLabel(t, phase.id)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={activeRole}
                    onChange={(event) =>
                      setActiveRole(event.target.value as TrackRole)
                    }
                    aria-label={t("builder.add.roleAria")}
                  >
                    {TRACK_ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {roleLabel(t, role.id)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="seg crate-add-tabs" role="tablist" aria-label={t("builder.add.tabsAria")}>
                {(["link", "search", "manual", "auto"] as const).map((id, index, all) => (
                  <Tip
                    key={id}
                    text={t(`builder.add.tab.${id}.hint`)}
                    end={index === all.length - 1}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={addTab === id}
                      className={addTab === id ? "seg-item active" : "seg-item"}
                      onClick={() => {
                        setAddTab(id);
                        clearNotice();
                      }}
                    >
                      {t(`builder.add.tab.${id}.label`)}
                    </button>
                  </Tip>
                ))}
              </div>

              {addTab === "search" ? (
                <>
                  <form
                    className="search-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      runSearch();
                    }}
                  >
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t("builder.search.placeholder")}
                      aria-label={t("builder.search.aria")}
                    />
                    <button type="submit" disabled={isPending}>
                      {isPending ? t("builder.search.busy") : t("builder.search.submit")}
                    </button>
                  </form>
                  <p className="builder-note">{t("builder.search.hint")}</p>
                </>
              ) : null}

              {addTab === "link" ? (
                <>
                  <form
                    className="search-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void importCrateLink();
                    }}
                  >
                    <input
                      value={linkUrl}
                      onChange={(event) => setLinkUrl(event.target.value)}
                      placeholder={t("builder.link.placeholder")}
                      aria-label={t("builder.link.aria")}
                    />
                    <button type="submit" disabled={isPending}>
                      {isPending ? t("builder.link.busy") : t("common.load")}
                    </button>
                  </form>
                  {tidalConnected && tidalPlaylists.length > 0 ? (
                    <div className="playlist-picker">
                      <label>
                        <span>{t("builder.link.tidalPlaylists")}</span>
                        <select
                          value=""
                          aria-label={t("builder.link.tidalPickAria")}
                          onChange={(event) => {
                            const id = event.target.value;
                            if (!id) return;
                            const picked = tidalPlaylists.find((item) => item.id === id);
                            void loadTidalCrate(id, picked?.name);
                          }}
                        >
                          <option value="">{t("builder.link.pickOption")}</option>
                          {tidalPlaylists.map((playlist) => (
                            <option key={playlist.id} value={playlist.id}>
                              {playlist.name}
                              {playlist.trackCount != null ? ` (${playlist.trackCount})` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                  {spotifyConnected && myPlaylists.length > 0 ? (
                    <div className="playlist-picker">
                      <label>
                        <span>{t("builder.link.spotifyPlaylists")}</span>
                        <select
                          value=""
                          aria-label={t("builder.link.spotifyPickAria")}
                          onChange={(event) => {
                            const id = event.target.value;
                            if (!id) return;
                            const url = `https://open.spotify.com/playlist/${id}`;
                            setLinkUrl(url);
                            void importCrateLink(url);
                          }}
                        >
                          <option value="">{t("builder.link.pickOption")}</option>
                          {myPlaylists.map((playlist) => (
                            <option key={playlist.id} value={playlist.id}>
                              {playlist.name} ({playlist.trackCount})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                  {renderConnection()}
                  <p className="builder-note">{t("builder.link.hint")}</p>
                </>
              ) : null}

              {addTab === "search" || addTab === "link" ? (
                <>
                  <FieldNoticeView notice={localNotice("crate")} />
                  {crateSource ? (
                    <div className="crate-source-bar">
                      <span>{crateSource}</span>
                      {results.length > 1 ? (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={addAllResults}
                        >
                          {t("builder.crate.addAll", { count: results.length })}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {!hasSearched ? (
                    // The notice above already says what to do next: no second box under it.
                    localNotice("crate") ? null : (
                      <div className="empty">
                        <p>
                          {addTab === "search"
                            ? t("builder.crate.emptySearch")
                            : t("builder.crate.emptyLink")}
                        </p>
                      </div>
                    )
                  ) : results.length === 0 ? (
                    <div className="empty">
                      <p>{t("builder.crate.none")}</p>
                    </div>
                  ) : (
                    <ul className="result-list">
                      {results.map((track) => (
                        <li key={track.id}>
                          <div className="track-main">
                            <TrackArt url={track.imageUrl} />
                            <div>
                              <strong>{track.name}</strong>
                              <span>
                                <em
                                  className={`source-pill source-${track.source || "spotify"}`}
                                >
                                  {sourceLabel(track.source || "spotify")}
                                </em>
                                {track.artists.join(", ")}
                                {track.durationMs
                                  ? ` · ${formatDuration(track.durationMs)}`
                                  : ""}
                              </span>
                            </div>
                          </div>
                          <button type="button" onClick={() => addTrack(track)}>
                            {t("builder.crate.add")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}

              {addTab === "manual" ? (
                <>
                  <form
                    className="manual-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addManualEntry();
                    }}
                  >
                    <label className="manual-field">
                      <span>{t("builder.manual.title")}</span>
                      <input
                        value={manualTitle}
                        onChange={(event) => setManualTitle(event.target.value)}
                        placeholder={t("builder.manual.title")}
                        aria-label={t("builder.manual.title")}
                      />
                    </label>
                    <label className="manual-field">
                      <span>{t("builder.manual.artist")}</span>
                      <input
                        value={manualArtist}
                        onChange={(event) => setManualArtist(event.target.value)}
                        placeholder={t("builder.manual.artist")}
                        aria-label={t("builder.manual.artist")}
                      />
                    </label>
                    <label className="manual-field is-wide">
                      <span>{t("builder.manual.link")}</span>
                      <input
                        value={manualLink}
                        onChange={(event) => setManualLink(event.target.value)}
                        placeholder={t("builder.manual.linkPlaceholder")}
                        aria-label={t("builder.link.aria")}
                      />
                    </label>
                    <button type="submit" className="btn manual-form-btn">
                      {t("builder.manual.add")}
                    </button>
                  </form>
                  <FieldNoticeView notice={localNotice("crate")} />
                </>
              ) : null}

              {addTab === "auto" ? (
                <>
                  <p className="builder-note">{t("builder.auto.note")}</p>
                  {draft.tracks.length > 0 ? (
                    <p className="builder-note">
                      {t("builder.auto.replaces", {
                        tracks: trackCount(draft.tracks.length, t),
                      })}
                    </p>
                  ) : null}
                  {spotifyConnected && myPlaylists.length > 0 ? (
                    <div className="playlist-picker">
                      <label>
                        <span>{t("builder.auto.ownPlaylists")}</span>
                        <select
                          value=""
                          onChange={(event) => {
                            const id = event.target.value;
                            if (!id) return;
                            setPlaylistUrl(`https://open.spotify.com/playlist/${id}`);
                            clearNotice();
                          }}
                          aria-label={t("builder.auto.pickAria")}
                        >
                          <option value="">{t("builder.auto.pickOption")}</option>
                          {myPlaylists.map((playlist) => (
                            <option key={playlist.id} value={playlist.id}>
                              {playlist.name} ({playlist.trackCount})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                  <form
                    className="search-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void extractFromPlaylist();
                    }}
                  >
                    <input
                      value={playlistUrl}
                      onChange={(event) => setPlaylistUrl(event.target.value)}
                      placeholder={t("builder.auto.placeholder")}
                      aria-label={t("builder.auto.linkAria")}
                    />
                    <button type="submit" disabled={isExtracting || !playlistUrl.trim()}>
                      {isExtracting ? t("builder.auto.busy") : t("builder.auto.submit")}
                    </button>
                  </form>
                  <FieldNoticeView notice={localNotice("playlist")} />
                  {renderConnection()}
                  <details className="explain-fold nested">
                    <summary>
                      <span>{t("builder.auto.how")}</span>
                      <em className="fold-toggle" />
                    </summary>
                    <div className="explain-body">
                      <ol className="explain-steps">
                        {extractStepsFor(t).map((step) => (
                          <li key={step.title}>
                            <strong>{step.title}</strong>
                            <span>{step.body}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </details>
                </>
              ) : null}
                </div>
              </details>
            </div>
          </details>

          <div className="set-chrome">
            <div className="set-bar">
              <div className="seg crate-view-tabs" role="tablist" aria-label={t("builder.view.aria")}>
                {(["list", "roles", "keys"] as const).map((id, index, all) => (
                  <Tip
                    key={id}
                    text={t(`builder.view.${id}.hint`)}
                    end={index === all.length - 1}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={crateView === id}
                      aria-controls={`set-view-${id}`}
                      className={crateView === id ? "seg-item active" : "seg-item"}
                      onClick={() => setCrateView(id)}
                    >
                      {t(`builder.view.${id}.label`)}
                    </button>
                  </Tip>
                ))}
              </div>
              <div className="set-bar-end">
                <SetMenus
                  canExport={draft.tracks.length > 0}
                  onSaveSet={openSaveSetup}
                  onExportPdf={() => setPendingTake("pdf")}
                  onExportM3u={() => setPendingTake("m3u")}
                  onExportRekordbox={() => setPendingTake("xml")}
                  onWriteStick={() => setPendingTake("stick")}
                  onCopyText={() => setPendingTake("copy")}
                />
                {draft.tracks.length > 0 ? (
                  <Tip text={t("library.menu.resetHint")} end>
                    <button
                      type="button"
                      className="btn ghost danger"
                      onClick={resetSet}
                    >
                      {t("library.menu.reset")}
                    </button>
                  </Tip>
                ) : null}
              </div>
              <GigReadyDialog
                open={pendingTake !== null}
                checks={pendingChecks}
                onClose={() => setPendingTake(null)}
                onContinue={confirmTake}
                onReselectStick={reselectStickForGigReady}
                onReselectStickFiles={reselectStickFilesForGigReady}
              />
              <StickWriteDialog
                open={stickOpen}
                onClose={() => setStickOpen(false)}
                draft={draft}
              />
              <ResetSetDialog
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                onConfirm={confirmReset}
              />
              <StickDisconnectDialog
                open={stickLostOpen}
                onClose={() => {
                  resumePreviewAfterStick.current = false;
                  stickLostQuietUntil.current = Date.now() + 20_000;
                  setStickLostOpen(false);
                }}
                onAutoReconnect={autoReconnectLostStick}
                onReconnect={reconnectLostStick}
                onReconnectFiles={reconnectLostStickFiles}
              />
            </div>
            {draft.tracks.length > 0 ? (
              <SetTools
                canMatch={draft.tracks.length > 0}
                matchingLinks={matchingLinks}
                onMatchLinks={() => void matchStreamingLinks()}
              >
                <SetSortMenu
                  disabled={mainTracks.length < 2}
                  onSort={sortSet}
                  pinnedCount={midPinnedCount}
                />
                <SetReshuffleMenu
                  different={reshuffleOffers.different}
                  playlist={reshuffleOffers.playlist}
                  collection={reshuffleOffers.collection}
                  history={reshuffleOffers.history}
                  onPick={reshuffleFrom}
                />
                <SetEnergyMenu
                  busy={energyBusy}
                  stickReady={stickReady}
                  onChooseStick={openStickPicker}
                  fileCount={draft.tracks.filter((track) => track.filePath?.trim()).length}
                  missingCount={
                    draft.tracks.filter(
                      (track) => track.filePath?.trim() && !hasKnownEnergy(track),
                    ).length
                  }
                  knownCount={
                    draft.tracks.filter(
                      (track) => track.filePath?.trim() && hasKnownEnergy(track),
                    ).length
                  }
                  onReadTags={() => void readEnergyTags()}
                  onMeasureMissing={() => void measureEnergy("missing")}
                  onMeasureAll={() => void measureEnergy("all")}
                  onWrite={() => void writeEnergyToFiles()}
                />
                <Tip
                  text={t(
                    filledMs < targetMs
                      ? "builder.tool.fitTipUnder"
                      : plannedJoins
                        ? "builder.tool.fitTipPlan"
                        : "builder.tool.fitTip",
                    { mix: formatDuration(blendMs) },
                  )}
                >
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={fitSlot}
                    disabled={
                      draft.tracks.length === 0 ||
                      (filledMs <= targetMs * 1.05 && filledMs >= targetMs)
                    }
                  >
                    {t("builder.tool.fit")}
                  </button>
                </Tip>
                <Tip text={t("builder.tool.fillMatchesTip")}>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={fillBestMatches}
                    disabled={draft.tracks.length === 0 || filledMs >= targetMs}
                  >
                    {t("builder.tool.fillMatches")}
                  </button>
                </Tip>
                <Tip
                  text={t("builder.tool.assignTip")}
                  disabled={mainTracks.length < 2}
                >
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={assignRoles}
                    disabled={mainTracks.length < 2}
                  >
                    {t("builder.tool.assign")}
                  </button>
                </Tip>
              </SetTools>
            ) : null}
          </div>
          <FieldNoticeView notice={localNotice("library")} />
          <FieldNoticeView notice={localNotice("export")} />

          {sortUndo ? (
            <div className="stick-reload" role="status">
              <div>
                <strong>{t("builder.sort.undoTitle")}</strong>
                <p>{t("builder.sort.undoBody")}</p>
              </div>
              <div className="stick-reload-actions">
                <button type="button" className="btn" onClick={undoSort}>
                  {t("builder.sort.undo")}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setSortUndo(null)}
                >
                  {t("builder.sort.dismiss")}
                </button>
              </div>
            </div>
          ) : null}

          {trimUndoLive.length > 0 || fillUndoLive.length > 0 ? (
            <div className="stick-reload" role="status">
              <p>
                {trimUndoLive.length === 1
                  ? t("builder.trim.undoBody", {
                      name:
                        draft.tracks.find((track) => track.id === trimUndoLive[0].id)
                          ?.name ?? trimUndoLive[0].id,
                      position:
                        (trimUndoLive[0].place ?? trimUndoLive[0].index) + 1,
                    })
                  : trimUndoLive.length > 1
                    ? t("builder.trim.undoBodyMany", {
                        details: trimUndoLive
                          .map((item) =>
                            t("builder.trim.undoDetail", {
                              name:
                                draft.tracks.find((track) => track.id === item.id)
                                  ?.name ?? item.id,
                              position: (item.place ?? item.index) + 1,
                            }),
                          )
                          .join(", "),
                      })
                    : t("builder.trim.fillUndoBody", {
                        count: fillUndoLive.length,
                      })}
              </p>
              <div className="stick-reload-actions">
                <button type="button" className="btn" onClick={undoTrim}>
                  {t("builder.trim.undo")}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setTrimUndo(null)}
                >
                  {t("builder.trim.dismiss")}
                </button>
              </div>
            </div>
          ) : null}

          {crateView === "list" ? (
            <div id="set-view-list" className="crate-view crate-list" role="tabpanel">
              <div className="crate-list-head">
                {visibleTimeline.length > 0 ? (
                <div
                  className="seg crate-list-filter"
                  role="group"
                  aria-label={t("builder.list.filterAria")}
                >
                  <Tip text={t("builder.list.filterSetTitle")}>
                    <button
                      type="button"
                      className={roleFilter === "all" ? "seg-item active" : "seg-item"}
                      onClick={() => setRoleFilter("all")}
                    >
                      {t("builder.list.filterSet")}
                    </button>
                  </Tip>
                  {TRACK_ROLES.map((role, index, all) => (
                    <Tip
                      key={role.id}
                      text={roleHint(t, role.id)}
                      end={index === all.length - 1}
                    >
                      <button
                        type="button"
                        className={
                          roleFilter === role.id ? "seg-item active" : "seg-item"
                        }
                        onClick={() => setRoleFilter(role.id)}
                      >
                        {roleLabel(t, role.id)}
                      </button>
                    </Tip>
                  ))}
                </div>
                ) : null}
                <p className="panel-inline-status builder-status">
                  {roleFilter === "all"
                    ? (() => {
                        const playingMs = visibleTimeline.reduce(
                          (sum, track) => sum + trackPlayedMs(track, blendMs),
                          0,
                        );
                        const overMs = visibleTimeline.reduce(
                          (sum, track) =>
                            sum + Math.max(0, track.durationMs - trackPlayedMs(track, blendMs)),
                          0,
                        );
                        const tooLong = filledMs > targetMs * 1.05;
                        const withBlend = overMs >= 1000;
                        return t(
                          tooLong
                            ? withBlend
                              ? "builder.list.headAllLongBlend"
                              : "builder.list.headAllLong"
                            : withBlend
                              ? "builder.list.headAllBlend"
                              : "builder.list.headAll",
                          {
                            tracks: trackCount(visibleTimeline.length, t),
                            duration: formatDuration(playingMs),
                            over: formatDuration(overMs),
                            mix: mixLabel,
                            minutes: draft.durationMinutes,
                          },
                        );
                      })()
                    : t("builder.list.headRole", {
                        role: roleLabel(t, roleFilter),
                        tracks: trackCount(visibleTimeline.length, t),
                        duration: formatDuration(
                          visibleTimeline.reduce((sum, track) => sum + track.durationMs, 0),
                        ),
                      })}
                </p>
                {visibleTimeline.length > 0 ? (
                  <Tip text={t("builder.list.detailsTitle")} end>
                    <button
                      type="button"
                      className="list-setting"
                      aria-pressed={
                        visibleTimeline.length > 0 &&
                        visibleTimeline.every((track) => openDetails.has(track.id))
                      }
                      disabled={visibleTimeline.length === 0}
                      onClick={() =>
                        setOpenDetails((current) =>
                          visibleTimeline.every((track) => current.has(track.id))
                            ? new Set()
                            : new Set(visibleTimeline.map((track) => track.id)),
                        )
                      }
                    >
                      {visibleTimeline.length > 0 &&
                      visibleTimeline.every((track) => openDetails.has(track.id))
                        ? t("builder.list.detailsClose")
                        : t("builder.list.detailsOpen")}
                    </button>
                  </Tip>
                ) : null}
              </div>
              {visibleTimeline.length === 0 ? (
                <div className="empty">
                  <p>{t("builder.list.empty")}</p>
                  <p>{t("builder.list.emptyHint")}</p>
                </div>
              ) : (
            <ol className="manual-list">
              {visibleTimeline.map((track) => (
                <li
                  key={`${track.role}-${track.id}`}
                  id={`track-${track.id}`}
                  className={[
                    "manual-row",
                    focusTrackId === track.id ? "focused" : "",
                    dragId === track.id ? "is-dragging" : "",
                    overId === track.id && dragId !== track.id ? "is-over" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (overId !== track.id) setOverId(track.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from =
                      event.dataTransfer.getData("text/plain") ||
                      dragIdRef.current ||
                      "";
                    if (from) reorderTrack(from, track.id);
                    dragIdRef.current = null;
                    setDragId(null);
                    setOverId(null);
                  }}
                >
                  <span className="manual-index">
                    <Tip text={t("builder.row.dragTitle")}>
                      <button
                        type="button"
                        className="drag-handle"
                        draggable
                        aria-label={t("builder.row.dragAria", {
                          name: track.name,
                        })}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", track.id);
                          event.dataTransfer.effectAllowed = "move";
                          dragIdRef.current = track.id;
                          const id = track.id;
                          requestAnimationFrame(() => setDragId(id));
                        }}
                        onDragEnd={() => {
                          dragIdRef.current = null;
                          setDragId(null);
                          setOverId(null);
                        }}
                      >
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </button>
                    </Tip>
                    <em className="set-pos">{positions.get(track.id) ?? "—"}</em>
                  </span>
                  <div className="manual-body">
                    <div className="manual-row-main">
                      <div className="manual-select-wrap">
                        <button
                          type="button"
                          className="manual-select"
                          onClick={() => setFocusTrackId(track.id)}
                        >
                          <TrackArt url={track.imageUrl} size={44} />
                          <span className="manual-copy">
                            <strong>{track.name}</strong>
                            <span>
                              {artistLine(track.artists, t)}
                              {track.durationMs
                                ? ` · ${formatDuration(track.durationMs)}`
                                : ""}
                            </span>
                          </span>
                        </button>
                        {draft.openerId === track.id ||
                        draft.closerId === track.id ||
                        draft.pinnedIds?.includes(track.id) ||
                        draft.excludedIds?.includes(track.id) ? (
                          <span className="anchor-pills">
                            {draft.openerId === track.id ? (
                              <Tip text={t("builder.row.openerBadgeTip")}>
                                <em className="anchor-pill is-opener">
                                  {t("builder.row.openerBadge")}
                                </em>
                              </Tip>
                            ) : null}
                            {draft.closerId === track.id ? (
                              <Tip text={t("builder.row.closerBadgeTip")}>
                                <em className="anchor-pill is-closer">
                                  {t("builder.row.closerBadge")}
                                </em>
                              </Tip>
                            ) : null}
                            {draft.pinnedIds?.includes(track.id) ? (
                              <Tip text={t("builder.row.pinBadgeTip")}>
                                <em className="anchor-pill is-pin">
                                  {t("builder.row.pinBadge")}
                                </em>
                              </Tip>
                            ) : null}
                            {draft.excludedIds?.includes(track.id) ? (
                              <Tip text={t("builder.row.excludeBadgeTip")} end>
                                <em className="anchor-pill is-exclude">
                                  {t("builder.row.excludeBadge")}
                                </em>
                              </Tip>
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                      <div className="manual-controls">
                        <div className="manual-meta">
                          <Tip text={t("builder.row.sourceTip")}>
                            <em
                              className={`source-pill source-${track.source || "manual"}`}
                            >
                              {sourceLabel(track.source)}
                            </em>
                          </Tip>
                          <Tip text={t("builder.row.phaseHint")}>
                            <select
                              value={track.phase}
                              onChange={(e) =>
                                patchTrack(track.id, {
                                  phase: e.target.value as SetPhaseId,
                                })
                              }
                              aria-label={t("builder.row.phaseAria", {
                                name: track.name,
                              })}
                            >
                              {PHASES.map((phase) => (
                                <option key={phase.id} value={phase.id}>
                                  {phaseLabel(t, phase.id)}
                                </option>
                              ))}
                            </select>
                          </Tip>
                          <Tip text={t("builder.row.roleHint")}>
                            <select
                              value={track.role}
                              onChange={(e) => {
                                const role = e.target.value as TrackRole;
                                patchTrack(track.id, {
                                  role,
                                  why: t("analysis.why.manual"),
                                  // Same rule as in the Rollen view: an Alternative sits in the phase its energy fits.
                                  ...(role === "safety"
                                    ? {
                                        phase: bestPhaseFor(
                                          track,
                                          draft.tracks.filter(
                                            (item) => item.id !== track.id,
                                          ),
                                        ),
                                      }
                                    : {}),
                                });
                              }}
                              aria-label={t("builder.row.roleAria", {
                                name: track.name,
                              })}
                            >
                              {TRACK_ROLES.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {roleLabel(t, role.id)}
                                </option>
                              ))}
                            </select>
                          </Tip>
                        </div>
                        <div className="timeline-tools">
                          <Tip
                            text={
                              previewTransport.trackId === track.id &&
                              previewTransport.playing
                                ? t("builder.row.pauseTip")
                                : t("builder.row.playTip")
                            }
                          >
                            <button
                              type="button"
                              className={
                                focusTrackId === track.id
                                  ? "icon-action is-playing"
                                  : "icon-action"
                              }
                              onClick={() => toggleTrackPreview(track)}
                              aria-label={
                                previewTransport.trackId === track.id &&
                                previewTransport.playing
                                  ? t("builder.row.pauseAria", {
                                      name: track.name,
                                    })
                                  : t("builder.row.playAria", {
                                      name: track.name,
                                    })
                              }
                            >
                              {previewTransport.trackId === track.id &&
                              previewTransport.playing ? (
                                <ActionIcon name="pause" />
                              ) : (
                                <ActionIcon name="play" />
                              )}
                            </button>
                          </Tip>
                          {track.role !== "safety" ? (
                            <Tip text={t("builder.row.rehearseTip")}>
                              <button
                                type="button"
                                className={
                                  rehearsal && focusTrackId === track.id
                                    ? "icon-action is-playing"
                                    : "icon-action"
                                }
                                onClick={() => rehearseTrack(track)}
                                aria-label={t("builder.row.rehearse")}
                                aria-pressed={rehearsal && focusTrackId === track.id}
                              >
                                <ActionIcon name="rehearse" />
                              </button>
                            </Tip>
                          ) : null}
                          <Tip text={t("builder.row.moveUpTip")}>
                            <button
                              type="button"
                              className="icon-action"
                              onClick={() => moveTrack(track.id, -1)}
                              aria-label={t("builder.row.moveUpAria", { name: track.name })}
                            >
                              <ActionIcon name="up" />
                            </button>
                          </Tip>
                          <Tip text={t("builder.row.moveDownTip")}>
                            <button
                              type="button"
                              className="icon-action"
                              onClick={() => moveTrack(track.id, 1)}
                              aria-label={t("builder.row.moveDownAria", { name: track.name })}
                            >
                              <ActionIcon name="down" />
                            </button>
                          </Tip>
                          {track.filePath?.trim() ? (
                            <TrackEnergyMenu
                              name={track.name}
                              busy={energyPendingIds.has(track.id)}
                              level={hasKnownEnergy(track) ? track.energyLevel : undefined}
                              onMeasure={() => void recalculateTrackEnergy(track)}
                              onSetLevel={(level) =>
                                patchTrack(track.id, {
                                  energyLevel: level,
                                  energySource: "manual",
                                })
                              }
                            />
                          ) : null}
                          {track.role === "safety" ? (
                            <Tip text={t("builder.row.placeInSetTip")}>
                              <button
                                type="button"
                                className="icon-action"
                                aria-expanded={placeFor === track.id}
                                aria-label={t("builder.row.placeInSet")}
                                onClick={() => {
                                  setReplaceFor(null);
                                  setExchangeFor(null);
                                  setPlaceFor((current) =>
                                    current === track.id ? null : track.id,
                                  );
                                }}
                              >
                                <ActionIcon name="replace" />
                              </button>
                            </Tip>
                          ) : (
                            <>
                              <Tip
                                text={
                                  playlistPoolCount >= 2
                                    ? t("builder.row.exchangeTitle")
                                    : t("builder.row.exchangeMissing")
                                }
                              >
                                <button
                                  type="button"
                                  className="icon-action"
                                  aria-expanded={exchangeFor === track.id}
                                  aria-label={t("builder.row.exchange")}
                                  disabled={playlistPoolCount < 2}
                                  onClick={() => {
                                    setPlaceFor(null);
                                    setReplaceFor(null);
                                    setExchangeFor((current) =>
                                      current === track.id ? null : track.id,
                                    );
                                  }}
                                >
                                  <ActionIcon name="exchange" />
                                </button>
                              </Tip>
                              <Tip text={t("builder.row.replaceTitle")}>
                                <button
                                  type="button"
                                  className="icon-action"
                                  aria-expanded={replaceFor === track.id}
                                  aria-label={t("builder.row.replace")}
                                  onClick={() => {
                                    setPlaceFor(null);
                                    setExchangeFor(null);
                                    setReplaceFor((current) =>
                                      current === track.id ? null : track.id,
                                    );
                                  }}
                                >
                                  <ActionIcon name="replace" />
                                </button>
                              </Tip>
                            </>
                          )}
                          {track.role !== "safety" ? (
                            <Tip
                              text={
                                draft.openerId === track.id
                                  ? t("builder.row.clearOpenerTip")
                                  : t("builder.row.setOpenerTitle")
                              }
                            >
                              <button
                                type="button"
                                className={
                                  draft.openerId === track.id
                                    ? "icon-action is-anchor"
                                    : "icon-action"
                                }
                                aria-label={
                                  draft.openerId === track.id
                                    ? t("builder.row.clearOpener")
                                    : t("builder.row.setOpener")
                                }
                                aria-pressed={draft.openerId === track.id}
                                onClick={() =>
                                  setDraft((current) =>
                                    current.openerId === track.id
                                      ? clearOpener(current)
                                      : pinOpener(current, track.id),
                                  )
                                }
                              >
                                <ActionIcon name="opener" />
                              </button>
                            </Tip>
                          ) : null}
                          {track.role !== "safety" ? (
                            <Tip
                              text={
                                draft.closerId === track.id
                                  ? t("builder.row.clearCloserTip")
                                  : t("builder.row.setCloserTitle")
                              }
                            >
                              <button
                                type="button"
                                className={
                                  draft.closerId === track.id
                                    ? "icon-action is-anchor"
                                    : "icon-action"
                                }
                                aria-label={
                                  draft.closerId === track.id
                                    ? t("builder.row.clearCloser")
                                    : t("builder.row.setCloser")
                                }
                                aria-pressed={draft.closerId === track.id}
                                onClick={() =>
                                  setDraft((current) =>
                                    current.closerId === track.id
                                      ? clearCloser(current)
                                      : pinCloser(current, track.id),
                                  )
                                }
                              >
                                <ActionIcon name="closer" />
                              </button>
                            </Tip>
                          ) : null}
                          <Tip
                            text={
                              draft.pinnedIds?.includes(track.id)
                                ? t("builder.row.clearPinTip")
                                : track.role === "safety"
                                  ? t("builder.row.setPinFromAltTitle")
                                  : t("builder.row.setPinTitle")
                            }
                          >
                            <button
                              type="button"
                              className={
                                draft.pinnedIds?.includes(track.id)
                                  ? "icon-action is-anchor"
                                  : "icon-action"
                              }
                              aria-label={
                                draft.pinnedIds?.includes(track.id)
                                  ? t("builder.row.clearPin")
                                  : t("builder.row.setPin")
                              }
                              aria-pressed={Boolean(draft.pinnedIds?.includes(track.id))}
                              onClick={() => {
                                const fromAlt = track.role === "safety";
                                setDraft((current) => toggleKeepPin(current, track.id));
                                if (fromAlt && !draft.pinnedIds?.includes(track.id)) {
                                  setStatus(
                                    t("builder.status.pinnedFromAlt", { name: track.name }),
                                  );
                                }
                              }}
                            >
                              <ActionIcon name="pin" />
                            </button>
                          </Tip>
                          <Tip
                            text={
                              draft.excludedIds?.includes(track.id)
                                ? t("builder.row.clearExcludeTip")
                                : t("builder.row.setExcludeTitle")
                            }
                          >
                            <button
                              type="button"
                              className={
                                draft.excludedIds?.includes(track.id)
                                  ? "icon-action is-exclude"
                                  : "icon-action"
                              }
                              aria-label={
                                draft.excludedIds?.includes(track.id)
                                  ? t("builder.row.clearExclude")
                                  : t("builder.row.setExclude")
                              }
                              aria-pressed={Boolean(draft.excludedIds?.includes(track.id))}
                              onClick={() => {
                                const wasExcluded = draft.excludedIds?.includes(track.id);
                                setDraft((current) =>
                                  toggleExclude(
                                    current,
                                    track.id,
                                    t("analysis.why.excluded"),
                                  ),
                                );
                                setStatus(
                                  t(
                                    wasExcluded
                                      ? "builder.status.excludeCleared"
                                      : "builder.status.excluded",
                                    { name: track.name },
                                  ),
                                );
                              }}
                            >
                              <ActionIcon name="exclude" />
                            </button>
                          </Tip>
                          <Tip text={t("builder.row.removeTip")} end>
                            <button
                              type="button"
                              className="icon-action danger"
                              onClick={() => removeTrack(track.id)}
                              aria-label={t("builder.row.removeAria", {
                                name: track.name,
                              })}
                            >
                              <ActionIcon name="remove" />
                            </button>
                          </Tip>
                        </div>
                      </div>
                    </div>
                    {track.role !== "safety" || track.why ? (
                      <div className="manual-subline">
                        {track.role !== "safety" ? (
                          <MixJoinLine tracks={mainTracks} track={track} />
                        ) : null}
                        {track.why ? (
                          <p className="why-inline">
                            <strong>{t("builder.row.why")}</strong>{" "}
                            {localizeWhy(track.why, t)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {replaceFor === track.id ? (
                      <ReplaceMenu
                        tracks={draft.tracks}
                        targetId={track.id}
                        onReplace={replaceTrack}
                        onClose={() => setReplaceFor(null)}
                        library={libraryRows}
                        onReplaceFromLibrary={replaceFromLibrary}
                        onPlayRow={playLibraryRow}
                        onPlayTrack={toggleTrackPreview}
                        playingId={
                          previewTransport.playing ? previewTransport.trackId : null
                        }
                      />
                    ) : null}
                    {exchangeFor === track.id ? (
                      <ReplaceMenu
                        tracks={draft.tracks}
                        targetId={track.id}
                        onReplace={replaceTrack}
                        onClose={() => setExchangeFor(null)}
                        playlistOnly
                        playlistPool={resolvedPlaylistPool}
                        onReplaceFromPool={replaceFromPool}
                        onPlayTrack={toggleTrackPreview}
                        playingId={
                          previewTransport.playing ? previewTransport.trackId : null
                        }
                      />
                    ) : null}
                    {placeFor === track.id ? (
                      <PlaceInSetMenu
                        tracks={draft.tracks}
                        altId={track.id}
                        onPlace={(relativeId, side) =>
                          placeAlternative(track.id, relativeId, side)
                        }
                        onClose={() => setPlaceFor(null)}
                      />
                    ) : null}
                    <details
                      className="track-details"
                      open={openDetails.has(track.id)}
                      onToggle={(event) => {
                        const open = event.currentTarget.open;
                        setOpenDetails((current) => {
                          if (current.has(track.id) === open) return current;
                          const next = new Set(current);
                          if (open) next.add(track.id);
                          else next.delete(track.id);
                          return next;
                        });
                      }}
                    >
                      <summary>
                        <span className="td-label">{t("builder.row.details")}</span>
                        <span className="td-values">{trackDetailsSummary(track, t)}</span>
                      </summary>
                    <label className="manual-comment">
                      <span>{t("builder.row.setNote")}</span>
                      <textarea
                        value={track.comment || ""}
                        rows={2}
                        placeholder={t("builder.row.setNotePlaceholder")}
                        title={t("builder.row.setNoteTip")}
                        onChange={(e) =>
                          patchTrack(track.id, {
                            comment: e.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="manual-extra">
                      <input
                        value={track.bpm}
                        onChange={(e) =>
                          patchTrack(track.id, { bpm: e.target.value })
                        }
                        placeholder={t("builder.row.bpmPlaceholder")}
                        aria-label={t("builder.row.bpmAria", { name: track.name })}
                        title={t("builder.row.bpmHint")}
                      />
                      <select
                        value={track.keyCamelot}
                        onChange={(e) =>
                          patchTrack(track.id, { keyCamelot: e.target.value })
                        }
                        aria-label={t("builder.row.keyAria", { name: track.name })}
                        title={t("builder.row.keyHint")}
                      >
                        <option value="">{t("builder.row.keyOption")}</option>
                        {CAMELOT_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                      <select
                        value={hasKnownEnergy(track) ? (track.energyLevel ?? "") : ""}
                        onChange={(e) =>
                          patchTrack(track.id, {
                            energyLevel: e.target.value ? Number(e.target.value) : undefined,
                            energySource: e.target.value ? "manual" : undefined,
                          })
                        }
                        aria-label={t("builder.row.energyAria", { name: track.name })}
                        title={t("builder.row.energyHint")}
                      >
                        <option value="">{t("builder.row.energyOption")}</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                          <option key={level} value={level}>
                            {t("builder.row.energy", { level })}
                          </option>
                        ))}
                      </select>
                      <div className="manual-transition">
                        <select
                          value={track.transition}
                          onChange={(e) =>
                            patchTrack(
                              track.id,
                              transitionOverlapPatch(e.target.value as TransitionVerb),
                            )
                          }
                          aria-label={t("builder.row.transitionAria", { name: track.name })}
                          title={t("builder.row.transitionHint")}
                        >
                          {TRANSITIONS.map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              title={transitionHint(t, item.id)}
                            >
                              {transitionLabel(t, item.id)}
                            </option>
                          ))}
                        </select>
                        <label className="manual-length">
                          <span>{t("builder.row.length")}</span>
                          <OverlapField
                            className="manual-overlap"
                            transition={track.transition}
                            overlapMs={track.overlapMs}
                            blendMs={blendMs}
                            durationMs={track.durationMs}
                            title={t("builder.row.overlapHint")}
                            ariaLabel={t("builder.row.length")}
                            onCommit={(ms) => patchTrack(track.id, { overlapMs: ms })}
                          />
                        </label>
                      </div>
                    </div>
                    </details>
                  </div>
                </li>
              ))}
            </ol>
              )}
            </div>
          ) : null}

          {crateView === "roles" ? (
            <div id="set-view-roles" className="crate-view" role="tabpanel">
          <RoleCrates
            embedded
            tracks={draft.tracks}
            positions={positions}
            activeRole={activeRole}
            focusedTrackId={focusTrackId}
            onSelectRole={(role) => {
              setActiveRole(role);
              setRoleFilter(role);
            }}
            onReplace={replaceTrack}
            onRemove={removeTrack}
            library={libraryRows}
            onSetPhase={(id, phase) =>
              patchTrack(id, { phase, why: t("analysis.why.manual") })
            }
            onFillPlanB={fillPlanB}
            onOpenLibrary={openLibrary}
            onAddAlternative={(row, phase) =>
              addLibraryTrack(libraryTrackToSetTrack(row, phase, "safety", t))
            }
            onMoveRole={(id, role) => {
              const moving = draft.tracks.find((item) => item.id === id);
              patchTrack(id, {
                role,
                why: t("analysis.why.manual"),
                // Landing in Alternativen: keep the phase if the energy fits, else take the best one.
                ...(role === "safety" && moving
                  ? { phase: bestPhaseFor(moving, draft.tracks.filter((item) => item.id !== id)) }
                  : {}),
              });
              setActiveRole(role);
              setRoleFilter(role);
            }}
            onFocusTrack={(id) => {
              setFocusTrackId(id);
              const track = draft.tracks.find((item) => item.id === id);
              if (track) {
                setActivePhase(track.phase);
                setActiveRole(track.role);
                setRoleFilter(track.role);
                requestAnimationFrame(() => {
                  document
                    .getElementById(`track-${id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                });
              }
            }}
          />
            </div>
          ) : null}

          {crateView === "keys" ? (
            <div id="set-view-keys" className="crate-view" role="tabpanel">
      <section className="curve" aria-label={t("builder.curve.aria")}>
        <div className="curve-head">
          <h2>{t("builder.curve.title")}</h2>
          <p
            className={filledMs > targetMs ? "curve-overrun" : undefined}
            role={filledMs > targetMs ? "status" : undefined}
          >
            {t(
              filledMs > targetMs ? "builder.curve.summaryOver" : "builder.curve.summary",
              {
                duration: formatDuration(filledMs),
                minutes: draft.durationMinutes,
                performance: mainTracks.length,
                safety: draft.tracks.filter((track) => track.role === "safety").length,
              },
            )}
          </p>
          {filledMs > targetMs ? (
            <strong className="curve-overrun-warning">
              {t("builder.curve.overrun", {
                duration: formatDuration(filledMs - targetMs),
              })}
            </strong>
          ) : null}
        </div>
        <details className="explain-fold nested principles">
          <summary>
            <span>{t("builder.curve.principles")}</span>
            <em className="fold-toggle" />
          </summary>
          <div className="explain-body">
            <p>{t("builder.curve.principlesIntro")}</p>
            <ul className="explain-steps">
              {prepPrinciplesFor(t).map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
        <div className="phase-grid">
          {PHASES.map((phase) => {
            const actual = phaseDurationMs(draft.tracks, phase.id, blendMs);
            const target = targetMs * phase.share;
            const ratio = target > 0 ? actual / target : 0;
            const minutes = Math.round(target / 60000);
            const active = activePhase === phase.id;
            const label = t("builder.curve.phaseLabel", {
              phase: phaseLabel(t, phase.id),
              actual: formatDuration(actual),
              minutes,
            });
            const overrun =
              ratio > 1
                ? t("builder.curve.phaseOverrun", {
                    duration: formatDuration(actual - target),
                  })
                : "";
            const clickHint = `${t("builder.curve.phaseClick", { label })}${
              overrun ? ` ${overrun}` : ""
            }`;
            return (
              <div key={phase.id} className="phase-slot">
                <button
                  type="button"
                  className={["curve-seg", active ? "active" : "", ratio > 1 ? "over" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  title={label}
                  aria-label={clickHint}
                  aria-pressed={active}
                  onClick={() => setActivePhase(phase.id)}
                >
                  <i style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
                </button>
                <button
                  type="button"
                  className={["phase", active ? "active" : "", ratio > 1 ? "over" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={active}
                  title={clickHint}
                  onClick={() => setActivePhase(phase.id)}
                >
                  <strong>{phaseLabel(t, phase.id)}</strong>
                  <span className="phase-hint">{phaseHint(t, phase.id)}</span>
                  <em>
                    {t("builder.curve.phaseTime", {
                      actual: formatDuration(actual),
                      minutes,
                    })}
                  </em>
                  {overrun ? <b className="phase-overrun">{overrun}</b> : null}
                </button>
                <label className="phase-purpose">
                  <span className="sr-only">
                    {t("builder.phase.purpose", { phase: phaseLabel(t, phase.id) })}
                  </span>
                  <input
                    value={draft.phaseNote?.[phase.id] ?? ""}
                    placeholder={t("builder.phase.purposePlaceholder")}
                    onChange={(event) => setPhaseNote(phase.id, event.target.value)}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <p className="curve-note">
          {t(plannedJoins ? "builder.curve.notePlan" : "builder.curve.note", {
            mix: formatDuration(blendMs),
          })}
        </p>
        {activeGuide ? (
          <p className="guide-line">
            <strong>
              {phaseWindowLabel(draft.durationMinutes, activePhase, t)}
            </strong>{" "}
            — {activeGuide.focus}
          </p>
        ) : null}
      </section>
              <EnergyPath tracks={draft.tracks} />
              <HarmonicPath
                tracks={draft.tracks}
                onSort={sortSet}
                onReorder={reorderTrack}
                pinnedCount={midPinnedCount}
                embedded
              />
            </div>
          ) : null}
        </section>
      </details>

      <details
        className="explain-fold section-fold"
        open={settingsOpen}
        onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
      >
        <summary>
          <span>{t("builder.settings.title")}</span>
          <em>{settingsNoteText}</em>
        </summary>
        {renderSetups()}
      </details>

      <PreviewPlayer
        tracks={
          libraryPreview && !draft.tracks.some((item) => item.id === libraryPreview.id)
            ? [...draft.tracks, libraryPreview]
            : draft.tracks
        }
        currentId={focusTrackId}
        onChange={(id) => setFocusTrackId(id)}
        onClose={() => {
          setFocusTrackId(null);
          setRehearsal(false);
        }}
        blendMs={blendMs}
        onStickMediaLost={() => reportStickLost(true)}
        rehearsal={
          rehearsal
            ? {
                onTransition: (id, value) => patchTrack(id, transitionOverlapPatch(value)),
                onOverlap: (id, overlapMs) => patchTrack(id, { overlapMs }),
                onNote: (id, value) => patchTrack(id, { comment: value }),
              }
            : null
        }
      />
    </div>
  );
}
