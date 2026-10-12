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
import { ManualArrange } from "@/components/ManualArrange";
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
import { reharmonizeDraft } from "@/lib/extract-set";
import { looksLikeMusicLink, parseMusicLink, sourceLabel } from "@/lib/music-link";
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
  const [crateMode, setCrateMode] = useState<"search" | "link">("search");
  const [crateService, setCrateService] = useState<
    "spotify" | "tidal" | "beatport"
  >("spotify");
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
  const [beatportUrl, setBeatportUrl] = useState("");
  const setups = useSyncExternalStore(
    subscribeSetups,
    readSetupsSnapshot,
    () => EMPTY_SETUPS,
  );
  const [setupName, setSetupName] = useState(draft.title);
  const [selectedSetup, setSelectedSetup] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [tidalConnected, setTidalConnected] = useState<boolean | null>(null);
  const [redirectUri, setRedirectUri] = useState("/api/auth/callback");
  const [isExtracting, setIsExtracting] = useState(false);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [matchingLinks, setMatchingLinks] = useState(false);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<TrackRole | "all">("all");
  const [workspaceMode, setWorkspaceMode] = useState<"auto" | "manual">(
    "manual",
  );
  const [settingsNote, setSettingsNote] = useState("Sichern · Verbinden");
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      if (data.redirectUri) setRedirectUri(data.redirectUri);
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
        if (data.redirectUri) setRedirectUri(data.redirectUri);
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
        `Set aus „${data.playlist?.name ?? "Playlist"}“: ${performanceCount} Performance-Tracks + ${safetyCount} Safety (Pool: ${data.playlist?.imported ?? "?"}).${tidalNote}`,
      );
      await refreshAuthStatus();
    } catch (err) {
      fail(
        "playlist",
        err instanceof Error ? err.message : "Extraktion fehlgeschlagen.",
        "Den Link prüfen. Im Spotify Dev Mode gehen nur eigene oder collaborative Playlists.",
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
      const parsed = parseMusicLink(trimmed);
      if (parsed?.source === "beatport") setCrateService("beatport");
      if (parsed?.source === "tidal") setCrateService("tidal");
      if (parsed?.source === "spotify") setCrateService("spotify");
      setCrateMode("link");
      setLinkUrl(trimmed);
      void importCrateLink(trimmed);
      return;
    }

    if (crateService === "beatport") {
      fail(
        "crate",
        "Beatport durchsucht SETFORM nicht.",
        "Auf Link / Playlist wechseln und einen beatport.com/track/… Link einfügen.",
      );
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
    setCrateService("tidal");
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
        setStatus(`${tracks.length} Tracks aus Tidal — einzeln oder alle in die Crate.`);
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

  async function loadBeatportIntoSet() {
    const trimmed = beatportUrl.trim();
    if (!trimmed.toLowerCase().includes("beatport.com")) {
      fail(
        "beatport",
        "Das ist kein Beatport-Track-Link.",
        "Die Adresse aus dem Browser kopieren. Sie muss beatport.com/track/ oder /release/ enthalten.",
      );
      return;
    }
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
          tracks?: SearchTrack[];
          message?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || "Beatport-Link fehlgeschlagen.");
        const incoming = data.tracks ?? [];
        if (!incoming.length) throw new Error("Keine Tracks im Beatport-Link.");
        addTracksBulk(
          incoming.map((track) => ({
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
            source: "beatport" as const,
            safetyAlt: "",
          })),
        );
        setBeatportUrl("");
        setStatus(
          data.message ||
            `${incoming.length} von Beatport in ${PHASES.find((phase) => phase.id === activePhase)?.label} gelegt.`,
        );
      } catch (err) {
        fail(
          "beatport",
          err instanceof Error ? err.message : "Beatport-Link fehlgeschlagen.",
          "Den Link im Browser öffnen. Steht der Titel in der Adresse, hier noch einmal einfügen.",
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
        "Einen Spotify-, Tidal- oder Beatport-Link ins Feld einfügen.",
      );
      return;
    }
    if (
      crateService === "beatport" ||
      trimmed.toLowerCase().includes("beatport.com")
    ) {
      setCrateService("beatport");
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
            throw new Error(data.error || "Beatport-Link fehlgeschlagen.");
          }
          const tracks = data.tracks ?? [];
          setResults(tracks);
          setCrateSource(data.label ? `Beatport: ${data.label}` : "Beatport");
          setStatus(
            data.message ||
              (tracks.length
                ? "Beatport geladen — mit + dazu ins Set."
                : "Keine Tracks im Link."),
          );
        } catch (err) {
          setResults([]);
          setCrateSource(null);
          fail(
            "crate",
            err instanceof Error ? err.message : "Beatport-Link fehlgeschlagen.",
            "Den Link im Browser öffnen. Steht der Titel in der Adresse, hier noch einmal einfügen.",
          );
        }
      });
      return;
    }

    if (crateService === "tidal" || trimmed.toLowerCase().includes("tidal.com")) {
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
          setStatus(`${(data.tracks ?? []).length} Tracks aus Tidal geladen.`);
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
            : `${tracks.length} Tracks geladen — einzeln oder alle hinzufügen.`,
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
      `+ ${mapped.length} Tracks → ${PHASES.find((p) => p.id === activePhase)?.label} / ${activeRole}`,
    );
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
    setStatus("Set-Export inkl. Cue-/Safety-Notizen kopiert.");
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
    setStatus("Brief zurückgesetzt — Crate ist leer.");
  }

  function harmonizeSet() {
    const next = reharmonizeDraft(draft);
    setDraft(next);
    setStatus("Set innerhalb der Phasen nach Camelot/BPM neu sortiert.");
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
                <option key={kind.id} value={kind.id}>
                  {kind.label} — {kind.hint}
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
          <span>Rekordbox</span>
          <em>
            {mainTracks.length
              ? `${mainTracks.filter((track) => track.keyCamelot).length}/${mainTracks.length} Keys`
              : "Erster Schritt"}
          </em>
        </summary>
        <LibraryPanel
          draft={draft}
          onMatchLinks={() => void matchStreamingLinks()}
          matchingLinks={matchingLinks}
          linkAlert={localNotice("library")}
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
            <em>Aufklappen</em>
          </summary>
          <div className="explain-body">
            <p>
              Diese Prinzipien bestimmen, wie SETFORM den Bogen legt und worauf
              du in der Timeline achten solltest.
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
          <span>Crate-Rollen</span>
          <em>{draft.tracks.length} Tracks</em>
        </summary>
      <RoleCrates
        tracks={draft.tracks}
        positions={positions}
        activeRole={activeRole}
        focusedTrackId={focusTrackId}
        onSelectRole={(role) => {
          setActiveRole(role);
          setRoleFilter(role);
        }}
        onReplace={replaceTrack}
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
      </details>

      <details className="explain-fold section-fold">
        <summary>
          <span>Harmonic Path</span>
          <em>Key-Prüfung</em>
        </summary>
        <HarmonicPath tracks={draft.tracks} onHarmonize={harmonizeSet} />
      </details>

      <PreviewPlayer
        tracks={draft.tracks}
        currentId={focusTrackId}
        onChange={(id) => setFocusTrackId(id)}
        onClose={() => setFocusTrackId(null)}
      />

      <div className="workspace-switch" role="tablist" aria-label="Workspace">
        <button
          type="button"
          role="tab"
          aria-selected={workspaceMode === "manual"}
          className={
            workspaceMode === "manual" ? "seg-item active" : "seg-item"
          }
          onClick={() => setWorkspaceMode("manual")}
          title="Tracks von Hand oder per Link sortieren, dann als PDF, M3U oder rekordbox mitnehmen."
        >
          Manual Arrange
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={workspaceMode === "auto"}
          className={workspaceMode === "auto" ? "seg-item active" : "seg-item"}
          onClick={() => setWorkspaceMode("auto")}
          title="Optional: Tracks von Spotify, Tidal oder Beatport dazunehmen, dann in der Timeline feinschleifen."
        >
          Crate + Timeline
        </button>
      </div>

      {workspaceMode === "manual" ? (
        <details className="explain-fold section-fold" open>
          <summary>
            <span>Manual Arrange</span>
            <em>{mainTracks.length} in der Performance</em>
          </summary>
        <ManualArrange
          tracks={draft.tracks}
          positions={positions}
          activePhase={activePhase}
          activeRole={activeRole}
          focusedTrackId={focusTrackId}
          onAddTracks={addTracksBulk}
          onPatch={patchTrack}
          onMove={moveTrack}
          onReorder={reorderTrack}
          onRemove={removeTrack}
          onReplace={replaceTrack}
          onMatchLinks={() => void matchStreamingLinks()}
          matchingLinks={matchingLinks}
          linkAlert={localNotice("library")}
          exportAlert={localNotice("export")}
          onFocus={(id) => setFocusTrackId(id)}
          onExportPdf={exportPdf}
          onExportM3u={exportM3u}
          onExportRekordbox={exportRekordbox}
        />
        </details>
      ) : (
      <div className="workspace crate-stack">
        <details className="explain-fold section-fold" open>
          <summary>
            <span>Crate ergänzen</span>
            <em>{PHASES.find((phase) => phase.id === activePhase)?.label}</em>
          </summary>
        <section className="panel search-panel">
          <div className="panel-head">
            <h2>Crate ergänzen</h2>
            <p>
              Neue Tracks: {PHASES.find((p) => p.id === activePhase)?.label} ·{" "}
              {TRACK_ROLES.find((role) => role.id === activeRole)?.label}
            </p>
          </div>

          <div className="seg crate-service-seg" role="tablist" aria-label="Crate-Dienst">
            <button
              type="button"
              title="Katalog durchsuchen oder einen Spotify-Link laden."
              className={
                crateService === "spotify"
                  ? "seg-item active source-spotify"
                  : "seg-item"
              }
              onClick={() => {
                setCrateService("spotify");
                setResults([]);
                setCrateSource(null);
                setHasSearched(false);
              }}
            >
              Spotify
            </button>
            <button
              type="button"
              title="Eigene Playlist wählen oder einen Tidal-Link einfügen."
              className={
                crateService === "tidal"
                  ? "seg-item active source-tidal"
                  : "seg-item"
              }
              onClick={() => {
                setCrateService("tidal");
                setResults([]);
                setCrateSource(null);
                setHasSearched(false);
              }}
            >
              Tidal
            </button>
            <button
              type="button"
              title="Track- oder Release-Link von beatport.com. Den Katalog gibt Beatport ohne Login nicht frei."
              className={
                crateService === "beatport"
                  ? "seg-item active source-beatport"
                  : "seg-item"
              }
              onClick={() => {
                setCrateService("beatport");
                setCrateMode("link");
                setResults([]);
                setCrateSource(null);
                setHasSearched(false);
              }}
            >
              Beatport
            </button>
          </div>
          <p className="crate-service-note">
            {crateService === "spotify"
              ? "Optional. Katalog durchsuchen oder einen Track-, Playlist- oder Album-Link laden."
              : crateService === "tidal"
                ? "Eigene Playlist wählen oder einen Tidal-Link einfügen."
                : "Beatport gibt den Katalog ohne Login nicht frei. Ein Track- oder Release-Link reicht, der Titel kommt aus der Adresse."}
          </p>

          {crateService === "tidal" ? (
            <div className="playlist-picker">
              <label>
                <span>Eigene Tidal-Playlists</span>
                <select
                  value=""
                  aria-label="Tidal Playlist wählen"
                  onChange={(event) => {
                    const id = event.target.value;
                    if (!id) return;
                    const picked = tidalPlaylists.find((item) => item.id === id);
                    void loadTidalCrate(id, picked?.name);
                  }}
                >
                  <option value="">
                    {tidalConnected
                      ? tidalPlaylists.length
                        ? "Playlist laden…"
                        : "Keine Playlists gefunden"
                      : "Zuerst mit Tidal verbinden"}
                  </option>
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

          {crateService === "beatport" ? null : (
          <div className="seg crate-mode-seg" role="tablist" aria-label="Crate-Quelle">
            <button
              type="button"
              role="tab"
              aria-selected={crateMode === "search"}
              className={crateMode === "search" ? "seg-item active" : "seg-item"}
              onClick={() => setCrateMode("search")}
            >
              Suche
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={crateMode === "link"}
              className={crateMode === "link" ? "seg-item active" : "seg-item"}
              onClick={() => setCrateMode("link")}
            >
              Link / Playlist
            </button>
          </div>
          )}

          {crateService !== "beatport" && crateMode === "search" ? (
            <form
              className="search-row"
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  crateService === "tidal"
                    ? "Artist, Track… oder tidal.com-Link"
                    : "Artist, Track, Genre… oder Spotify-Link"
                }
                aria-label={
                  crateService === "tidal" ? "Tidal Suche" : "Spotify Suche"
                }
              />
              <button type="submit" disabled={isPending}>
                {isPending ? "Suche…" : "Suchen"}
              </button>
            </form>
          ) : (
            <form
              className="search-row"
              onSubmit={(e) => {
                e.preventDefault();
                void importCrateLink();
              }}
            >
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder={
                  crateService === "beatport"
                    ? "beatport.com/track/… oder /release/…"
                    : crateService === "tidal"
                      ? "tidal.com/browse/playlist/… oder /track/…"
                      : "open.spotify.com/track, /playlist oder /album"
                }
                aria-label={
                  crateService === "beatport"
                    ? "Beatport Link"
                    : crateService === "tidal"
                      ? "Tidal Link"
                      : "Spotify Link"
                }
              />
              <button type="submit" disabled={isPending}>
                {isPending ? "Lade…" : "Laden"}
              </button>
            </form>
          )}
          <FieldNoticeView notice={localNotice("crate")} />

          {crateSource ? (
            <div className="crate-source-bar">
              <span>{crateSource}</span>
              {results.length > 1 ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={addAllResults}
                  disabled={results.length === 0}
                >
                  Alle + ({results.length})
                </button>
              ) : null}
            </div>
          ) : null}

          {!hasSearched ? (
            <div className="empty">
              <p>
                {crateService === "beatport"
                  ? "Link einfügen und laden. Danach den Track mit + dazu in die Phase legen."
                  : crateMode === "search"
                    ? "Suche starten. Ein Link im Feld wird direkt geladen."
                    : crateService === "tidal"
                      ? "Playlist- oder Track-Link einfügen."
                      : "Track-, Playlist- oder Album-Link. Playlists: eigene oder collaborative, im Dev Mode."}
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
                          className={`source-pill source-${track.source || crateService}`}
                        >
                          {sourceLabel(track.source || crateService)}
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
        </section>
        </details>

        <details className="explain-fold section-fold" open>
          <summary>
            <span>Set-Timeline</span>
            <em>{visibleTimeline.length} Tracks</em>
          </summary>
        <section className="panel set-panel timeline-panel">
          <div className="panel-head">
            <div>
              <h2>Set-Timeline</h2>
              <p className="timeline-filter">
                {roleFilter === "all"
                  ? "Performance-Set"
                  : TRACK_ROLES.find((role) => role.id === roleFilter)?.label}
                {" · "}
                {visibleTimeline.length} Tracks ·{" "}
                {formatDuration(
                  visibleTimeline.reduce(
                    (sum, track) => sum + track.durationMs,
                    0,
                  ),
                )}
              </p>
            </div>
            <div className="actions timeline-actions">
              <div className="seg" role="group" aria-label="Timeline-Filter">
                <button
                  type="button"
                  className={roleFilter === "all" ? "seg-item active" : "seg-item"}
                  title="Performance-Reihenfolge, ohne die Alternativen."
                  onClick={() => setRoleFilter("all")}
                >
                  Alle
                </button>
                {TRACK_ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className={
                      roleFilter === role.id ? "seg-item active" : "seg-item"
                    }
                    title={role.hint}
                    onClick={() => setRoleFilter(role.id)}
                  >
                    {role.label}
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
                extra={
                  <span className="tip">
                    <button type="button" className="btn ghost" onClick={resetSet}>
                      Reset
                    </button>
                    <span className="tip-bubble" role="tooltip">
                      Set leeren und zum leeren Brief zurück. Gespeicherte Setups bleiben.
                    </span>
                  </span>
                }
              />
            </div>
          </div>

          {visibleTimeline.length === 0 ? (
            <div className="empty">
              <p>Noch kein Set.</p>
              <p>
                Playlist extrahieren, Keys matchen, dann Timeline feinschleifen.
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
                      <span>Comment</span>
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
                        aria-label={`Transition für ${track.name}`}
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
        </section>
        </details>
      </div>
      )}

      <details className="explain-fold optional-source">
        <summary>
          <span>Spotify, Tidal, Beatport</span>
          <em>Optional</em>
        </summary>
      <section className="import-panel" aria-label="Playlist import">
        <p className="section-note">
          Nur wenn der Track noch nicht auf dem Stick liegt. Key und BPM kommen
          aus diesen Playlists meist nicht mit.
        </p>
        <div className="panel-head">
          <h2>Playlist laden</h2>
          <p>
            {spotifyConnected === null
              ? "Auth prüfen…"
              : spotifyConnected
                ? "Spotify verbunden"
                : "Spotify-Login nötig"}
          </p>
        </div>

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
        <FieldNoticeView notice={localNotice("connect")} />
        <form
          className="search-row import-row"
          onSubmit={(event) => {
            event.preventDefault();
            void loadBeatportIntoSet();
          }}
        >
          <input
            value={beatportUrl}
            onChange={(event) => setBeatportUrl(event.target.value)}
            placeholder="beatport.com/track/… oder /release/…"
            aria-label="Beatport Link"
          />
          <button type="submit" disabled={isPending || !beatportUrl.trim()}>
            {isPending ? "Lade…" : "Beatport laden"}
          </button>
        </form>
        <FieldNoticeView notice={localNotice("beatport")} />
        <p className="section-note">
          Beatport hat keinen Konto-Login. Der Link legt den Titel in die aktive
          Phase. Key und BPM stehen in der Adresse nicht.
        </p>
        {tidalConnected ? null : (
          <p className="import-hint">
            Tidal-Fehler 1002: In der Entwickler-App müssen genau diese Scopes
            an sein: <code>user.read</code> und <code>playlists.read</code>.
            Redirect-URI exakt{" "}
            <code>{redirectUri.replace("/callback", "/tidal/callback")}</code>. Danach
            speichern und den Login neu starten.
          </p>
        )}

        {spotifyConnected && myPlaylists.length > 0 ? (
          <div className="playlist-picker">
            <label>
              <span>Eigene Playlists</span>
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
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
          className="search-row import-row"
          onSubmit={(e) => {
            e.preventDefault();
            void extractFromPlaylist();
          }}
        >
          <input
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="Spotify- oder Tidal-Playlist-Link"
            aria-label="Playlist URL"
          />
          <button type="submit" disabled={isExtracting || !playlistUrl.trim()}>
            {isExtracting ? "Extrahiere…" : "Set extrahieren"}
          </button>
        </form>
        <FieldNoticeView notice={localNotice("playlist")} />

        <details className="explain-fold">
          <summary>
            <span>So funktioniert die Extraktion</span>
            <em>Aufklappen</em>
          </summary>
          <div className="explain-body">
            <p>
              SETFORM nimmt eine Playlist und legt daraus ein Set mit Dauer,
              Phasen und Übergängen. Die Playlist ist das Material, die
              Performance-Reihenfolge ist die Geschichte des Abends.
            </p>
            <ol className="explain-steps">
              {EXTRACT_STEPS.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                </li>
              ))}
            </ol>
            <p className="explain-note">
              Spotify Dev Mode: nur <strong>eigene</strong> oder collaborative
              Playlists — keine fremden/editorial Charts. Redirect URI:{" "}
              <code>{redirectUri}</code>
            </p>
          </div>
        </details>
      </section>
      </details>

    </div>
  );
}
