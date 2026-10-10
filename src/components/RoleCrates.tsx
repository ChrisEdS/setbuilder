"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  camelotColor,
  phaseAccent,
  relationLabel,
  roleAccent,
  type HarmonicRelation,
} from "@/lib/harmonic";
import {
  PHASES,
  TRACK_ROLES,
  formatDuration,
  tracksByRole,
  type SetTrack,
  type TrackRole,
} from "@/lib/set";

type Props = {
  tracks: SetTrack[];
  positions: Map<string, string>;
  activeRole: TrackRole;
  focusedTrackId?: string | null;
  onSelectRole: (role: TrackRole) => void;
  onFocusTrack?: (id: string) => void;
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
  anchor: 260,
  bridge: 260,
  groove: 260,
  safety: 360,
};

const DEFAULT_OPEN: Record<TrackRole, boolean> = {
  anchor: true,
  bridge: true,
  groove: true,
  safety: true,
};

function readPrefs(): CratePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { open: { ...DEFAULT_OPEN }, heights: { ...DEFAULT_HEIGHT }, wide: "safety" };
    }
    const parsed = JSON.parse(raw) as Partial<CratePrefs>;
    const wide =
      parsed.wide === null ||
      parsed.wide === "anchor" ||
      parsed.wide === "bridge" ||
      parsed.wide === "groove" ||
      parsed.wide === "safety"
        ? parsed.wide
        : "safety";
    return {
      open: { ...DEFAULT_OPEN, ...parsed.open },
      heights: { ...DEFAULT_HEIGHT, ...parsed.heights },
      wide,
    };
  } catch {
    return { open: { ...DEFAULT_OPEN }, heights: { ...DEFAULT_HEIGHT }, wide: "safety" };
  }
}

export function RoleCrates({
  tracks,
  positions,
  activeRole,
  focusedTrackId,
  onSelectRole,
  onFocusTrack,
}: Props) {
  const [prefs, setPrefs] = useState<CratePrefs>({
    open: DEFAULT_OPEN,
    heights: DEFAULT_HEIGHT,
    wide: "safety",
  });
  const [hydrated, setHydrated] = useState(false);
  const dragRef = useRef<{
    role: TrackRole;
    startY: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    setPrefs(readPrefs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs, hydrated]);

  const setOpen = useCallback((role: TrackRole, open: boolean) => {
    setPrefs((current) => ({
      ...current,
      open: { ...current.open, [role]: open },
    }));
  }, []);

  const toggleOpen = useCallback((role: TrackRole) => {
    setPrefs((current) => ({
      ...current,
      open: { ...current.open, [role]: !current.open[role] },
    }));
  }, []);

  const setWide = useCallback((role: TrackRole | null) => {
    setPrefs((current) => ({
      ...current,
      wide: current.wide === role ? null : role,
      open:
        role == null
          ? current.open
          : { ...current.open, [role]: true },
    }));
  }, []);

  const expandAll = () =>
    setPrefs((current) => ({
      ...current,
      open: { anchor: true, bridge: true, groove: true, safety: true },
    }));

  const collapseAll = () =>
    setPrefs((current) => ({
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
      startH: prefs.heights[role],
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
    setPrefs((current) => ({
      ...current,
      heights: { ...current.heights, [drag.role]: next },
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

  return (
    <section className="role-crates" aria-label="Crate-Rollen Übersicht">
      <div className="panel-head crate-toolbar-head">
        <div>
          <h2>Crate-Rollen</h2>
          <p className="timeline-filter">
            Aufklappen, Höhe ziehen — Alternativen extra groß möglich
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
            onClick={() => setWide("safety")}
          >
            Alternativen groß
          </button>
        </div>
      </div>

      <details className="explain-fold nested">
        <summary>
          <span>Rollen kurz erklärt</span>
          <em>Aufklappen</em>
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
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  ["--crate-tint" as string]: accent.tint,
                  ["--crate-bar" as string]: accent.bar,
                  ["--crate-h" as string]: `${prefs.heights[role.id]}px`,
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
                  <strong>
                    {role.label}
                    {isSafety ? <i className="crate-alt-tag">Safety</i> : null}
                  </strong>
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
                  {roleTracks.length === 0 ? (
                    <p className="crate-empty">
                      {isSafety
                        ? "Noch keine Alternativen — bei Extraktion landen Reste hier, oder manuell als Alternativen setzen."
                        : "Noch keine Tracks"}
                    </p>
                  ) : (
                    <ul className="crate-track-list">
                      {roleTracks.map((track) => {
                        const keyColor = camelotColor(track.keyCamelot);
                        const phaseColor = phaseAccent(track.phase);
                        const focused = focusedTrackId === track.id;
                        return (
                          <li key={`${role.id}-${track.id}`}>
                            <button
                              type="button"
                              className={
                                focused
                                  ? "crate-card is-focused"
                                  : "crate-card"
                              }
                              onClick={() => onFocusTrack?.(track.id)}
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
                                    className="pill phase"
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
                                </div>
                                {track.why ? (
                                  <p className="why" title={track.why}>
                                    {track.why}
                                  </p>
                                ) : null}
                                {track.harmonicFromPrev &&
                                track.harmonicFromPrev !== "unknown" &&
                                track.role !== "safety" ? (
                                  <p
                                    className={`harm harm-${track.harmonicFromPrev as HarmonicRelation}`}
                                  >
                                    {relationLabel(track.harmonicFromPrev)}
                                  </p>
                                ) : null}
                                {track.safetyAlt ? (
                                  <p
                                    className="safety-line"
                                    title={track.safetyAlt}
                                  >
                                    Alt für: {track.safetyAlt}
                                  </p>
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
                          </li>
                        );
                      })}
                    </ul>
                  )}

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
