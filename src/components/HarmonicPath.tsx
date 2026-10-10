"use client";

import {
  camelotColor,
  pathStats,
  relationLabel,
  type HarmonicRelation,
} from "@/lib/harmonic";
import { performanceTracks, type SetTrack } from "@/lib/set";

type Props = {
  tracks: SetTrack[];
  onHarmonize: () => void;
};

export function HarmonicPath({ tracks, onHarmonize }: Props) {
  const performance = performanceTracks(tracks);
  const stats = pathStats(performance);
  const coverage =
    stats.total === 0 ? 0 : Math.round((stats.keyed / stats.total) * 100);
  const scorePct = stats.avg == null ? null : Math.round(stats.avg * 100);

  return (
    <section className="harmonic-path" aria-label="Harmonic path">
      <div className="panel-head">
        <div>
          <h2>Harmonic Path</h2>
          <p className="timeline-filter">
            Camelot-Nachbarschaft entlang der Performance-Tracks
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={onHarmonize}
            disabled={performance.length < 2}
          >
            Harmonisch sortieren
          </button>
        </div>
      </div>

      <div className="harm-stats">
        <div>
          <strong>{coverage}%</strong>
          <span>Keys gesetzt</span>
          <div className="mini-bar" aria-hidden>
            <i style={{ width: `${coverage}%` }} />
          </div>
        </div>
        <div>
          <strong>{scorePct == null ? "—" : `${scorePct}%`}</strong>
          <span>Mix-Score</span>
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
          <span>Clashes</span>
        </div>
      </div>

      {performance.length === 0 ? (
        <p className="guide-line">Noch kein Set — zuerst Playlist extrahieren.</p>
      ) : (
        <ol className="harm-steps">
          {performance.map((track, index) => {
            const relation = (track.harmonicFromPrev ||
              "unknown") as HarmonicRelation;
            const color = camelotColor(track.keyCamelot);
            return (
              <li key={track.id}>
                {index > 0 ? (
                  <span className={`harm-link harm-${relation}`}>
                    {relationLabel(relation)}
                  </span>
                ) : (
                  <span className="harm-link start">Start</span>
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
                    {track.name}
                    {track.bpm ? ` · ${track.bpm}` : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <details className="explain-fold nested">
        <summary>
          <span>Camelot &amp; Mix-Score erklärt</span>
          <em>Aufklappen</em>
        </summary>
        <div className="explain-body">
          <p>
            <strong>Mix-Score</strong> misst, wie gut aufeinanderfolgende Keys
            zusammenpassen (gleiche Key, Relative, ±1 Camelot = gut). Clashes
            sind große Sprünge — oft Absicht vor einem Peak, sonst Feinschliff.
          </p>
          <p>
            Farben folgen dem Camelot Wheel (1–12). <strong>A</strong> = Moll
            (kräftiger), <strong>B</strong> = Dur (heller). Keys in der Timeline
            oder Key Library setzen, dann „Harmonisch sortieren“.
          </p>
          <div className="camelot-legend" aria-label="Camelot Farben">
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
