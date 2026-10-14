import type { SetDraft, SetTrack } from "@/lib/set";

/** Covers from the stick are blob URLs. After a reload they are dead. */
export function usableImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("blob:")) return null;
  return url;
}

export function sanitizeTrackImages(track: SetTrack): SetTrack {
  const imageUrl = usableImageUrl(track.imageUrl);
  return imageUrl === track.imageUrl ? track : { ...track, imageUrl };
}

export function sanitizeDraftImages(draft: SetDraft): SetDraft {
  let changed = false;
  const tracks = draft.tracks.map((track) => {
    const next = sanitizeTrackImages(track);
    if (next !== track) changed = true;
    return next;
  });
  return changed ? { ...draft, tracks } : draft;
}

export function draftNeedsStickFiles(draft: SetDraft): boolean {
  return draft.tracks.some(
    (track) => Boolean(track.filePath) || track.source === "rekordbox",
  );
}
