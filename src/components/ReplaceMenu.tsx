"use client";

import { useEffect, useMemo, useState } from "react";
import type { LibraryRow } from "@/components/LibraryPanel";
import { Tip } from "@/components/Hint";
import { useI18n } from "@/lib/i18n/react";
import { parseKeyValue } from "@/lib/key-import";
import { libraryRowTrackId } from "@/lib/rekordbox-stick";
import {
  rankLibraryReplacements,
  rankReplacements,
  replacementOrigin,
} from "@/lib/replace-track";
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
  /** Alternatives are already in the set. Same preview as the setlist row. */
  onPlayTrack?: (track: SetTrack) => void;
  playingId?: string | null;
};

const PAGE = 6;
const POOL = 36;

function rowMeta(key: string, bpm: string, energy?: number): string {
  return [key || "—", bpm, energy != null ? `E${energy}` : ""].filter(Boolean).join(" · ");
}

export function ReplaceMenu({
  tracks,
  targetId,
  onReplace,
  onClose,
  library = [],
  onReplaceFromLibrary,
  onPlayRow,
  onPlayTrack,
  playingId = null,
}: Props) {
  const { t } = useI18n();
  const [pageIndex, setPageIndex] = useState(0);
  const options = rankReplacements(tracks, targetId, t);
  const byId = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const libraryEnabled = Boolean(onReplaceFromLibrary);
  const fromLibrary = useMemo(
    () =>
      libraryEnabled
        ? rankLibraryReplacements(
            tracks,
            targetId,
            library,
            (raw) => parseKeyValue(raw) || raw,
            POOL,
            t,
          )
        : [],
    [tracks, targetId, library, libraryEnabled, t],
  );
  const pages = Math.max(1, Math.ceil(fromLibrary.length / PAGE));
  const page = pageIndex % pages;
  const visibleLibrary = fromLibrary.slice(page * PAGE, page * PAGE + PAGE);
  const mine = options.slice(0, PAGE);

  useEffect(() => {
    setPageIndex(0);
  }, [targetId]);

  function originLine(row: LibraryRow): string | null {
    const origin = replacementOrigin(row);
    if (!origin) return null;
    if (origin.kind === "history") return t("crates.replace.originHistory", { name: origin.name });
    if (origin.kind === "folder") return t("crates.replace.originFolder", { name: origin.name });
    return t("crates.replace.originPlaylist", { name: origin.name });
  }

  return (
    <div className="replace-menu" role="region" aria-label={t("crates.replace.ariaLabel")}>
      <div className="replace-menu-head">
        <div>
          <strong>{t("crates.replace.title")}</strong>
          {fromLibrary.length > 0 ? <p>{t("crates.replace.groupLibrary")}</p> : null}
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
      {mine.length === 0 && fromLibrary.length === 0 ? (
        <p className="replace-empty">{t("crates.replace.empty")}</p>
      ) : (
        <ul className="replace-list">
          {mine.length > 0 ? <li className="replace-kicker">{t("crates.replace.groupMine")}</li> : null}
          {mine.map((option) => {
            const track = byId.get(option.id);
            return (
              <li key={option.id} title={option.detail}>
                <div className="replace-copy">
                  <span className="replace-play">
                    {onPlayTrack && track ? (
                      <button
                        type="button"
                        className={playingId === track.id ? "lib-play is-playing" : "lib-play"}
                        aria-label={
                          playingId === track.id
                            ? t("crates.player.pause")
                            : t("crates.replace.playAria", { title: option.title })
                        }
                        title={
                          playingId === track.id
                            ? t("crates.player.pause")
                            : t("crates.replace.play")
                        }
                        onClick={() => onPlayTrack(track)}
                      >
                        {playingId === track.id ? "❚❚" : "▶"}
                      </button>
                    ) : null}
                  </span>
                  <div>
                    <strong>{option.title}</strong>
                    <span>{option.artist}</span>
                  </div>
                </div>
                <em className="replace-meta">
                  {rowMeta(track?.keyCamelot ?? "", track?.bpm ?? "", track?.energyLevel)}
                </em>
                <button
                  type="button"
                  className="btn ghost lib-add"
                  onClick={() => {
                    onReplace(targetId, option.id);
                    onClose();
                  }}
                >
                  {t("crates.replace.insert")}
                </button>
              </li>
            );
          })}
          {visibleLibrary.length > 0 ? (
            <li className="replace-kicker">{t("crates.replace.groupLibraryTitle")}</li>
          ) : null}
          {visibleLibrary.map(({ row, detail }, index) => {
            const origin = originLine(row);
            const playing = playingId === libraryRowTrackId(row);
            return (
              <li key={`${row.artist}-${row.title}-${page}-${index}`} title={detail}>
                <div className="replace-copy">
                  <span className="replace-play">
                    {onPlayRow ? (
                      <button
                        type="button"
                        className={playing ? "lib-play is-playing" : "lib-play"}
                        disabled={!row.stick?.filePath}
                        aria-label={
                          playing
                            ? t("crates.player.pause")
                            : t("crates.replace.playAria", { title: row.title })
                        }
                        title={
                          !row.stick?.filePath
                            ? t("crates.replace.playNeedsStick")
                            : playing
                              ? t("crates.player.pause")
                              : t("crates.replace.play")
                        }
                        onClick={() => onPlayRow(row)}
                      >
                        {playing ? "❚❚" : "▶"}
                      </button>
                    ) : null}
                  </span>
                  <div>
                    <strong>{row.title}</strong>
                    <span>{row.artist || t("crates.replace.unknownArtist")}</span>
                    {origin ? <span className="replace-origin">{origin}</span> : null}
                  </div>
                </div>
                <em className="replace-meta">{rowMeta(row.key, row.bpm, row.energy)}</em>
                <button
                  type="button"
                  className="btn ghost lib-add"
                  onClick={() => {
                    onReplaceFromLibrary?.(targetId, row);
                    onClose();
                  }}
                >
                  {t("crates.replace.insert")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 ? (
        <div className="replace-foot">
          <Tip text={t("crates.replace.moreTip")}>
            <button
              type="button"
              className="btn ghost library-more-btn"
              aria-label={t("crates.replace.moreAria", { page: page + 1, pages })}
              onClick={() => setPageIndex((current) => (current + 1) % pages)}
            >
              <span className="library-more-icon" aria-hidden="true">
                ↻
              </span>
              {t("crates.replace.more")}
            </button>
          </Tip>
          <span className="replace-count">
            {t("crates.replace.count", {
              shown: page * PAGE + visibleLibrary.length,
              total: fromLibrary.length,
            })}
          </span>
        </div>
      ) : null}
    </div>
  );
}
