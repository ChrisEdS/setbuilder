"use client";

import { useState } from "react";
import {
  applyStickSet,
  readRekordboxStick,
  type RekordboxStickSet,
} from "@/lib/rekordbox-stick";
import { rememberStickFiles } from "@/lib/stick-audio";
import { formatDuration, type SetDraft } from "@/lib/set";

type Props = {
  draft: SetDraft;
  busy: boolean;
  onApply: (draft: SetDraft, message: string) => void;
  onMatchLinks?: () => void;
  matchingLinks?: boolean;
  onIndexed: (
    rows: Array<{ artist: string; title: string; key: string; bpm: string }>,
  ) => void;
};

export function RekordboxStick({
  draft,
  busy,
  onApply,
  onMatchLinks,
  matchingLinks,
  onIndexed,
}: Props) {
  const [localBusy, setLocalBusy] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [sets, setSets] = useState<RekordboxStickSet[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    setLocalBusy(true);
    setError(null);
    try {
      const stick = await readRekordboxStick(files);
      rememberStickFiles(files);
      setLabel(stick.label);
      setSets(stick.sets);
      onIndexed(
        stick.library.map((track) => ({
          artist: track.artist,
          title: track.title,
          key: track.keyCamelot || track.keyRaw,
          bpm: track.bpm,
        })),
      );
      if (!stick.sets.length) {
        setError("Die Datenbank hat Tracks, aber keine Playlist und keine History.");
      }
    } catch (caught) {
      setSets([]);
      setLabel(null);
      const message =
        caught instanceof Error ? caught.message : "Rekordbox-Stick konnte nicht gelesen werden.";
      setError(message);
      onApply(draft, message);
    } finally {
      setLocalBusy(false);
    }
  }

  function take(set: RekordboxStickSet) {
    if (!set.tracks.length) return;
    const next = applyStickSet(draft, set);
    const keyed = set.tracks.filter((track) => track.keyCamelot).length;
    const minutes = set.tracks.reduce((sum, track) => sum + track.durationMs, 0);
    onApply(
      next,
      `${set.kind === "history" ? "History" : "Playlist"} „${set.name}“ · ${set.tracks.length} Tracks` +
        (keyed ? ` · ${keyed} mit Key` : "") +
        (minutes ? ` · ${formatDuration(minutes)}` : "") +
        (set.missing ? ` · ${set.missing} ohne Treffer` : ""),
    );
  }

  const pending = busy || localBusy;

  return (
    <div className="stick-import">
      <div className="library-pane-grid">
        <div>
          <h3>Rekordbox-Stick</h3>
          <p>
            Playlists und gespielte History direkt vom Export-Stick. Reihenfolge,
            Key, BPM und Kommentar bleiben erhalten.
          </p>
          <p className="library-path">
            Stick-Ordner oder <code>PIONEER/rekordbox/export.pdb</code>
            {label ? (
              <>
                {" "}
                · <strong>{label}</strong>
              </>
            ) : null}
          </p>
        </div>
        <div className="stick-actions">
          <label className={"btn library-file" + (pending ? " is-busy" : "")}>
            {pending ? "Lade…" : "Stick wählen"}
            <input
              type="file"
              hidden
              multiple
              disabled={pending}
              // Nonstandard directory picker. The browser returns every file
              // under the chosen volume; only export.pdb is read.
              {...{ webkitdirectory: "", directory: "" }}
              onChange={(event) => {
                void load(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {onMatchLinks ? (
            <button
              type="button"
              className="btn ghost library-file"
              disabled={pending || matchingLinks || draft.tracks.length === 0}
              onClick={onMatchLinks}
            >
              {matchingLinks ? "Suche…" : "Links suchen"}
            </button>
          ) : null}
          <label className={"btn ghost library-file" + (pending ? " is-busy" : "")}>
            export.pdb
            <input
              type="file"
              hidden
              accept=".pdb,.xml,application/xml"
              disabled={pending}
              onChange={(event) => {
                void load(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {error ? <p className="library-inline-status">{error}</p> : null}
      {sets.length ? (
        <ul className="stick-list">
          {sets.map((set) => {
            const ms = set.tracks.reduce((sum, track) => sum + track.durationMs, 0);
            return (
              <li key={set.id}>
                <div>
                  <strong>{set.name}</strong>
                  <span>
                    {set.kind === "history" ? "History" : "Playlist"}
                    {set.path !== set.name ? ` · ${set.path}` : ""}
                    {` · ${set.tracks.length} Tracks`}
                    {ms ? ` · ${formatDuration(ms)}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={pending || set.tracks.length === 0}
                  onClick={() => take(set)}
                >
                  Als Set laden
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
