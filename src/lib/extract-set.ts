import {
  bpmOk,
  harmonicRelation,
  normalizeCamelot,
  orderByHarmonicPath,
  relationLabel,
  type HarmonicRelation,
} from "@/lib/harmonic";
import { energyStep } from "@/lib/energy";
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
    (track, index, arr) => {
      const position = arr.length <= 1 ? 0.5 : index / (arr.length - 1);
      return {
        ...track,
        bpm: track.catalogBpm || "",
        keyCamelot: track.catalogKey || "",
        energy: catalogEnergy(track, position),
      };
    },
  );
  normalizeBpmEnergy(pool);

  const selected = packTracks(pool, targetMs);
  const catalogCount = selected.filter(
    (track) => track.bpm || track.catalogPopularity != null,
  ).length;
  const phased =
    catalogCount >= 4
      ? arrangeByCatalogEnergy(selected)
      : assignPhasesByDuration(selected, targetMs);

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
    slotKind: DEFAULT_SET.slotKind,
    audience: options.audience ?? DEFAULT_SET.audience,
    gear: options.gear ?? DEFAULT_SET.gear,
    durationMinutes,
    tracks: withSafety,
  };
}

function catalogEnergy(
  track: SpotifyTrack,
  position: number,
): number {
  const pop =
    typeof track.catalogPopularity === "number"
      ? track.catalogPopularity
      : typeof track.popularity === "number"
        ? track.popularity / 100
        : null;
  // Playlist position stays a weak prior. Catalog popularity carries the arc
  // until BPM is normalized across the crate.
  const popularity = pop == null ? 0.5 : Math.min(1, Math.max(0, pop));
  return popularity * 0.72 + position * 0.28;
}

function normalizeBpmEnergy(pool: Enriched[]): void {
  const bpms = pool
    .map((track) => Number(track.bpm))
    .filter((bpm) => Number.isFinite(bpm) && bpm >= 60 && bpm <= 200);
  if (bpms.length < 4) return;
  const sorted = [...bpms].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)] || 120;
  for (const track of pool) {
    const bpm = Number(track.bpm);
    if (!Number.isFinite(bpm) || bpm < 60) continue;
    const relative = Math.min(1, Math.max(0, 0.5 + (bpm - mid) / 24));
    track.energy = track.energy * 0.35 + relative * 0.65;
  }
}

function arrangeByCatalogEnergy(
  tracks: Enriched[],
): Array<Enriched & { phase: SetPhaseId }> {
  const sorted = [...tracks].sort((a, b) => a.energy - b.energy);
  const count = sorted.length;
  const slice = (start: number, end: number) =>
    sorted.slice(Math.round(start * count), Math.round(end * count));
  const open = slice(0, 0.17);
  const lift = slice(0.17, 0.42);
  const rise = slice(0.42, 0.59);
  const hot = sorted.slice(Math.round(0.59 * count));
  const peakCount = Math.max(1, Math.round(0.25 * count));
  const peak = hot.slice(Math.max(0, hot.length - peakCount));
  const release = hot.slice(0, Math.max(0, hot.length - peakCount)).reverse();
  const tagged = [
    ...open.map((track) => ({ ...track, phase: "open" as const })),
    ...lift.map((track) => ({ ...track, phase: "lift" as const })),
    ...rise.map((track) => ({ ...track, phase: "rise" as const })),
    ...peak.map((track) => ({ ...track, phase: "peak" as const })),
    ...release.map((track) => ({ ...track, phase: "release" as const })),
  ];
  return tagged.length ? tagged : tracks.map((track) => ({ ...track, phase: "lift" }));
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

type RoleInput = Pick<
  SetTrack,
  | "id"
  | "name"
  | "artists"
  | "album"
  | "durationMs"
  | "uri"
  | "externalUrl"
  | "imageUrl"
  | "bpm"
  | "keyCamelot"
  | "phase"
> & { energy?: number; energyLevel?: number };

function assignRolesAndTransitions(tracks: RoleInput[]): SetTrack[] {
  const peakIndexes = tracks
    .map((track, index) => (track.phase === "peak" ? index : -1))
    .filter((index) => index >= 0);

  // Peak anchors: with Energy Levels the strongest peak tracks (8+) carry the
  // impact, at most half of the peak. Without them every second slot does.
  const anchorSlots = new Set<number>();
  const strongPeak = peakIndexes
    .filter((index) => (tracks[index].energyLevel ?? 0) >= 8)
    .sort((a, b) => (tracks[b].energyLevel ?? 0) - (tracks[a].energyLevel ?? 0));
  if (strongPeak.length > 0) {
    const limit = Math.max(1, Math.ceil(peakIndexes.length / 2));
    for (const index of strongPeak.slice(0, limit)) anchorSlots.add(index);
  } else {
    for (let i = 0; i < peakIndexes.length; i += 2) {
      anchorSlots.add(peakIndexes[i]);
    }
  }
  if (peakIndexes.length > 0) {
    // The closing peak moment only anchors when it is not a known low-energy track.
    const last = peakIndexes[peakIndexes.length - 1];
    if ((tracks[last].energyLevel ?? 8) >= 8) anchorSlots.add(last);
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
    // Same, ±1 and A/B on one number mix cleanly and stay Groove. A Bridge is
    // for what needs care: key clash, +2 boost, off-wheel contrast, a BPM jump
    // or a step of two or more Energy Levels.
    const keyPivot =
      relation === "energyBoost" || relation === "contrast" || relation === "clash";
    const bpmPivot = prev ? !bpmOk(prev.bpm, track.bpm, 3) : false;
    const energyStepKind = prev
      ? energyStep(prev.energyLevel, track.energyLevel)
      : "unknown";
    const energyPivot = energyStepKind === "lift" || energyStepKind === "jump";

    let role: TrackRole = "groove";
    let why = "Groove-Atem im Arc";

    if (track.phase === "peak" && anchorSlots.has(index)) {
      role = "anchor";
      why =
        index === contrastIdx
          ? "Peak-Signature / Key-Contrast Moment"
          : "Peak-Anchor (Impact, danach Groove)";
    } else if (isBoundary || keyPivot || bpmPivot || energyPivot) {
      role = "bridge";
      why = isBoundary
        ? `Phasen-Pivot ${prev?.phase} → ${track.phase}`
        : keyPivot
          ? relation === "clash"
            ? "Brücke: Key-Clash, kurz überlappen oder per Break wechseln"
            : `Brücke: ${relationLabel(relation)}`
          : energyPivot
            ? `Brücke: Energie ${(prev?.energyLevel ?? 0)} → ${track.energyLevel ?? 0}${energyStepKind === "jump" ? " (Sprung, Break oder Reset nötig)" : ""}`
            : "Brücke: BPM-Sprung (>3)";
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
      energy: track.energy ?? 0.5,
      energyLevel: track.energyLevel,
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
    why: "Safety net aus Playlist-Rest (nicht in der Performance-Reihenfolge)",
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

/**
 * Distributes Anchor / Bridge / Groove over an existing performance order
 * (e.g. a set imported from a rekordbox stick). Order, phases, comments and
 * links stay untouched; Alternativen are not changed. Existing notes and
 * chosen transitions are kept.
 */
export function distributeRoles(draft: SetDraft): SetDraft {
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  if (performance.length === 0) return draft;
  const assigned = assignRolesAndTransitions(performance);
  const byId = new Map(assigned.map((track) => [track.id, track]));
  return {
    ...draft,
    tracks: draft.tracks.map((track) => {
      const next = byId.get(track.id);
      if (!next || track.role === "safety") return track;
      return {
        ...track,
        role: next.role,
        why: next.why,
        harmonicFromPrev: next.harmonicFromPrev,
        transition: track.transition === "unset" ? next.transition : track.transition,
        // Stick imports keep the rekordbox comment only; drop generated notes
        // from earlier versions (e.g. "open/groove · Übergang: long-blend").
        note:
          track.source === "rekordbox" && /^\w+\/\w+ · Übergang:/.test(track.note)
            ? ""
            : track.note,
      };
    }),
  };
}

export type SlotFitResult = {
  draft: SetDraft;
  kept: number;
  moved: number;
  beforeMs: number;
  afterMs: number;
};

/**
 * Trims a set that is longer than the slot. Per phase the tracks are spread
 * evenly (first track of the opener and last of the closer always stay) until
 * the phase budget of the brief is filled. Everything else moves to
 * Alternativen, so nothing is lost and Plan B comes for free.
 */
export function fitToSlot(draft: SetDraft): SlotFitResult {
  const targetMs = draft.durationMinutes * 60_000;
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  const beforeMs = performance.reduce((sum, track) => sum + track.durationMs, 0);
  if (!performance.length || beforeMs <= targetMs * 1.05) {
    return { draft, kept: performance.length, moved: 0, beforeMs, afterMs: beforeMs };
  }

  const fallbackMs = 5 * 60_000;
  const moveIds = new Set<string>();
  PHASES.forEach((phase, phaseIndex) => {
    const group = performance.filter((track) => track.phase === phase.id);
    if (!group.length) return;
    const groupMs = group.reduce((sum, t) => sum + (t.durationMs || fallbackMs), 0);
    const budget = targetMs * phase.share;
    if (groupMs <= budget * 1.15) return;
    const avg = groupMs / group.length;
    const count = Math.min(group.length, Math.max(1, Math.round(budget / avg)));
    const keep = new Set<number>();
    for (let i = 0; i < count; i++) {
      keep.add(Math.min(group.length - 1, Math.floor(((i + 0.5) * group.length) / count)));
    }
    if (phaseIndex === 0) keep.add(0);
    if (phaseIndex === PHASES.length - 1) keep.add(group.length - 1);
    group.forEach((track, index) => {
      if (!keep.has(index)) moveIds.add(track.id);
    });
  });

  const trimmed: SetDraft = {
    ...draft,
    tracks: draft.tracks.map((track) =>
      moveIds.has(track.id)
        ? {
            ...track,
            role: "safety" as TrackRole,
            why: "Beim Kürzen auf den Slot unter Alternativen gelegt",
          }
        : track,
    ),
  };
  const next = distributeRoles(trimmed);
  const keptTracks = next.tracks.filter((track) => track.role !== "safety");
  return {
    draft: next,
    kept: keptTracks.length,
    moved: moveIds.size,
    beforeMs,
    afterMs: keptTracks.reduce((sum, track) => sum + track.durationMs, 0),
  };
}
