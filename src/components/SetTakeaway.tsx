"use client";

import type { ReactNode } from "react";

type Props = {
  canMatch: boolean;
  canExport: boolean;
  matchingLinks?: boolean;
  onMatchLinks?: () => void;
  onExportPdf?: () => void;
  onExportM3u?: () => void;
  onExportRekordbox?: () => void;
  onCopyText?: () => void;
  extra?: ReactNode;
};

function Tip({
  text,
  disabled,
  children,
}: {
  text: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="tip" tabIndex={disabled ? 0 : undefined}>
      {children}
      <span className="tip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function SetTakeaway({
  canMatch,
  canExport,
  matchingLinks,
  onMatchLinks,
  onExportPdf,
  onExportM3u,
  onExportRekordbox,
  onCopyText,
  extra,
}: Props) {
  return (
    <div className="takeaway">
      <div className="takeaway-row">
        <Tip
          disabled={!canMatch}
          text="Sucht für Tracks ohne Adresse einen Spotify-Treffer und hängt den Link an. Titel und Artist müssen passen."
        >
          <button
            type="button"
            className="btn ghost"
            onClick={onMatchLinks}
            disabled={!canMatch || matchingLinks}
          >
            {matchingLinks ? "Suche…" : "Links suchen"}
          </button>
        </Tip>
        <div className="takeaway-exports" role="group" aria-label="Set mitnehmen">
          <span className="takeaway-label">Mitnehmen</span>
          <Tip
            disabled={!canExport}
            text="Druckansicht mit Brief, Spielreihenfolge, Startzeit, Key, BPM, Übergang, Kommentar und Alternativen. Im Dialog „Als PDF speichern“ wählen."
          >
            <button
              type="button"
              className="btn"
              onClick={onExportPdf}
              disabled={!canExport || !onExportPdf}
            >
              PDF
            </button>
          </Tip>
          <Tip
            disabled={!canExport}
            text="Playlist der Performance-Reihenfolge für Player, die M3U lesen. Alternativen sind nicht dabei."
          >
            <button
              type="button"
              className="btn ghost"
              onClick={onExportM3u}
              disabled={!canExport || !onExportM3u}
            >
              M3U
            </button>
          </Tip>
          <Tip
            disabled={!canExport}
            text="XML für rekordbox: File → Import Playlist. Die Performance ist eine Playlist, die Alternativen eine zweite."
          >
            <button
              type="button"
              className="btn ghost"
              onClick={onExportRekordbox}
              disabled={!canExport || !onExportRekordbox}
            >
              rekordbox
            </button>
          </Tip>
          {onCopyText ? (
            <Tip
              disabled={!canExport}
              text="Set als Text in die Zwischenablage, mit Brief, Kommentaren und Prinzipien."
            >
              <button
                type="button"
                className="btn ghost"
                onClick={onCopyText}
                disabled={!canExport}
              >
                Text
              </button>
            </Tip>
          ) : null}
        </div>
        {extra}
      </div>
    </div>
  );
}
