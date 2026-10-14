"use client";

import {
  useCallback,
  useMemo,
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
  relationHint,
  roleAccent,
} from "@/lib/harmonic";
import {
  localizeNote,
  localizeWhy,
  phaseLabel,
  roleHint,
  roleLabel,
  transitionHint,
  transitionLabel,
} from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { TrackArt } from "@/components/TrackArt";
import type { LibraryRow } from "@/components/LibraryPanel";
import { PHASE_ENERGY, PLAN_B_MIN, planBCount, planBState } from "@/lib/energy";
import {
  bestPhaseFor,
  planBFill,
  suggestPlanB,
  type PlanBSuggestion,
} from "@/lib/plan-b";
import { rankReplacements } from "@/lib/replace-track";
import {
  PHASES,
  TRACK_ROLES,
  artistLine,
  formatDuration,
  performanceTracks,
  tracksByRole,
  type SetPhaseId,
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
  /** Stick library, used to suggest Plan B tracks for thin phases. */
  library?: LibraryRow[];
  onAddAlternative?: (row: LibraryRow, phase: SetPhaseId) => void;
  /** Change a track's phase straight from its card. */
  onSetPhase?: (trackId: string, phase: SetPhaseId) => void;
  /** Put several library tracks in as Alternativen in one go ("Lücken füllen"). */
  onFillPlanB?: (picks: PlanBSuggestion<LibraryRow>[]) => void;
  /** Open the library section so suggestions have something to draw from. */
  onOpenLibrary?: () => void;
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
  library,
  onAddAlternative,
  onSetPhase,
  onFillPlanB,
  onOpenLibrary,
}: Props) {
  const { t } = useI18n();
  const prefs = useSyncExternalStore(subscribePrefs, readPrefs, () => DEFAULT_PREFS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropRole, setDropRole] = useState<TrackRole | null>(null);
  const draggedRef = useRef(false);
  const [flashRole, setFlashRole] = useState<TrackRole | null>(null);
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

  /** Open a column, bring it into view and flash it briefly so the jump is visible. */
  const revealRole = useCallback(
    (role: TrackRole) => {
      setOpen(role, true);
      onSelectRole(role);
      setFlashRole(role);
      window.setTimeout(() => {
        document
          .getElementById(`crate-col-${role}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }, 60);
      window.setTimeout(() => setFlashRole((current) => (current === role ? null : current)), 1800);
    },
    [onSelectRole, setOpen],
  );

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

  // With a performance track in focus, the Alternativen are ordered by how well they replace it.
  const swapRank = useMemo(() => {
    const target = tracks.find((track) => track.id === focusedTrackId);
    if (!target || target.role === "safety") return null;
    return new Map(rankReplacements(tracks, target.id, t).map((option) => [option.id, option.score]));
  }, [tracks, focusedTrackId, t]);

  const openCount = TRACK_ROLES.filter((role) => prefs.open[role.id]).length;
  // All columns share one row height so their bottoms always line up.
  const rowHeight = Math.max(
    MIN_HEIGHT,
    ...TRACK_ROLES.filter((role) => prefs.open[role.id]).map(
      (role) => prefs.heights[role.id],
    ),
  );

  return (
    <section className="role-crates" aria-label={t("crates.ariaLabel")}>
      <div className="panel-head crate-toolbar-head">
        <div>
          {embedded ? null : <h2>{t("crates.title")}</h2>}
          <p className="section-note">{t("crates.intro")}</p>
        </div>
        <div className="crate-toolbar">
          <button type="button" className="btn ghost" onClick={expandAll}>
            {t("crates.expandAll")}
          </button>
          <button type="button" className="btn ghost" onClick={collapseAll}>
            {t("crates.collapseAll")}
          </button>
          <button
            type="button"
            className={prefs.wide === "safety" ? "btn" : "btn ghost"}
            onClick={() => {
              setWide("safety");
              setOpen("safety", true);
            }}
          >
            {t("crates.wideAlternatives")}
          </button>
        </div>
      </div>

      <details className="explain-fold nested">
        <summary>
          <span>{t("crates.explain")}</span>
          <em className="fold-toggle" />
        </summary>
        <div className="explain-body">
          <ul className="role-explain">
            {TRACK_ROLES.map((role) => (
              <li key={role.id}>
                <strong>{roleLabel(t, role.id)}</strong>
                <span>{roleHint(t, role.id)}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <PlanBStrip
        tracks={tracks}
        library={library}
        onAdd={onAddAlternative}
        onFill={onFillPlanB}
        onOpenLibrary={onOpenLibrary}
        onShow={() => revealRole("safety")}
      />

      <div
        className={
          prefs.wide
            ? `crate-columns wide-${prefs.wide}`
            : "crate-columns"
        }
        data-open-count={openCount}
      >
        {TRACK_ROLES.map((role) => {
          const roleTracks =
            role.id === "safety" && swapRank
              ? [...tracksByRole(tracks, role.id)].sort(
                  (a, b) => (swapRank.get(b.id) ?? 0) - (swapRank.get(a.id) ?? 0),
                )
              : tracksByRole(tracks, role.id);
          const active = activeRole === role.id;
          const accent = roleAccent(role.id);
          const isOpen = prefs.open[role.id];
          const isWide = prefs.wide === role.id;
          const isSafety = role.id === "safety";
          const roleName = roleLabel(t, role.id);

          return (
            <div
              key={role.id}
              id={`crate-col-${role.id}`}
              className={[
                "crate-col",
                flashRole === role.id ? "is-flash" : "",
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
                  <strong>{roleName}</strong>
                  <span>{roleHint(t, role.id)}</span>
                  <em>{roleTracks.length}</em>
                </button>
                <div className="crate-col-tools">
                  <button
                    type="button"
                    className="crate-icon-btn"
                    aria-expanded={isOpen}
                    aria-label={
                      isOpen
                        ? t("crates.col.collapse", { role: roleName })
                        : t("crates.col.expand", { role: roleName })
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
                        ? t("crates.col.widthReset", { role: roleName })
                        : t("crates.col.widen", { role: roleName })
                    }
                    title={t("crates.col.widenTitle")}
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
                        ? t("crates.empty.drop")
                        : isSafety
                          ? t("crates.empty.safety")
                          : t("crates.empty.default")}
                    </p>
                  ) : (
                    <ul className="crate-track-list">
                      {roleTracks.map((track) => {
                        const keyColor = camelotColor(track.keyCamelot);
                        const phaseColor = phaseAccent(track.phase);
                        const focused = focusedTrackId === track.id;
                        return (
                          <li
                            key={`${role.id}-${track.id}`}
                            className={
                              isSafety && swapRank && (swapRank.get(track.id) ?? 0) < 0.55
                                ? "crate-item is-weak"
                                : "crate-item"
                            }
                          >
                            <button
                              type="button"
                              draggable={Boolean(onMoveRole)}
                              title={t("crates.card.dragTitle")}
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
                              <TrackArt url={track.imageUrl} size={44} />
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
                                  title={artistLine(track.artists, t)}
                                >
                                  {artistLine(track.artists, t)}
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
                                    {phaseLabel(t, track.phase)}
                                  </span>
                                  {track.durationMs > 0 ? (
                                    <span className="pill">
                                      {formatDuration(track.durationMs)}
                                    </span>
                                  ) : null}
                                  {keyColor ? (
                                    <span
                                      className="pill key"
                                      style={{
                                        background: keyColor.bg,
                                        color: keyColor.fg,
                                        borderColor: keyColor.border,
                                      }}
                                      title={t("crates.card.camelotHint", {
                                        key: track.keyCamelot,
                                      })}
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
                                      title={t("crates.card.keyUnsetTitle")}
                                    >
                                      {t("crates.card.keyUnset")}
                                    </span>
                                  )}
                                  {track.bpm ? (
                                    <span className="pill">{track.bpm}</span>
                                  ) : null}
                                  {track.energyLevel != null ? (
                                    <span
                                      className="pill"
                                      title={t("crates.card.energyTitle", {
                                        level: track.energyLevel,
                                      })}
                                    >
                                      E{track.energyLevel}
                                    </span>
                                  ) : null}
                                </div>
                                {track.why ? (
                                  <p className="why" title={localizeWhy(track.why, t)}>
                                    {localizeWhy(track.why, t)}
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
                                    {t("crates.card.altFor", {
                                      name: track.safetyAlt,
                                    })}
                                  </p>
                                ) : null}
                                {isSafety && localizeNote(track.note, t) ? (
                                  <p
                                    className="safety-line"
                                    title={localizeNote(track.note, t)}
                                  >
                                    Cue: {localizeNote(track.note, t)}
                                  </p>
                                ) : null}
                                {track.transition !== "unset" ? (
                                  <p
                                    className="transition-line"
                                    title={transitionHint(t, track.transition)}
                                  >
                                    {t("analysis.note.transition", {
                                      transition: transitionLabel(t, track.transition),
                                    })}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                            {isSafety && onReplace && focusedTrackId ? (
                              <SafetySwap
                                tracks={tracks}
                                targetId={focusedTrackId}
                                replacementId={track.id}
                                weak={(swapRank?.get(track.id) ?? 1) < 0.55}
                                onReplace={onReplace}
                              />
                            ) : null}
                            {(focused || isSafety) && (onSetPhase || onMoveRole) ? (
                              isSafety ? (
                                <SafetyTools
                                  track={track}
                                  tracks={tracks}
                                  onSetPhase={onSetPhase}
                                />
                              ) : (
                                <div className="crate-item-tools">
                                  {onSetPhase ? (
                                    <label>
                                      <span>{t("crates.card.phase")}</span>
                                      <select
                                        value={track.phase}
                                        aria-label={t("crates.card.phaseAria", {
                                          name: track.name,
                                        })}
                                        onChange={(event) =>
                                          onSetPhase(track.id, event.target.value as SetPhaseId)
                                        }
                                      >
                                        {PHASES.map((phase) => (
                                          <option key={phase.id} value={phase.id}>
                                            {phaseLabel(t, phase.id)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : null}
                                  {onMoveRole ? (
                                    <label>
                                      <span>{t("crates.card.role")}</span>
                                      <select
                                        value={track.role}
                                        aria-label={t("crates.card.roleAria", {
                                          name: track.name,
                                        })}
                                        onChange={(event) =>
                                          onMoveRole(track.id, event.target.value as TrackRole)
                                        }
                                      >
                                        {TRACK_ROLES.map((item) => (
                                          <option key={item.id} value={item.id}>
                                            {roleLabel(t, item.id)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : null}
                                </div>
                              )
                            ) : null}
                            {onRemove ? (
                              <button
                                type="button"
                                className="crate-remove"
                                aria-label={t("crates.card.removeAria", {
                                  name: track.name,
                                })}
                                title={t("crates.card.removeTitle")}
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
                    aria-label={t("crates.col.resizeAria", { role: roleName })}
                    title={t("crates.col.resizeTitle")}
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
  const { t } = useI18n();
  const performance = performanceTracks(tracks);
  const index = performance.findIndex((item) => item.id === track.id);
  const join = index > 0 ? mixJoin(performance[index - 1], track, t) : null;
  if (!join || join.relation === "unknown") return null;
  return (
    <p
      className={`harm harm-${join.relation}`}
      title={relationHint(join.relation, t)}
    >
      {join.label}
    </p>
  );
}

function SafetySwap({
  tracks,
  targetId,
  replacementId,
  weak,
  onReplace,
}: {
  tracks: SetTrack[];
  targetId: string;
  replacementId: string;
  weak?: boolean;
  onReplace: (targetId: string, replacementId: string) => void;
}) {
  const { t } = useI18n();
  const target = tracks.find((track) => track.id === targetId);
  if (!target || target.role === "safety") return null;
  const option = rankReplacements(tracks, targetId, t).find((item) => item.id === replacementId);
  if (!option) return null;
  return (
    <div className="safety-swap">
      <p title={option.detail}>{option.detail}</p>
      <button
        type="button"
        className={weak ? "btn ghost" : "btn"}
        onClick={() => onReplace(targetId, replacementId)}
      >
        {weak ? t("crates.swap.anyway") : t("crates.swap.instead")}
      </button>
    </div>
  );
}

/** One line under the picker of an Alternative: does it count as Plan B, and if not, why. */
function SafetyTools({
  track,
  tracks,
  onSetPhase,
}: {
  track: SetTrack;
  tracks: SetTrack[];
  onSetPhase?: (trackId: string, phase: SetPhaseId) => void;
}) {
  const { t } = useI18n();
  const state = planBState(track);
  const band = PHASE_ENERGY[track.phase];
  const better = state === "below" || state === "above" ? bestPhaseFor(track, tracks) : null;
  const label = phaseLabel(t, track.phase);
  return (
    <div className="crate-item-tools is-safety">
      {onSetPhase ? (
        <label>
          <span>{t("crates.safety.replacesFor")}</span>
          <select
            value={track.phase}
            aria-label={t("crates.safety.replacesAria", { name: track.name })}
            onChange={(event) => onSetPhase(track.id, event.target.value as SetPhaseId)}
          >
            {PHASES.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phaseLabel(t, phase.id)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className={`crate-planb-note ${state === "fit" ? "ok" : state === "unknown" ? "" : "thin"}`}>
        {state === "fit"
          ? t("crates.safety.fit", { phase: label, level: track.energyLevel ?? "" })
          : state === "unknown"
            ? t("crates.safety.unknown", { phase: label })
            : t(state === "below" ? "crates.safety.below" : "crates.safety.above", {
                level: track.energyLevel ?? "",
                phase: label,
                min: band.min,
                max: band.max,
              })}
      </p>
      {better && better !== track.phase && onSetPhase ? (
        <button type="button" className="btn ghost" onClick={() => onSetPhase(track.id, better)}>
          {t("crates.safety.setPhase", { phase: phaseLabel(t, better) })}
        </button>
      ) : null}
    </div>
  );
}

/** Plan B per phase: at least two Alternativen that fit, so a failed blend never stalls the floor. */
function PlanBStrip({
  tracks,
  library,
  onAdd,
  onFill,
  onOpenLibrary,
  onShow,
}: {
  tracks: SetTrack[];
  library?: LibraryRow[];
  onAdd?: (row: LibraryRow, phase: SetPhaseId) => void;
  onFill?: (picks: PlanBSuggestion<LibraryRow>[]) => void;
  onOpenLibrary?: () => void;
  onShow: () => void;
}) {
  const { t } = useI18n();
  // null: follow the first thin phase; "closed": the user collapsed the suggestions.
  const [chosen, setChosen] = useState<SetPhaseId | "closed" | null>(null);
  const performance = performanceTracks(tracks);
  const phases = PHASES.filter((phase) => performance.some((track) => track.phase === phase.id));
  const thin = phases.filter((phase) => planBCount(tracks, phase.id) < PLAN_B_MIN);
  const hasLibrary = Boolean(library?.length);
  const fill = hasLibrary && library ? planBFill(library, tracks) : [];
  const activeId = chosen === "closed" ? null : (chosen ?? thin[0]?.id ?? null);
  const activePhase = phases.find((phase) => phase.id === activeId) ?? null;
  const missing = activePhase ? PLAN_B_MIN - planBCount(tracks, activePhase.id) : 0;
  const items =
    activeId && hasLibrary && library ? suggestPlanB(library, tracks, activeId, 3) : [];
  if (!phases.length) return null;
  return (
    <div className="planb-strip" role="group" aria-label={t("crates.planB.ariaLabel")}>
      <span className="planb-label">Plan B</span>
      <ul>
        {phases.map((phase) => {
          const count = planBCount(tracks, phase.id);
          const ok = count >= PLAN_B_MIN;
          const selected = activeId === phase.id;
          return (
            <li key={phase.id}>
              <button
                type="button"
                className={`planb-chip ${ok ? "ok" : "thin"}${selected ? " selected" : ""}`}
                aria-pressed={selected}
                title={ok ? t("crates.planB.chipCovered") : t("crates.planB.chipGap")}
                onClick={() => setChosen(selected ? "closed" : phase.id)}
              >
                <span>{phaseLabel(t, phase.id)}</span>
                <strong>
                  {Math.min(count, 9)}/{PLAN_B_MIN}
                </strong>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="planb-actions">
        {thin.length && hasLibrary && onFill ? (
          <button
            type="button"
            className="btn"
            disabled={!fill.length}
            title={fill.length ? t("crates.planB.fillTitle") : t("crates.planB.fillNone")}
            onClick={() => onFill(fill)}
          >
            {fill.length ? t("crates.planB.fillCount", { count: fill.length }) : t("crates.planB.fill")}
          </button>
        ) : null}
        {thin.length && !hasLibrary && onOpenLibrary ? (
          <button type="button" className="btn" onClick={onOpenLibrary}>
            {t("crates.planB.loadLibrary")}
          </button>
        ) : null}
        <button type="button" className="btn ghost" onClick={onShow}>
          {t("crates.planB.show")}
        </button>
      </div>

      {!thin.length ? (
        <p className="planb-hint">{t("crates.planB.allCovered", { min: PLAN_B_MIN })}</p>
      ) : null}

      {thin.length && !hasLibrary ? (
        <p className="planb-hint">
          {t("crates.planB.noLibrary")}
        </p>
      ) : null}

      {activePhase && hasLibrary ? (
        <div className="planb-suggest">
          <h4>
            {phaseLabel(t, activePhase.id)}
            <span>
              {" "}
              {missing > 0
                ? t("crates.planB.suggestMissing", {
                    missing,
                    min: PHASE_ENERGY[activePhase.id].min,
                    max: PHASE_ENERGY[activePhase.id].max,
                  })
                : t("crates.planB.suggestCovered", {
                    min: PHASE_ENERGY[activePhase.id].min,
                    max: PHASE_ENERGY[activePhase.id].max,
                  })}
            </span>
          </h4>
          {items.length === 0 ? (
            <p className="planb-hint">{t("crates.planB.noMatches")}</p>
          ) : (
            <ul>
              {items.map(({ row, keyCamelot, energy }) => (
                <li key={`${row.artist}-${row.title}`}>
                  <div>
                    <strong title={row.title}>{row.title}</strong>
                    <span title={row.artist}>{row.artist}</span>
                  </div>
                  <em>
                    {keyCamelot} · {row.bpm || t("analysis.bpm.open")}
                    {energy != null ? ` · E${energy}` : ""}
                  </em>
                  {onAdd ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => onAdd(row, activePhase.id)}
                      aria-label={t("crates.planB.addAria", {
                        title: row.title,
                        phase: phaseLabel(t, activePhase.id),
                      })}
                    >
                      {t("crates.planB.add")}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
