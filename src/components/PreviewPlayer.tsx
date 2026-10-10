"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { trackFilePath } from "@/lib/export-booth";
import { playerEmbed, type PlayableTrack } from "@/lib/player";
import { stickAudioUrl } from "@/lib/stick-audio";
import type { SetTrack } from "@/lib/set";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type Props = {
  tracks: Array<PlayableTrack & Partial<Pick<SetTrack, "filePath" | "note" | "uri" | "source">>>;
  currentId: string | null;
  onChange: (id: string) => void;
  onClose: () => void;
};

export function PreviewPlayer({ tracks, currentId, onChange, onClose }: Props) {
  const isClient = useIsClient();
  const index = tracks.findIndex((item) => item.id === currentId);
  const track = index >= 0 ? tracks[index] : null;
  if (!isClient || !track) return null;

  const embed = playerEmbed(track);
  const localAudio = stickAudioUrl(
    trackFilePath(track),
    track.name,
  );
  const prev = index > 0 ? tracks[index - 1] : null;
  const next = index < tracks.length - 1 ? tracks[index + 1] : null;

  return createPortal(
    <aside className="preview-player" aria-label="Player">
      <div className="preview-dock">
        <div className="preview-now">
          <button
            type="button"
            className="player-skip"
            disabled={!prev}
            onClick={() => prev && onChange(prev.id)}
            aria-label="Vorheriger Track"
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
              {localAudio ? " · Stick" : embed ? ` · ${embed.label}` : ""}
            </span>
          </div>
          <button
            type="button"
            className="player-skip"
            disabled={!next}
            onClick={() => next && onChange(next.id)}
            aria-label="Nächster Track"
          >
            ›
          </button>
          <button
            type="button"
            className="preview-close"
            onClick={onClose}
            aria-label="Player schließen"
          >
            ✕
          </button>
        </div>
        {localAudio ? (
          <audio className="preview-audio" src={localAudio} controls autoPlay />
        ) : embed ? (
          <iframe
            key={embed.src}
            title={`${embed.label} Player`}
            src={embed.src}
            width="100%"
            height={embed.height}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="eager"
          />
        ) : (
          <p className="player-fallback">
            Kein Embed für diesen Eintrag.
            {track.source === "rekordbox" ? " Stick-Ordner wählen, dann spielt die Datei hier." : ""}
            {track.externalUrl ? (
              <>
                {" "}
                <a href={track.externalUrl} target="_blank" rel="noreferrer">
                  In der Quelle öffnen
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
