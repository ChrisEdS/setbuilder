"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { playerEmbed, type PlayableTrack } from "@/lib/player";
import { parseSpotifyLink } from "@/lib/spotify-link";
import { playSpotifyTrack } from "@/lib/spotify-playback";

function spotifyTrackId(track: PlayableTrack): string | null {
  if (track.source === "spotify" && /^[A-Za-z0-9]{22}$/.test(track.id)) {
    return track.id;
  }
  const parsed = parseSpotifyLink(track.externalUrl || "");
  return parsed?.kind === "track" ? parsed.id : null;
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type Props = {
  tracks: PlayableTrack[];
  currentId: string | null;
  onChange: (id: string) => void;
  onClose: () => void;
};

type FullPlay = "playing" | "need-auth" | "error";

export function PreviewPlayer({ tracks, currentId, onChange, onClose }: Props) {
  const isClient = useIsClient();
  const index = tracks.findIndex((item) => item.id === currentId);
  const track = index >= 0 ? tracks[index] : null;
  const spotifyId = track ? spotifyTrackId(track) : null;
  const [status, setStatus] = useState<{
    id: string;
    play: FullPlay;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!spotifyId) return;
    const id = spotifyId;
    let cancelled = false;
    void playSpotifyTrack(id)
      .then(() => {
        if (cancelled) return;
        setStatus({
          id,
          play: "playing",
          message: "Volle Länge über Spotify Premium",
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Playback fehlgeschlagen.";
        const needsAuth =
          /neu verbinden|nicht verbunden|Premium|Auth|streaming/i.test(message);
        setStatus({
          id,
          play: needsAuth ? "need-auth" : "error",
          message,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [spotifyId]);

  const full = status?.id === spotifyId ? status : null;

  if (!isClient || !track) return null;

  const embed = playerEmbed(track);
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
              {full?.play === "playing" ? " · Premium" : embed ? ` · ${embed.label}` : ""}
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
        {full ? (
          <p className="player-fallback">
            {full.message}
            {full.play === "need-auth" ? (
              <>
                {" "}
                <a href="/api/auth/login?prompt=1">Spotify neu verbinden</a>
              </>
            ) : null}
          </p>
        ) : null}
        {embed && full?.play !== "playing" ? (
          <iframe
            key={embed.src}
            title={`${embed.label} Player`}
            src={embed.src}
            width="100%"
            height={embed.height}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="eager"
          />
        ) : null}
        {!embed && full?.play !== "playing" ? (
          <p className="player-fallback">
            Kein Embed für diesen Eintrag.
            {track.externalUrl ? (
              <>
                {" "}
                <a href={track.externalUrl} target="_blank" rel="noreferrer">
                  In der Quelle öffnen
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </aside>,
    document.body,
  );
}
