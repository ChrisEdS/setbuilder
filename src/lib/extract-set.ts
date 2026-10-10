import type { SpotifyTrack } from "@/lib/spotify";
import {
  DEFAULT_SET,
  PHASES,
  type SetDraft,
  type SetPhaseId,
  type SetTrack,
  type TrackRole,
  type TransitionVerb,
} from "@/lib/set";

export type ExtractOptions = {
  durationMinutes: number;
  title?: string;
  vibe?: string;
  venue?: string;
  slot?: string;
  audience?: string;
  gear?: string;
  /** Keep playlist order as the arc skeleton (recommended). */
  preserveOrder?: boolean;
};

/**
 * Turns a Spotify playlist crate into a timed set along
 * Open → Lift → Rise → Peak → Release.
 *
 * Without Spotify audio-features we use playlist order as energy proxy
 * (crate already curated) and duration packing against the brief.
 */
export function extractSetFromPlaylist(
  tracks: SpotifyTrack[],
  playlistName: string,
  options: ExtractOptions,
): SetDraft {
  if (tracks.length === 0) {
    throw new Error("Playlist enthält keine abspielbaren Tracks.");
  }

  const durationMinutes = Math.max(20, options.durationMinutes || 60);
  const targetMs = durationMinutes * 60_000;
  const preserveOrder = options.preserveOrder !== false;

  // Pool: prefer a focused crate size; keep source order
  const pool = tracks.slice(0, Math.min(tracks.length, 120));

  // Pack to target duration — take a contiguous window from the start of the
  // crate first (typical prep), then top up with later bridges/safeties.
  const selected = packTracks(pool, targetMs);

  const ordered = preserveOrder
    ? selected
    : [...selected].sort((a, b) => a.durationMs - b.durationMs);

  const phased = assignPhasesByDuration(ordered, targetMs);
  const withRoles = assignRolesAndTransitions(phased);
  const withSafety = attachSafetyAlts(withRoles, pool);

  return {
    title: options.title?.trim() || playlistName,
    vibe: options.vibe?.trim() || `Aus Playlist: ${playlistName}`,
    venue: options.venue ?? DEFAULT_SET.venue,
    slot: options.slot ?? `${durationMinutes} Min · auto-extrahiert`,
    audience: options.audience ?? DEFAULT_SET.audience,
    gear: options.gear ?? DEFAULT_SET.gear,
    durationMinutes,
    tracks: withSafety,
  };
}

function packTracks(pool: SpotifyTrack[], targetMs: number): SpotifyTrack[] {
  const selected: SpotifyTrack[] = [];
  let total = 0;
  const softCap = targetMs * 1.08;

  for (const track of pool) {
    if (selected.length >= 40) break;
    if (total >= targetMs && selected.length >= 8) break;
    if (total + track.durationMs > softCap && selected.length >= 8) continue;
    selected.push(track);
    total += track.durationMs;
  }

  // If playlist is short, take everything
  if (selected.length === 0) return pool.slice(0, 12);
  return selected;
}

function assignPhasesByDuration(
  tracks: SpotifyTrack[],
  targetMs: number,
): Array<SpotifyTrack & { phase: SetPhaseId }> {
  const total = tracks.reduce((sum, t) => sum + t.durationMs, 0) || targetMs;
  let cursor = 0;
  const boundaries = PHASES.map((phase) => {
    cursor += phase.share;
    return { id: phase.id, until: cursor };
  });

  let acc = 0;
  return tracks.map((track, index) => {
    const midpoint = (acc + track.durationMs / 2) / total;
    acc += track.durationMs;
    const phase =
      boundaries.find((boundary) => midpoint <= boundary.until)?.id ?? "release";

    // Force last track into release when we have enough material
    if (index === tracks.length - 1 && tracks.length >= 6) {
      return { ...track, phase: "release" as SetPhaseId };
    }
    return { ...track, phase };
  });
}

function assignRolesAndTransitions(
  tracks: Array<SpotifyTrack & { phase: SetPhaseId }>,
): SetTrack[] {
  const peakIndexes = tracks
    .map((track, index) => ({ track, index }))
    .filter((item) => item.track.phase === "peak")
    .map((item) => item.index);

  // Peak triplet anchors spaced with grooves (DJ.Studio tip)
  const anchorSlots = new Set<number>();
  for (let i = 0; i < peakIndexes.length; i += 2) {
    anchorSlots.add(peakIndexes[i]);
  }
  // Signature contrast: last peak track before release
  if (peakIndexes.length > 0) {
    anchorSlots.add(peakIndexes[peakIndexes.length - 1]);
  }

  return tracks.map((track, index, arr) => {
    const prevPhase = index > 0 ? arr[index - 1].phase : null;
    const isBoundary = prevPhase && prevPhase !== track.phase;

    let role: TrackRole = "groove";
    if (track.phase === "peak" && anchorSlots.has(index)) role = "anchor";
    else if (isBoundary) role = "bridge";
    else if (track.phase === "open" && index === 0) role = "groove";
    else if (track.phase === "release") role = index === arr.length - 1 ? "anchor" : "groove";

    const transition = pickTransition(track.phase, role, isBoundary);

    return {
      id: track.id,
      name: track.name,
      artists: track.artists,
      album: track.album,
      durationMs: track.durationMs,
      uri: track.uri,
      externalUrl: track.externalUrl,
      imageUrl: track.imageUrl,
      phase: track.phase,
      role,
      transition,
      bpm: "",
      keyCamelot: "",
      note: noteFor(track.phase, role, transition),
      safetyAlt: "",
    };
  });
}

function pickTransition(
  phase: SetPhaseId,
  role: TrackRole,
  isBoundary: boolean | null,
): TransitionVerb {
  if (role === "bridge" || isBoundary) {
    if (phase === "rise") return "eq-swap";
    if (phase === "peak") return "break-to-drop";
    if (phase === "release") return "echo-out";
    return "long-blend";
  }
  if (phase === "open") return "long-blend";
  if (phase === "lift") return "stem-vocal";
  if (phase === "peak" && role === "anchor") return "break-to-drop";
  if (phase === "peak") return "loop-filter";
  if (phase === "release") return "echo-out";
  return "eq-swap";
}

function noteFor(
  phase: SetPhaseId,
  role: TrackRole,
  transition: TransitionVerb,
): string {
  const bits = [`${phase}/${role}`, `Übergang: ${transition}`];
  if (role === "anchor" && phase === "peak") {
    bits.push("Peak-Impact — danach Groove atmen lassen");
  }
  if (role === "bridge") {
    bits.push("Pivot: Key/BPM micro-move prüfen");
  }
  if (phase === "release") {
    bits.push("Nicht maxen — kontrolliert landen");
  }
  return bits.join(" · ");
}

function attachSafetyAlts(
  setTracks: SetTrack[],
  pool: SpotifyTrack[],
): SetTrack[] {
  const used = new Set(setTracks.map((track) => track.id));
  const leftovers = pool.filter((track) => !used.has(track.id));

  return setTracks.map((track, index) => {
    // Attach safeties to bridges and peak anchors
    if (track.role !== "bridge" && !(track.role === "anchor" && track.phase === "peak")) {
      return track;
    }
    const alt = leftovers[index % Math.max(leftovers.length, 1)];
    if (!alt) return { ...track, role: track.role === "bridge" ? track.role : track.role };
    return {
      ...track,
      safetyAlt: `${alt.artists.join(", ")} – ${alt.name}`,
    };
  });
}
