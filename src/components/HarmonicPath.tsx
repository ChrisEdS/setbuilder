"use client";

import {
  camelotColor,
  harmonicRelation,
  pathStats,
  relationLabel,
} from "@/lib/harmonic";
import { useI18n } from "@/lib/i18n/react";
import { performanceTracks, type SetTrack } from "@/lib/set";

type Props = {
  tracks: SetTrack[];
  onHarmonize: () => void;
  /** Rendered inside the set workspace: no own heading. */
  embedded?: boolean;
};

/** Renders `**bold**` markers of a message as <strong>. */
function rich(text: string) {
  return text
    .split("**")
    .map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));
}

export function HarmonicPath({ tracks, onHarmonize, embedded }: Props) {
  const { t } = useI18n();
  const performance = performanceTracks(tracks);
  const stats = pathStats(performance);
  const coverage =
    stats.total === 0 ? 0 : Math.round((stats.keyed / stats.total) * 100);
  const scorePct = stats.avg == null ? null : Math.round(stats.avg * 100);

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
        {embedded ? null : (
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={onHarmonize}
              disabled={performance.length < 2}
            >
              {t("analysis.harmonic.harmonize")}
            </button>
          </div>
        )}
      </div>

      <div className="harm-stats">
        <div>
          <strong>{coverage}%</strong>
          <span>{t("analysis.harmonic.statKeys")}</span>
          <div className="mini-bar" aria-hidden>
            <i style={{ width: `${coverage}%` }} />
          </div>
        </div>
        <div>
          <strong>{scorePct == null ? "—" : `${scorePct}%`}</strong>
          <span>{t("analysis.harmonic.statScore")}</span>
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
          <span>{t("analysis.harmonic.statClashes")}</span>
        </div>
      </div>

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
              <li key={track.id}>
                {index > 0 ? (
                  <span className={`harm-link harm-${relation}`}>
                    {relationLabel(relation, t)}
                  </span>
                ) : (
                  <span className="harm-link start">{t("analysis.harmonic.start")}</span>
                )}
                <div
                  className={color ? "harm-node keyed" : "harm-node"}
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
                  <strong>
                    {color ? (
                      <i
                        className="key-dot"
                        style={{ background: color.solid }}
                      />
                    ) : null}
                    {track.keyCamelot || "—"}
                  </strong>
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
