"use client";

import { useMemo } from "react";
import type { LibraryRow } from "@/components/LibraryPanel";
import { parseKeyValue } from "@/lib/key-import";
import { rankLibraryReplacements, rankReplacements } from "@/lib/replace-track";
import type { SetTrack } from "@/lib/set";

type Props = {
  tracks: SetTrack[];
  targetId: string;
  onReplace: (targetId: string, replacementId: string) => void;
  onClose: () => void;
  /** Whole stick library: shown as extra candidates, ranked by key/BPM fit. */
  library?: LibraryRow[];
  onReplaceFromLibrary?: (targetId: string, row: LibraryRow) => void;
  onPlayRow?: (row: LibraryRow) => void;
};

export function ReplaceMenu({
  tracks,
  targetId,
  onReplace,
  onClose,
  library = [],
  onReplaceFromLibrary,
  onPlayRow,
}: Props) {
  const options = rankReplacements(tracks, targetId);
  const libraryEnabled = Boolean(onReplaceFromLibrary);
  const fromLibrary = useMemo(
    () =>
      libraryEnabled
        ? rankLibraryReplacements(
            tracks,
            targetId,
            library,
            (raw) => parseKeyValue(raw) || raw,
            8,
          )
        : [],
    [tracks, targetId, library, libraryEnabled],
  );
  return (
    <div className="replace-menu" role="listbox" aria-label="Alternative einsetzen">
      <div className="replace-menu-head">
        <strong>Ersatz einsetzen</strong>
        <button type="button" className="btn ghost" onClick={onClose}>
          Schließen
        </button>
      </div>
      {options.length === 0 && fromLibrary.length === 0 ? (
        <p>Keine Alternativen. Einen Track auf die Rolle Alternativen setzen oder die Stick-Bibliothek laden.</p>
      ) : null}
      {options.length > 0 ? (
        <p className="replace-group">Aus deinen Alternativen</p>
      ) : null}
      {options.length > 0 ? (
        <ul>
          {options.slice(0, 8).map((option) => (
            <li key={option.id}>
              <div>
                <strong>{option.title}</strong>
                <span>{option.artist}</span>
                <em>{option.detail}</em>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onReplace(targetId, option.id);
                  onClose();
                }}
              >
                Einsetzen
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {fromLibrary.length > 0 ? (
        <>
          <p className="replace-group">Aus der Bibliothek, passend zu Vorgänger und Nachfolger</p>
          <ul>
            {fromLibrary.map(({ row, detail }, index) => (
              <li key={`${row.artist}-${row.title}-${index}`}>
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.artist || "Unknown"}</span>
                  <em>{detail}</em>
                </div>
                <span className="replace-actions">
                  {onPlayRow ? (
                    <button
                      type="button"
                      className="lib-play"
                      disabled={!row.stick?.filePath}
                      aria-label={`${row.title} abspielen`}
                      title={row.stick?.filePath ? "Abspielen" : "Nur mit gewähltem Stick-Ordner abspielbar"}
                      onClick={() => onPlayRow(row)}
                    >
                      ▶
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      onReplaceFromLibrary?.(targetId, row);
                      onClose();
                    }}
                  >
                    Einsetzen
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
