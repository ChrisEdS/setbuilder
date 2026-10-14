"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Hint, Tip } from "@/components/Hint";
import { SetSortMenu } from "@/components/SetTakeaway";
import {
  camelotColor,
  harmonicRelation,
  pathStats,
  relationHint,
  relationLabel,
  relationShortLabel,
} from "@/lib/harmonic";
import { useI18n } from "@/lib/i18n/react";
import { performanceTracks, type SetTrack } from "@/lib/set";
import type { SetSortTechnique } from "@/lib/sort-set";

type Props = {
  tracks: SetTrack[];
  onSort: (technique: SetSortTechnique) => void;
  onReorder: (fromId: string, toId: string) => void;
  /** Rendered inside the set workspace: no own heading. */
  embedded?: boolean;
};

/** Renders `**bold**` markers of a message as <strong>. */
function rich(text: string) {
  return text
    .split("**")
    .map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));
}

export function HarmonicPath({ tracks, onSort, onReorder, embedded }: Props) {
  const { t } = useI18n();
  const performance = performanceTracks(tracks);
  const stats = pathStats(performance);
  const coverage =
    stats.total === 0 ? 0 : Math.round((stats.keyed / stats.total) * 100);
  const scorePct = stats.avg == null ? null : Math.round(stats.avg * 100);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const canSort = performance.length >= 2;

  const sortMenu = (
    <SetSortMenu disabled={!canSort} onSort={onSort} />
  );

  return (
    <section className="harmonic-path" aria-label={t("analysis.harmonic.ariaLabel")}>
      <div className="panel-head">
        <div>
          {embedded ? (
            <h3>{t("analysis.harmonic.titleEmbedded")}</h3>
          ) : (
            <h2>{t("analysis.harmonic.title")}</h2>
          )}
          <p className="section-note">{t("analysis.harmonic.note")}</p>
        </div>
        {embedded ? null : <div className="actions">{sortMenu}</div>}
      </div>

      <div className="harm-stats">
        <div>
          <strong>{stats.total === 0 ? "—" : `${coverage}%`}</strong>
          <Hint
            className="stat-label"
            text={t("analysis.harmonic.statKeysHint")}
            mark={performance.length > 0}
          >
            {t("analysis.harmonic.statKeys")}
          </Hint>
          <div className="mini-bar" aria-hidden>
            <i style={{ width: `${coverage}%` }} />
          </div>
        </div>
        <div>
          <strong>{scorePct == null ? "—" : `${scorePct}%`}</strong>
          <Hint
            className="stat-label"
            text={t("analysis.harmonic.statScoreHint")}
            mark={performance.length > 0}
          >
            {t("analysis.harmonic.statScore")}
          </Hint>
          <div className="mini-bar" aria-hidden>
            <i
              className={
                scorePct == null
                  ? undefined
                  : scorePct >= 75
                    ? "ok"
                    : scorePct >= 50
                      ? "mid"
                      : "bad"
              }
              style={{ width: `${scorePct ?? 0}%` }}
            />
          </div>
        </div>
        <div>
          <strong>{stats.clashes}</strong>
          <Hint
            className="stat-label"
            text={t("analysis.harmonic.statClashesHint")}
            mark={performance.length > 0}
          >
            {t(
              stats.clashes === 1
                ? "analysis.harmonic.statClashes.one"
                : "analysis.harmonic.statClashes.other",
            )}
          </Hint>
        </div>
      </div>

      {performance.length >= 2 && scorePct != null ? (
        <div className={stats.clashes > 0 ? "harm-advice warn" : "harm-advice"}>
          <p>
            {stats.clashes === 1
              ? t("analysis.harmonic.advice.clashOne", { score: scorePct })
              : stats.clashes > 1
                ? t("analysis.harmonic.advice.clashes", {
                    clashes: stats.clashes,
                    score: scorePct,
                  })
                : scorePct >= 75
                  ? t("analysis.harmonic.advice.ok", { score: scorePct })
                  : t("analysis.harmonic.advice.mid", { score: scorePct })}
          </p>
          {sortMenu}
        </div>
      ) : embedded && canSort ? (
        <div className="harm-advice">{sortMenu}</div>
      ) : null}

      {performance.length === 0 ? (
        <div className="empty">
          <p>{t("analysis.harmonic.emptyTitle")}</p>
          <p>{t("analysis.harmonic.emptyHint")}</p>
        </div>
      ) : (
        <ol className="harm-steps">
          {performance.map((track, index) => {
            const relation =
              index === 0
                ? "unknown"
                : harmonicRelation(
                    performance[index - 1].keyCamelot,
                    track.keyCamelot,
                  );
            const color = camelotColor(track.keyCamelot);
            return (
              <li
                key={track.id}
                style={{ "--i": index } as CSSProperties}
                className={[
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
                  if (from) onReorder(from, track.id);
                  dragIdRef.current = null;
                  setDragId(null);
                  setOverId(null);
                }}
              >
                <div
                  className={[
                    color ? "harm-node keyed" : "harm-node",
                    index === 0 ? "is-start" : "",
                    index > 0 ? `via-${relation}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    color
                      ? {
                          background: color.bg,
                          borderColor: color.border,
                          color: color.fg,
                        }
                      : undefined
                  }
                >
                  <span
                    className={
                      index === 0
                        ? "harm-badge start"
                        : `harm-badge harm-${relation}`
                    }
                    title={
                      index === 0
                        ? t("analysis.harmonic.start")
                        : `${relationLabel(relation, t)} — ${relationHint(relation, t)}`
                    }
                  >
                    {index === 0
                      ? t("analysis.harmonic.start.short")
                      : relationShortLabel(relation, t)}
                  </span>
                  <Tip text={t("builder.row.dragTitle")}>
                    <button
                      type="button"
                      className="drag-handle"
                      draggable
                      aria-label={t("builder.row.dragAria", { name: track.name })}
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
                    </button>
                  </Tip>
                  <div className="harm-node-head">
                    <strong
                      title={
                        track.keyCamelot
                          ? t("analysis.harmonic.camelotHint", {
                              key: track.keyCamelot,
                            })
                          : t("analysis.harmonic.camelotOpenHint")
                      }
                    >
                      {color ? (
                        <i
                          className="key-dot"
                          style={{ background: color.solid }}
                        />
                      ) : null}
                      {track.keyCamelot || "—"}
                    </strong>
                    {track.energyLevel != null ? (
                      <em className="harm-energy" title={`Energy ${track.energyLevel}`}>
                        E{track.energyLevel}
                      </em>
                    ) : null}
                  </div>
                  <span title={`${track.artists.join(", ")} – ${track.name}`}>
                    <b className="harm-name">{track.name}</b>
                    {track.bpm ? <small>{track.bpm} BPM</small> : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <details className="explain-fold nested">
        <summary>
          <span>{t("analysis.harmonic.foldTitle")}</span>
          <em className="fold-toggle" />
        </summary>
        <div className="explain-body">
          <p>{rich(t("analysis.harmonic.explain1"))}</p>
          <p>{t("analysis.harmonic.explain2")}</p>
          <p>{rich(t("analysis.harmonic.explain3"))}</p>
          <div className="camelot-legend" aria-label={t("analysis.harmonic.legendLabel")}>
            {Array.from({ length: 12 }, (_, i) => {
              const n = i + 1;
              const a = camelotColor(`${n}A`)!;
              const b = camelotColor(`${n}B`)!;
              return (
                <span key={n} className="legend-pair">
                  <i style={{ background: a.solid }} title={`${n}A`} />
                  <i style={{ background: b.solid }} title={`${n}B`} />
                  <em>{n}</em>
                </span>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}
