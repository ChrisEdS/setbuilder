"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";
import { ReplaceMenu } from "@/components/ReplaceMenu";
import { SetTakeaway } from "@/components/SetTakeaway";
import { CAMELOT_CODES, mixJoin } from "@/lib/harmonic";
import { sourceLabel } from "@/lib/music-link";
import {
  PHASES,
  TRACK_ROLES,
  TRANSITIONS,
  formatDuration,
  type SetPhaseId,
  type SetTrack,
  type TrackRole,
  type TrackSource,
  type TransitionVerb,
} from "@/lib/set";

type ResolvedTrack = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
  uri: string;
  externalUrl: string;
  imageUrl: string | null;
  source: TrackSource;
  bpm?: string;
  keyCamelot?: string;
};

type Props = {
  tracks: SetTrack[];
  positions: Map<string, string>;
  activePhase: SetPhaseId;
  activeRole: TrackRole;
  onAddTracks: (tracks: SetTrack[]) => void;
  onPatch: (id: string, patch: Partial<SetTrack>) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onReorder: (activeId: string, overId: string) => void;
  onRemove: (id: string) => void;
  onReplace?: (targetId: string, replacementId: string) => void;
  onMatchLinks?: () => void;
  matchingLinks?: boolean;
  linkAlert?: FieldNotice | null;
  exportAlert?: FieldNotice | null;
  onFocus?: (id: string) => void;
  focusedTrackId?: string | null;
  onExportPdf?: () => void;
  onExportM3u?: () => void;
  onExportRekordbox?: () => void;
  toolbar?: ReactNode;
};

export function ManualArrange({
  tracks,
  positions,
  activePhase,
  activeRole,
  onAddTracks,
  onPatch,
  onMove,
  onReorder,
  onRemove,
  onReplace,
  onMatchLinks,
  matchingLinks,
  linkAlert,
  exportAlert,
  onFocus,
  focusedTrackId,
  onExportPdf,
  onExportM3u,
  onExportRekordbox,
  toolbar,
}: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [error, setError] = useState<FieldNotice | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const performance = tracks.filter((track) => track.role !== "safety");
  const arranged = [
    ...performance,
    ...tracks.filter((track) => track.role === "safety"),
  ];

  function toSetTrack(track: ResolvedTrack): SetTrack {
    return {
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
      bpm: track.bpm || "",
      keyCamelot: track.keyCamelot || "",
      note: "",
      comment: "",
      source: track.source,
      safetyAlt: "",
    };
  }

  function addManualEntry() {
    const name = title.trim();
    if (!name) {
      setError({
        text: "Titel fehlt.",
        hint: "Einen Titel eintragen. Der Artist kann leer bleiben.",
      });
      return;
    }
    const link = url.trim();
    const id = `manual:${Date.now().toString(36)}`;
    const next: SetTrack = {
      id,
      name,
      artists: [artist.trim() || "Unknown"],
      album: "Manual",
      durationMs: 0,
      uri: link || id,
      externalUrl: link || "",
      imageUrl: null,
      phase: activePhase,
      role: activeRole,
      transition: "unset",
      bpm: "",
      keyCamelot: "",
      note: "",
      comment: "",
      source: "manual",
      safetyAlt: "",
    };
    onAddTracks([next]);
    setTitle("");
    setArtist("");
    setUrl("");
    setError(null);
    setStatus(`+ ${name} manuell ergänzt`);
  }

  function importLink() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError({
        text: "Link fehlt.",
        hint: "Eine Adresse von Spotify, Tidal, SoundCloud oder Beatport einfügen.",
      });
      return;
    }
    setError(null);
    setStatus(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/resolve-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = (await response.json()) as {
          tracks?: ResolvedTrack[];
          label?: string;
          message?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Link konnte nicht geladen werden.");
        }
        const incoming = (data.tracks ?? []).map(toSetTrack);
        if (!incoming.length) {
          throw new Error("Keine Tracks im Link gefunden.");
        }
        onAddTracks(incoming);
        setUrl("");
        setStatus(
          data.message ||
            `+ ${incoming.length} von ${sourceLabel(incoming[0]?.source)} geladen`,
        );
      } catch (err) {
        setError({
          text: err instanceof Error ? err.message : "Link konnte nicht geladen werden.",
          hint: "Die Adresse im Browser prüfen. Playlists und einzelne Tracks gehen, die Startseite nicht.",
        });
      }
    });
  }

  return (
    <section className="panel manual-panel" aria-label="Manual Arrange">
      <div className="panel-head">
        <div>
          <h2>Manual Arrange</h2>
          <p className="section-note">
            Link oder Titel eintragen, an der Nummer sortieren. Links suchen
            hängt fehlende Spotify-Adressen an. PDF, M3U und rekordbox nehmen
            das Set mit.
          </p>
          <p className="head-meta">
            {performance.length} in der Performance · neue Tracks:{" "}
            {PHASES.find((phase) => phase.id === activePhase)?.label} ·{" "}
            {TRACK_ROLES.find((role) => role.id === activeRole)?.label}
          </p>
        </div>
        <div className="manual-head-actions">
          <SetTakeaway
            canMatch={Boolean(onMatchLinks) && tracks.length > 0}
            canExport={tracks.length > 0}
            matchingLinks={matchingLinks}
            onMatchLinks={onMatchLinks}
            onExportPdf={onExportPdf}
            onExportM3u={onExportM3u}
            onExportRekordbox={onExportRekordbox}
          />
        </div>
      </div>

      {toolbar}
      <FieldNoticeView notice={linkAlert ?? null} />
      <FieldNoticeView notice={exportAlert ?? null} />

      <div className="manual-add">
        <div className="manual-form">
          <label className="manual-field is-wide">
            <span>Track-Link</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="spotify / tidal / soundcloud / beatport URL"
              aria-label="Music link"
            />
          </label>
          <button
            type="button"
            className="btn manual-form-btn"
            disabled={pending}
            title="Lädt Track, Playlist oder Album von Spotify, Tidal, SoundCloud oder Beatport in die Phase oben."
            onClick={importLink}
          >
            {pending ? "Lade…" : "Link laden"}
          </button>

          <label className="manual-field">
            <span>Titel</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel"
              aria-label="Manual title"
            />
          </label>
          <label className="manual-field">
            <span>Artist</span>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist"
              aria-label="Manual artist"
            />
          </label>
          <button
            type="button"
            className="btn ghost manual-form-btn"
            onClick={addManualEntry}
          >
            Eintrag +
          </button>
        </div>

        <FieldNoticeView notice={error} />
        {status ? <p className="banner status">{status}</p> : null}
      </div>

      {tracks.length === 0 ? (
        <div className="empty">
          <p>Noch leer.</p>
          <p>
            Link einfügen oder Titel/Artist tippen — dann sortieren und Comments
            schreiben.
          </p>
        </div>
      ) : (
        <ol className="manual-list">
          {arranged.map((track, index) => {
            const focused = focusedTrackId === track.id;
            const previous =
              track.role === "safety"
                ? null
                : performance[performance.findIndex((item) => item.id === track.id) - 1];
            const join = mixJoin(previous, track);
            const altHead =
              track.role === "safety" &&
              (index === 0 || arranged[index - 1]?.role !== "safety");
            return (
              <li
                key={track.id}
                id={`manual-${track.id}`}
                className={[
                  "manual-row",
                  focused ? "focused" : "",
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
                {altHead ? <p className="alt-head">Alternativen</p> : null}
                <span className="manual-index">
                  <button
                    type="button"
                    className="drag-handle"
                    draggable
                    aria-label={`${track.name} verschieben`}
                    title="Hier ziehen"
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
                    <i />
                    <i />
                    <i />
                  </button>
                  <em>{positions.get(track.id) ?? index + 1}</em>
                </span>
                <div className="manual-body">
                <div
                  className="manual-row-main"
                  onClick={() => onFocus?.(track.id)}
                >
                  <button
                    type="button"
                    className="manual-select"
                    onClick={() => onFocus?.(track.id)}
                  >
                    {track.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.imageUrl}
                        alt=""
                        width={48}
                        height={48}
                        draggable={false}
                      />
                    ) : (
                      <div className="art-fallback sm" />
                    )}
                    <span className="manual-copy">
                      <strong>{track.name}</strong>
                      <span>
                        {track.artists.join(", ")}
                        {track.durationMs
                          ? ` · ${formatDuration(track.durationMs)}`
                          : ""}
                      </span>
                    </span>
                  </button>

                  <div className="manual-meta">
                    <em className={`source-pill source-${track.source || "manual"}`}>
                      {sourceLabel(track.source)}
                    </em>
                    <select
                      value={track.phase}
                      onChange={(e) =>
                        onPatch(track.id, {
                          phase: e.target.value as SetPhaseId,
                        })
                      }
                      aria-label={`Phase ${track.name}`}
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
                        onPatch(track.id, {
                          role: e.target.value as TrackRole,
                        })
                      }
                      aria-label={`Rolle ${track.name}`}
                    >
                      {TRACK_ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="timeline-tools">
                    <button
                      type="button"
                      className={focused ? "is-playing" : undefined}
                      onClick={() => onFocus?.(track.id)}
                      aria-label={`${track.name} abspielen`}
                    >
                      ▶
                    </button>
                    <button type="button" onClick={() => onMove(track.id, -1)}>
                      ↑
                    </button>
                    <button type="button" onClick={() => onMove(track.id, 1)}>
                      ↓
                    </button>
                    {track.role !== "safety" && onReplace ? (
                      <button
                        type="button"
                        onClick={() =>
                          setReplaceFor((current) =>
                            current === track.id ? null : track.id,
                          )
                        }
                      >
                        Ersatz
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onRemove(track.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {join ? (
                  <p className={`mix-join harm-${join.relation}`}>{join.label}</p>
                ) : null}
                {replaceFor === track.id && onReplace ? (
                  <ReplaceMenu
                    tracks={tracks}
                    targetId={track.id}
                    onReplace={onReplace}
                    onClose={() => setReplaceFor(null)}
                  />
                ) : null}

                <label className="manual-comment">
                  <span>Comment</span>
                  <textarea
                    value={track.comment || ""}
                    rows={2}
                    placeholder="Cue, Energy, Vocal rein, Floor-Notiz…"
                    onChange={(e) =>
                      onPatch(track.id, { comment: e.target.value })
                    }
                  />
                </label>

                <div className="manual-extra">
                  <input
                    value={track.bpm}
                    onChange={(e) => onPatch(track.id, { bpm: e.target.value })}
                    placeholder="BPM"
                    aria-label={`BPM ${track.name}`}
                  />
                  <select
                    value={track.keyCamelot}
                    onChange={(e) =>
                      onPatch(track.id, { keyCamelot: e.target.value })
                    }
                    aria-label={`Key ${track.name}`}
                  >
                    <option value="">Key</option>
                    {CAMELOT_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <select
                    value={track.transition}
                    onChange={(e) =>
                      onPatch(track.id, {
                        transition: e.target.value as TransitionVerb,
                      })
                    }
                    aria-label={`Transition ${track.name}`}
                  >
                    {TRANSITIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
