"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { HarmonicPath } from "@/components/HarmonicPath";
import { LibraryPanel } from "@/components/LibraryPanel";
import { ManualArrange } from "@/components/ManualArrange";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import { RoleCrates } from "@/components/RoleCrates";
import { openSetPdfExport } from "@/lib/export-pdf";
import { CAMELOT_CODES } from "@/lib/harmonic";
import { reharmonizeDraft } from "@/lib/extract-set";
import { looksLikeSpotifyLink } from "@/lib/spotify-link";
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
  setPositionById,
  totalDurationMs,
} from "@/lib/set";

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

function persistDraft(draft: SetDraft) {
  const raw = JSON.stringify(draft);
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedDraft = draft;
  window.dispatchEvent(new Event(DRAFT_EVENT));
}

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
  const [crateService, setCrateService] = useState<"spotify" | "tidal">("spotify");
  const [tidalPlaylists, setTidalPlaylists] = useState<
    Array<{ id: string; name: string; trackCount: number | null }>
  >([]);
  const [crateSource, setCrateSource] = useState<string | null>(null);
  const [results, setResults] = useState<SearchTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [tidalConnected, setTidalConnected] = useState<boolean | null>(null);
  const [redirectUri, setRedirectUri] = useState(
    "http://127.0.0.1:4317/api/auth/callback",
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<TrackRole | "all">("all");
  const [workspaceMode, setWorkspaceMode] = useState<"auto" | "manual">(
    "manual",
  );
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
          setError(`Spotify-Login fehlgeschlagen: ${message}`);
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
      setError("Bitte eine Spotify-Playlist-URL einfügen.");
      return;
    }

    setError(null);
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
        setError(
          "Spotify-Login nötig, um Playlist-Tracks zu lesen. Zuerst verbinden, dann erneut extrahieren.",
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
      setError(err instanceof Error ? err.message : "Extraktion fehlgeschlagen.");
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
  const fillRatio = Math.min(filledMs / targetMs, 1);
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
      setError("Mindestens 2 Zeichen für die Suche.");
      return;
    }

    if (looksLikeSpotifyLink(trimmed)) {
      setCrateMode("link");
      setLinkUrl(trimmed);
      void importCrateLink(trimmed);
      return;
    }

    setError(null);
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
        setError(err instanceof Error ? err.message : "Suche fehlgeschlagen.");
      }
    });
  }

  async function loadTidalCrate(playlistId: string, label?: string) {
    if (!playlistId) return;
    setError(null);
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
        setError(err instanceof Error ? err.message : "Tidal-Playlist fehlgeschlagen.");
      }
    });
  }

  async function importCrateLink(rawUrl = linkUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setError("Playlist- oder Track-Link einfügen.");
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
          setError(err instanceof Error ? err.message : "Tidal-Link fehlgeschlagen.");
        }
      });
      return;
    }

    setError(null);
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
        setError(
          err instanceof Error ? err.message : "Link konnte nicht geladen werden.",
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
      setStatus("PDF-Ansicht geöffnet — im Dialog „Als PDF speichern“ wählen.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF-Export fehlgeschlagen.");
    }
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

  return (
    <div className="set-shell">
      {authNote ? <p className="banner status">{authNote}</p> : null}
      <header className="hero">
        <div className="hero-copy">
          <p className="brand">SETFORM</p>
          <h1>Dramaturgie statt Playlist.</h1>
          <p className="lede">
            Spotify-Crate laden, Arc nach Slot formen, Keys aus rekordbox
            matchen — Spannung in Wellen, Peak bewusst spät.
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

      <section className="import-panel" aria-label="Playlist import">
        <div className="panel-head">
          <h2>Playlist → Set extrahieren</h2>
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
        {tidalConnected ? null : (
          <p className="import-hint">
            Tidal-Fehler 1002: In der Entwickler-App müssen genau diese Scopes
            an sein: <code>user.read</code> und <code>playlists.read</code>.
            Redirect-URI exakt{" "}
            <code>http://127.0.0.1:4317/api/auth/tidal/callback</code>. Danach
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
                  setError(null);
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

        {error ? <p className="banner error">{error}</p> : null}
        {status ? <p className="banner status">{status}</p> : null}

        <details className="explain-fold">
          <summary>
            <span>So funktioniert die Extraktion</span>
            <em>Aufklappen</em>
          </summary>
          <div className="explain-body">
            <p>
              SETFORM baut aus deiner Spotify-Playlist kein zufälliges Mix — es
              formt eine <strong>Dramaturgie</strong> nach Brief-Dauer und Slot.
              Die Playlist-Reihenfolge bleibt die Crate-Priorität.
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

      <details className="explain-fold principles" aria-label="Dramaturgie-Prinzipien">
        <summary>
          <span>Dramaturgie-Prinzipien</span>
          <em>Aufklappen</em>
        </summary>
        <div className="explain-body">
          <p>
            Diese Regeln steuern, wie SETFORM die Energiekurve denkt — und worauf
            du beim Feinschliff in der Timeline achten solltest.
          </p>
          <ul>
            {PREP_PRINCIPLES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </details>

      <section className="curve" aria-label="Energy curve">
        <div className="curve-head">
          <h2>Energiekurve</h2>
          <p>
            {formatDuration(filledMs)} / {draft.durationMinutes}:00 ·{" "}
            {mainTracks.length} Performance ·{" "}
            {draft.tracks.filter((track) => track.role === "safety").length}{" "}
            Safety
          </p>
        </div>
        <div
          className="curve-bar"
          role="progressbar"
          aria-valuenow={Math.round(fillRatio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${Math.max(fillRatio * 100, 3)}%` }} />
        </div>
        <div className="phase-grid">
          {PHASES.map((phase) => {
            const actual = phaseDurationMs(draft.tracks, phase.id);
            const target = targetMs * phase.share;
            return (
              <button
                key={phase.id}
                type="button"
                className={activePhase === phase.id ? "phase active" : "phase"}
                onClick={() => setActivePhase(phase.id)}
              >
                <strong>{phase.label}</strong>
                <span>{phase.hint}</span>
                <em>
                  {formatDuration(actual)} / ~{Math.round(target / 60000)} min
                </em>
              </button>
            );
          })}
        </div>
        {activeGuide ? (
          <p className="guide-line">
            <strong>{activeGuide.window}</strong> — {activeGuide.focus}
          </p>
        ) : null}
      </section>

      <RoleCrates
        tracks={draft.tracks}
        positions={positions}
        activeRole={activeRole}
        focusedTrackId={focusTrackId}
        onSelectRole={(role) => {
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

      <LibraryPanel
        draft={draft}
        onApply={(next, message) => {
          setDraft(next);
          setError(null);
          setStatus(message);
        }}
      />

      <HarmonicPath tracks={draft.tracks} onHarmonize={harmonizeSet} />

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
        >
          Manual Arrange
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={workspaceMode === "auto"}
          className={workspaceMode === "auto" ? "seg-item active" : "seg-item"}
          onClick={() => setWorkspaceMode("auto")}
        >
          Crate + Timeline
        </button>
      </div>

      {workspaceMode === "manual" ? (
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
          onFocus={(id) => setFocusTrackId(id)}
          onExportPdf={exportPdf}
        />
      ) : (
      <div className="workspace crate-stack">
        <section className="panel search-panel">
          <div className="panel-head">
            <h2>
              Crate füllen · {crateService === "tidal" ? "Tidal" : "Spotify"}
            </h2>
            <p>
              Aktiv: {PHASES.find((p) => p.id === activePhase)?.label} /{" "}
              {activeRole}
            </p>
          </div>

          <div className="seg crate-service-seg" role="tablist" aria-label="Crate-Dienst">
            <button
              type="button"
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
          </div>

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

          {crateMode === "search" ? (
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
                placeholder="Artist, Track, Genre… oder Spotify-Link"
                aria-label="Spotify Suche"
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
                placeholder="open.spotify.com/track|playlist|album/… "
                aria-label="Spotify Link"
              />
              <button type="submit" disabled={isPending}>
                {isPending ? "Lade…" : "Laden"}
              </button>
            </form>
          )}

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
                {crateMode === "search"
                  ? "Suche starten — oder Spotify-Link einfügen."
                  : "Track-, Playlist- oder Album-Link laden. Playlists: eigene/collaborative in Dev Mode."}
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
                          {track.source === "tidal" || crateService === "tidal"
                            ? "Tidal"
                            : "Spotify"}
                        </em>
                        {track.artists.join(", ")}
                        {track.durationMs
                          ? ` · ${formatDuration(track.durationMs)}`
                          : ""}
                      </span>
                    </div>
                  </div>
                  <button type="button" onClick={() => addTrack(track)}>
                    + Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

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
                    onClick={() => setRoleFilter(role.id)}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn"
                onClick={exportPdf}
                disabled={mainTracks.length === 0}
              >
                PDF
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={copyExport}
                disabled={draft.tracks.length === 0}
              >
                Text
              </button>
              <button type="button" className="btn ghost" onClick={resetSet}>
                Reset
              </button>
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
                        <button
                          type="button"
                          className="danger"
                          onClick={() => removeTrack(track.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
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
                            note: e.target.value,
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
                      <a
                        className="timeline-link"
                        href={track.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Öffnen
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
