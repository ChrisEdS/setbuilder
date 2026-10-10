import {
  bpmOk,
  harmonicRelation,
  normalizeCamelot,
  orderByHarmonicPath,
  relationLabel,
  type HarmonicRelation,
} from "@/lib/harmonic";
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
  /** Prefer Camelot-compatible order inside each phase */
  harmonize?: boolean;
};

type Enriched = SpotifyTrack & {
  bpm: string;
  keyCamelot: string;
  energy: number;
};

/**
 * Builds a timed DJ set from a playlist crate.
 *
 * Criteria (sharpened):
 * 1. Pack by duration to the brief (playlist order = crate order)
 * 2. Map onto Open→Lift→Rise→Peak→Release by runtime share
 * 3. Inside each phase, optionally reorder for Camelot + small BPM moves
 * 4. Roles: anchors on peak (spaced), bridges on phase/key pivots, groove elsewhere
 * 5. Leftovers become Safety-crate tracks with context
 * 6. Deliberate key contrast allowed once into the final peak anchor
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
  const harmonize = options.harmonize !== false;

  const pool: Enriched[] = tracks.slice(0, Math.min(tracks.length, 120)).map(
    (track, index, arr) => ({
      ...track,
      bpm: "",
      keyCamelot: "",
      // Crate position as soft energy prior (early = lower)
      energy: arr.length <= 1 ? 0.5 : index / (arr.length - 1),
    }),
  );

  const selected = packTracks(pool, targetMs);
  const phased = assignPhasesByDuration(selected, targetMs);

  // Harmonize inside each phase, keep phase sequence intact
  const byPhase = new Map<SetPhaseId, Enriched[]>();
  for (const phase of PHASES) byPhase.set(phase.id, []);
  for (const track of phased) {
    byPhase.get(track.phase)!.push(track);
  }

  const sequenced: Array<Enriched & { phase: SetPhaseId }> = [];
  for (const phase of PHASES) {
    const group = byPhase.get(phase.id) ?? [];
    const ordered =
      harmonize && group.some((t) => normalizeCamelot(t.keyCamelot))
        ? orderByHarmonicPath(group, phase.id !== "release")
        : group;
    // Rise/Peak prefer slight energy rise via original crate energy if no keys
    const finalGroup =
      !harmonize || group.some((t) => normalizeCamelot(t.keyCamelot))
        ? ordered
        : sortByEnergy(ordered, phase.id);
    for (const track of finalGroup) {
      sequenced.push({ ...track, phase: phase.id });
    }
  }

  if (sequenced.length >= 6) {
    sequenced[sequenced.length - 1].phase = "release";
  }

  const withRoles = assignRolesAndTransitions(sequenced);
  const withSafety = appendSafetyCrates(withRoles, pool, selected);

  return {
    title: options.title?.trim() || playlistName,
    vibe: options.vibe?.trim() || `Aus Playlist: ${playlistName}`,
    venue: options.venue ?? DEFAULT_SET.venue,
    slot: options.slot ?? `${durationMinutes} Min · harmonic arc`,
    audience: options.audience ?? DEFAULT_SET.audience,
    gear: options.gear ?? DEFAULT_SET.gear,
    durationMinutes,
    tracks: withSafety,
  };
}

function sortByEnergy(
  tracks: Enriched[],
  phase: SetPhaseId,
): Enriched[] {
  const sorted = [...tracks].sort((a, b) => a.energy - b.energy);
  if (phase === "release") {
    return [...tracks].sort((a, b) => b.energy - a.energy);
  }
  return sorted;
}

function packTracks(pool: Enriched[], targetMs: number): Enriched[] {
  const selected: Enriched[] = [];
  let total = 0;
  const softCap = targetMs * 1.06;

  for (const track of pool) {
    if (selected.length >= 36) break;
    if (total >= targetMs && selected.length >= 8) break;
    if (total + track.durationMs > softCap && selected.length >= 8) continue;
    selected.push(track);
    total += track.durationMs;
  }

  if (selected.length === 0) return pool.slice(0, 12);
  return selected;
}

function assignPhasesByDuration(
  tracks: Enriched[],
  targetMs: number,
): Array<Enriched & { phase: SetPhaseId }> {
  const total = tracks.reduce((sum, t) => sum + t.durationMs, 0) || targetMs;
  let cursor = 0;
  const boundaries = PHASES.map((phase) => {
    cursor += phase.share;
    return { id: phase.id, until: cursor };
  });

  let acc = 0;
  return tracks.map((track) => {
    const midpoint = (acc + track.durationMs / 2) / total;
    acc += track.durationMs;
    const phase =
      boundaries.find((boundary) => midpoint <= boundary.until)?.id ?? "release";
    return { ...track, phase };
  });
}

function assignRolesAndTransitions(
  tracks: Array<Enriched & { phase: SetPhaseId }>,
): SetTrack[] {
  const peakIndexes = tracks
    .map((track, index) => (track.phase === "peak" ? index : -1))
    .filter((index) => index >= 0);

  const anchorSlots = new Set<number>();
  for (let i = 0; i < peakIndexes.length; i += 2) {
    anchorSlots.add(peakIndexes[i]);
  }
  if (peakIndexes.length > 0) {
    anchorSlots.add(peakIndexes[peakIndexes.length - 1]);
  }

  // One deliberate contrast slot: last peak anchor
  const contrastIdx =
    peakIndexes.length > 0 ? peakIndexes[peakIndexes.length - 1] : -1;

  return tracks.map((track, index, arr) => {
    const prev = index > 0 ? arr[index - 1] : null;
    const isBoundary = Boolean(prev && prev.phase !== track.phase);
    const relation: HarmonicRelation = prev
      ? harmonicRelation(prev.keyCamelot, track.keyCamelot)
      : "unknown";
    const keyPivot =
      relation === "relative" ||
      relation === "energyBoost" ||
      relation === "adjacent" ||
      relation === "contrast";
    const bpmPivot = prev ? !bpmOk(prev.bpm, track.bpm, 3) : false;

    let role: TrackRole = "groove";
    let why = "Groove-Atem im Arc";

    if (track.phase === "peak" && anchorSlots.has(index)) {
      role = "anchor";
      why =
        index === contrastIdx
          ? "Peak-Signature / Key-Contrast Moment"
          : "Peak-Anchor (Impact, danach Groove)";
    } else if (isBoundary || keyPivot || bpmPivot) {
      role = "bridge";
      why = isBoundary
        ? `Phasen-Pivot ${prev?.phase} → ${track.phase}`
        : keyPivot
          ? `Harmonic Pivot (${relationLabel(relation)})`
          : "BPM-Pivot (>3)";
    } else if (track.phase === "release" && index === arr.length - 1) {
      role = "anchor";
      why = "Closing-Anchor — kontrolliert landen";
    } else if (track.phase === "open" && index === 0) {
      role = "groove";
      why = "Opener — Headroom, Long Blend";
    }

    if (role === "anchor" && track.phase === "peak" && index === contrastIdx) {
      // keep contrast note even without keys
      why = "Peak-Signature — bewusster Contrast vor Release";
    }

    const transition = pickTransition(track.phase, role, isBoundary, relation);

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
      bpm: track.bpm,
      keyCamelot: track.keyCamelot,
      energy: track.energy,
      note: noteFor(track.phase, role, transition, relation),
      why,
      safetyAlt: "",
      harmonicFromPrev: relation,
    };
  });
}

function pickTransition(
  phase: SetPhaseId,
  role: TrackRole,
  isBoundary: boolean,
  relation: HarmonicRelation,
): TransitionVerb {
  if (relation === "contrast") return "power-reset";
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
  relation: HarmonicRelation,
): string {
  const bits = [
    `${phase}/${role}`,
    `Übergang: ${transition}`,
    relation !== "unknown" ? relationLabel(relation) : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

function appendSafetyCrates(
  setTracks: SetTrack[],
  pool: Enriched[],
  selected: Enriched[],
): SetTrack[] {
  const used = new Set(selected.map((track) => track.id));
  const leftovers = pool.filter((track) => !used.has(track.id));

  // Attach textual alts on bridges/peak anchors
  const withAlts = setTracks.map((track, index) => {
    if (
      track.role !== "bridge" &&
      !(track.role === "anchor" && track.phase === "peak")
    ) {
      return track;
    }
    const alt = leftovers[index % Math.max(leftovers.length, 1)];
    if (!alt) return track;
    return {
      ...track,
      safetyAlt: `${alt.artists.join(", ")} – ${alt.name}`,
    };
  });

  // Materialize Safety crate (standby tracks) — up to 8
  const safetyTracks: SetTrack[] = leftovers.slice(0, 8).map((track, index) => ({
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    durationMs: track.durationMs,
    uri: track.uri,
    externalUrl: track.externalUrl,
    imageUrl: track.imageUrl,
    phase: (["open", "lift", "rise", "peak"] as SetPhaseId[])[index % 4],
    role: "safety" as TrackRole,
    transition: "unset" as TransitionVerb,
    bpm: track.bpm,
    keyCamelot: track.keyCamelot,
    energy: track.energy,
    note: "Plan B — nur wenn der Raum dreht",
    why: "Safety net aus Playlist-Rest (nicht in der Haupt-Timeline)",
    safetyAlt: "",
    harmonicFromPrev: "unknown" as HarmonicRelation,
  }));

  return [...withAlts, ...safetyTracks];
}

/** Re-run Camelot path per phase on an existing draft (after keys/BPM filled). */
export function reharmonizeDraft(draft: SetDraft): SetDraft {
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  const safeties = draft.tracks.filter((track) => track.role === "safety");

  const phased: SetTrack[] = [];
  for (const phase of PHASES) {
    const group = performance.filter((track) => track.phase === phase.id);
    const ordered = orderByHarmonicPath(group, phase.id !== "release");
    phased.push(...ordered);
  }

  // Recompute relations after reorder
  const withRelations = phased.map((track, index, arr) => {
    const prev = index > 0 ? arr[index - 1] : null;
    const relation = prev
      ? harmonicRelation(prev.keyCamelot, track.keyCamelot)
      : "unknown";
    return {
      ...track,
      harmonicFromPrev: relation,
      note: noteFor(track.phase, track.role, track.transition, relation),
    };
  });

  return { ...draft, tracks: [...withRelations, ...safeties] };
}
