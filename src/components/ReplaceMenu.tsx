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
  rankPoolReplacements,
  rankReplacements,
  replacementOrigin,
} from "@/lib/replace-track";
import type { SetTrack, SourcePoolTrack } from "@/lib/set";
import { lockBodyScroll } from "@/lib/ui-scroll-lock";

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
  /** Loaded playlist pool — Exchange mode lists only these fits. */
  playlistPool?: SourcePoolTrack[];
  onReplaceFromPool?: (targetId: string, track: SourcePoolTrack) => void;
  /** Preview a pool track that is not already in the set. */
  onPlayPool?: (track: SourcePoolTrack) => void;
  /** Hide alternatives/library; show playlist-pool fits only. */
  playlistOnly?: boolean;
};

const PAGE = 6;
const POOL = 36;

function rowMeta(key: string, bpm: string, energy?: number): string {
  return [key || "—", bpm, energy != null ? `E${energy}` : ""].filter(Boolean).join(" · ");
}

/** True when the player can actually open audio (stick file or streaming link). */
function poolTrackPlayable(track: SourcePoolTrack): boolean {
  if (track.filePath?.trim()) return true;
  const external = track.externalUrl?.trim() || "";
  if (/^https?:\/\//i.test(external)) return true;
  const uri = track.uri?.trim() || "";
  if (/^https?:\/\//i.test(uri) || uri.startsWith("spotify:")) return true;
  // `rekordbox:…` placeholders are not playable without a file path.
  return false;
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
      {/* Do not pass disabled to Tip — tip must stay hoverable with playNeedsStick. */}
      <Tip text={tip}>
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
  playlistPool = [],
  onReplaceFromPool,
  onPlayPool,
  playlistOnly = false,
}: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [pageIndex, setPageIndex] = useState(0);
  const options = playlistOnly ? [] : rankReplacements(tracks, targetId, t);
  const byId = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const libraryEnabled = !playlistOnly && Boolean(onReplaceFromLibrary);
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
  const fromPool = useMemo(
    () =>
      playlistPool.length && (playlistOnly || onReplaceFromPool)
        ? rankPoolReplacements(tracks, targetId, playlistPool, POOL, t)
        : [],
    [tracks, targetId, playlistPool, playlistOnly, onReplaceFromPool, t],
  );
  const pages = Math.max(
    1,
    Math.ceil((playlistOnly ? fromPool.length : fromLibrary.length) / PAGE),
  );
  const page = pageIndex % pages;
  const visiblePool = fromPool.slice(page * PAGE, page * PAGE + PAGE);
  const visibleLibrary = fromLibrary.slice(page * PAGE, page * PAGE + PAGE);
  const mine = options.slice(0, PAGE);
  const target = byId.get(targetId);
  const empty = playlistOnly
    ? fromPool.length === 0
    : mine.length === 0 && fromLibrary.length === 0;

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
    const unlockScroll = lockBodyScroll();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
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
        aria-label={
          playlistOnly ? t("crates.replace.exchangeAria") : t("crates.replace.ariaLabel")
        }
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="replace-menu-head">
          <div className="replace-menu-copy">
            <strong>
              {playlistOnly ? t("crates.replace.exchangeTitle") : t("crates.replace.title")}
            </strong>
            <h4>{t("crates.replace.target", { name: target?.name ?? "" })}</h4>
            {playlistOnly ? (
              <p>{t("crates.replace.groupPlaylist")}</p>
            ) : fromLibrary.length > 0 ? (
              <p>{t("crates.replace.groupLibrary")}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="replace-close"
            onClick={onClose}
            title={t("common.closeTip")}
          >
            {t("common.close")}
          </button>
        </div>
        <div className="replace-menu-body">
          {empty ? (
            <p className="replace-empty">
              {playlistOnly ? t("crates.replace.exchangeEmpty") : t("crates.replace.empty")}
            </p>
          ) : (
            <ul className="replace-list">
              {mine.length > 0 ? (
                <li className="replace-kicker">{t("crates.replace.groupMine")}</li>
              ) : null}
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
                        <em className="replace-meta">
                          {rowMeta(track?.keyCamelot ?? "", track?.bpm ?? "", track?.energyLevel)}
                        </em>
                      </div>
                    </div>
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
              {playlistOnly ? (
                <>
                  {visiblePool.length > 0 ? (
                    <li className="replace-kicker">{t("crates.replace.groupPlaylist")}</li>
                  ) : null}
                  {visiblePool.map(({ track, detail }) => {
                    const inSet = byId.get(track.id);
                    const canPlayPool = Boolean(inSet?.filePath?.trim()) || poolTrackPlayable(track);
                    return (
                      <li key={track.id} title={detail}>
                        <div className="replace-copy">
                          {onPlayTrack && inSet ? (
                            <ReplacePlayButton
                              playing={playingId === inSet.id}
                              disabled={!inSet.filePath?.trim() && !poolTrackPlayable(track)}
                              playAria={t("crates.replace.playAria", { title: track.name })}
                              onPlay={() => onPlayTrack(inSet)}
                            />
                          ) : onPlayPool ? (
                            <ReplacePlayButton
                              playing={playingId === track.id}
                              disabled={!canPlayPool}
                              playAria={t("crates.replace.playAria", { title: track.name })}
                              onPlay={() => onPlayPool(track)}
                            />
                          ) : (
                            <span className="replace-play" />
                          )}
                          <div>
                            <strong>{track.name}</strong>
                            <span>
                              {track.artists[0] || t("crates.replace.unknownArtist")}
                            </span>
                            <em className="replace-meta">
                              {rowMeta(
                                track.keyCamelot || track.catalogKey || "",
                                track.bpm || track.catalogBpm || "",
                                track.energyLevel,
                              )}
                            </em>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn ghost lib-add"
                          data-replace-primary
                          onClick={() => {
                            if (inSet) onReplace(targetId, inSet.id);
                            else onReplaceFromPool?.(targetId, track);
                            onClose();
                          }}
                        >
                          {t("crates.replace.insert")}
                        </button>
                      </li>
                    );
                  })}
                </>
              ) : (
                <>
                  {visibleLibrary.length > 0 ? (
                    <li className="replace-kicker">{t("crates.replace.groupLibraryTitle")}</li>
                  ) : null}
                  {visibleLibrary.map(({ row, detail }, index) => {
                    const origin = originLine(row);
                    const playing = playingId === libraryRowTrackId(row);
                    return (
                      <li
                        key={`${row.artist}-${row.title}-${page}-${index}`}
                        title={detail}
                      >
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
                            <em className="replace-meta">
                              {rowMeta(row.key, row.bpm, row.energy)}
                            </em>
                          </div>
                        </div>
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
                </>
              )}
            </ul>
          )}
        </div>
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
                shown:
                  page * PAGE +
                  (playlistOnly ? visiblePool.length : visibleLibrary.length),
                total: playlistOnly ? fromPool.length : fromLibrary.length,
              })}
            </span>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
