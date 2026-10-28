import {
  bpmOk,
  harmonicRelation,
  normalizeCamelot,
  orderByHarmonicPath,
  type HarmonicRelation,
} from "@/lib/harmonic";
import { orderPhase, type SetSortTechnique } from "@/lib/sort-set";
import { PHASE_ENERGY, energyFitsPhase, energyStep, hasKnownEnergy } from "@/lib/energy";
import { phaseLabel } from "@/lib/i18n/domain";
import { LocalizedError } from "@/lib/i18n/error";
import { isGeneratedNote } from "@/lib/i18n/stored";
import { tDe, type Translate } from "@/lib/i18n/core";
import { parseKeyValue } from "@/lib/key-import";
import { inCamelotNeighborhood } from "@/lib/library-filter";
import { bestPhaseFor } from "@/lib/plan-b";
import { rankFitsAfter } from "@/lib/replace-track";
import { orderByPerfectHarmony } from "@/lib/perfect-harmony";
import {
  applySetAnchors,
  excludedSetIds,
  keepInSetIds,
  lockPerformanceEnds,
  normalizeExcludedIds,
  withSuggestedAnchors,
  withoutEndPins,
} from "@/lib/set-anchors";
import type { SpotifyTrack } from "@/lib/spotify";
import {
  PHASES,
  blendMsOf,
  playedDurationMs,
  trackPlayedMs,
  type SetDraft,
  type SetPhaseId,
  type SetTrack,
  type SourcePoolTrack,
  type TrackRole,
  type TransitionVerb,
  type EnergySource,
} from "@/lib/set";

/** How many leftovers become Alternativen after packing. */
const SAFETY_ALT_CAP = 24;

export type ExtractOptions = {
  durationMinutes: number;
  title?: string;
  vibe?: string;
  venue?: string;
  slot?: string;
  audience?: string;
  gear?: string;
  notes?: string;
  /** Prefer Camelot-compatible order inside each phase */
  harmonize?: boolean;
  blendMs?: number;
};

type Enriched = SpotifyTrack & {
  bpm: string;
  keyCamelot: string;
  energy: number;
  energyLevel?: number;
  energySource?: EnergySource;
  filePath?: string;
  source?: SetTrack["source"];
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
  t: Translate = tDe,
): SetDraft {
  if (tracks.length === 0) {
    throw new LocalizedError(
      "analysis.extract.noTracks",
      undefined,
      tDe("analysis.extract.noTracks"),
    );
  }

  const pool = enrichPlaylistPool(tracks);
  const sourcePool = pool.map(toSourcePoolTrack);
  const draft = buildDraftFromPool(pool, playlistName, options, t);
  return { ...draft, sourcePool };
}

/** True when the draft has a pool large enough to pick a different cast. */
export function canReshuffleDraft(draft: SetDraft): boolean {
  const pool = draft.sourcePool?.length ?? 0;
  if (pool < 2) return false;
  const performance = draft.tracks.filter((track) => track.role !== "safety").length;
  return pool > performance;
}

/**
 * True when Alternatives or the playlist pool can still supply a non-excluded
 * track that is not already in the performance (for Trim-to-slot refill).
 */
export function canFillDraft(draft: SetDraft): boolean {
  return fillCandidateCount(draft) > 0;
}

function fillCandidateCount(draft: SetDraft): number {
  const excluded = excludedSetIds(draft);
  const inPerformance = new Set(
    draft.tracks.filter((track) => track.role !== "safety").map((track) => track.id),
  );
  let count = 0;
  for (const track of draft.tracks) {
    if (track.role !== "safety") continue;
    if (excluded.has(track.id)) continue;
    count += 1;
  }
  for (const track of draft.sourcePool ?? []) {
    if (inPerformance.has(track.id)) continue;
    if (draft.tracks.some((item) => item.id === track.id)) continue;
    if (excluded.has(track.id)) continue;
    count += 1;
  }
  return count;
}

/**
 * Shuffle the stored playlist pool and rebuild the set for the same brief.
 * Keeps title/vibe/venue/… and opener, closer, and mid-pins (forced into the cast).
 */
export function reshuffleDraftFromPool(
  draft: SetDraft,
  t: Translate = tDe,
  random: () => number = Math.random,
): SetDraft {
  const stored = draft.sourcePool;
  if (!stored?.length) return draft;

  const openerId = draft.openerId?.trim() || null;
  const closerId = draft.closerId?.trim() || null;
  const pinnedIds = withoutEndPins(draft.pinnedIds, openerId, closerId);
  const excludedIds = normalizeExcludedIds(draft.excludedIds);
  const excluded = new Set(excludedIds ?? []);
  const pinIds = new Set(
    [openerId, closerId, ...(pinnedIds ?? [])]
      .filter((id): id is string => Boolean(id))
      .filter((id) => !excluded.has(id)),
  );
  const held = draft.tracks
    .filter((track) => track.role !== "safety" && pinIds.has(track.id))
    .filter((track) => !stored.some((row) => row.id === track.id))
    .map(setTrackAsPool);
  // Excluded ids never enter the cast — hard skip like a missing track.
  const usable = [...held, ...stored].filter((track) => !excluded.has(track.id));
  const shuffled = shuffleCopy(usable, random);
  const ordered = [
    ...shuffled.filter((track) => pinIds.has(track.id)),
    ...shuffled.filter((track) => !pinIds.has(track.id)),
  ];

  const pool = enrichPlaylistPool(
    ordered.map((track) => ({
      id: track.id,
      name: track.name,
      uri: track.uri,
      durationMs: track.durationMs,
      explicit: track.explicit ?? false,
      artists: track.artists,
      album: track.album,
      imageUrl: track.imageUrl,
      externalUrl: track.externalUrl,
      popularity: track.popularity ?? null,
      isrc: track.isrc ?? null,
      catalogBpm: track.catalogBpm || track.bpm || "",
      catalogKey: track.catalogKey || track.keyCamelot || "",
      catalogPopularity: track.catalogPopularity ?? null,
    })),
  );
  // Prefer stored energy when we already computed it at extract time.
  for (let i = 0; i < pool.length; i++) {
    const prior = ordered[i];
    if (prior?.energy != null) pool[i].energy = prior.energy;
    else if (hasKnownEnergy(prior ?? {})) pool[i].energy = (prior?.energyLevel ?? 0) / 10;
    if (prior && hasKnownEnergy(prior)) {
      pool[i].energyLevel = prior.energyLevel;
      pool[i].energySource = prior.energySource;
    }
    if (prior?.bpm) pool[i].bpm = prior.bpm;
    if (prior?.keyCamelot) pool[i].keyCamelot = prior.keyCamelot;
    if (prior?.filePath) pool[i].filePath = prior.filePath;
    if (prior?.source) pool[i].source = prior.source;
  }

  const next = buildDraftFromPool(
    pool,
    draft.title,
    {
      durationMinutes: draft.durationMinutes,
      title: draft.title,
      vibe: draft.vibe,
      venue: draft.venue,
      slot: draft.slot,
      audience: draft.audience,
      gear: draft.gear,
      notes: draft.notes,
      harmonize: true,
      blendMs: draft.blendMs,
    },
    t,
    {
      openerId,
      closerId,
      pinnedIds,
      excludedIds,
    },
  );
  return {
    ...next,
    slotKind: draft.slotKind,
    excludedIds,
    sourcePool: stored,
  };
}

function enrichPlaylistPool(tracks: SpotifyTrack[]): Enriched[] {
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
  return pool;
}

function toSourcePoolTrack(track: Enriched): SourcePoolTrack {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    durationMs: track.durationMs,
    uri: track.uri,
    externalUrl: track.externalUrl,
    imageUrl: track.imageUrl,
    bpm: track.bpm,
    keyCamelot: track.keyCamelot,
    energy: track.energy,
    energyLevel: track.energyLevel,
    energySource: track.energySource,
    filePath: track.filePath,
    popularity: track.popularity ?? null,
    catalogPopularity: track.catalogPopularity ?? null,
    catalogBpm: track.catalogBpm,
    catalogKey: track.catalogKey,
    explicit: track.explicit,
    isrc: track.isrc ?? null,
  };
}

function shuffleCopy<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function buildDraftFromPool(
  pool: Enriched[],
  playlistName: string,
  options: ExtractOptions,
  t: Translate,
  pins: {
    openerId?: string | null;
    closerId?: string | null;
    pinnedIds?: string[];
    excludedIds?: string[];
  } = {},
): SetDraft {
  const durationMinutes = Math.max(20, options.durationMinutes || 60);
  const blendMs = blendMsOf(options.blendMs);
  const targetMs = durationMinutes * 60_000;
  const harmonize = options.harmonize !== false;
  const openerId = pins.openerId?.trim() || null;
  const closerId = pins.closerId?.trim() || null;
  const pinnedIds = withoutEndPins(pins.pinnedIds, openerId, closerId);
  const excludedIds = normalizeExcludedIds(pins.excludedIds);
  const excluded = new Set(excludedIds ?? []);
  const packPool = pool.filter((track) => !excluded.has(track.id));

  const selected = ensurePinsInPack(
    packTracks(packPool, targetMs, blendMs),
    packPool,
    [openerId, closerId, ...(pinnedIds ?? [])]
      .filter((id): id is string => Boolean(id))
      .filter((id) => !excluded.has(id)),
  );
  const catalogCount = selected.filter(
    (track) => track.bpm || track.catalogPopularity != null,
  ).length;
  const phased =
    catalogCount >= 4
      ? arrangeByCatalogEnergy(selected)
      : assignPhasesByDuration(selected, targetMs);

  const byPhase = new Map<SetPhaseId, Enriched[]>();
  for (const phase of PHASES) byPhase.set(phase.id, []);
  for (const track of phased) {
    byPhase.get(track.phase)!.push(track);
  }

  const sequenced: Array<Enriched & { phase: SetPhaseId }> = [];
  for (const phase of PHASES) {
    const group = byPhase.get(phase.id) ?? [];
    const ordered =
      harmonize && group.some((item) => normalizeCamelot(item.keyCamelot))
        ? orderByHarmonicPath(group, phase.id !== "release")
        : group;
    const finalGroup =
      !harmonize || group.some((item) => normalizeCamelot(item.keyCamelot))
        ? ordered
        : sortByEnergy(ordered, phase.id);
    for (const track of finalGroup) {
      sequenced.push({ ...track, phase: phase.id });
    }
  }

  if (sequenced.length >= 6) {
    sequenced[sequenced.length - 1].phase = "release";
  }

  const withRoles = assignRolesAndTransitions(sequenced, t);
  const withSafety = appendSafetyCrates(withRoles, pool, selected, t);

  const base: SetDraft = {
    title: options.title?.trim() || playlistName,
    vibe: options.vibe?.trim() || t("analysis.extract.vibe", { name: playlistName }),
    venue: options.venue ?? "",
    slot: options.slot ?? t("analysis.extract.slot", { minutes: durationMinutes }),
    audience: options.audience ?? "",
    gear: options.gear ?? "",
    notes: options.notes ?? "",
    durationMinutes,
    blendMs,
    tracks: withSafety,
    openerId,
    closerId,
    pinnedIds,
    excludedIds,
  };

  // Keep explicit pins at the ends; otherwise suggest warm open/release.
  const anchored = openerId || closerId ? applySetAnchors(base) : withSuggestedAnchors(base);
  return {
    ...anchored,
    pinnedIds: withoutEndPins(anchored.pinnedIds, anchored.openerId, anchored.closerId),
    excludedIds,
  };
}

/** Force pinned tracks into the performance pack when they exist in the pool. */
function ensurePinsInPack(
  selected: Enriched[],
  pool: Enriched[],
  pinIds: string[],
): Enriched[] {
  const keep = pinIds.filter(Boolean);
  if (!keep.length) return selected;
  const protectedIds = new Set(keep);
  const byId = new Map(pool.map((track) => [track.id, track]));
  const next = [...selected];
  const ids = new Set(next.map((track) => track.id));

  const include = (id: string) => {
    if (!id || ids.has(id)) return;
    const track = byId.get(id);
    if (!track) return;
    for (let i = next.length - 1; i >= 0; i--) {
      if (!protectedIds.has(next[i].id)) {
        ids.delete(next[i].id);
        next.splice(i, 1);
        break;
      }
    }
    next.push(track);
    ids.add(id);
  };

  for (const id of keep) include(id);
  return next;
}

function setTrackAsPool(track: SetTrack): SourcePoolTrack {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    durationMs: track.durationMs,
    uri: track.uri,
    externalUrl: track.externalUrl,
    imageUrl: track.imageUrl,
    bpm: track.bpm,
    keyCamelot: track.keyCamelot,
    energy: track.energy,
    energyLevel: track.energyLevel,
    energySource: track.energySource,
    filePath: track.filePath,
    source: track.source,
    popularity: null,
    catalogPopularity: null,
    catalogBpm: track.bpm,
    catalogKey: track.keyCamelot,
    explicit: false,
    isrc: null,
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

function packTracks(pool: Enriched[], targetMs: number, blendMs: number): Enriched[] {
  const selected: Enriched[] = [];
  let played = 0;
  const softCap = targetMs * 1.06;

  for (const track of pool) {
    if (selected.length >= 60) break;
    const span = playedDurationMs(track.durationMs, blendMs);
    if (played >= targetMs && selected.length >= 8) break;
    if (played + span > softCap && selected.length >= 8) continue;
    selected.push(track);
    played += span;
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
> & { energy?: number; energyLevel?: number; energySource?: EnergySource };

function assignRolesAndTransitions(
  tracks: Array<RoleInput & { filePath?: string; source?: SetTrack["source"] }>,
  t: Translate,
): SetTrack[] {
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
    let why = t("analysis.why.groove");

    if (track.phase === "peak" && anchorSlots.has(index)) {
      role = "anchor";
      why =
        index === contrastIdx
          ? t("analysis.why.peakContrast")
          : t("analysis.why.peakAnchor");
    } else if (isBoundary || keyPivot || bpmPivot || energyPivot) {
      role = "bridge";
      why = isBoundary
        ? t("analysis.why.phasePivot", {
            from: prev ? phaseLabel(t, prev.phase) : "",
            to: phaseLabel(t, track.phase),
          })
        : keyPivot
          ? relation === "clash"
            ? t("analysis.why.bridgeClash")
            : relation === "energyBoost"
              ? t("analysis.why.bridgeEnergyBoost")
              : t("analysis.why.bridgeContrast")
          : energyPivot
            ? t(
                energyStepKind === "jump"
                  ? "analysis.why.bridgeEnergyJump"
                  : "analysis.why.bridgeEnergy",
                { from: prev?.energyLevel ?? 0, to: track.energyLevel ?? 0 },
              )
            : t("analysis.why.bridgeBpm");
    } else if (track.phase === "release" && index === arr.length - 1) {
      role = "anchor";
      why = t("analysis.why.closing");
    } else if (track.phase === "open" && index === 0) {
      role = "groove";
      why = t("analysis.why.opener");
    }

    if (role === "anchor" && track.phase === "peak" && index === contrastIdx) {
      // keep contrast note even without keys
      why = t("analysis.why.peakSignature");
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
      energyLevel: hasKnownEnergy(track) ? track.energyLevel : undefined,
      energySource: hasKnownEnergy(track) ? track.energySource : undefined,
      filePath: track.filePath,
      source: track.source,
      // The row shows phase, role, transition and the live key relation; no machine note.
      note: "",
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

function appendSafetyCrates(
  setTracks: SetTrack[],
  pool: Enriched[],
  selected: Enriched[],
  t: Translate,
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

  // Materialize Safety crate (standby tracks) — enough Plan B after reshuffle.
  const safetyTracks: SetTrack[] = leftovers.slice(0, SAFETY_ALT_CAP).map((track, index) => ({
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
    energyLevel: hasKnownEnergy(track) ? track.energyLevel : undefined,
    energySource: hasKnownEnergy(track) ? track.energySource : undefined,
    filePath: track.filePath,
    source: track.source,
    note: t("analysis.note.safety"),
    why: t("analysis.why.safetyNet"),
    safetyAlt: "",
    harmonicFromPrev: "unknown" as HarmonicRelation,
  }));

  return [...withAlts, ...safetyTracks];
}

const PLAYED_ROLES = new Set<TrackRole>(["anchor", "bridge", "groove"]);

/**
 * Role an Alternative takes when sort brings it back.
 * A stored previous played role wins; otherwise groove.
 */
function roleWhenPromoted(track: SetTrack): TrackRole {
  if (PLAYED_ROLES.has(track.role)) return track.role;
  const stored = (track as SetTrack & { playedRole?: unknown }).playedRole;
  if (stored === "anchor" || stored === "bridge" || stored === "groove") return stored;
  return "groove";
}

/**
 * Move one Alternative into the cast for sorting.
 * Phase stays as stored: a phase that still fits is the bucket the per-phase
 * sort uses; one that does not is left too, and the existing sort re-lays the
 * arc the same way it already does for performance tracks (locked ends,
 * perfect harmony by timeline).
 */
function promoteAlternativeForSort(track: SetTrack): SetTrack {
  if (track.role !== "safety") return track;
  return {
    ...track,
    role: roleWhenPromoted(track),
    why: "",
  };
}

/**
 * How many Alternatives a sort actually brought back into the performance.
 * Excluded tracks do not count.
 */
export function alternativesPulledIntoPerformance(before: SetDraft, after: SetDraft): number {
  const afterById = new Map(after.tracks.map((track) => [track.id, track]));
  const excluded = excludedSetIds(before);
  let count = 0;
  for (const track of before.tracks) {
    if (track.role !== "safety" || excluded.has(track.id)) continue;
    const next = afterById.get(track.id);
    if (next && next.role !== "safety") count += 1;
  }
  return count;
}

/**
 * Reorder the performance and every non-excluded Alternative.
 * Opener and closer stay at the ends; mid-pins move with the cast.
 * Excluded tracks stay Alternatives. Does not trim to the slot.
 */
export function reorderDraft(draft: SetDraft, technique: SetSortTechnique): SetDraft {
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  const excluded = excludedSetIds(draft);
  const pulled = draft.tracks.filter(
    (track) => track.role === "safety" && !excluded.has(track.id),
  );
  const stayingOut = draft.tracks.filter(
    (track) => track.role === "safety" && excluded.has(track.id),
  );
  // Pins win; otherwise keep the current first/last performance song at the ends.
  // Measured before Alternatives join, so a parked track cannot become the closer.
  const startId = draft.openerId?.trim() || performance[0]?.id || null;
  const endId =
    draft.closerId?.trim() ||
    performance[performance.length - 1]?.id ||
    null;

  const cast = [...performance, ...pulled.map(promoteAlternativeForSort)];

  const phased =
    technique === "perfect"
      ? reorderPerformancePerfect(cast, startId, endId)
      : PHASES.flatMap((phase) => {
          const group = cast.filter((track) => track.phase === phase.id);
          return orderPhase(group, phase.id, technique);
        });

  const locked =
    technique === "perfect"
      ? phased
      : lockPerformanceEnds(phased, startId, endId);

  const withRelations = locked.map((track, index, arr) => {
    const prev = index > 0 ? arr[index - 1] : null;
    const relation = prev
      ? harmonicRelation(prev.keyCamelot, track.keyCamelot)
      : "unknown";
    return {
      ...track,
      harmonicFromPrev: relation,
      note: isGeneratedNote(track.note) ? "" : track.note,
    };
  });

  return applySetAnchors({ ...draft, tracks: [...withRelations, ...stayingOut] });
}

/**
 * Whole-set Camelot TSP: kill clashes across phase seams, then re-lay phases
 * by timeline share so the arc still reads Open → Release.
 *
 * Pins win when set; otherwise the current first/last performance tracks stay
 * so Perfect matches the “Opener/closer stay” copy without requiring a pin.
 * Pass those ids from the performance before Alternatives are pulled in.
 */
function reorderPerformancePerfect(
  performance: SetTrack[],
  fixedStartId: string | null,
  fixedEndId: string | null,
): SetTrack[] {
  if (performance.length <= 1) return performance;
  const ordered = orderByPerfectHarmony(performance, {
    fixedStartId: fixedStartId ?? performance[0]?.id ?? null,
    fixedEndId: fixedEndId ?? performance[performance.length - 1]?.id ?? null,
  });
  return rephaseByTimeline(ordered);
}

function rephaseByTimeline(tracks: SetTrack[]): SetTrack[] {
  const total = tracks.reduce((sum, track) => sum + (track.durationMs || 1), 0);
  let cursor = 0;
  const boundaries = PHASES.map((phase) => {
    cursor += phase.share;
    return { id: phase.id, until: cursor };
  });
  let acc = 0;
  return tracks.map((track) => {
    const duration = track.durationMs || 1;
    const midpoint = (acc + duration / 2) / total;
    acc += duration;
    const phase =
      boundaries.find((boundary) => midpoint <= boundary.until)?.id ?? "release";
    return { ...track, phase };
  });
}

/**
 * Distributes Anchor / Bridge / Groove over an existing performance order
 * (e.g. a set imported from a rekordbox stick). Order, phases, comments and
 * links stay untouched; Alternativen are not changed. Existing notes and
 * chosen transitions are kept.
 */
export function distributeRoles(draft: SetDraft, t: Translate = tDe): SetDraft {
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  if (performance.length === 0) return draft;
  const assigned = assignRolesAndTransitions(performance, t);
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
        // Drop machine notes from earlier versions ("open/groove · Übergang: long-blend").
        note: isGeneratedNote(track.note) ? "" : track.note,
      };
    }),
  };
}

/** One moved track, as it stood in the list just before this trim. */
export type TrimRestore = {
  id: string;
  role: TrackRole;
  phase: SetPhaseId;
  index: number;
  why?: string;
};

export type SlotFitResult = {
  draft: SetDraft;
  kept: number;
  /** Tracks demoted to Alternativen (trim / exclude sweep). */
  moved: number;
  /** Tracks promoted into the performance (refill). */
  added: number;
  beforeMs: number;
  afterMs: number;
  /** Tracks moved or filled, with the role, phase and place to restore. */
  restore: TrimRestore[];
};

/**
 * Fits playing time to the slot: demotes overflow to Alternativen, and when
 * under the brief fills from Alternativen then the playlist pool. Opener,
 * closer and mid-pins stay in the cast; excludedIds never enter it.
 */
export function fitToSlot(draft: SetDraft, t: Translate = tDe): SlotFitResult {
  const targetMs = draft.durationMinutes * 60_000;
  const blendMs = blendMsOf(draft.blendMs);
  const excluded = excludedSetIds(draft);
  const protectedIds = keepInSetIds(draft);
  const fallbackMs = 5 * 60_000;
  const spanOf = (track: Pick<SetTrack, "durationMs" | "transition" | "overlapMs">) =>
    trackPlayedMs(
      {
        durationMs: track.durationMs || fallbackMs,
        transition: track.transition,
        overlapMs: track.overlapMs,
      },
      blendMs,
    );
  const playingMs = (set: SetDraft) =>
    set.tracks
      .filter((track) => track.role !== "safety")
      .reduce((sum, track) => sum + spanOf(track), 0);

  const beforeMs = playingMs(draft);
  const restore: TrimRestore[] = [];
  const moveIds = new Set<string>();
  const addedIds = new Set<string>();

  // Sweep: excluded tracks must not stay in the performance.
  for (const track of draft.tracks) {
    if (track.role === "safety") continue;
    if (!excluded.has(track.id)) continue;
    moveIds.add(track.id);
  }

  const demoteWhy = (id: string) =>
    excluded.has(id) ? t("analysis.why.excluded") : t("analysis.why.trimmed");

  const demote = (source: SetDraft, ids: Set<string>): SetDraft => {
    if (!ids.size) return source;
    const remaining = source.tracks.filter(
      (track) => track.role !== "safety" && !ids.has(track.id),
    );
    return distributeRoles(
      {
        ...source,
        tracks: source.tracks.map((track) =>
          ids.has(track.id)
            ? {
                ...track,
                role: "safety" as TrackRole,
                phase: bestPhaseFor(track, remaining),
                why: demoteWhy(track.id),
              }
            : track,
        ),
      },
      t,
    );
  };

  let working = demote(draft, moveIds);

  const performance = working.tracks.filter((track) => track.role !== "safety");

  if (playingMs(working) > targetMs * 1.05 && performance.length) {
    PHASES.forEach((phase, phaseIndex) => {
      const group = performance.filter((track) => track.phase === phase.id);
      if (!group.length) return;
      const groupMs = group.reduce((sum, track) => sum + spanOf(track), 0);
      const budget = targetMs * phase.share;
      if (groupMs <= budget * 1.15) return;
      const avg = groupMs / group.length;
      const count = Math.min(group.length, Math.max(1, Math.round(budget / avg)));
      const keep = new Set<number>();
      const band = PHASE_ENERGY[phase.id];
      for (let i = 0; i < count; i++) {
        const start = Math.floor((i * group.length) / count);
        const end = Math.max(start + 1, Math.floor(((i + 1) * group.length) / count));
        const middle = Math.min(
          group.length - 1,
          Math.floor(((i + 0.5) * group.length) / count),
        );
        let best = middle;
        let bestCost = Infinity;
        for (let j = start; j < end && j < group.length; j++) {
          const level = group[j].energyLevel;
          const gap =
            level == null ? 0 : Math.max(0, band.min - level, level - band.max);
          const cost = gap * 10 + Math.abs(j - middle) * 0.1;
          if (cost < bestCost) {
            bestCost = cost;
            best = j;
          }
        }
        keep.add(best);
      }
      if (phaseIndex === 0) keep.add(0);
      if (phaseIndex === PHASES.length - 1) keep.add(group.length - 1);
      group.forEach((track, index) => {
        if (protectedIds.has(track.id) || excluded.has(track.id)) return;
        if (!keep.has(index)) moveIds.add(track.id);
      });
    });

    for (let guard = 0; guard < performance.length; guard++) {
      const kept = performance.filter((track) => !moveIds.has(track.id));
      const total = kept.reduce((sum, track) => sum + spanOf(track), 0);
      if (total <= targetMs * 1.05) break;
      let pick: SetTrack | null = null;
      let worst = 0;
      for (const phase of PHASES) {
        const group = kept.filter((track) => track.phase === phase.id);
        if (group.length < 2) continue;
        const ratio =
          group.reduce((sum, track) => sum + spanOf(track), 0) /
          (targetMs * phase.share);
        if (ratio <= worst) continue;
        const band = PHASE_ENERGY[phase.id];
        const removable = group.filter(
          (track) =>
            track.id !== performance[0].id &&
            track.id !== performance[performance.length - 1].id &&
            !protectedIds.has(track.id) &&
            !excluded.has(track.id),
        );
        if (!removable.length) continue;
        const gapOf = (track: SetTrack) =>
          track.energyLevel == null
            ? 0
            : Math.max(0, band.min - track.energyLevel, track.energyLevel - band.max);
        pick = [...removable].sort(
          (a, b) =>
            gapOf(b) - gapOf(a) ||
            Math.abs(group.indexOf(a) - (group.length - 1) / 2) -
              Math.abs(group.indexOf(b) - (group.length - 1) / 2),
        )[0];
        worst = ratio;
      }
      if (!pick) break;
      moveIds.add(pick.id);
    }

    working = demote(draft, moveIds);
    // Role assignment can put time back; keep demoting until inside the brief.
    for (
      let guard = 0;
      playingMs(working) > targetMs * 1.05 && guard < performance.length;
      guard++
    ) {
      const kept = working.tracks.filter((track) => track.role !== "safety");
      let pick: SetTrack | null = null;
      let worst = 0;
      for (const phase of PHASES) {
        const group = kept.filter((track) => track.phase === phase.id);
        if (group.length < 2) continue;
        const ratio =
          group.reduce((sum, track) => sum + spanOf(track), 0) /
          (targetMs * phase.share);
        if (ratio <= worst) continue;
        const band = PHASE_ENERGY[phase.id];
        const removable = group.filter(
          (track) =>
            track.id !== performance[0]?.id &&
            track.id !== performance[performance.length - 1]?.id &&
            !protectedIds.has(track.id) &&
            !excluded.has(track.id),
        );
        if (!removable.length) continue;
        const gapOf = (track: SetTrack) =>
          track.energyLevel == null
            ? 0
            : Math.max(0, band.min - track.energyLevel, track.energyLevel - band.max);
        pick = [...removable].sort(
          (a, b) =>
            gapOf(b) - gapOf(a) ||
            Math.abs(group.indexOf(a) - (group.length - 1) / 2) -
              Math.abs(group.indexOf(b) - (group.length - 1) / 2),
        )[0];
        worst = ratio;
      }
      if (!pick) break;
      moveIds.add(pick.id);
      working = demote(draft, moveIds);
    }
  }

  // Snapshot demotions against the original draft for undo.
  draft.tracks.forEach((track, index) => {
    if (!moveIds.has(track.id)) return;
    restore.push({
      id: track.id,
      role: track.role,
      phase: track.phase,
      index,
      why: track.why,
    });
  });

  // Refill only when we started under the slot. After a trim that began over,
  // do not pull the just-demoted tracks straight back into the performance.
  const afterTrimMs = playingMs(working);
  if (beforeMs < targetMs && afterTrimMs < targetMs) {
    const softCap = targetMs * 1.06;
    const filled = fillUnderSlot(working, {
      targetMs,
      softCap,
      spanOf,
      excluded,
      t,
      onAdd: (snapshot) => {
        addedIds.add(snapshot.id);
        restore.push(snapshot);
      },
    });
    working = filled;
  }

  // Never leave excluded ids in the performance after fill.
  const stray = working.tracks.filter(
    (track) => track.role !== "safety" && excluded.has(track.id),
  );
  if (stray.length) {
    for (const track of stray) moveIds.add(track.id);
    working = demote(working, new Set(stray.map((track) => track.id)));
  }

  const keptTracks = working.tracks.filter((track) => track.role !== "safety");
  const unchanged = moveIds.size === 0 && addedIds.size === 0;
  if (unchanged) {
    return {
      draft,
      kept: keptTracks.length,
      moved: 0,
      added: 0,
      beforeMs,
      afterMs: beforeMs,
      restore: [],
    };
  }

  return {
    draft: applySetAnchors(working),
    kept: keptTracks.length,
    moved: moveIds.size,
    added: addedIds.size,
    beforeMs,
    afterMs: playingMs(working),
    restore,
  };
}

function poolTrackAsSetTrack(
  track: SourcePoolTrack,
  phase: SetPhaseId,
  t: Translate,
): SetTrack {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    durationMs: track.durationMs,
    uri: track.uri,
    externalUrl: track.externalUrl,
    imageUrl: track.imageUrl,
    phase,
    role: "groove",
    transition: "unset",
    bpm: track.bpm || track.catalogBpm || "",
    keyCamelot: track.keyCamelot || track.catalogKey || "",
    energy: track.energy,
    energyLevel: track.energyLevel,
    energySource: track.energySource,
    filePath: track.filePath,
    source: track.source,
    note: "",
    why: t("analysis.why.filled"),
    safetyAlt: "",
  };
}

/**
 * Promote Alternativen, then unused sourcePool tracks, until playing time
 * reaches the slot (soft cap like packTracks). Never casts excluded ids.
 */
function fillUnderSlot(
  draft: SetDraft,
  opts: {
    targetMs: number;
    softCap: number;
    spanOf: (track: Pick<SetTrack, "durationMs" | "transition" | "overlapMs">) => number;
    excluded: Set<string>;
    t: Translate;
    onAdd: (snapshot: TrimRestore) => void;
  },
): SetDraft {
  let next = draft;
  let added = 0;
  const { targetMs, softCap, spanOf, excluded, t, onAdd } = opts;

  const playing = () =>
    next.tracks
      .filter((track) => track.role !== "safety")
      .reduce((sum, track) => sum + spanOf(track), 0);

  for (let guard = 0; guard < 80 && playing() < targetMs; guard++) {
    const inSet = new Set(next.tracks.map((track) => track.id));
    const performance = next.tracks.filter((track) => track.role !== "safety");
    const safeties = next.tracks.filter((track) => track.role === "safety");

    const alt = safeties.find((track) => !excluded.has(track.id));
    let candidate: SetTrack | null = null;
    let fromAltIndex = -1;

    if (alt) {
      fromAltIndex = next.tracks.findIndex((track) => track.id === alt.id);
      candidate = {
        ...alt,
        role: "groove",
        why: t("analysis.why.filled"),
      };
    } else {
      const poolHit = (next.sourcePool ?? []).find(
        (track) => !inSet.has(track.id) && !excluded.has(track.id),
      );
      if (!poolHit) break;
      const phase = bestPhaseFor(
        {
          phase: "lift",
          bpm: poolHit.bpm || poolHit.catalogBpm || "",
          keyCamelot: poolHit.keyCamelot || poolHit.catalogKey || "",
          energyLevel: poolHit.energyLevel,
        },
        performance,
      );
      candidate = poolTrackAsSetTrack(poolHit, phase, t);
    }

    if (!candidate) break;
    const span = spanOf(candidate);
    const current = playing();
    if (current + span > softCap && current >= targetMs * 0.9) break;

    onAdd({
      id: candidate.id,
      role: "safety",
      phase: alt?.phase ?? candidate.phase,
      index: fromAltIndex >= 0 ? fromAltIndex : next.tracks.length,
      why: alt?.why ?? "",
    });
    added += 1;

    if (alt) {
      const promoted = candidate;
      const others = next.tracks.filter((track) => track.id !== promoted.id);
      const perf = others.filter((track) => track.role !== "safety");
      const rest = others.filter((track) => track.role === "safety");
      next = { ...next, tracks: [...perf, promoted, ...rest] };
    } else {
      const perf = next.tracks.filter((track) => track.role !== "safety");
      const rest = next.tracks.filter((track) => track.role === "safety");
      next = { ...next, tracks: [...perf, candidate, ...rest] };
    }
  }

  if (!added) return draft;
  return distributeRoles(next, t);
}

export type BestMatchFillResult = SlotFitResult & {
  /** Why nothing was added. Null once at least one track is in the performance. */
  idle: "full" | "empty" | "unfit" | null;
};

type FillBlendSide = {
  id: string;
  name: string;
  artists: string[];
  bpm: string;
  keyCamelot: string;
  energyLevel?: number;
  phase: SetPhaseId;
};

function seedPhaseForEnergy(level: number | undefined, fallback: SetPhaseId): SetPhaseId {
  if (level == null) return fallback;
  return PHASES.find((phase) => energyFitsPhase(level, phase.id) === true)?.id ?? fallback;
}

/**
 * Best rankFitsAfter score against the phase this track would join.
 * Neighborhood, the ±6 BPM window and “no energy jump” are rankFitsAfter’s
 * own gates; the phase band is bestPhaseFor + energyFitsPhase.
 */
function fillBlendRank(
  candidate: FillBlendSide,
  performance: SetTrack[],
  t: Translate,
): { score: number; phase: SetPhaseId } | null {
  if (!candidate.keyCamelot.trim()) return null;
  const phase = bestPhaseFor(
    {
      phase: candidate.phase,
      bpm: candidate.bpm,
      keyCamelot: candidate.keyCamelot,
      energyLevel: candidate.energyLevel,
    },
    performance,
  );
  if (energyFitsPhase(candidate.energyLevel, phase) === false) return null;
  const keyed = performance.filter((track) => track.keyCamelot.trim());
  const phaseRefs = keyed.filter((track) => track.phase === phase);
  const refs = phaseRefs.length ? phaseRefs : keyed;
  if (!refs.length) return null;
  const row = {
    artist: candidate.artists[0] ?? "",
    title: candidate.name,
    key: candidate.keyCamelot,
    bpm: candidate.bpm,
    energy: candidate.energyLevel,
  };
  let best = -1;
  for (const ref of refs) {
    if (!inCamelotNeighborhood(ref.keyCamelot, candidate.keyCamelot)) continue;
    const ranked = rankFitsAfter(
      [row],
      {
        name: ref.name,
        artists: ref.artists,
        keyCamelot: ref.keyCamelot,
        bpm: ref.bpm,
        energyLevel: ref.energyLevel,
      },
      (raw) => parseKeyValue(raw) || raw,
      t,
    );
    const score = ranked[0]?.score ?? -1;
    if (score > best) best = score;
  }
  return best < 0 ? null : { score: best, phase };
}

function rankFillSources(
  sources: FillBlendSide[],
  performance: SetTrack[],
  t: Translate,
): { source: FillBlendSide; score: number; phase: SetPhaseId }[] {
  const ranked: { source: FillBlendSide; score: number; phase: SetPhaseId }[] = [];
  for (const source of sources) {
    const hit = fillBlendRank(source, performance, t);
    if (hit) ranked.push({ source, score: hit.score, phase: hit.phase });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/**
 * Fills remaining slot time with tracks that blend into the current
 * performance. Qualifying Alternatives come before the playlist pool.
 * Does not trim. Pins, opener and closer stay; excluded ids are never cast.
 */
export function fillWithBestMatches(
  draft: SetDraft,
  t: Translate = tDe,
): BestMatchFillResult {
  const targetMs = draft.durationMinutes * 60_000;
  const blendMs = blendMsOf(draft.blendMs);
  const excluded = excludedSetIds(draft);
  const fallbackMs = 5 * 60_000;
  const spanOf = (track: Pick<SetTrack, "durationMs" | "transition" | "overlapMs">) =>
    trackPlayedMs(
      {
        durationMs: track.durationMs || fallbackMs,
        transition: track.transition,
        overlapMs: track.overlapMs,
      },
      blendMs,
    );
  const playingMs = (set: SetDraft) =>
    set.tracks
      .filter((track) => track.role !== "safety")
      .reduce((sum, track) => sum + spanOf(track), 0);

  const beforeMs = playingMs(draft);
  const keptNow = draft.tracks.filter((track) => track.role !== "safety").length;
  const idleResult = (idle: "full" | "empty" | "unfit"): BestMatchFillResult => ({
    draft,
    kept: keptNow,
    moved: 0,
    added: 0,
    beforeMs,
    afterMs: beforeMs,
    restore: [],
    idle,
  });

  if (beforeMs >= targetMs) return idleResult("full");

  const restore: TrimRestore[] = [];
  let next = draft;
  let added = 0;

  for (let guard = 0; guard < 80 && playingMs(next) < targetMs; guard++) {
    const inSet = new Set(next.tracks.map((track) => track.id));
    const performance = next.tracks.filter((track) => track.role !== "safety");
    const altTracks = next.tracks.filter(
      (track) => track.role === "safety" && !excluded.has(track.id),
    );
    const poolTracks = (next.sourcePool ?? []).filter(
      (track) => !inSet.has(track.id) && !excluded.has(track.id),
    );
    const rankedAlts = rankFillSources(
      altTracks.map((track) => ({
        id: track.id,
        name: track.name,
        artists: track.artists,
        bpm: track.bpm,
        keyCamelot: track.keyCamelot,
        energyLevel: track.energyLevel,
        phase: track.phase,
      })),
      performance,
      t,
    );
    const rankedPool = rankFillSources(
      poolTracks.map((track) => ({
        id: track.id,
        name: track.name,
        artists: track.artists,
        bpm: track.bpm || track.catalogBpm || "",
        keyCamelot: track.keyCamelot || track.catalogKey || "",
        energyLevel: track.energyLevel,
        phase: seedPhaseForEnergy(track.energyLevel, "lift"),
      })),
      performance,
      t,
    );
    const pick = rankedAlts[0] ?? rankedPool[0] ?? null;
    if (!pick) {
      if (!added) return idleResult(altTracks.length + poolTracks.length > 0 ? "unfit" : "empty");
      break;
    }

    const alt = altTracks.find((track) => track.id === pick.source.id) ?? null;
    const poolHit = alt ? undefined : poolTracks.find((track) => track.id === pick.source.id);
    let candidate: SetTrack;
    if (alt) {
      candidate = {
        ...alt,
        role: "groove",
        phase: pick.phase,
        why: t("analysis.why.filled"),
      };
    } else if (poolHit) {
      candidate = poolTrackAsSetTrack(poolHit, pick.phase, t);
    } else {
      break;
    }
    const span = spanOf(candidate);
    if (span <= 0) break;

    const fromAltIndex = alt ? next.tracks.findIndex((track) => track.id === alt.id) : -1;
    restore.push({
      id: candidate.id,
      role: "safety",
      phase: alt?.phase ?? pick.phase,
      index: fromAltIndex >= 0 ? fromAltIndex : next.tracks.length,
      why: alt?.why ?? "",
    });
    added += 1;

    const perf = next.tracks.filter(
      (track) => track.role !== "safety" && track.id !== candidate.id,
    );
    const rest = next.tracks.filter(
      (track) => track.role === "safety" && track.id !== candidate.id,
    );
    const closerId = next.closerId?.trim() || null;
    const closer = closerId ? perf.find((track) => track.id === closerId) : undefined;
    const body = closer ? perf.filter((track) => track.id !== closerId) : perf;
    next = {
      ...next,
      tracks: [...(closer ? [...body, candidate, closer] : [...body, candidate]), ...rest],
    };
  }

  if (!added) return idleResult("empty");
  const finished = applySetAnchors(distributeRoles(next, t));
  return {
    draft: finished,
    kept: finished.tracks.filter((track) => track.role !== "safety").length,
    moved: 0,
    added,
    beforeMs,
    afterMs: playingMs(finished),
    restore,
    idle: null,
  };
}

/**
 * Puts tracks from one trim back at the role, phase and index they had just
 * before it. Notes, and any later reorder of the other tracks, stay as they
 * are on the current draft. A second trim replaces the snapshot; this applies
 * only the one it is given.
 */
export function undoTrimToSlot(draft: SetDraft, restore: readonly TrimRestore[]): SetDraft {
  const present = new Set(draft.tracks.map((track) => track.id));
  const moves = restore.filter((item) => present.has(item.id));
  if (!moves.length) return draft;

  const previous = new Map(moves.map((item) => [item.id, item]));
  const patched = draft.tracks.map((track) => {
    const prev = previous.get(track.id);
    if (!prev) return track;
    return { ...track, role: prev.role, phase: prev.phase, why: prev.why };
  });

  const moving = new Set(moves.map((item) => item.id));
  const ordered = patched.filter((track) => !moving.has(track.id));
  for (const move of [...moves].sort((a, b) => a.index - b.index)) {
    const track = patched.find((item) => item.id === move.id);
    if (!track) continue;
    ordered.splice(Math.max(0, Math.min(move.index, ordered.length)), 0, track);
  }

  return { ...draft, tracks: ordered };
}
