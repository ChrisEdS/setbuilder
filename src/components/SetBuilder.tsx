"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  ARC_GUIDE,
  DEFAULT_SET,
  PHASES,
  PREP_PRINCIPLES,
  TRACK_ROLES,
  TRANSITIONS,
  type SetDraft,
  type SetPhaseId,
  type SetTrack,
  type TrackRole,
  type TransitionVerb,
  exportSetText,
  formatDuration,
  phaseDurationMs,
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
};

const STORAGE_KEY = "setform-draft-v2";
const DRAFT_EVENT = "setform-draft";

let cachedRaw: string | null | undefined;
let cachedDraft: SetDraft = DEFAULT_SET;

function readStoredDraft(): SetDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedDraft;
    cachedRaw = raw;
    if (!raw) {
      cachedDraft = DEFAULT_SET;
      return cachedDraft;
    }
    const parsed = JSON.parse(raw) as SetDraft;
    cachedDraft = parsed?.tracks && parsed.title ? parsed : DEFAULT_SET;
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
  const [results, setResults] = useState<SearchTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [redirectUri, setRedirectUri] = useState(
    "http://127.0.0.1:4317/api/auth/callback",
  );
  const [isExtracting, setIsExtracting] = useState(false);

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
      setSpotifyConnected(Boolean(data.connected));
      if (data.redirectUri) setRedirectUri(data.redirectUri);
    } catch {
      setSpotifyConnected(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    const message = params.get("message") || "unknown";
    if (auth) window.history.replaceState({}, "", "/");

    fetch("/api/auth/status")
      .then((response) => response.json())
      .then((data: { connected?: boolean; redirectUri?: string }) => {
        setSpotifyConnected(Boolean(data.connected));
        if (data.redirectUri) setRedirectUri(data.redirectUri);
        if (auth === "ok") {
          setStatus(
            "Spotify verbunden — Playlist-URL einfügen und Set extrahieren.",
          );
        } else if (auth === "error") {
          setError(`Spotify-Login fehlgeschlagen: ${message}`);
        }
      })
      .catch(() => setSpotifyConnected(false));
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
      const response = await fetch("/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          durationMinutes: draft.durationMinutes,
          title: draft.title,
          vibe: draft.vibe,
          venue: draft.venue,
          slot: draft.slot,
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
      setStatus(
        `Set aus „${data.playlist?.name ?? "Playlist"}“: ${data.playlist?.selected ?? data.draft.tracks.length} Tracks gewählt (von ${data.playlist?.imported ?? "?"} importiert).`,
      );
      await refreshAuthStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraktion fehlgeschlagen.");
    } finally {
      setIsExtracting(false);
    }
  }

  const filledMs = totalDurationMs(draft.tracks);
  const targetMs = draft.durationMinutes * 60_000;
  const fillRatio = Math.min(filledMs / targetMs, 1);
  const activeGuide = ARC_GUIDE.find((item) => item.phase === activePhase);

  const roleCounts = useMemo(() => {
    return Object.fromEntries(
      TRACK_ROLES.map((role) => [
        role.id,
        draft.tracks.filter((track) => track.role === role.id).length,
      ]),
    ) as Record<TrackRole, number>;
  }, [draft.tracks]);

  function runSearch(nextQuery = query) {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) {
      setError("Mindestens 2 Zeichen für die Suche.");
      return;
    }

    setError(null);
    setStatus(null);
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

  async function copyExport() {
    await navigator.clipboard.writeText(exportSetText(draft));
    setStatus("Set-Export inkl. Cue-/Safety-Notizen kopiert.");
  }

  function resetSet() {
    setDraft(DEFAULT_SET);
    setStatus("Brief zurückgesetzt — Crate ist leer.");
  }

  return (
    <div className="set-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="brand">SETFORM</p>
          <h1>Playlist rein — Set raus.</h1>
          <p className="lede">
            Spotify-Playlist laden, automatisch auf Open → Lift → Rise → Peak →
            Release legen, Anchors/Bridges/Safeties markieren, dann feinschleifen.
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
            <span>Slot / Tageszeit</span>
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
              className="ghost"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                setSpotifyConnected(false);
                setStatus("Spotify getrennt.");
              }}
            >
              Trennen
            </button>
          ) : (
            <a className="button-link" href="/api/auth/login">
              Mit Spotify verbinden
            </a>
          )}
        </div>

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
            placeholder="https://open.spotify.com/playlist/…"
            aria-label="Spotify Playlist URL"
          />
          <button type="submit" disabled={isExtracting}>
            {isExtracting ? "Extrahiere…" : "Set extrahieren"}
          </button>
        </form>

        <p className="guide-line">
          Redirect URI in der Spotify App muss exakt sein:{" "}
          <code>{redirectUri}</code>
          {" · "}Playlist muss für deinen Account lesbar sein (eigene oder
          collaborative). Dauer oben steuert, wie lang das extrahierte Set wird.
        </p>
      </section>

      <section className="principles" aria-label="Advanced prep tips">
        <h2>Damit das Set sich richtig anfühlt</h2>
        <ul>
          {PREP_PRINCIPLES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="curve" aria-label="Energy curve">
        <div className="curve-head">
          <h2>Energiekurve</h2>
          <p>
            {formatDuration(filledMs)} / {draft.durationMinutes}:00 ·{" "}
            {draft.tracks.length} Tracks · Crate-Ziel 40–120
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

      <section className="roles" aria-label="Crate roles">
        <div className="panel-head">
          <h2>Crate-Rollen</h2>
          <p>Anchors · Bridges · Groove · Safety nets</p>
        </div>
        <div className="role-grid">
          {TRACK_ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              className={activeRole === role.id ? "role active" : "role"}
              onClick={() => setActiveRole(role.id)}
            >
              <strong>{role.label}</strong>
              <span>{role.hint}</span>
              <em>{roleCounts[role.id]}</em>
            </button>
          ))}
        </div>
      </section>

      <div className="workspace">
        <section className="panel search-panel">
          <div className="panel-head">
            <h2>Spotify Crate füllen</h2>
            <p>
              Aktiv: {PHASES.find((p) => p.id === activePhase)?.label} /{" "}
              {activeRole}
            </p>
          </div>
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
              placeholder="Artist, Track, Genre…"
              aria-label="Spotify Suche"
            />
            <button type="submit" disabled={isPending}>
              {isPending ? "Suche…" : "Suchen"}
            </button>
          </form>

          {error ? <p className="banner error">{error}</p> : null}
          {status ? <p className="banner status">{status}</p> : null}

          {!hasSearched ? (
            <div className="empty">
              <p>Starte mit einer Suche — z. B. „tech house“, Artist oder Track.</p>
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
                        {track.artists.join(", ")} ·{" "}
                        {formatDuration(track.durationMs)}
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

        <section className="panel set-panel">
          <div className="panel-head">
            <h2>Set-Timeline</h2>
            <div className="actions">
              <button
                type="button"
                onClick={copyExport}
                disabled={draft.tracks.length === 0}
              >
                Export kopieren
              </button>
              <button type="button" className="ghost" onClick={resetSet}>
                Reset
              </button>
            </div>
          </div>

          {draft.tracks.length === 0 ? (
            <div className="empty">
              <p>Noch kein Set.</p>
              <p>
                Oben eine Spotify-Playlist einfügen und „Set extrahieren“ —
                optional danach per Suche nachschärfen.
              </p>
            </div>
          ) : (
            <ol className="set-list">
              {draft.tracks.map((track, index) => (
                <li key={track.id}>
                  <div className="set-index">{index + 1}</div>
                  <div className="set-body">
                    <div className="set-title-row">
                      <strong>{track.name}</strong>
                      <span>{formatDuration(track.durationMs)}</span>
                    </div>
                    <p>{track.artists.join(", ")}</p>
                    <div className="set-controls">
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
                      <input
                        value={track.bpm}
                        onChange={(e) =>
                          patchTrack(track.id, { bpm: e.target.value })
                        }
                        placeholder="BPM"
                        aria-label={`BPM für ${track.name}`}
                      />
                      <input
                        value={track.keyCamelot}
                        onChange={(e) =>
                          patchTrack(track.id, { keyCamelot: e.target.value })
                        }
                        placeholder="Key z.B. 8A"
                        aria-label={`Key für ${track.name}`}
                      />
                      <input
                        value={track.note}
                        onChange={(e) =>
                          patchTrack(track.id, { note: e.target.value })
                        }
                        placeholder="In/Out · Mix-Rationale"
                        aria-label={`Cue für ${track.name}`}
                      />
                      <input
                        value={track.safetyAlt}
                        onChange={(e) =>
                          patchTrack(track.id, { safetyAlt: e.target.value })
                        }
                        placeholder="Safety alt"
                        aria-label={`Safety für ${track.name}`}
                        className="full"
                      />
                    </div>
                    <div className="set-actions">
                      <a
                        href={track.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Spotify
                      </a>
                      <button type="button" onClick={() => moveTrack(track.id, -1)}>
                        ↑
                      </button>
                      <button type="button" onClick={() => moveTrack(track.id, 1)}>
                        ↓
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeTrack(track.id)}
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
