"use client";

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
import { HarmonicPath } from "@/components/HarmonicPath";
import { LibraryPanel } from "@/components/LibraryPanel";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import { ReplaceMenu } from "@/components/ReplaceMenu";
import { SetTakeaway } from "@/components/SetTakeaway";
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
  ARC_GUIDE,
  DEFAULT_SET,
  PHASES,
  EXTRACT_STEPS,
  PREP_PRINCIPLES,
  SLOT_KINDS,
  TRACK_ROLES,
  TRANSITIONS,
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
  const index = tracks.findIndex((item) => item.id === track.id);
  const join = index > 0 ? mixJoin(tracks[index - 1], track) : null;
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
    cachedDraft = {
      ...DEFAULT_SET,
      ...parsed,
      slotKind: parsed.slotKind ?? "peaktime",
      tracks: (parsed.tracks ?? []).map(normalizeTrack),
    };
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

let authNoteCache: string | null | undefined;

function readAuthNote(): string | null {
  if (authNoteCache !== undefined) return authNoteCache;
  const params = new URLSearchParams(window.location.search);
  const auth = params.get("auth");
  if (auth === "ok") {
    authNoteCache =
      "Spotify ist neu verbunden. Track nochmal starten — dann läuft Premium in voller Länge.";
  } else if (auth === "error") {
    const message = params.get("message") || "unbekannt";
    authNoteCache =
      message === "invalid_state"
        ? "Der Spotify-Login ist nicht zurückgekommen. Einmal neu verbinden und warten, bis die Seite wieder da ist."
        : `Spotify-Login fehlgeschlagen: ${message}`;
  } else {
    authNoteCache = null;
  }
  return authNoteCache;
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
  const raw = JSON.stringify(draft);
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
  const draft = useSyncExternalStore(
    subscribeDraft,
    readStoredDraft,
    () => DEFAULT_SET,
  );
  const [activePhase, setActivePhase] = useState<SetPhaseId>("open");
  const [activeRole, setActiveRole] = useState<TrackRole>("anchor");
  const [query, setQuery] = useState("tech house");
  const [linkUrl, setLinkUrl] = useState("");
  const [addTab, setAddTab] = useState<"search" | "link" | "manual" | "auto">(
    "link",
  );
  const [crateView, setCrateView] = useState<"list" | "roles" | "keys">("list");
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
  const [setupName, setSetupName] = useState(draft.title);
  const [selectedSetup, setSelectedSetup] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [tidalConnected, setTidalConnected] = useState<boolean | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [libraryPreview, setLibraryPreview] = useState<SetTrack | null>(null);
  const [matchingLinks, setMatchingLinks] = useState(false);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<TrackRole | "all">("all");
  const [settingsNote, setSettingsNote] = useState("Sichern · Verbinden");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Feedback like "+ Titel → Peak / Anchor" is a toast: it follows the scroll and fades after a while.
  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 8000);
    return () => window.clearTimeout(timer);
  }, [status]);

  function noteSettings(note: string) {
    setSettingsNote(note);
    if (note === "Spotify fehlt") setSettingsOpen(true);
  }

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
  const authNote = useSyncExternalStore(
    () => () => {},
    readAuthNote,
    () => null,
  );
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
    const message = params.get("message") || "unknown";
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
          setStatus(
            "Spotify verbunden — wähle eine eigene Playlist und extrahiere das Set.",
          );
        } else if (auth === "error") {
          fail(
            "connect",
            `Spotify-Login fehlgeschlagen: ${message}`,
            "Redirect URI in der Developer-App prüfen, Zugangsdaten unter Einstellungen speichern, dann erneut verbinden.",
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
        "Playlist-Link fehlt.",
        "Einen Spotify- oder Tidal-Playlist-Link ins Feld einfügen.",
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
          "Spotify-Login nötig, um Playlist-Tracks zu lesen.",
          "Unter Einstellungen mit Spotify verbinden, dann hier noch einmal extrahieren.",
        );
        return;
      }
      if (!response.ok || !data.draft) {
        throw new Error(data.error || "Extraktion fehlgeschlagen.");
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
      const tidalNote =
        tidalMatched === 0
          ? " Tidal ohne Treffer."
          : tidalKeyed > 0
            ? ` Tidal: ${tidalKeyed} mit Key/BPM, ${tidalMatched} gematcht.`
            : ` Tidal: ${tidalMatched} Tracks über Popularität sortiert. Key/BPM gibt diese App nicht zurück.`;
      setStatus(
        `Set aus „${data.playlist?.name ?? "Playlist"}“: ${performanceCount} Performance-Tracks + ${safetyCount} Alternativen (Pool: ${data.playlist?.imported ?? "?"}).${tidalNote}`,
      );
      await refreshAuthStatus();
    } catch (err) {
      fail(
        "playlist",
        err instanceof Error ? err.message : "Extraktion fehlgeschlagen.",
        "Den Link prüfen. Im Spotify Dev Mode gehen nur eigene oder kollaborative Playlists.",
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
  const activeGuide = ARC_GUIDE.find((item) => item.phase === activePhase);

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
        "Mindestens 2 Zeichen für die Suche.",
        "Artist oder Titel mit mindestens zwei Zeichen eintippen.",
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
        if (!response.ok) throw new Error(data.error || "Suche fehlgeschlagen.");
        setResults(data.tracks ?? []);
        if ((data.tracks ?? []).length === 0) {
          setStatus("Keine Treffer — anderen Artist oder Track versuchen.");
        }
      } catch (err) {
        setResults([]);
        fail(
          "crate",
          err instanceof Error ? err.message : "Suche fehlgeschlagen.",
          "Verbindung unter Einstellungen prüfen und die Suche wiederholen.",
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
        if (!response.ok) throw new Error(data.error || "Tidal-Playlist fehlgeschlagen.");
        const tracks = data.tracks ?? [];
        setResults(tracks);
        setCrateSource(`Tidal: ${data.label || label || "Playlist"}`);
        setStatus(`${trackCount(tracks.length)} aus Tidal — einzeln oder alle ins Set.`);
      } catch (err) {
        setResults([]);
        fail(
          "crate",
          err instanceof Error ? err.message : "Tidal-Playlist fehlgeschlagen.",
          "Mit Tidal verbinden. In der Entwickler-App user.read und playlists.read einschalten.",
        );
      }
    });
  }

  async function importCrateLink(rawUrl = linkUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      fail(
        "crate",
        "Playlist- oder Track-Link fehlt.",
        "Einen Link von Spotify, Tidal, Beatport oder SoundCloud ins Feld einfügen.",
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
            throw new Error(data.error || `${store}-Link fehlgeschlagen.`);
          }
          const tracks = data.tracks ?? [];
          setResults(tracks);
          setCrateSource(data.label ? `${store}: ${data.label}` : store);
          setStatus(
            data.message ||
              (tracks.length
                ? `${store} geladen — mit + dazu ins Set.`
                : "Keine Tracks im Link."),
          );
        } catch (err) {
          setResults([]);
          setCrateSource(null);
          fail(
            "crate",
            err instanceof Error ? err.message : `${store}-Link fehlgeschlagen.`,
            "Den Link im Browser öffnen. Steht der Titel in der Adresse, hier noch einmal einfügen.",
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
          if (!response.ok) throw new Error(data.error || "Tidal-Link fehlgeschlagen.");
          setResults(data.tracks ?? []);
          setCrateSource(`Tidal: ${data.label || "Playlist"}`);
          setStatus(`${trackCount((data.tracks ?? []).length)} aus Tidal geladen.`);
        } catch (err) {
          setResults([]);
          fail(
            "crate",
            err instanceof Error ? err.message : "Tidal-Link fehlgeschlagen.",
            "Mit Tidal verbinden. Die Redirect URI muss exakt die aus den Einstellungen sein.",
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
          throw new Error(data.error || "Link konnte nicht geladen werden.");
        }
        const tracks = data.tracks ?? [];
        setResults(tracks);
        setCrateSource(
          data.kind && data.label
            ? `${data.kind === "track" ? "Track" : data.kind === "album" ? "Album" : "Playlist"}: ${data.label}`
            : null,
        );
        setStatus(
          tracks.length === 1
            ? "Track geladen — mit + zum Set hinzufügen."
            : `${trackCount(tracks.length)} geladen — einzeln oder alle hinzufügen.`,
        );
      } catch (err) {
        setResults([]);
        setCrateSource(null);
        fail(
          "crate",
          err instanceof Error ? err.message : "Link konnte nicht geladen werden.",
          "Unter Einstellungen verbinden und den Link erneut laden. Im Dev Mode nur eigene Playlists.",
        );
      }
    });
  }

  function addTrack(track: SearchTrack) {
    if (draft.tracks.some((item) => item.id === track.id)) {
      setStatus("Track ist schon im Set.");
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
      `+ ${track.name} → ${PHASES.find((p) => p.id === activePhase)?.label} / ${activeRole}`,
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
      setStatus("Alle Treffer sind schon im Set.");
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
      `+ ${trackCount(mapped.length)} → ${PHASES.find((p) => p.id === activePhase)?.label} / ${activeRole}`,
    );
  }

  function addManualEntry() {
    const name = manualTitle.trim();
    if (!name) {
      fail(
        "crate",
        "Titel fehlt.",
        "Einen Titel eintragen. Artist und Link dürfen leer bleiben.",
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
      `+ ${name} → ${PHASES.find((p) => p.id === activePhase)?.label} / ${TRACK_ROLES.find((r) => r.id === activeRole)?.label}`,
    );
  }

  function addLibraryTrack(track: SetTrack) {
    const same = draft.tracks.some(
      (item) =>
        item.id === track.id ||
        (item.name.toLowerCase() === track.name.toLowerCase() &&
          item.artists.join(",").toLowerCase() === track.artists.join(",").toLowerCase()),
    );
    if (same) {
      setStatus(`${track.name} ist schon im Set.`);
      return;
    }
    addTracksBulk([track]);
    setStatus(
      `+ ${track.name} → ${PHASES.find((p) => p.id === track.phase)?.label} / ${TRACK_ROLES.find((r) => r.id === track.role)?.label}`,
    );
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
    await navigator.clipboard.writeText(exportSetText(draft));
    setStatus("Set als Text kopiert, mit Cue-Notizen und Alternativen.");
  }

  function exportPdf() {
    try {
      openSetPdfExport(draft);
      setStatus(
        "Druckansicht geöffnet. Dort drucken oder „Als PDF speichern“ wählen.",
      );
    } catch (err) {
      fail(
        "export",
        err instanceof Error ? err.message : "PDF-Export fehlgeschlagen.",
        "Pop-ups für diese Seite erlauben und PDF noch einmal öffnen.",
      );
    }
  }

  function exportM3u() {
    downloadText(
      boothFileName(draft.title, "m3u"),
      buildM3u(draft),
      "audio/x-mpegurl",
    );
    setStatus("M3U der Performance-Reihenfolge gespeichert.");
  }

  function exportRekordbox() {
    downloadText(
      boothFileName(draft.title, "xml"),
      buildRekordboxXml(draft),
      "application/xml",
    );
    setStatus(
      "rekordbox-XML gespeichert. In rekordbox: File → Import Playlist. Alternativen liegen in der zweiten Playlist.",
    );
  }

  function replaceTrack(targetId: string, replacementId: string) {
    setDraft((current) => ({
      ...current,
      tracks: swapIntoSlot(current.tracks, targetId, replacementId),
    }));
    setReplaceFor(null);
    setStatus("Alternative eingesetzt. Der ersetzte Track liegt bei den Alternativen.");
  }

  async function matchStreamingLinks() {
    const pending = draft.tracks.filter(
      (track) => !track.externalUrl && track.name.trim(),
    );
    if (!pending.length) {
      setStatus("Alle Tracks haben schon einen Link.");
      return;
    }
    setMatchingLinks(true);
    setStatus(`Suche Spotify-Links… 0/${pending.length}`);
    const patches = new Map<
      string,
      { externalUrl: string; imageUrl: string | null }
    >();
    let found = 0;
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
            if (!response.ok) return;
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
        setStatus(`Suche Spotify-Links… ${Math.min(i + 4, pending.length)}/${pending.length}`);
      }
      setDraft((current) => ({
        ...current,
        tracks: current.tracks.map((track) => {
          const patch = patches.get(track.id);
          return patch ? { ...track, ...patch } : track;
        }),
      }));
      setStatus(
        found
          ? `${found} Spotify-Links gesetzt, ${pending.length - found} ohne sicheren Treffer.`
          : "Kein sicherer Spotify-Treffer.",
      );
    } catch (err) {
      fail(
        "library",
        err instanceof Error ? err.message : "Spotify-Suche fehlgeschlagen.",
        "Unter Einstellungen mit Spotify verbinden und Links suchen erneut starten.",
      );
    } finally {
      setMatchingLinks(false);
    }
  }

  function saveSetup() {
    const name = setupName.trim() || draft.title || "Setup";
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
    setStatus(`„${name}“ gespeichert.`);
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
    setStatus(`„${setup.name}“ geladen.`);
  }

  function deleteSetup() {
    const setup = setups.find((item) => item.id === selectedSetup);
    if (!setup) return;
    const next = setups.filter((item) => item.id !== setup.id);
    writeSetups(next);
    setSelectedSetup("");
    setStatus(`„${setup.name}“ gelöscht.`);
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
    setStatus("Einstellungsdatei heruntergeladen.");
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
          throw new Error("Datei enthält kein SETFORM-Setup.");
        }
        const name = parsed.name || incoming.title;
        setSetupName(name);
        setDraft({
          ...DEFAULT_SET,
          ...incoming,
          tracks: incoming.tracks.map(normalizeTrack),
        });
        setStatus(`„${name}“ aus Datei geladen.`);
      } catch (err) {
        fail(
          "settings",
          err instanceof Error ? err.message : "Datei ungültig.",
          "Eine Datei verwenden, die hier über Herunterladen gespeichert wurde.",
        );
      }
    };
    reader.readAsText(file);
  }

  function resetSet() {
    setDraft(DEFAULT_SET);
    setFocusTrackId(null);
    setStatus("Brief zurückgesetzt — das Set ist leer.");
  }

  function harmonizeSet() {
    const next = reharmonizeDraft(draft);
    setDraft(next);
    setStatus("Set innerhalb der Phasen nach Camelot/BPM neu sortiert.");
  }

  function fitSlot() {
    const result = fitToSlot(draft);
    if (!result.moved) {
      setStatus("Das Set passt schon in den Slot.");
      return;
    }
    setDraft(result.draft);
    setStatus(
      `Auf Slot gekürzt: ${formatDuration(result.beforeMs)} → ${formatDuration(result.afterMs)} · ${trackCount(result.kept)} bleiben, ${trackCount(result.moved)} liegen unter Alternativen.`,
    );
  }

  function assignRoles() {
    setDraft(distributeRoles(draft));
    setStatus(
      "Rollen verteilt: Anchor auf Peak und Schluss, Bridge bei Phasen-, Key- oder BPM-Wechsel, sonst Groove.",
    );
  }

  function renderSetups() {
    return (
      <section className="setups-bar" aria-label="Gespeicherte Einstellungen">
        <div className="panel-head">
          <h2>Einstellungen</h2>
          <p>Brief sichern. Spotify und Tidal hier verbinden.</p>
        </div>
        <div className="setups-grid">
          <div className="setup-card">
            <h3>Speichern</h3>
            <label className="setup-field">
              <span>Name</span>
              <input
                value={setupName}
                onChange={(event) => setSetupName(event.target.value)}
                aria-label="Setup-Name"
              />
            </label>
            <button type="button" className="btn" onClick={saveSetup}>
              Speichern
            </button>
          </div>
          <div className="setup-card">
            <h3>Laden</h3>
            <label className="setup-field">
              <span>Gespeicherter Stand</span>
              <select
                value={selectedSetup}
                onChange={(event) => setSelectedSetup(event.target.value)}
                aria-label="Gespeichertes Setup"
              >
                <option value="">Wählen…</option>
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
                Laden
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={!selectedSetup}
                onClick={deleteSetup}
              >
                Löschen
              </button>
            </div>
          </div>
          <div className="setup-card">
            <h3>Datei</h3>
            <p>JSON sichern oder auf einem anderen Rechner öffnen.</p>
            <div className="setup-actions">
              <button type="button" className="btn ghost" onClick={downloadSetup}>
                Herunterladen
              </button>
              <label className="btn ghost file-btn">
                Öffnen
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
        ? "wird geprüft"
        : spotifyConnected
          ? "verbunden"
          : "nicht verbunden";
    const tidalState =
      tidalConnected === null
        ? "wird geprüft"
        : tidalConnected
          ? "verbunden"
          : "nicht verbunden";
    return (
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
                setStatus("Spotify getrennt.");
              }}
            >
              Spotify trennen
            </button>
          ) : (
            <a className="button-link" href="/api/auth/login">
              Mit Spotify verbinden
            </a>
          )}
          {tidalConnected ? (
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                await fetch("/api/auth/tidal/logout", { method: "POST" });
                setTidalConnected(false);
                setStatus("Tidal getrennt.");
              }}
            >
              Tidal trennen
            </button>
          ) : (
            <a className="button-link tidal-login" href="/api/auth/tidal/login">
              Mit Tidal verbinden
            </a>
          )}
        </div>
        <p className="head-meta">
          Spotify {spotifyState} · Tidal {tidalState}
        </p>
        {spotifyConnected && tidalConnected ? null : (
          <p className="import-hint">
            Die Zugangsdaten für Spotify und Tidal stehen unter Einstellungen.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="set-shell">
      {authNote ? <p className="banner status">{authNote}</p> : null}
      <header className="hero">
        <div className="hero-copy">
          <p className="brand">SETFORM</p>
          <h1>Dramaturgie statt Playlist.</h1>
          <p className="lede">
            SETFORM formt aus dem Rekordbox-Stick ein Set. Playlist oder
            History laden, den Bogen nach Slot und Dauer legen, und an Key und
            BPM sehen, ob der Übergang zum nächsten Track trägt. Spotify, Tidal
            und Beatport sind die Ergänzung, wenn ein Track noch nicht auf dem
            Stick liegt.
          </p>
        </div>
        <div className="hero-meta" aria-label="Set brief">
          <label>
            <span>Titel</span>
            <input
              value={draft.title}
              onChange={(e) =>
                setDraft((c) => ({ ...c, title: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Vibe / Genre-Arc</span>
            <input
              value={draft.vibe}
              onChange={(e) =>
                setDraft((c) => ({ ...c, vibe: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Venue / Soundsystem</span>
            <input
              value={draft.venue}
              onChange={(e) =>
                setDraft((c) => ({ ...c, venue: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Slot-Art</span>
            <select
              value={draft.slotKind ?? "peaktime"}
              onChange={(e) => {
                const slotKind = e.target.value as SetSlotKind;
                const kind = SLOT_KINDS.find((item) => item.id === slotKind);
                setDraft((c) => ({
                  ...c,
                  slotKind,
                  slot: kind
                    ? `${kind.label} · ${c.durationMinutes} Min`
                    : c.slot,
                }));
              }}
            >
              {SLOT_KINDS.map((kind) => (
                <option key={kind.id} value={kind.id} title={kind.hint}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Slot-Notiz</span>
            <input
              value={draft.slot}
              onChange={(e) =>
                setDraft((c) => ({ ...c, slot: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Audience</span>
            <input
              value={draft.audience}
              onChange={(e) =>
                setDraft((c) => ({ ...c, audience: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Gear</span>
            <input
              value={draft.gear}
              onChange={(e) =>
                setDraft((c) => ({ ...c, gear: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Dauer (Min)</span>
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

      <details
        className="explain-fold section-fold"
        open={settingsOpen}
        onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Einstellungen</span>
          <em>{settingsNote}</em>
        </summary>
        {renderSetups()}
      </details>

      <details className="explain-fold section-fold" open>
        <summary>
          <span>Set laden &amp; Keys</span>
          <em>
            {mainTracks.length
              ? `${mainTracks.filter((track) => track.keyCamelot).length}/${mainTracks.length} Keys`
              : "Erster Schritt"}
          </em>
        </summary>
        <LibraryPanel
          draft={draft}
          onAddTrack={addLibraryTrack}
          onPlayTrack={playLibraryTrack}
          onApply={(next, message) => {
            setDraft(next);
            clearNotice();
            setStatus(message);
          }}
        />
      </details>

      <details className="explain-fold section-fold" open>
        <summary>
          <span>Energiekurve</span>
          <em>
            {formatDuration(filledMs)} / {draft.durationMinutes}:00
            {filledMs > targetMs ? " · über dem Brief" : ""}
          </em>
        </summary>
      <section className="curve" aria-label="Energy curve">
        <div className="curve-head">
          <h2>Energiekurve</h2>
          <p>
            {formatDuration(filledMs)} / {draft.durationMinutes}:00
            {filledMs > targetMs ? " · über dem Brief" : ""} ·{" "}
            {mainTracks.length} Performance ·{" "}
            {draft.tracks.filter((track) => track.role === "safety").length}{" "}
            Alternativen
          </p>
        </div>
        <details className="explain-fold nested principles">
          <summary>
            <span>Dramaturgie-Prinzipien</span>
            <em className="fold-toggle" />
          </summary>
          <div className="explain-body">
            <p>
              Diese Prinzipien bestimmen, wie SETFORM den Bogen legt und worauf
              du in der Setliste achten solltest.
            </p>
            <ul className="explain-steps">
              {PREP_PRINCIPLES.map((item) => (
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
            const label = `${phase.label}: ${formatDuration(actual)} von etwa ${minutes} min`;
            return (
              <div key={phase.id} className="phase-slot">
                <button
                  type="button"
                  className={["curve-seg", active ? "active" : "", ratio > 1 ? "over" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  title={label}
                  aria-label={`${label}. Klick legt neue Tracks in diese Phase.`}
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
                  title={`${label}. Klick legt neue Tracks in diese Phase.`}
                  onClick={() => setActivePhase(phase.id)}
                >
                  <strong>{phase.label}</strong>
                  <span className="phase-hint">{phase.hint}</span>
                  <em>
                    {formatDuration(actual)} / ~{minutes} min
                  </em>
                </button>
              </div>
            );
          })}
        </div>
        <p className="curve-note">
          Die Breite ist der Anteil am Brief, die Füllung die schon gelegte
          Spielzeit. Gelb heißt, die Phase liegt über ihrem Fenster.
        </p>
        {activeGuide ? (
          <p className="guide-line">
            <strong>
              {phaseWindowLabel(draft.durationMinutes, activePhase)}
            </strong>{" "}
            — {activeGuide.focus}
          </p>
        ) : null}
      </section>
      </details>

      <details className="explain-fold section-fold" open>
        <summary>
          <span>Set bauen</span>
          <em>
            {mainTracks.length} Performance ·{" "}
            {draft.tracks.length - mainTracks.length} Alternativen
          </em>
        </summary>
        <section className="crate-workspace" aria-label="Set bauen">
          <div className="panel-head">
            <div>
              <h2>Set bauen</h2>
              <p className="section-note">
                Hier kommt Musik rein und bekommt eine Phase und eine Rolle.
                Danach ordnest du das Set von Hand oder lässt es nach Key
                sortieren.
              </p>
            </div>
          </div>

          <details className="explain-fold nested crate-add" open>
            <summary>
              <span>Musik hinzufügen</span>
              <em className="fold-toggle" />
            </summary>
            <div className="explain-body crate-add-body">
              {addTab === "auto" ? null : (
                <div className="add-target">
                  <span className="add-target-label">Neue Tracks landen in</span>
                  <select
                    value={activePhase}
                    onChange={(event) =>
                      setActivePhase(event.target.value as SetPhaseId)
                    }
                    aria-label="Phase für neue Tracks"
                  >
                    {PHASES.map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={activeRole}
                    onChange={(event) =>
                      setActiveRole(event.target.value as TrackRole)
                    }
                    aria-label="Rolle für neue Tracks"
                  >
                    {TRACK_ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="seg crate-add-tabs" role="tablist" aria-label="Wie Musik hinzufügen">
                {(
                  [
                    ["link", "Link", "Track, Playlist oder Album von Spotify, Tidal, Beatport oder SoundCloud."],
                    ["search", "Suche", "Den Spotify-Katalog nach Artist, Titel oder Genre durchsuchen."],
                    ["manual", "Von Hand", "Titel und Artist selbst eintragen."],
                    ["auto", "Automatisch", "Eine ganze Playlist als fertiges Set verteilen lassen."],
                  ] as const
                ).map(([id, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={addTab === id}
                    className={addTab === id ? "seg-item active" : "seg-item"}
                    title={hint}
                    onClick={() => {
                      setAddTab(id);
                      clearNotice();
                    }}
                  >
                    {label}
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
                      placeholder="Artist, Titel oder Genre"
                      aria-label="Spotify-Suche"
                    />
                    <button type="submit" disabled={isPending}>
                      {isPending ? "Suche…" : "Suchen"}
                    </button>
                  </form>
                  <p className="import-hint">
                    Durchsucht den Spotify-Katalog. Ein Link im Feld wird direkt geladen.
                  </p>
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
                      placeholder="Link von Spotify, Tidal, Beatport oder SoundCloud"
                      aria-label="Link"
                    />
                    <button type="submit" disabled={isPending}>
                      {isPending ? "Lade…" : "Laden"}
                    </button>
                  </form>
                  {tidalConnected && tidalPlaylists.length > 0 ? (
                    <div className="playlist-picker">
                      <label>
                        <span>Eigene Tidal-Playlists</span>
                        <select
                          value=""
                          aria-label="Tidal-Playlist wählen"
                          onChange={(event) => {
                            const id = event.target.value;
                            if (!id) return;
                            const picked = tidalPlaylists.find((item) => item.id === id);
                            void loadTidalCrate(id, picked?.name);
                          }}
                        >
                          <option value="">Playlist laden…</option>
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
                        <span>Eigene Spotify-Playlists</span>
                        <select
                          value=""
                          aria-label="Spotify-Playlist wählen"
                          onChange={(event) => {
                            const id = event.target.value;
                            if (!id) return;
                            const url = `https://open.spotify.com/playlist/${id}`;
                            setLinkUrl(url);
                            void importCrateLink(url);
                          }}
                        >
                          <option value="">Playlist laden…</option>
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
                  <p className="import-hint">
                    Beatport und SoundCloud brauchen keinen Login, der Titel kommt aus der
                    Adresse. Key und BPM stehen dort nicht. Spotify liefert im Dev Mode nur
                    eigene oder kollaborative Playlists.
                  </p>
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
                          Alle + ({results.length})
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {!hasSearched ? (
                    <div className="empty">
                      <p>
                        {addTab === "search"
                          ? "Suche starten. Treffer lassen sich einzeln oder alle auf einmal hinzufügen."
                          : "Link einfügen und laden. Danach einzeln oder alle ins Set legen."}
                      </p>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="empty">
                      <p>Keine Tracks geladen.</p>
                    </div>
                  ) : (
                    <ul className="result-list">
                      {results.map((track) => (
                        <li key={track.id}>
                          <div className="track-main">
                            {track.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={track.imageUrl} alt="" width={48} height={48} />
                            ) : (
                              <div className="art-fallback" />
                            )}
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
                            + dazu
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
                      <span>Titel</span>
                      <input
                        value={manualTitle}
                        onChange={(event) => setManualTitle(event.target.value)}
                        placeholder="Titel"
                        aria-label="Titel"
                      />
                    </label>
                    <label className="manual-field">
                      <span>Artist</span>
                      <input
                        value={manualArtist}
                        onChange={(event) => setManualArtist(event.target.value)}
                        placeholder="Artist"
                        aria-label="Artist"
                      />
                    </label>
                    <label className="manual-field is-wide">
                      <span>Link (optional)</span>
                      <input
                        value={manualLink}
                        onChange={(event) => setManualLink(event.target.value)}
                        placeholder="Adresse zum Track, zum Beispiel für den Player"
                        aria-label="Link"
                      />
                    </label>
                    <button type="submit" className="btn manual-form-btn">
                      Hinzufügen
                    </button>
                  </form>
                  <FieldNoticeView notice={localNotice("crate")} />
                </>
              ) : null}

              {addTab === "auto" ? (
                <>
                  <p className="section-note">
                    SETFORM nimmt eine Playlist und verteilt die Tracks nach Dauer,
                    Phasen und Rollen auf das Set.
                  </p>
                  {draft.tracks.length > 0 ? (
                    <p className="import-hint">
                      Das aktuelle Set mit {trackCount(draft.tracks.length)} wird dabei
                      ersetzt.
                    </p>
                  ) : null}
                  {spotifyConnected && myPlaylists.length > 0 ? (
                    <div className="playlist-picker">
                      <label>
                        <span>Eigene Playlists</span>
                        <select
                          value=""
                          onChange={(event) => {
                            const id = event.target.value;
                            if (!id) return;
                            setPlaylistUrl(`https://open.spotify.com/playlist/${id}`);
                            clearNotice();
                          }}
                          aria-label="Eigene Playlist wählen"
                        >
                          <option value="">Playlist wählen…</option>
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
                      placeholder="Spotify- oder Tidal-Playlist-Link"
                      aria-label="Playlist-Link"
                    />
                    <button type="submit" disabled={isExtracting || !playlistUrl.trim()}>
                      {isExtracting ? "Extrahiere…" : "Set extrahieren"}
                    </button>
                  </form>
                  <FieldNoticeView notice={localNotice("playlist")} />
                  {renderConnection()}
                  <details className="explain-fold nested">
                    <summary>
                      <span>So funktioniert die Extraktion</span>
                      <em className="fold-toggle" />
                    </summary>
                    <div className="explain-body">
                      <ol className="explain-steps">
                        {EXTRACT_STEPS.map((step) => (
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

          <div className="crate-view-bar">
            <div className="seg" role="tablist" aria-label="Ansicht">
              {(
                [
                  ["list", "Setliste", "Die Reihenfolge des Abends. Hier sortierst du von Hand und schreibst Kommentare."],
                  ["roles", "Rollen", "Anchor, Bridge, Groove und Alternativen als Spalten. Titel zwischen Rollen ziehen."],
                  ["keys", "Key-Pfad", "Camelot-Keys entlang der Reihenfolge, mit Mix-Score und Clashes."],
                ] as const
              ).map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={crateView === id}
                  className={crateView === id ? "seg-item active" : "seg-item"}
                  title={hint}
                  onClick={() => setCrateView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <SetTakeaway
              canMatch={draft.tracks.length > 0}
              canExport={draft.tracks.length > 0}
              matchingLinks={matchingLinks}
              onMatchLinks={() => void matchStreamingLinks()}
              onExportPdf={exportPdf}
              onExportM3u={exportM3u}
              onExportRekordbox={exportRekordbox}
              onCopyText={() => void copyExport()}
              leading={
                <>
                  <span className="tip">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={harmonizeSet}
                      disabled={mainTracks.length < 2}
                    >
                      Harmonisch sortieren
                    </button>
                    <span className="tip-bubble" role="tooltip">
                      Ordnet jede Phase nach Camelot-Key und BPM neu. Die Rollen bleiben.
                    </span>
                  </span>
                  <span className="tip">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={fitSlot}
                      disabled={filledMs <= targetMs * 1.05}
                    >
                      Auf Slot kürzen
                    </button>
                    <span className="tip-bubble" role="tooltip">
                      Kürzt das Set auf die Dauer im Brief. Pro Phase bleiben gleichmäßig verteilte Tracks, der Rest wandert unter Alternativen. Nichts geht verloren.
                    </span>
                  </span>
                  <span className="tip">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={assignRoles}
                      disabled={mainTracks.length < 2}
                    >
                      Rollen verteilen
                    </button>
                    <span className="tip-bubble" role="tooltip">
                      Setzt Anchor, Bridge und Groove neu nach Phase, Key und BPM. Die Reihenfolge bleibt.
                    </span>
                  </span>
                </>
              }
              extra={
                <span className="tip tip-end">
                  <button type="button" className="btn ghost" onClick={resetSet}>
                    Zurücksetzen
                  </button>
                  <span className="tip-bubble" role="tooltip">
                    Set leeren und zum leeren Brief zurück. Gespeicherte Setups bleiben.
                  </span>
                </span>
              }
            />
          </div>
          <FieldNoticeView notice={localNotice("library")} />
          <FieldNoticeView notice={localNotice("export")} />

          {crateView === "list" ? (
            <div className="crate-view crate-list">
              <div className="crate-list-head">
                <p className="head-meta">
                  {roleFilter === "all"
                    ? "Performance-Set"
                    : TRACK_ROLES.find((role) => role.id === roleFilter)?.label}
                  {" · "}
                  {trackCount(visibleTimeline.length)} ·{" "}
                  {formatDuration(
                    visibleTimeline.reduce((sum, track) => sum + track.durationMs, 0),
                  )}
                </p>
                <div className="seg" role="group" aria-label="Setliste filtern">
                  <button
                    type="button"
                    className={roleFilter === "all" ? "seg-item active" : "seg-item"}
                    title="Performance-Reihenfolge, ohne die Alternativen."
                    onClick={() => setRoleFilter("all")}
                  >
                    Set
                  </button>
                  {TRACK_ROLES.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      className={roleFilter === role.id ? "seg-item active" : "seg-item"}
                      title={role.hint}
                      onClick={() => setRoleFilter(role.id)}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
              {visibleTimeline.length === 0 ? (
                <div className="empty">
                  <p>Noch kein Set.</p>
                  <p>
                    Oben Musik hinzufügen oder unter „Set laden & Keys“ eine Playlist vom Stick laden.
                  </p>
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
                      aria-label={`${track.name} verschieben`}
                      title="Hier ziehen"
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
                        {track.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={track.imageUrl}
                            alt=""
                            width={48}
                            height={48}
                            draggable={false}
                          />
                        ) : (
                          <div className="art-fallback sm" />
                        )}
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
                          aria-label={`Phase für ${track.name}`}
                        >
                          {PHASES.map((phase) => (
                            <option key={phase.id} value={phase.id}>
                              {phase.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={track.role}
                          onChange={(e) =>
                            patchTrack(track.id, {
                              role: e.target.value as TrackRole,
                              why: "Manuell gesetzt",
                            })
                          }
                          aria-label={`Rolle für ${track.name}`}
                        >
                          {TRACK_ROLES.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.label}
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
                          aria-label={`${track.name} abspielen`}
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
                            onClick={() =>
                              setReplaceFor((current) =>
                                current === track.id ? null : track.id,
                              )
                            }
                          >
                            Ersatz
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
                      />
                    ) : null}
                    {track.why ? (
                      <p className="why-inline">
                        <strong>Warum hier:</strong> {track.why}
                      </p>
                    ) : null}
                    <label className="manual-comment">
                      <span>Kommentar</span>
                      <textarea
                        value={track.comment || track.note || ""}
                        rows={2}
                        placeholder="Cue, Energy, Vocal rein, Floor-Notiz…"
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
                        placeholder="BPM"
                        aria-label={`BPM für ${track.name}`}
                      />
                      <select
                        value={track.keyCamelot}
                        onChange={(e) =>
                          patchTrack(track.id, { keyCamelot: e.target.value })
                        }
                        aria-label={`Key für ${track.name}`}
                      >
                        <option value="">Key</option>
                        {CAMELOT_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
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
                        aria-label={`Übergang für ${track.name}`}
                      >
                        {TRANSITIONS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
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
            onMoveRole={(id, role) => {
              patchTrack(id, { role, why: "Manuell gesetzt" });
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
              <HarmonicPath tracks={draft.tracks} onHarmonize={harmonizeSet} embedded />
            </div>
          ) : null}
        </section>
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
