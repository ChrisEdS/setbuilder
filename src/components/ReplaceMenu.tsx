"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LibraryRow } from "@/components/LibraryPanel";
import { ActionIcon } from "@/components/ActionIcon";
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

/** Same round play control as a setlist row. */
function ReplacePlayButton({
  playing,
  disabled,
  playAria,
  onPlay,
}: {
  playing: boolean;
  disabled?: boolean;
  playAria: string;
  onPlay: () => void;
}) {
  const { t } = useI18n();
  const tip = disabled
    ? t("crates.replace.playNeedsStick")
    : playing
      ? t("builder.row.pauseTip")
      : t("builder.row.playTip");
  return (
    <span className="replace-play">
      <Tip text={tip} disabled={Boolean(disabled)}>
        <button
          type="button"
          className={playing ? "icon-action is-playing" : "icon-action"}
          disabled={disabled}
          aria-label={playing ? t("crates.player.pause") : playAria}
          onClick={onPlay}
        >
          <ActionIcon name={playing ? "pause" : "play"} />
        </button>
      </Tip>
    </span>
  );
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
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
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
  const target = byId.get(targetId);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-replace-primary], button")
        ?.focus();
    });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  function originLine(row: LibraryRow): string | null {
    const origin = replacementOrigin(row);
    if (!origin) return null;
    if (origin.kind === "history") return t("crates.replace.originHistory", { name: origin.name });
    if (origin.kind === "folder") return t("crates.replace.originFolder", { name: origin.name });
    return t("crates.replace.originPlaylist", { name: origin.name });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="replace-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
    <div
      ref={panelRef}
      className="replace-menu"
      role="dialog"
      aria-modal="true"
      aria-label={t("crates.replace.ariaLabel")}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="replace-menu-head">
        <div>
          <strong>{t("crates.replace.title")}</strong>
          <h4>{t("crates.replace.target", { name: target?.name ?? "" })}</h4>
          {fromLibrary.length > 0 ? <p>{t("crates.replace.groupLibrary")}</p> : null}
        </div>
        <button type="button" className="btn ghost replace-close" onClick={onClose}>
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
                  {onPlayTrack && track ? (
                    <ReplacePlayButton
                      playing={playingId === track.id}
                      playAria={t("crates.replace.playAria", { title: option.title })}
                      onPlay={() => onPlayTrack(track)}
                    />
                  ) : (
                    <span className="replace-play" />
                  )}
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
                  data-replace-primary
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
                  {onPlayRow ? (
                    <ReplacePlayButton
                      playing={playing}
                      disabled={!row.stick?.filePath}
                      playAria={t("crates.replace.playAria", { title: row.title })}
                      onPlay={() => onPlayRow(row)}
                    />
                  ) : (
                    <span className="replace-play" />
                  )}
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
                  data-replace-primary
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
    </div>,
    document.body,
  );
}
