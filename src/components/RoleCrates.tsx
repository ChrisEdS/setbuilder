"use client";

import type { CSSProperties } from "react";
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
  activeRole: TrackRole;
  focusedTrackId?: string | null;
  onSelectRole: (role: TrackRole) => void;
  onFocusTrack?: (id: string) => void;
};

export function RoleCrates({
  tracks,
  activeRole,
  focusedTrackId,
  onSelectRole,
  onFocusTrack,
}: Props) {
  return (
    <section className="role-crates" aria-label="Crate-Rollen Übersicht">
      <div className="panel-head">
        <div>
          <h2>Crate-Rollen</h2>
          <p className="timeline-filter">
            Anchor · Bridge · Groove · Safety — klicken filtert die Timeline
          </p>
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

      <div className="crate-columns">
        {TRACK_ROLES.map((role) => {
          const roleTracks = tracksByRole(tracks, role.id);
          const active = activeRole === role.id;
          const accent = roleAccent(role.id);
          return (
            <div
              key={role.id}
              className={active ? "crate-col active" : "crate-col"}
              style={
                {
                  ["--crate-tint" as string]: accent.tint,
                  ["--crate-bar" as string]: accent.bar,
                } as CSSProperties
              }
            >
              <button
                type="button"
                className="crate-col-head"
                onClick={() => onSelectRole(role.id)}
              >
                <span className="crate-bar" aria-hidden />
                <strong>{role.label}</strong>
                <span>{role.hint}</span>
                <em>{roleTracks.length}</em>
              </button>

              {roleTracks.length === 0 ? (
                <p className="crate-empty">Noch keine Tracks</p>
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
                            focused ? "crate-card is-focused" : "crate-card"
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
                            <strong title={track.name}>{track.name}</strong>
                            <span className="artists" title={track.artists.join(", ")}>
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
                                {PHASES.find((p) => p.id === track.phase)?.label}
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
                                    style={{ background: keyColor.solid }}
                                  />
                                  {track.keyCamelot}
                                </span>
                              ) : (
                                <span className="pill muted" title="Key noch setzen">
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
                              <p className="safety-line" title={track.safetyAlt}>
                                Alt: {track.safetyAlt}
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
