"use client";

import {
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

  return (
    <section className="harmonic-path" aria-label="Harmonic path">
      <div className="panel-head">
        <h2>Harmonic Path</h2>
        <div className="actions">
          <button type="button" onClick={onHarmonize} disabled={performance.length < 2}>
            Harmonisch sortieren
          </button>
        </div>
      </div>

      <div className="harm-stats">
        <div>
          <strong>{coverage}%</strong>
          <span>Keys gesetzt</span>
        </div>
        <div>
          <strong>{stats.avg == null ? "—" : `${Math.round(stats.avg * 100)}%`}</strong>
          <span>Mix-Score</span>
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
            return (
              <li key={track.id}>
                {index > 0 ? (
                  <span className={`harm-link harm-${relation}`}>
                    {relationLabel(relation)}
                  </span>
                ) : (
                  <span className="harm-link start">Start</span>
                )}
                <div className="harm-node">
                  <strong>{track.keyCamelot || "—"}</strong>
                  <span>
                    {track.name}
                    {track.bpm ? ` · ${track.bpm}` : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="guide-line">
        Camelot: gleiche Key, Relative (8A↔8B), ±1 Nachbar, Energy Boost (+1).
        Keys/BPM in der Timeline setzen — dann „Harmonisch sortieren“. Spotify
        liefert Audio-Features in Dev Mode nicht mehr.
      </p>
    </section>
  );
}
