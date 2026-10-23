/**
 * Explicit set opener (first performance track) and closer (last).
 * Sort and extract call applySetAnchors so pins survive reordering.
 */

import { harmonicRelation } from "@/lib/harmonic";
import type { SetDraft, SetTrack } from "@/lib/set";

function energyOf(track: SetTrack): number {
  if (track.energyLevel != null) return track.energyLevel;
  return 99;
}

/** Prefer low energy + a known key — a warm open, not a peak. */
export function suggestOpenerId(tracks: SetTrack[]): string | null {
  const pool = tracks.filter((track) => track.role !== "safety");
  if (!pool.length) return null;
  const open = pool.filter((track) => track.phase === "open");
  const candidates = open.length ? open : pool.slice(0, Math.min(4, pool.length));
  const ranked = [...candidates].sort((a, b) => {
    const keyA = a.keyCamelot?.trim() ? 0 : 1;
    const keyB = b.keyCamelot?.trim() ? 0 : 1;
    if (keyA !== keyB) return keyA - keyB;
    return energyOf(a) - energyOf(b);
  });
  return ranked[0]?.id ?? null;
}

/** Prefer a release-phase track with room to land — not the loudest peak. */
export function suggestCloserId(tracks: SetTrack[]): string | null {
  const pool = tracks.filter((track) => track.role !== "safety");
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0].id;
  const release = pool.filter((track) => track.phase === "release");
  const candidates = release.length
    ? release
    : pool.slice(Math.max(0, pool.length - 4));
  const ranked = [...candidates].sort((a, b) => energyOf(a) - energyOf(b));
  const pick = ranked[0];
  return pick?.id ?? pool[pool.length - 1].id;
}

export function withSuggestedAnchors(draft: SetDraft): SetDraft {
  const openerId = draft.openerId ?? suggestOpenerId(draft.tracks);
  const closerId = draft.closerId ?? suggestCloserId(draft.tracks);
  return applySetAnchors({ ...draft, openerId, closerId });
}

/**
 * Move start/end tracks to the performance ends (phase open / release).
 * Does not write openerId/closerId — used after sort so positional ends stay
 * without silently creating pins.
 */
export function lockPerformanceEnds(
  performance: SetTrack[],
  startId: string | null,
  endId: string | null,
): SetTrack[] {
  if (!performance.length || (!startId && !endId)) return performance;

  let opener = startId
    ? performance.find((track) => track.id === startId) ?? null
    : null;
  const closer = endId
    ? performance.find((track) => track.id === endId) ?? null
    : null;

  // Prefer distinct ends when both ids collide on a multi-track set.
  if (opener && closer && opener.id === closer.id && performance.length > 1) {
    opener = null;
  }

  const middle = performance.filter(
    (track) => track.id !== opener?.id && track.id !== closer?.id,
  );

  const nextPerf: SetTrack[] = [];
  if (opener) {
    nextPerf.push({
      ...opener,
      phase: "open",
      role: opener.role === "safety" ? "groove" : opener.role,
    });
  }
  nextPerf.push(...middle);
  if (closer && closer.id !== opener?.id) {
    nextPerf.push({
      ...closer,
      phase: "release",
      role: closer.role === "safety" ? "groove" : closer.role,
    });
  }
  return nextPerf;
}

/**
 * Move pinned opener to performance start (phase open) and closer to the end
 * (phase release). Same id for both only works with a one-track set.
 */
export function applySetAnchors(draft: SetDraft): SetDraft {
  const openerId = draft.openerId?.trim() || null;
  const closerId = draft.closerId?.trim() || null;
  if (!openerId && !closerId) return draft;

  const performance = draft.tracks.filter((track) => track.role !== "safety");
  const safeties = draft.tracks.filter((track) => track.role === "safety");
  if (!performance.length) return draft;

  const nextPerf = lockPerformanceEnds(performance, openerId, closerId);

  // Drop pins that no longer exist; clear opener when it collided with closer.
  let nextOpenerId: string | null =
    openerId && performance.some((track) => track.id === openerId)
      ? openerId
      : null;
  const nextCloserId: string | null =
    closerId && performance.some((track) => track.id === closerId)
      ? closerId
      : null;
  if (
    nextOpenerId &&
    nextCloserId &&
    nextOpenerId === nextCloserId &&
    performance.length > 1
  ) {
    nextOpenerId = null;
  }

  const withRelations = nextPerf.map((track, index, arr) => {
    const prev = index > 0 ? arr[index - 1] : null;
    return {
      ...track,
      harmonicFromPrev: prev
        ? harmonicRelation(prev.keyCamelot, track.keyCamelot)
        : "unknown",
    };
  });

  return {
    ...draft,
    openerId: nextOpenerId,
    closerId: nextCloserId,
    tracks: [...withRelations, ...safeties],
  };
}

/** Drop blank ids, duplicates, and any id that is already the opener or closer. */
export function withoutEndPins(
  ids: string[] | undefined,
  openerId: string | null | undefined,
  closerId: string | null | undefined,
): string[] | undefined {
  const drop = new Set(
    [openerId, closerId]
      .map((id) => id?.trim())
      .filter((id): id is string => Boolean(id)),
  );
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids ?? []) {
    const id = raw.trim();
    if (!id || drop.has(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next.length ? next : undefined;
}

/** Opener, closer, and mid-pins: these tracks stay in the performance. */
export function keepInSetIds(
  draft: Pick<SetDraft, "openerId" | "closerId" | "pinnedIds">,
): Set<string> {
  const ids = new Set<string>();
  for (const raw of [draft.openerId, draft.closerId, ...(draft.pinnedIds ?? [])]) {
    const id = raw?.trim();
    if (id) ids.add(id);
  }
  return ids;
}

/** Pin a track so trim and reshuffle keep it, without locking its place in the order. */
export function toggleKeepPin(draft: SetDraft, trackId: string): SetDraft {
  const id = trackId.trim();
  if (!id) return draft;
  const current = draft.pinnedIds ?? [];
  if (current.includes(id)) {
    return { ...draft, pinnedIds: withoutEndPins(current.filter((item) => item !== id), null, null) };
  }
  const openerId = draft.openerId === id ? null : draft.openerId ?? null;
  const closerId = draft.closerId === id ? null : draft.closerId ?? null;
  return {
    ...draft,
    openerId,
    closerId,
    pinnedIds: withoutEndPins([...(draft.pinnedIds ?? []), id], openerId, closerId),
  };
}

export function pinOpener(draft: SetDraft, trackId: string): SetDraft {
  const id = trackId.trim();
  if (!id) return draft;
  const closerId = draft.closerId === id && draft.tracks.filter((t) => t.role !== "safety").length > 1
    ? null
    : draft.closerId;
  return applySetAnchors({
    ...draft,
    openerId: id,
    closerId,
    pinnedIds: withoutEndPins(draft.pinnedIds, id, closerId),
  });
}

export function pinCloser(draft: SetDraft, trackId: string): SetDraft {
  const id = trackId.trim();
  if (!id) return draft;
  const openerId = draft.openerId === id && draft.tracks.filter((t) => t.role !== "safety").length > 1
    ? null
    : draft.openerId;
  return applySetAnchors({
    ...draft,
    openerId,
    closerId: id,
    pinnedIds: withoutEndPins(draft.pinnedIds, openerId, id),
  });
}

export function clearOpener(draft: SetDraft): SetDraft {
  return { ...draft, openerId: null };
}

export function clearCloser(draft: SetDraft): SetDraft {
  return { ...draft, closerId: null };
}
