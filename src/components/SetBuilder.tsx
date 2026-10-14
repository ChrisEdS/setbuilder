"use client";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import {
  createTranslate,
  errorText,
  localizeNote,
  localizeWhy,
  phaseHint,
  phaseLabel,
  roleHint,
  roleLabel,
  slotHint,
  slotLabel,
  transitionLabel,
  type Lang,
  type Translate,
} from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { ConnectionSetup } from "@/components/ConnectionSetup";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";
import { EnergyPath } from "@/components/EnergyPath";
import { HarmonicPath } from "@/components/HarmonicPath";
import { LibraryPanel } from "@/components/LibraryPanel";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import { ReplaceMenu } from "@/components/ReplaceMenu";
import type { LibraryRow } from "@/components/LibraryPanel";
import {
  libraryTrackToSetTrack,
  mediaPathsForDraft,
  rehydrateStickCovers,
  stickLibraryRows,
} from "@/lib/rekordbox-stick";
import {
  hydrateStickMedia,
  loadPersistedStickHandle,
  readStickFromHandle,
  stickPermission,
} from "@/lib/stick-session";
import { sanitizeDraftImages } from "@/lib/media";
import { TrackArt } from "@/components/TrackArt";
import { StickReloadBanner } from "@/components/StickReloadBanner";
import { bestPhaseFor } from "@/lib/plan-b";
import { SetMenus, SetTools } from "@/components/SetTakeaway";
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
import { CAMELOT_CODES, mixJoin } from "@/lib/harmonic";
import { distributeRoles, fitToSlot, reharmonizeDraft } from "@/lib/extract-set";
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
  type TrackRole,
  type TransitionVerb,
  exportSetText,
  formatDuration,
  performanceTracks,
  phaseDurationMs,
  phaseWindowLabel,
  setPositionById,
  totalDurationMs,
  trackCount,
} from "@/lib/set";

function MixJoinLine({ tracks, track }: { tracks: SetTrack[]; track: SetTrack }) {
  const { t } = useI18n();
  const index = tracks.findIndex((item) => item.id === track.id);
  const join = index > 0 ? mixJoin(tracks[index - 1], track, t) : null;
  if (!join) return null;
  return <p className={`mix-join harm-${join.relation}`}>{join.label}</p>;
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

const STORAGE_KEY = "setform-draft-v4";
const SETUPS_KEY = "setform-setups-v1";

type SavedSetup = {
  id: string;
  name: string;
  savedAt: string;
  draft: SetDraft;
};
const DRAFT_EVENT = "setform-draft";

let cachedRaw: string | null | undefined;
let cachedDraft: SetDraft = DEFAULT_SET;

function normalizeTrack(track: SetTrack): SetTrack {
  return {
    ...track,
    comment: track.comment ?? "",
    source: track.source ?? "spotify",
    note: track.note ?? "",
    safetyAlt: track.safetyAlt ?? "",
  };
}

const BRIEF_FIELDS = ["title", "vibe", "venue", "slot", "audience", "gear"] as const;

const BRIEF_DEFAULTS: Record<Lang, Record<(typeof BRIEF_FIELDS)[number], string>> = {
  de: briefDefaultsFor("de"),
  en: briefDefaultsFor("en"),
};

function briefDefaultsFor(lang: Lang) {
  const t = createTranslate(lang);
  return {
    title: t("builder.defaults.title"),
    vibe: t("builder.defaults.vibe"),
    venue: t("builder.defaults.venue"),
    slot: t("builder.defaults.slot"),
    audience: t("builder.defaults.audience"),
    gear: t("builder.defaults.gear"),
  };
}

/**
 * Display step for the sample brief: a field that still holds the sample text of the other
 * language is shown in the current one. Edited fields never change; the same object comes
 * back when nothing needs swapping.
 */
function localizeBrief(draft: SetDraft, lang: Lang): SetDraft {
  const other: Lang = lang === "de" ? "en" : "de";
  let next = draft;
  for (const field of BRIEF_FIELDS) {
    if (
      draft[field] === BRIEF_DEFAULTS[other][field] &&
      draft[field] !== BRIEF_DEFAULTS[lang][field]
    ) {
      if (next === draft) next = { ...draft };
      next[field] = BRIEF_DEFAULTS[lang][field];
    }
  }
  return next;
}

function readStoredDraft(): SetDraft {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("setform-draft-v3");
    if (raw === cachedRaw) return cachedDraft;
    cachedRaw = raw;
    if (!raw) {
      cachedDraft = DEFAULT_SET;
      return cachedDraft;
    }
    const parsed = JSON.parse(raw) as SetDraft;
    if (!(parsed?.tracks && parsed.title)) {
      cachedDraft = DEFAULT_SET;
      return cachedDraft;
    }
    cachedDraft = sanitizeDraftImages({
      ...DEFAULT_SET,
      ...parsed,
      slotKind: parsed.slotKind ?? "peaktime",
      tracks: (parsed.tracks ?? []).map(normalizeTrack),
    });
    const cleanRaw = JSON.stringify(cachedDraft);
    if (cleanRaw !== raw) {
      localStorage.setItem(STORAGE_KEY, cleanRaw);
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
  const raw = localStorage.getItem(SETUPS_KEY) || "[]";
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
  window.addEventListener("setform-setups", onStoreChange);
  return () => window.removeEventListener("setform-setups", onStoreChange);
}

function writeSetups(setups: SavedSetup[]) {
  localStorage.setItem(SETUPS_KEY, JSON.stringify(setups));
  setupsRaw = null;
  window.dispatchEvent(new Event("setform-setups"));
}

function persistDraft(draft: SetDraft) {
  const raw = JSON.stringify(sanitizeDraftImages(draft));
  localStorage.setItem(STORAGE_KEY, raw);
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

export function SetBuilder() {
  const { t, lang } = useI18n();
  const storedDraft = useSyncExternalStore(
    subscribeDraft,
    readStoredDraft,
    () => DEFAULT_SET,
  );
  const draft = localizeBrief(storedDraft, lang);
  const [activePhase, setActivePhase] = useState<SetPhaseId>("open");
  const [activeRole, setActiveRole] = useState<TrackRole>("anchor");
  const [query, setQuery] = useState("tech house");
  const [linkUrl, setLinkUrl] = useState("");
  const [addTab, setAddTab] = useState<"search" | "link" | "manual" | "auto">(
    "link",
  );
  const [crateView, setCrateView] = useState<"list" | "roles" | "keys">("list");
  const [stickOpen, setStickOpen] = useState(false);
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
  // null = follow the brief title (so the default follows the interface language)
  const [setupNameInput, setSetupName] = useState<string | null>(null);
  const setupName = setupNameInput ?? draft.title;
  const [selectedSetup, setSelectedSetup] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [tidalConnected, setTidalConnected] = useState<boolean | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [libraryPreview, setLibraryPreview] = useState<SetTrack | null>(null);
  const [libraryRows, setLibraryRows] = useState<LibraryRow[]>([]);
  const [matchingLinks, setMatchingLinks] = useState(false);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Feedback like "+ Titel → Peak / Anchor" is a toast: it follows the scroll and fades after a while.
  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 8000);
    return () => window.clearTimeout(timer);
  }, [status]);

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
  // The OAuth-return effect below runs once but may finish after a language change: it reads the latest t.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
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
      const handle = await loadPersistedStickHandle();
      if (!handle || cancelled) return;
      if (!(await stickPermission(handle, "readwrite", false))) return;
      try {
        const stick = await readStickFromHandle(handle);
        if (cancelled) return;
        await hydrateStickMedia(handle, mediaPathsForDraft(readStoredDraft(), stick.library));
        if (cancelled) return;
        setLibraryRows(stickLibraryRows(stick.library));
        setDraft((current) => rehydrateStickCovers(current, stick.library));
      } catch {
        /* Banner still offers a manual reconnect. */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Once on launch: reconnect a stick this browser already allowed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setDraft(updater: SetDraft | ((current: SetDraft) => SetDraft)) {
    const next = typeof updater === "function" ? updater(draft) : updater;
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

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    const message = params.get("message") || "";
    if (auth) window.history.replaceState({}, "", "/");

    (async () => {
      try {
        const response = await fetch("/api/auth/status");
        const data = (await response.json()) as {
          connected?: boolean;
          redirectUri?: string;
        };
        if (cancelled) return;
        const tidalRes = await fetch("/api/auth/tidal/status");
        const tidal = (await tidalRes.json()) as { connected?: boolean };
        if (!cancelled) setTidalConnected(Boolean(tidal.connected));
        if (!cancelled && tidal.connected) {
          const listRes = await fetch("/api/tidal/playlists");
          const list = (await listRes.json()) as {
            playlists?: Array<{ id: string; name: string; trackCount: number | null }>;
          };
          if (!cancelled && listRes.ok) setTidalPlaylists(list.playlists ?? []);
        }
        const connected = Boolean(data.connected);
        setSpotifyConnected(connected);
        if (connected) {
          const listRes = await fetch("/api/playlists");
          const listData = (await listRes.json()) as {
            owned?: Array<{
              id: string;
              name: string;
              owner: string;
              trackCount: number;
              owned: boolean;
              externalUrl: string;
            }>;
          };
          if (!cancelled && listRes.ok) setMyPlaylists(listData.owned ?? []);
        }
        if (auth === "ok") {
          setStatus(tRef.current("builder.auth.connectedStatus"));
        } else if (auth === "error") {
          fail(
            "connect",
            authFailureText(message, tRef.current),
            tRef.current("builder.auth.failedHint"),
          );
        }
      } catch {
        if (!cancelled) setSpotifyConnected(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
    setStatus(null);
    setIsExtracting(true);
    try {
      const tidalPlaylist = playlistUrl.toLowerCase().includes("tidal.com");
      const response = await fetch(tidalPlaylist ? "/api/playlist/tidal" : "/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          durationMinutes: draft.durationMinutes,
          title: draft.title,
          vibe: draft.vibe,
          venue: draft.venue,
          slot: draft.slot,
          slotKind: draft.slotKind,
          audience: draft.audience,
          gear: draft.gear,
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

      setDraft(data.draft);
      setRoleFilter("all");
      const performanceCount = (data.draft.tracks ?? []).filter(
        (track) => track.role !== "safety",
      ).length;
      const safetyCount = (data.draft.tracks ?? []).filter(
        (track) => track.role === "safety",
      ).length;
      const tidalMatched = data.playlist?.tidalMatched ?? 0;
      const tidalKeyed = data.playlist?.tidalKeyed ?? 0;
      setStatus(
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
  const filledMs = totalDurationMs(draft.tracks);
  const targetMs = draft.durationMinutes * 60_000;
  const activeGuide = arcGuideFor(t).find((item) => item.phase === activePhase);

  const visibleTimeline = useMemo(() => {
    if (!draft.tracks.length) return [];
    if (roleFilter === "all") return mainTracks;
    return draft.tracks.filter((track) => track.role === roleFilter);
  }, [draft.tracks, mainTracks, roleFilter]);

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
      const seen = new Set(current.tracks.map((track) => track.id));
      const fresh = incoming
        .map(normalizeTrack)
        .filter((track) => !seen.has(track.id));
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

  function addLibraryTrack(incoming: SetTrack) {
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
    addTracksBulk([track]);
    setStatus(
      t("builder.status.added", {
        name: track.name,
        phase: phaseLabel(t, track.phase),
        role: roleLabel(t, track.role),
      }),
    );
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
    setLibraryPreview(track);
    setFocusTrackId(track.id);
  }

  function patchTrack(id: string, patch: Partial<SetTrack>) {
    setDraft((current) => ({
      ...current,
      tracks: current.tracks.map((track) =>
        track.id === id ? { ...track, ...patch } : track,
      ),
    }));
  }

  function removeTrack(id: string) {
    setFocusTrackId((current) => (current === id ? null : current));
    setDraft((current) => ({
      ...current,
      tracks: current.tracks.filter((track) => track.id !== id),
    }));
  }

  function moveTrack(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.tracks.findIndex((track) => track.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.tracks.length) {
        return current;
      }
      const tracks = [...current.tracks];
      const [item] = tracks.splice(index, 1);
      tracks.splice(nextIndex, 0, item);
      return { ...current, tracks };
    });
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
      return { ...current, tracks };
    });
  }

  async function copyExport() {
    await navigator.clipboard.writeText(exportSetText(draft, t));
    setStatus(t("builder.status.copied"));
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
      buildM3u(draft),
      "audio/x-mpegurl",
    );
    setStatus(t("builder.status.m3u"));
  }

  function exportRekordbox() {
    downloadText(
      "SETFORM-rekordbox.xml",
      buildRekordboxXml(draft, t),
      "application/xml",
    );
    setStatus(t("builder.status.rekordbox"));
  }

  function replaceTrack(targetId: string, replacementId: string) {
    setDraft((current) => ({
      ...current,
      tracks: swapIntoSlot(current.tracks, targetId, replacementId, t),
    }));
    setReplaceFor(null);
    setStatus(t("builder.status.replaced"));
  }

  function replaceFromLibrary(targetId: string, row: LibraryRow) {
    const target = draft.tracks.find((track) => track.id === targetId);
    if (!target) return;
    const incoming = libraryTrackToSetTrack(row, target.phase, target.role, t);
    setDraft((current) => ({
      ...current,
      tracks: swapIntoSlot([...current.tracks, incoming], targetId, incoming.id, t),
    }));
    setReplaceFor(null);
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

  function saveSetup() {
    const name = setupName.trim() || draft.title || t("builder.setups.fallbackName");
    const nextSetup: SavedSetup = {
      id:
        setups.find((item) => item.name === name)?.id ||
        `setup-${Date.now().toString(36)}`,
      name,
      savedAt: new Date().toISOString(),
      draft,
    };
    const next = [
      nextSetup,
      ...setups.filter((item) => item.id !== nextSetup.id && item.name !== name),
    ];
    writeSetups(next);
    setSelectedSetup(nextSetup.id);
    setSetupName(name);
    setStatus(t("builder.status.setupSaved", { name }));
  }

  function loadSetup(id = selectedSetup) {
    const setup = setups.find((item) => item.id === id);
    if (!setup) return;
    const next = {
      ...DEFAULT_SET,
      ...setup.draft,
      tracks: (setup.draft.tracks ?? []).map(normalizeTrack),
    };
    setDraft(next);
    setSetupName(setup.name);
    setFocusTrackId(null);
    setStatus(t("builder.status.setupLoaded", { name: setup.name }));
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
    const name = (setupName.trim() || draft.title || "setform").replace(
      /[^\w\-]+/g,
      "-",
    );
    const blob = new Blob([JSON.stringify({ name, draft }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.setform.json`;
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
        const name = parsed.name || incoming.title;
        setSetupName(name);
        setDraft({
          ...DEFAULT_SET,
          ...incoming,
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
    reader.readAsText(file);
  }

  function resetSet() {
    setDraft(DEFAULT_SET);
    setFocusTrackId(null);
    setStatus(t("builder.status.reset"));
  }

  function harmonizeSet() {
    const next = reharmonizeDraft(draft, t);
    setDraft(next);
    setStatus(t("builder.status.harmonized"));
  }

  function fitSlot() {
    const result = fitToSlot(draft, t);
    if (!result.moved) {
      setStatus(t("builder.status.fits"));
      return;
    }
    setDraft(result.draft);
    setStatus(
      t("builder.status.trimmed", {
        before: formatDuration(result.beforeMs),
        after: formatDuration(result.afterMs),
        kept: trackCount(result.kept, t),
        moved: trackCount(result.moved, t),
      }),
    );
  }

  function assignRoles() {
    setDraft(distributeRoles(draft, t));
    setStatus(t("builder.status.roles"));
  }

  function renderSetups() {
    return (
      <section className="setups-bar" aria-label={t("builder.setups.aria")}>
        <div className="panel-head">
          <h2>{t("builder.settings.title")}</h2>
          <p>{t("builder.setups.intro")}</p>
        </div>
        <div className="setups-grid">
          <div className="setup-card">
            <h3>{t("common.save")}</h3>
            <label className="setup-field">
              <span>{t("builder.setups.name")}</span>
              <input
                value={setupName}
                onChange={(event) => setSetupName(event.target.value)}
                aria-label={t("builder.setups.nameAria")}
              />
            </label>
            <button type="button" className="btn" onClick={saveSetup}>
              {t("common.save")}
            </button>
          </div>
          <div className="setup-card">
            <h3>{t("common.load")}</h3>
            <label className="setup-field">
              <span>{t("builder.setups.stored")}</span>
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
            </label>
            <div className="setup-actions">
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
          </div>
          <div className="setup-card">
            <h3>{t("builder.setups.fileTitle")}</h3>
            <p>{t("builder.setups.fileHint")}</p>
            <div className="setup-actions">
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
            </div>
            <FieldNoticeView notice={localNotice("settings")} />
          </div>
        </div>
        <ConnectionSetup onStatus={noteSettings} />
        <FieldNoticeView notice={localNotice("connect")} />
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
      <div className="crate-connect">
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
        <p className="head-meta">
          {t("builder.conn.state", { spotify: spotifyState, tidal: tidalState })}
        </p>
        {spotifyConnected && tidalConnected ? null : (
          <p className="import-hint">{t("builder.conn.hint")}</p>
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

  return (
    <div className="set-shell">
      {authNote ? <p className="banner status">{authNote}</p> : null}
      <div className="topbar">
        <LanguageSwitch />
      </div>
      <header className="hero">
        <div className="hero-copy">
          <p className="brand">SETFORM</p>
          <h1>{t("builder.hero.title")}</h1>
          <p className="lede">{t("builder.hero.lede")}</p>
        </div>
        <div className="hero-meta" aria-label={t("builder.brief.aria")}>
          <label>
            <span>{t("builder.brief.title")}</span>
            <input
              value={draft.title}
              onChange={(e) =>
                setDraft((c) => ({ ...c, title: e.target.value }))
              }
            />
          </label>
          <label>
            <span>{t("builder.brief.vibe")}</span>
            <input
              value={draft.vibe}
              onChange={(e) =>
                setDraft((c) => ({ ...c, vibe: e.target.value }))
              }
            />
          </label>
          <label>
            <span>{t("builder.brief.venue")}</span>
            <input
              value={draft.venue}
              onChange={(e) =>
                setDraft((c) => ({ ...c, venue: e.target.value }))
              }
            />
          </label>
          <label>
            <span>{t("builder.brief.slotKind")}</span>
            <select
              value={draft.slotKind ?? "peaktime"}
              onChange={(e) => {
                const slotKind = e.target.value as SetSlotKind;
                const kind = SLOT_KINDS.find((item) => item.id === slotKind);
                setDraft((c) => ({
                  ...c,
                  slotKind,
                  slot: kind
                    ? t("builder.brief.slotText", {
                        kind: slotLabel(t, kind.id),
                        minutes: c.durationMinutes,
                      })
                    : c.slot,
                }));
              }}
            >
              {SLOT_KINDS.map((kind) => (
                <option key={kind.id} value={kind.id} title={slotHint(t, kind.id)}>
                  {slotLabel(t, kind.id)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("builder.brief.slotNote")}</span>
            <input
              value={draft.slot}
              onChange={(e) =>
                setDraft((c) => ({ ...c, slot: e.target.value }))
              }
            />
          </label>
          <label>
            <span>{t("builder.brief.audience")}</span>
            <input
              value={draft.audience}
              onChange={(e) =>
                setDraft((c) => ({ ...c, audience: e.target.value }))
              }
            />
          </label>
          <label>
            <span>{t("builder.brief.gear")}</span>
            <input
              value={draft.gear}
              onChange={(e) =>
                setDraft((c) => ({ ...c, gear: e.target.value }))
              }
            />
          </label>
          <label>
            <span>{t("builder.brief.duration")}</span>
            <input
              type="number"
              min={30}
              max={240}
              value={draft.durationMinutes}
              onChange={(e) =>
                setDraft((c) => ({
                  ...c,
                  durationMinutes: Number(e.target.value) || 60,
                }))
              }
            />
          </label>
        </div>
      </header>

      {status ? <p className="banner status">{status}</p> : null}

      <StickReloadBanner
        draft={draft}
        onLoaded={(rows) => {
          setLibraryRows(rows);
          const library = rows.flatMap((row) => (row.stick ? [row.stick] : []));
          if (library.length) setDraft((current) => rehydrateStickCovers(current, library));
        }}
      />

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
          onAddTrack={addLibraryTrack}
          onPlayTrack={playLibraryTrack}
          rows={libraryRows}
          onRows={(rows) => {
            setLibraryRows(rows);
            const library = rows.flatMap((row) => (row.stick ? [row.stick] : []));
            if (library.length) setDraft((current) => rehydrateStickCovers(current, library));
          }}
          onApply={(next, message) => {
            setDraft(next);
            clearNotice();
            setStatus(message);
          }}
        />
      </details>

      <details className="explain-fold section-fold" open>
        <summary>
          <span>{t("builder.build.title")}</span>
          <em>
            {t("builder.build.summary", {
              performance: mainTracks.length,
              safety: draft.tracks.length - mainTracks.length,
            })}
          </em>
        </summary>
        <section className="crate-workspace" aria-label={t("builder.build.title")}>
          <div className="panel-head">
            <div>
              <h2>{t("builder.build.title")}</h2>
              <p className="section-note">{t("builder.build.note")}</p>
            </div>
          </div>

          <details className="explain-fold nested crate-add">
            <summary>
              <span>{t("builder.add.title")}</span>
              <em className="fold-toggle" />
            </summary>
            <div className="explain-body crate-add-body">
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
                {(["link", "search", "manual", "auto"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={addTab === id}
                    className={addTab === id ? "seg-item active" : "seg-item"}
                    title={t(`builder.add.tab.${id}.hint`)}
                    onClick={() => {
                      setAddTab(id);
                      clearNotice();
                    }}
                  >
                    {t(`builder.add.tab.${id}.label`)}
                  </button>
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
                  <p className="import-hint">{t("builder.search.hint")}</p>
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
                  <p className="import-hint">{t("builder.link.hint")}</p>
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
                    <div className="empty">
                      <p>
                        {addTab === "search"
                          ? t("builder.crate.emptySearch")
                          : t("builder.crate.emptyLink")}
                      </p>
                    </div>
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
                  <p className="section-note">{t("builder.auto.note")}</p>
                  {draft.tracks.length > 0 ? (
                    <p className="import-hint">
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

          <div className="set-bar">
            <div className="seg" role="tablist" aria-label={t("builder.view.aria")}>
              {(["list", "roles", "keys"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={crateView === id}
                  className={crateView === id ? "seg-item active" : "seg-item"}
                  title={t(`builder.view.${id}.hint`)}
                  onClick={() => setCrateView(id)}
                >
                  {t(`builder.view.${id}.label`)}
                </button>
              ))}
            </div>
            <SetMenus
              canExport={draft.tracks.length > 0}
              onExportPdf={exportPdf}
              onExportM3u={exportM3u}
              onExportRekordbox={exportRekordbox}
              onWriteStick={() => setStickOpen(true)}
              onCopyText={() => void copyExport()}
              onReset={resetSet}
            />
            <StickWriteDialog
              open={stickOpen}
              onClose={() => setStickOpen(false)}
              draft={draft}
            />
          </div>
          <SetTools
            canMatch={draft.tracks.length > 0}
            matchingLinks={matchingLinks}
            onMatchLinks={() => void matchStreamingLinks()}
          >
            <span className="tip">
              <button
                type="button"
                className="btn ghost"
                onClick={harmonizeSet}
                disabled={mainTracks.length < 2}
              >
                {t("builder.tool.harmonize")}
              </button>
              <span className="tip-bubble" role="tooltip">
                {t("builder.tool.harmonizeTip")}
              </span>
            </span>
            <span className="tip">
              <button
                type="button"
                className="btn ghost"
                onClick={fitSlot}
                disabled={filledMs <= targetMs * 1.05}
              >
                {t("builder.tool.fit")}
              </button>
              <span className="tip-bubble" role="tooltip">
                {t("builder.tool.fitTip")}
              </span>
            </span>
            <span className="tip">
              <button
                type="button"
                className="btn ghost"
                onClick={assignRoles}
                disabled={mainTracks.length < 2}
              >
                {t("builder.tool.assign")}
              </button>
              <span className="tip-bubble" role="tooltip">
                {t("builder.tool.assignTip")}
              </span>
            </span>
          </SetTools>
          <FieldNoticeView notice={localNotice("library")} />
          <FieldNoticeView notice={localNotice("export")} />

          {crateView === "list" ? (
            <div className="crate-view crate-list">
              <div className="crate-list-head">
                <p className="head-meta">
                  {roleFilter === "all"
                    ? t(
                        filledMs > targetMs * 1.05
                          ? "builder.list.headAllLong"
                          : "builder.list.headAll",
                        {
                          tracks: trackCount(visibleTimeline.length, t),
                          duration: formatDuration(
                            visibleTimeline.reduce((sum, track) => sum + track.durationMs, 0),
                          ),
                          minutes: draft.durationMinutes,
                        },
                      )
                    : t("builder.list.headRole", {
                        role: roleLabel(t, roleFilter),
                        tracks: trackCount(visibleTimeline.length, t),
                        duration: formatDuration(
                          visibleTimeline.reduce((sum, track) => sum + track.durationMs, 0),
                        ),
                      })}
                </p>
                <button
                  type="button"
                  className="btn ghost details-toggle"
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
                <div className="seg" role="group" aria-label={t("builder.list.filterAria")}>
                  <button
                    type="button"
                    className={roleFilter === "all" ? "seg-item active" : "seg-item"}
                    title={t("builder.list.filterSetTitle")}
                    onClick={() => setRoleFilter("all")}
                  >
                    {t("builder.list.filterSet")}
                  </button>
                  {TRACK_ROLES.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      className={roleFilter === role.id ? "seg-item active" : "seg-item"}
                      title={roleHint(t, role.id)}
                      onClick={() => setRoleFilter(role.id)}
                    >
                      {roleLabel(t, role.id)}
                    </button>
                  ))}
                </div>
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
                    <button
                      type="button"
                      className="drag-handle"
                      draggable
                      aria-label={t("builder.row.dragAria", { name: track.name })}
                      title={t("builder.row.dragTitle")}
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
                    <em>{positions.get(track.id) ?? "—"}</em>
                  </span>
                  <div className="manual-body">
                    <div className="manual-row-main">
                      <button
                        type="button"
                        className="manual-select"
                        onClick={() => setFocusTrackId(track.id)}
                      >
                        <TrackArt url={track.imageUrl} size={44} />
                        <span className="manual-copy">
                          <strong>{track.name}</strong>
                          <span>
                            {track.artists.join(", ")}
                            {track.durationMs
                              ? ` · ${formatDuration(track.durationMs)}`
                              : ""}
                          </span>
                        </span>
                      </button>
                      <div className="manual-meta">
                        <em
                          className={`source-pill source-${track.source || "manual"}`}
                        >
                          {sourceLabel(track.source)}
                        </em>
                        <select
                          value={track.phase}
                          onChange={(e) =>
                            patchTrack(track.id, {
                              phase: e.target.value as SetPhaseId,
                            })
                          }
                          aria-label={t("builder.row.phaseAria", { name: track.name })}
                        >
                          {PHASES.map((phase) => (
                            <option key={phase.id} value={phase.id}>
                              {phaseLabel(t, phase.id)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={track.role}
                          onChange={(e) =>
                            patchTrack(track.id, {
                              role: e.target.value as TrackRole,
                              why: t("analysis.why.manual"),
                            })
                          }
                          aria-label={t("builder.row.roleAria", { name: track.name })}
                        >
                          {TRACK_ROLES.map((role) => (
                            <option key={role.id} value={role.id}>
                              {roleLabel(t, role.id)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="timeline-tools">
                        <button
                          type="button"
                          className={
                            focusTrackId === track.id ? "is-playing" : undefined
                          }
                          onClick={() => setFocusTrackId(track.id)}
                          aria-label={t("builder.row.playAria", { name: track.name })}
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTrack(track.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTrack(track.id, 1)}
                        >
                          ↓
                        </button>
                        {track.role !== "safety" ? (
                          <button
                            type="button"
                            title={t("builder.row.replaceTitle")}
                            onClick={() =>
                              setReplaceFor((current) =>
                                current === track.id ? null : track.id,
                              )
                            }
                          >
                            {t("builder.row.replace")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="danger"
                          onClick={() => removeTrack(track.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {track.role !== "safety" ? (
                      <MixJoinLine tracks={mainTracks} track={track} />
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
                      />
                    ) : null}
                    {track.why ? (
                      <p className="why-inline">
                        <strong>{t("builder.row.why")}</strong>{" "}
                        {localizeWhy(track.why, t)}
                      </p>
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
                        <span className="td-values">
                          {[
                            track.keyCamelot || t("builder.row.keyOpen"),
                            track.bpm ? `${track.bpm} BPM` : t("builder.row.bpmOpen"),
                            track.energyLevel != null
                              ? t("builder.row.energy", { level: track.energyLevel })
                              : null,
                            track.transition !== "unset"
                              ? transitionLabel(t, track.transition)
                              : null,
                            (track.comment || "").trim() ? t("builder.row.commentTag") : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </summary>
                    <label className="manual-comment">
                      <span>{t("builder.row.comment")}</span>
                      <textarea
                        value={track.comment || localizeNote(track.note, t)}
                        rows={2}
                        placeholder={t("builder.row.commentPlaceholder")}
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
                      />
                      <select
                        value={track.keyCamelot}
                        onChange={(e) =>
                          patchTrack(track.id, { keyCamelot: e.target.value })
                        }
                        aria-label={t("builder.row.keyAria", { name: track.name })}
                      >
                        <option value="">{t("builder.row.keyOption")}</option>
                        {CAMELOT_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                      <select
                        value={track.energyLevel ?? ""}
                        onChange={(e) =>
                          patchTrack(track.id, {
                            energyLevel: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        aria-label={t("builder.row.energyAria", { name: track.name })}
                      >
                        <option value="">{t("builder.row.energyOption")}</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                          <option key={level} value={level}>
                            {t("builder.row.energy", { level })}
                          </option>
                        ))}
                      </select>
                      <select
                        value={track.transition}
                        onChange={(e) =>
                          patchTrack(track.id, {
                            transition: e.target.value as TransitionVerb,
                          })
                        }
                        aria-label={t("builder.row.transitionAria", { name: track.name })}
                      >
                        {TRANSITIONS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {transitionLabel(t, item.id)}
                          </option>
                        ))}
                      </select>
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
            <div className="crate-view">
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
            <div className="crate-view">
      <section className="curve" aria-label={t("builder.curve.aria")}>
        <div className="curve-head">
          <h2>{t("builder.curve.title")}</h2>
          <p>
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
            const actual = phaseDurationMs(draft.tracks, phase.id);
            const target = targetMs * phase.share;
            const ratio = target > 0 ? actual / target : 0;
            const minutes = Math.round(target / 60000);
            const active = activePhase === phase.id;
            const label = t("builder.curve.phaseLabel", {
              phase: phaseLabel(t, phase.id),
              actual: formatDuration(actual),
              minutes,
            });
            const clickHint = t("builder.curve.phaseClick", { label });
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
                </button>
              </div>
            );
          })}
        </div>
        <p className="curve-note">{t("builder.curve.note")}</p>
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
              <HarmonicPath tracks={draft.tracks} onHarmonize={harmonizeSet} embedded />
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
        onClose={() => setFocusTrackId(null)}
      />
    </div>
  );
}
