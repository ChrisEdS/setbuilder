"use client";

import { useMemo } from "react";
import type { LibraryRow } from "@/components/LibraryPanel";
import { useI18n } from "@/lib/i18n/react";
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
  const { t } = useI18n();
  const options = rankReplacements(tracks, targetId, t);
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
            t,
          )
        : [],
    [tracks, targetId, library, libraryEnabled, t],
  );
  return (
    <div className="replace-menu" role="menu" aria-label={t("crates.replace.ariaLabel")}>
      <div className="replace-menu-head">
        <strong>{t("crates.replace.title")}</strong>
        <button type="button" className="btn ghost" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
      {options.length === 0 && fromLibrary.length === 0 ? (
        <p>{t("crates.replace.empty")}</p>
      ) : null}
      {options.length > 0 ? (
        <p className="replace-group">{t("crates.replace.groupMine")}</p>
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
                role="menuitem"
                className="btn"
                onClick={() => {
                  onReplace(targetId, option.id);
                  onClose();
                }}
              >
                {t("crates.replace.insert")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {fromLibrary.length > 0 ? (
        <>
          <p className="replace-group">{t("crates.replace.groupLibrary")}</p>
          <ul>
            {fromLibrary.map(({ row, detail }, index) => (
              <li key={`${row.artist}-${row.title}-${index}`}>
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.artist || t("crates.replace.unknownArtist")}</span>
                  <em>{detail}</em>
                </div>
                <span className="replace-actions">
                  {onPlayRow ? (
                    <button
                      type="button"
                      className="lib-play"
                      disabled={!row.stick?.filePath}
                      aria-label={t("crates.replace.playAria", { title: row.title })}
                      title={
                        row.stick?.filePath
                          ? t("crates.replace.play")
                          : t("crates.replace.playNeedsStick")
                      }
                      onClick={() => onPlayRow(row)}
                    >
                      ▶
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="btn"
                    onClick={() => {
                      onReplaceFromLibrary?.(targetId, row);
                      onClose();
                    }}
                  >
                    {t("crates.replace.insert")}
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
