"use client";

import {
  relationLabel,
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
  activeRole: TrackRole;
  onSelectRole: (role: TrackRole) => void;
  onFocusTrack?: (id: string) => void;
};

export function RoleCrates({
  tracks,
  activeRole,
  onSelectRole,
  onFocusTrack,
}: Props) {
  return (
    <section className="role-crates" aria-label="Crate-Rollen Übersicht">
      <div className="panel-head">
        <h2>Crate-Rollen</h2>
        <p>Welche Tracks wo gelandet sind — und warum</p>
      </div>

      <div className="crate-columns">
        {TRACK_ROLES.map((role) => {
          const roleTracks = tracksByRole(tracks, role.id);
          const active = activeRole === role.id;
          return (
            <div
              key={role.id}
              className={active ? "crate-col active" : "crate-col"}
            >
              <button
                type="button"
                className="crate-col-head"
                onClick={() => onSelectRole(role.id)}
              >
                <strong>{role.label}</strong>
                <span>{role.hint}</span>
                <em>{roleTracks.length}</em>
              </button>

              {roleTracks.length === 0 ? (
                <p className="crate-empty">Noch keine Tracks</p>
              ) : (
                <ul className="crate-track-list">
                  {roleTracks.map((track) => (
                    <li key={`${role.id}-${track.id}`}>
                      <button
                        type="button"
                        className="crate-card"
                        onClick={() => onFocusTrack?.(track.id)}
                      >
                        {track.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={track.imageUrl} alt="" width={40} height={40} />
                        ) : (
                          <div className="art-fallback sm" />
                        )}
                        <div className="crate-card-body">
                          <strong>{track.name}</strong>
                          <span className="artists">
                            {track.artists.join(", ")}
                          </span>
                          <div className="crate-meta">
                            <span className="pill">
                              {PHASES.find((p) => p.id === track.phase)?.label}
                            </span>
                            <span className="pill">
                              {formatDuration(track.durationMs)}
                            </span>
                            {track.keyCamelot ? (
                              <span className="pill key">{track.keyCamelot}</span>
                            ) : (
                              <span className="pill muted">Key?</span>
                            )}
                            {track.bpm ? (
                              <span className="pill">{track.bpm} BPM</span>
                            ) : null}
                          </div>
                          {track.why ? (
                            <p className="why">{track.why}</p>
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
                            <p className="safety-line">Alt: {track.safetyAlt}</p>
                          ) : null}
                          {track.transition !== "unset" ? (
                            <p className="transition-line">
                              → {track.transition}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
