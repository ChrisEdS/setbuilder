"use client";

import { rankReplacements } from "@/lib/replace-track";
import type { SetTrack } from "@/lib/set";

type Props = {
  tracks: SetTrack[];
  targetId: string;
  onReplace: (targetId: string, replacementId: string) => void;
  onClose: () => void;
};

export function ReplaceMenu({ tracks, targetId, onReplace, onClose }: Props) {
  const options = rankReplacements(tracks, targetId);
  return (
    <div className="replace-menu" role="listbox" aria-label="Alternative einsetzen">
      <div className="replace-menu-head">
        <strong>Alternative einsetzen</strong>
        <button type="button" className="btn ghost" onClick={onClose}>
          Schließen
        </button>
      </div>
      {options.length === 0 ? (
        <p>Keine Alternativen. Einen Track auf die Rolle Alternativen setzen.</p>
      ) : (
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
      )}
    </div>
  );
}
