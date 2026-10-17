/**
 * Bridges the dock PreviewPlayer and setlist/library play buttons so the row
 * control can show pause and request pause/resume without lifting audio state.
 */

type Snapshot = {
  trackId: string | null;
  playing: boolean;
  pauseToken: number;
  playToken: number;
};

let snapshot: Snapshot = {
  trackId: null,
  playing: false,
  pauseToken: 0,
  playToken: 0,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribePreviewTransport(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getPreviewTransportSnapshot(): Snapshot {
  return snapshot;
}

/** Called by PreviewDock whenever the focused track or audio play state changes. */
export function reportPreviewPlayback(trackId: string | null, playing: boolean) {
  if (snapshot.trackId === trackId && snapshot.playing === playing) return;
  snapshot = { ...snapshot, trackId, playing };
  emit();
}

export function requestPreviewPause() {
  snapshot = {
    ...snapshot,
    pauseToken: snapshot.pauseToken + 1,
    playing: false,
  };
  emit();
}

export function requestPreviewResume() {
  snapshot = {
    ...snapshot,
    playToken: snapshot.playToken + 1,
  };
  emit();
}
