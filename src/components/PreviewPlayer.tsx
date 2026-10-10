"use client";

type Props = {
  trackId: string | null;
  title?: string;
  artists?: string;
  onClose: () => void;
};

export function PreviewPlayer({ trackId, title, artists, onClose }: Props) {
  if (!trackId) return null;

  return (
    <aside className="preview-player" aria-label="Track Vorschau">
      <div className="preview-head">
        <div>
          <p className="preview-kicker">Vorschau</p>
          <strong title={title}>{title || "Track"}</strong>
          {artists ? <span>{artists}</span> : null}
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          Schließen
        </button>
      </div>
      <iframe
        title="Spotify Preview"
        src={`https://open.spotify.com/embed/track/${trackId}?utm_source=setform&theme=0`}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
      <p className="guide-line">
        Spotify Embed — 30s-Previews hängen vom Track/Markt ab. Volle Länge in der
        Spotify-App.
      </p>
    </aside>
  );
}
