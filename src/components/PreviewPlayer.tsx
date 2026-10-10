"use client";

type Props = {
  trackId: string | null;
  title?: string;
  artists?: string;
  imageUrl?: string | null;
  onClose: () => void;
};

export function PreviewPlayer({
  trackId,
  title,
  artists,
  imageUrl,
  onClose,
}: Props) {
  if (!trackId) return null;

  return (
    <aside className="preview-player" aria-label="Track Vorschau">
      <div className="preview-dock">
        <div className="preview-now">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="preview-art" />
          ) : (
            <div className="preview-art fallback" aria-hidden />
          )}
          <div className="preview-meta">
            <strong title={title}>{title || "Track"}</strong>
            {artists ? <span>{artists}</span> : null}
          </div>
          <button
            type="button"
            className="preview-close"
            onClick={onClose}
            aria-label="Vorschau schließen"
          >
            ✕
          </button>
        </div>
        <iframe
          title="Spotify Preview"
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=setform&theme=0`}
          width="100%"
          height="80"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    </aside>
  );
}
