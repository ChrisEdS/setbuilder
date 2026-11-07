/**
 * Which tracks the player may queue. Excluded tracks and parked alternatives
 * are not NEXT, even when the focused row is one of them.
 */

export function playableQueue<T extends { id: string; role?: string }>(
  tracks: readonly T[],
  excludedIds: Iterable<string> | undefined,
): T[] {
  const excluded = new Set(
    [...(excludedIds ?? [])].map((id) => id.trim()).filter(Boolean),
  );
  return tracks.filter((track) => track.role !== "safety" && !excluded.has(track.id));
}

export function playerNeighbors<T extends { id: string; role?: string }>(
  tracks: readonly T[],
  excludedIds: Iterable<string> | undefined,
  currentId: string,
): { prev: T | null; next: T | null; queue: T[] } {
  const queue = playableQueue(tracks, excludedIds);
  const at = queue.findIndex((track) => track.id === currentId);
  if (at >= 0) {
    return {
      prev: at > 0 ? queue[at - 1] : null,
      next: at < queue.length - 1 ? queue[at + 1] : null,
      queue,
    };
  }

  const playable = new Set(queue.map((track) => track.id));
  const fullAt = tracks.findIndex((track) => track.id === currentId);
  let prev: T | null = null;
  let next: T | null = null;
  if (fullAt >= 0) {
    for (let i = fullAt - 1; i >= 0; i--) {
      if (!playable.has(tracks[i].id)) continue;
      prev = queue.find((track) => track.id === tracks[i].id) ?? null;
      break;
    }
    for (let i = fullAt + 1; i < tracks.length; i++) {
      if (!playable.has(tracks[i].id)) continue;
      next = queue.find((track) => track.id === tracks[i].id) ?? null;
      break;
    }
  }
  return { prev, next, queue };
}
