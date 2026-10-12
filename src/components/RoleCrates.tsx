"use client";

import {
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  camelotColor,
  mixJoin,
  phaseAccent,
  roleAccent,
} from "@/lib/harmonic";
import { rankReplacements } from "@/lib/replace-track";
import {
  PHASES,
  TRACK_ROLES,
  formatDuration,
  performanceTracks,
  tracksByRole,
  type SetTrack,
  type TrackRole,
} from "@/lib/set";

type Props = {
  /** Rendered inside the Crate workspace: no own heading. */
  embedded?: boolean;
  tracks: SetTrack[];
  positions: Map<string, string>;
  activeRole: TrackRole;
  focusedTrackId?: string | null;
  onSelectRole: (role: TrackRole) => void;
  onFocusTrack?: (id: string) => void;
  onMoveRole?: (trackId: string, role: TrackRole) => void;
  onReplace?: (targetId: string, replacementId: string) => void;
  onRemove?: (id: string) => void;
};

type CratePrefs = {
  open: Record<TrackRole, boolean>;
  heights: Record<TrackRole, number>;
  wide: TrackRole | null;
};

const STORAGE_KEY = "setform-crate-prefs-v1";
const MIN_HEIGHT = 140;
const MAX_HEIGHT = 720;
const DEFAULT_HEIGHT: Record<TrackRole, number> = {
  anchor: 280,
  bridge: 280,
  groove: 280,
  safety: 280,
};

const DEFAULT_OPEN: Record<TrackRole, boolean> = {
  anchor: true,
  bridge: true,
  groove: true,
  safety: true,
};

const DEFAULT_PREFS: CratePrefs = {
  open: DEFAULT_OPEN,
  heights: DEFAULT_HEIGHT,
  wide: null,
};

let cachedRaw: string | null | undefined;
let cachedPrefs: CratePrefs = DEFAULT_PREFS;
const listeners = new Set<() => void>();

function parsePrefs(raw: string | null): CratePrefs {
  if (!raw) {
    return {
      open: { ...DEFAULT_OPEN },
      heights: { ...DEFAULT_HEIGHT },
      wide: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CratePrefs>;
    const wide =
      parsed.wide === null ||
      parsed.wide === "anchor" ||
      parsed.wide === "bridge" ||
      parsed.wide === "groove" ||
      parsed.wide === "safety"
        ? parsed.wide
        : null;
    return {
      open: { ...DEFAULT_OPEN, ...parsed.open },
      heights: { ...DEFAULT_HEIGHT, ...parsed.heights },
      wide,
    };
  } catch {
    return {
      open: { ...DEFAULT_OPEN },
      heights: { ...DEFAULT_HEIGHT },
      wide: null,
    };
  }
}

function readPrefs(): CratePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedPrefs;
    cachedRaw = raw;
    cachedPrefs = parsePrefs(raw);
    return cachedPrefs;
  } catch {
    return cachedPrefs;
  }
}

function writePrefs(next: CratePrefs) {
  cachedPrefs = next;
  cachedRaw = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // ignore quota
  }
  listeners.forEach((listener) => listener());
}

function subscribePrefs(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function updatePrefs(updater: (current: CratePrefs) => CratePrefs) {
  writePrefs(updater(readPrefs()));
}

export function RoleCrates({
  embedded,
  tracks,
  positions,
  activeRole,
  focusedTrackId,
  onSelectRole,
  onFocusTrack,
  onMoveRole,
  onReplace,
  onRemove,
}: Props) {
  const prefs = useSyncExternalStore(subscribePrefs, readPrefs, () => DEFAULT_PREFS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropRole, setDropRole] = useState<TrackRole | null>(null);
  const draggedRef = useRef(false);
  const dragRef = useRef<{
    role: TrackRole;
    startY: number;
    startH: number;
  } | null>(null);

  const setOpen = useCallback((role: TrackRole, open: boolean) => {
    updatePrefs((current) => ({
      ...current,
      open: { ...current.open, [role]: open },
    }));
  }, []);

  const toggleOpen = useCallback((role: TrackRole) => {
    updatePrefs((current) => ({
      ...current,
      open: { ...current.open, [role]: !current.open[role] },
    }));
  }, []);

  const setWide = useCallback((role: TrackRole | null) => {
    updatePrefs((current) => ({
      ...current,
      wide: current.wide === role ? null : role,
      open:
        role == null
          ? current.open
          : { ...current.open, [role]: true },
    }));
  }, []);

  const expandAll = () =>
    updatePrefs((current) => ({
      ...current,
      open: { anchor: true, bridge: true, groove: true, safety: true },
    }));

  const collapseAll = () =>
    updatePrefs((current) => ({
      ...current,
      open: { anchor: false, bridge: false, groove: false, safety: false },
      wide: null,
    }));

  function onResizePointerDown(
    role: TrackRole,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      role,
      startY: event.clientY,
      startH: Math.max(
        MIN_HEIGHT,
        ...TRACK_ROLES.filter((item) => prefs.open[item.id]).map(
          (item) => prefs.heights[item.id],
        ),
      ),
    };
    setOpen(role, true);
  }

  function onResizePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = event.clientY - drag.startY;
    const next = Math.min(
      MAX_HEIGHT,
      Math.max(MIN_HEIGHT, drag.startH + delta),
    );
    updatePrefs((current) => ({
      ...current,
      heights: Object.fromEntries(
        TRACK_ROLES.map((role) => [role.id, next]),
      ) as Record<TrackRole, number>,
    }));
  }

  function onResizePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // already released
      }
    }
    dragRef.current = null;
  }

  const openCount = TRACK_ROLES.filter((role) => prefs.open[role.id]).length;
  // All columns share one row height so their bottoms always line up.
  const rowHeight = Math.max(
    MIN_HEIGHT,
    ...TRACK_ROLES.filter((role) => prefs.open[role.id]).map(
      (role) => prefs.heights[role.id],
    ),
  );

  return (
    <section className="role-crates" aria-label="Crate-Rollen Übersicht">
      <div className="panel-head crate-toolbar-head">
        <div>
          {embedded ? null : <h2>Crate-Rollen</h2>}
          <p className="section-note">
            Titel in eine andere Rolle ziehen. Die Höhe aller Spalten lässt
            sich am unteren Rand ändern, „Alternativen groß“ verbreitert die
            Alternativen.
          </p>
        </div>
        <div className="crate-toolbar">
          <button type="button" className="btn ghost" onClick={expandAll}>
            Alle auf
          </button>
          <button type="button" className="btn ghost" onClick={collapseAll}>
            Alle zu
          </button>
          <button
            type="button"
            className={prefs.wide === "safety" ? "btn" : "btn ghost"}
            onClick={() => {
              setWide("safety");
              setOpen("safety", true);
            }}
          >
            Alternativen groß
          </button>
        </div>
      </div>

      <details className="explain-fold nested">
        <summary>
          <span>Rollen kurz erklärt</span>
          <em className="fold-toggle" />
        </summary>
        <div className="explain-body">
          <ul className="role-explain">
            {TRACK_ROLES.map((role) => (
              <li key={role.id}>
                <strong>{role.label}</strong>
                <span>{role.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <div
        className={
          prefs.wide
            ? `crate-columns wide-${prefs.wide}`
            : "crate-columns"
        }
        data-open-count={openCount}
      >
        {TRACK_ROLES.map((role) => {
          const roleTracks = tracksByRole(tracks, role.id);
          const active = activeRole === role.id;
          const accent = roleAccent(role.id);
          const isOpen = prefs.open[role.id];
          const isWide = prefs.wide === role.id;
          const isSafety = role.id === "safety";

          return (
            <div
              key={role.id}
              className={[
                "crate-col",
                active ? "active" : "",
                isOpen ? "is-open" : "is-collapsed",
                isWide ? "is-wide" : "",
                isSafety ? "is-safety" : "",
                dropRole === role.id ? "is-drop" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                if (!onMoveRole || !draggingId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dropRole !== role.id) setDropRole(role.id);
              }}
              onDragLeave={(event) => {
                const next = event.relatedTarget;
                if (next instanceof Node && event.currentTarget.contains(next)) return;
                setDropRole((current) => (current === role.id ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                setDropRole(null);
                setDraggingId(null);
                if (!onMoveRole || !id) return;
                const moving = tracks.find((item) => item.id === id);
                if (!moving || moving.role === role.id) return;
                if (!isOpen) setOpen(role.id, true);
                onMoveRole(id, role.id);
              }}
              style={
                {
                  ["--crate-tint" as string]: accent.tint,
                  ["--crate-bar" as string]: accent.bar,
                  ["--crate-h" as string]: `${rowHeight}px`,
                } as CSSProperties
              }
            >
              <div className="crate-col-head-row">
                <button
                  type="button"
                  className="crate-col-head"
                  onClick={() => {
                    onSelectRole(role.id);
                    if (!isOpen) setOpen(role.id, true);
                  }}
                >
                  <span className="crate-bar" aria-hidden />
                  <strong>{role.label}</strong>
                  <span>{role.hint}</span>
                  <em>{roleTracks.length}</em>
                </button>
                <div className="crate-col-tools">
                  <button
                    type="button"
                    className="crate-icon-btn"
                    aria-expanded={isOpen}
                    aria-label={
                      isOpen
                        ? `${role.label} zuklappen`
                        : `${role.label} aufklappen`
                    }
                    onClick={() => toggleOpen(role.id)}
                  >
                    {isOpen ? "–" : "+"}
                  </button>
                  <button
                    type="button"
                    className={
                      isWide ? "crate-icon-btn active" : "crate-icon-btn"
                    }
                    aria-pressed={isWide}
                    aria-label={
                      isWide
                        ? `${role.label} Breite zurücksetzen`
                        : `${role.label} verbreitern`
                    }
                    title="Breiter anzeigen"
                    onClick={() => setWide(role.id)}
                  >
                    ⤢
                  </button>
                </div>
              </div>

              {isOpen ? (
                <>
                  <div className="crate-col-body">
                  {roleTracks.length === 0 ? (
                    <p className="crate-empty">
                      {dropRole === role.id
                        ? "Hier ablegen"
                        : isSafety
                          ? "Noch keine Alternativen. Beim Extrahieren landen übrige Tracks hier, oder du setzt Tracks selbst auf die Rolle Alternativen."
                          : "Noch keine Tracks"}
                    </p>
                  ) : (
                    <ul className="crate-track-list">
                      {roleTracks.map((track) => {
                        const keyColor = camelotColor(track.keyCamelot);
                        const phaseColor = phaseAccent(track.phase);
                        const focused = focusedTrackId === track.id;
                        return (
                          <li key={`${role.id}-${track.id}`} className="crate-item">
                            <button
                              type="button"
                              draggable={Boolean(onMoveRole)}
                              title="In eine andere Rolle ziehen"
                              className={[
                                "crate-card",
                                focused ? "is-focused" : "",
                                draggingId === track.id ? "is-dragging" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onDragStart={(event) => {
                                draggedRef.current = true;
                                event.dataTransfer.setData("text/plain", track.id);
                                event.dataTransfer.effectAllowed = "move";
                                setDraggingId(track.id);
                              }}
                              onDragEnd={() => {
                                setDraggingId(null);
                                setDropRole(null);
                                window.setTimeout(() => {
                                  draggedRef.current = false;
                                }, 0);
                              }}
                              onClick={() => {
                                if (draggedRef.current) return;
                                onFocusTrack?.(track.id);
                              }}
                            >
                              {track.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={track.imageUrl}
                                  alt=""
                                  width={44}
                                  height={44}
                                />
                              ) : (
                                <div className="art-fallback sm" />
                              )}
                              <div className="crate-card-body">
                                <div className="crate-title-row">
                                  <em className="crate-set-num">
                                    {positions.get(track.id) ?? "—"}
                                  </em>
                                  <strong title={track.name}>
                                    {track.name}
                                  </strong>
                                </div>
                                <span
                                  className="artists"
                                  title={track.artists.join(", ")}
                                >
                                  {track.artists.join(", ")}
                                </span>
                                <div className="crate-meta">
                                  <span
                                    className="pill phase-pill"
                                    style={{
                                      background: phaseColor.bg,
                                      color: phaseColor.fg,
                                      borderColor: "transparent",
                                    }}
                                  >
                                    {
                                      PHASES.find((p) => p.id === track.phase)
                                        ?.label
                                    }
                                  </span>
                                  <span className="pill">
                                    {formatDuration(track.durationMs)}
                                  </span>
                                  {keyColor ? (
                                    <span
                                      className="pill key"
                                      style={{
                                        background: keyColor.bg,
                                        color: keyColor.fg,
                                        borderColor: keyColor.border,
                                      }}
                                      title={`Camelot ${track.keyCamelot}`}
                                    >
                                      <i
                                        className="key-dot"
                                        style={{
                                          background: keyColor.solid,
                                        }}
                                      />
                                      {track.keyCamelot}
                                    </span>
                                  ) : (
                                    <span
                                      className="pill muted"
                                      title="Key noch setzen"
                                    >
                                      Key offen
                                    </span>
                                  )}
                                  {track.bpm ? (
                                    <span className="pill">{track.bpm}</span>
                                  ) : null}
                                  {track.energyLevel != null ? (
                                    <span
                                      className="pill"
                                      title={`Energy Level ${track.energyLevel} von 10`}
                                    >
                                      E{track.energyLevel}
                                    </span>
                                  ) : null}
                                </div>
                                {track.why ? (
                                  <p className="why" title={track.why}>
                                    {track.why}
                                  </p>
                                ) : null}
                                {track.role !== "safety" ? (
                                  <SetJoin tracks={tracks} track={track} />
                                ) : null}
                                {track.safetyAlt ? (
                                  <p
                                    className="safety-line"
                                    title={track.safetyAlt}
                                  >
                                    Alt für: {track.safetyAlt}
                                  </p>
                                ) : null}
                                {isSafety && onReplace && focusedTrackId ? (
                                  <SafetySwap
                                    tracks={tracks}
                                    targetId={focusedTrackId}
                                    replacementId={track.id}
                                    onReplace={onReplace}
                                  />
                                ) : null}
                                {isSafety && track.note ? (
                                  <p className="safety-line" title={track.note}>
                                    Cue: {track.note}
                                  </p>
                                ) : null}
                                {track.transition !== "unset" ? (
                                  <p className="transition-line">
                                    → {track.transition}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                            {onRemove ? (
                              <button
                                type="button"
                                className="crate-remove"
                                aria-label={`${track.name} aus dem Set entfernen`}
                                title="Aus dem Set entfernen"
                                onClick={() => onRemove(track.id)}
                              >
                                ✕
                              </button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  </div>

                  <button
                    type="button"
                    className="crate-resize"
                    aria-label={`${role.label}-Höhe ziehen`}
                    title="Höhe ziehen"
                    onPointerDown={(event) =>
                      onResizePointerDown(role.id, event)
                    }
                    onPointerMove={onResizePointerMove}
                    onPointerUp={onResizePointerUp}
                    onPointerCancel={onResizePointerUp}
                  >
                    <span />
                  </button>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SetJoin({ tracks, track }: { tracks: SetTrack[]; track: SetTrack }) {
  const performance = performanceTracks(tracks);
  const index = performance.findIndex((item) => item.id === track.id);
  const join = index > 0 ? mixJoin(performance[index - 1], track) : null;
  if (!join || join.relation === "unknown") return null;
  return <p className={`harm harm-${join.relation}`}>{join.label}</p>;
}

function SafetySwap({
  tracks,
  targetId,
  replacementId,
  onReplace,
}: {
  tracks: SetTrack[];
  targetId: string;
  replacementId: string;
  onReplace: (targetId: string, replacementId: string) => void;
}) {
  const target = tracks.find((track) => track.id === targetId);
  if (!target || target.role === "safety") return null;
  const option = rankReplacements(tracks, targetId).find((item) => item.id === replacementId);
  if (!option) return null;
  return (
    <div className="safety-swap">
      <p title={option.detail}>{option.detail}</p>
      <button type="button" className="btn" onClick={() => onReplace(targetId, replacementId)}>
        Statt Fokus einsetzen
      </button>
    </div>
  );
}
