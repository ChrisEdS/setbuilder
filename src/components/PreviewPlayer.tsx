"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { trackFilePath } from "@/lib/export-booth";
import { mixJoin } from "@/lib/harmonic";
import { playerEmbed, type PlayableTrack } from "@/lib/player";
import { useI18n } from "@/lib/i18n/react";
import { stickAudioUrl } from "@/lib/stick-audio";
import { performanceTracks, type SetTrack } from "@/lib/set";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type Props = {
  tracks: Array<
    PlayableTrack &
      Partial<
        Pick<SetTrack, "filePath" | "note" | "uri" | "source" | "keyCamelot" | "bpm" | "role">
      >
  >;
  currentId: string | null;
  onChange: (id: string) => void;
  onClose: () => void;
};

export function PreviewPlayer({ tracks, currentId, onChange, onClose }: Props) {
  const { t } = useI18n();
  const isClient = useIsClient();
  const track = tracks.find((item) => item.id === currentId) ?? null;
  if (!isClient || !track) return null;

  const embed = playerEmbed(track);
  const localAudio = stickAudioUrl(
    trackFilePath(track),
    track.name,
  );
  const lane = performanceTracks(tracks as SetTrack[]);
  const sequence = lane.some((item) => item.id === track.id) ? lane : tracks;
  const seqIndex = sequence.findIndex((item) => item.id === track.id);
  const prev = seqIndex > 0 ? sequence[seqIndex - 1] : null;
  const next =
    seqIndex >= 0 && seqIndex < sequence.length - 1
      ? sequence[seqIndex + 1]
      : null;
  const nextJoin = next
    ? mixJoin(
        { keyCamelot: track.keyCamelot || "", bpm: track.bpm || "" },
        { keyCamelot: next.keyCamelot || "", bpm: next.bpm || "" },
        t,
      )
    : null;

  return createPortal(
    <aside className="preview-player" aria-label={t("crates.player.ariaLabel")}>
      <div className="preview-dock">
        <div className="preview-now">
          <button
            type="button"
            className="player-skip"
            disabled={!prev}
            onClick={() => prev && onChange(prev.id)}
            aria-label={t("crates.player.prev")}
          >
            ‹
          </button>
          {track.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.imageUrl} alt="" className="preview-art" />
          ) : (
            <div className="preview-art fallback" aria-hidden />
          )}
          <div className="preview-meta">
            <strong title={track.name}>{track.name}</strong>
            <span>
              {(track.artists ?? []).join(", ") || "—"}
              {track.keyCamelot ? ` · ${track.keyCamelot}` : ""}
              {track.bpm ? ` · ${track.bpm}` : ""}
              {localAudio ? " · Stick" : embed ? ` · ${embed.label}` : ""}
            </span>
            {nextJoin ? (
              <em className={`mix-join harm-${nextJoin.relation}`}>
                {t("crates.player.then", { join: nextJoin.label })}
              </em>
            ) : null}
          </div>
          <button
            type="button"
            className="player-skip"
            disabled={!next}
            onClick={() => next && onChange(next.id)}
            aria-label={t("crates.player.next")}
          >
            ›
          </button>
          <button
            type="button"
            className="preview-close"
            onClick={onClose}
            aria-label={t("crates.player.close")}
          >
            ✕
          </button>
        </div>
        {localAudio ? (
          <audio className="preview-audio" src={localAudio} controls autoPlay />
        ) : embed ? (
          <iframe
            key={embed.src}
            title={t("crates.player.iframeTitle", { label: embed.label })}
            src={embed.src}
            width="100%"
            height={embed.height}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="eager"
          />
        ) : (
          <p className="player-fallback">
            {t("crates.player.noEmbed")}
            {track.source === "rekordbox" ? ` ${t("crates.player.pickStick")}` : ""}
            {track.externalUrl ? (
              <>
                {" "}
                <a href={track.externalUrl} target="_blank" rel="noreferrer">
                  {t("crates.player.openSource")}
                </a>
              </>
            ) : null}
          </p>
        )}
      </div>
    </aside>,
    document.body,
  );
}
