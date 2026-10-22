import { isGeneratedNote } from "@/lib/i18n";
import { hasKnownEnergy, isMetadataComment, parseEnergyLevel, settledEnergy } from "@/lib/energy";
import { sanitizeDraftImages } from "@/lib/media";
import {
  blendMsOf,
  DEFAULT_SET,
  explicitOverlapMs,
  type SetDraft,
  type SetPhaseId,
  type SetSlotKind,
  type SetTrack,
  type SourcePoolTrack,
  type TrackRole,
  type TrackSource,
  type TransitionVerb,
} from "@/lib/set";

export const DRAFT_SCHEMA_VERSION = 1;

const phases = new Set<SetPhaseId>(["open", "lift", "rise", "peak", "release"]);
const roles = new Set<TrackRole>(["anchor", "bridge", "groove", "safety"]);
const transitions = new Set<TransitionVerb>([
  "cut",
  "short-blend",
  "long-blend",
  "eq-swap",
  "echo-out",
  "delay-throw",
  "filter-out",
  "loop-filter",
  "break-to-drop",
  "double-drop",
  "stem-vocal",
  "backspin",
  "power-reset",
  "unset",
]);
const slots = new Set<SetSlotKind>(["warmup", "support", "peaktime", "closing"]);
const sources = new Set<TrackSource>([
  "spotify",
  "tidal",
  "soundcloud",
  "beatport",
  "rekordbox",
  "manual",
]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Keeps a non-empty purpose line per known phase. Anything else is dropped. */
function phaseNotes(value: unknown): SetDraft["phaseNote"] {
  const raw = object(value);
  if (!raw) return undefined;
  const notes: Partial<Record<SetPhaseId, string>> = {};
  for (const id of phases) {
    const line = text(raw[id]);
    if (line.trim()) notes[id] = line;
  }
  return Object.keys(notes).length ? notes : undefined;
}

/** Normalizes one performance track from any supported stored-draft version. */
export function normalizeDraftTrack(value: unknown): SetTrack | null {
  const raw = object(value);
  if (!raw || typeof raw.name !== "string") return null;
  const rawComment = text(raw.comment);
  const rawNote = text(raw.note);
  const generatedNote = isGeneratedNote(rawNote);
  const legacyPath =
    raw.source === "rekordbox" && rawNote.includes("/") && !generatedNote
      ? rawNote.trim()
      : "";
  const userNote = !generatedNote && !legacyPath ? rawNote : "";
  const canonicalComment = isMetadataComment(rawComment)
    ? userNote
    : rawComment || userNote;
  const energyLevel = finite(raw.energyLevel, Number.NaN);
  const base = {
    ...raw,
    id: text(raw.id),
    name: raw.name,
    artists: strings(raw.artists),
    album: text(raw.album),
    durationMs: finite(raw.durationMs),
    uri: text(raw.uri),
    externalUrl: text(raw.externalUrl),
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : null,
    phase: phases.has(raw.phase as SetPhaseId) ? (raw.phase as SetPhaseId) : "open",
    role: roles.has(raw.role as TrackRole) ? (raw.role as TrackRole) : "groove",
    transition: transitions.has(raw.transition as TransitionVerb)
      ? (raw.transition as TransitionVerb)
      : "unset",
    bpm: text(raw.bpm),
    keyCamelot: text(raw.keyCamelot),
    // `comment` is the only set-only user note. `note` remains empty after migration.
    note: "",
    comment: canonicalComment,
    filePath: text(raw.filePath) || legacyPath || undefined,
    safetyAlt: text(raw.safetyAlt),
    source: sources.has(raw.source as TrackSource) ? (raw.source as TrackSource) : "spotify",
    energyLevel: Number.isFinite(energyLevel) ? energyLevel : undefined,
    energySource: raw.energySource,
  } as SetTrack;
  const fromComment = parseEnergyLevel(rawComment);
  const tagged =
    fromComment != null && !hasKnownEnergy(base)
      ? { ...base, energyLevel: fromComment, energySource: "tag" as const }
      : base;
  const settled = settledEnergy(tagged);
  const overlapMs = explicitOverlapMs(raw.overlapMs);
  const track: SetTrack = {
    ...tagged,
    energyLevel: settled.energyLevel,
    energySource: settled.energySource,
  };
  if (overlapMs === undefined) delete track.overlapMs;
  else track.overlapMs = overlapMs;
  return track;
}

/** Normalizes a bulk import and rejects duplicates both existing and earlier in the same batch. */
export function uniqueIncomingDraftTracks(
  existing: Iterable<string>,
  incoming: readonly unknown[],
): SetTrack[] {
  const seen = new Set(existing);
  const fresh: SetTrack[] = [];
  for (const value of incoming) {
    const track = normalizeDraftTrack(value);
    if (!track || seen.has(track.id)) continue;
    seen.add(track.id);
    fresh.push(track);
  }
  return fresh;
}

function normalizePoolTrack(value: unknown): SourcePoolTrack | null {
  const raw = object(value);
  if (!raw || typeof raw.name !== "string") return null;
  const track = {
    ...raw,
    id: text(raw.id),
    name: raw.name,
    artists: strings(raw.artists),
    album: text(raw.album),
    durationMs: finite(raw.durationMs),
    uri: text(raw.uri),
    externalUrl: text(raw.externalUrl),
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : null,
    bpm: typeof raw.bpm === "string" ? raw.bpm : undefined,
    keyCamelot: typeof raw.keyCamelot === "string" ? raw.keyCamelot : undefined,
    energy: typeof raw.energy === "number" && Number.isFinite(raw.energy) ? raw.energy : undefined,
    energyLevel:
      typeof raw.energyLevel === "number" && Number.isFinite(raw.energyLevel)
        ? raw.energyLevel
        : undefined,
    source: sources.has(raw.source as TrackSource) ? (raw.source as TrackSource) : undefined,
  } as SourcePoolTrack;
  const settled = settledEnergy(track);
  return {
    ...track,
    energyLevel: settled.energyLevel,
    energySource: settled.energySource,
  };
}

function repairIds<T extends { id: string }>(
  items: T[],
  kind: string,
  seen: Set<string>,
): T[] {
  return items.map((item, index) => {
    const base = item.id || `${kind}-${index + 1}`;
    let id = base;
    for (let suffix = 2; seen.has(id); suffix++) id = `${base}-${suffix}`;
    seen.add(id);
    return id === item.id ? item : { ...item, id };
  });
}

/**
 * Validates, migrates and normalizes stored JSON. Returns null when the outer
 * shape is not trustworthy enough to recover. User-authored text is not trimmed.
 */
export function normalizeStoredDraft(value: unknown): SetDraft | null {
  const raw = object(value);
  if (!raw || typeof raw.title !== "string" || !Array.isArray(raw.tracks)) return null;
  const normalizedTracks = raw.tracks.map(normalizeDraftTrack);
  if (normalizedTracks.some((track) => track === null)) return null;
  const normalizedPool = Array.isArray(raw.sourcePool)
    ? raw.sourcePool.map(normalizePoolTrack)
    : undefined;
  if (normalizedPool?.some((track) => track === null)) return null;

  const seen = new Set<string>();
  const tracks = repairIds(normalizedTracks as SetTrack[], "track", seen);
  const sourcePool = normalizedPool
    ? repairIds(normalizedPool as SourcePoolTrack[], "pool", seen)
    : undefined;
  const draft: SetDraft = {
    ...DEFAULT_SET,
    ...raw,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    title: raw.title,
    vibe: text(raw.vibe, DEFAULT_SET.vibe),
    venue: text(raw.venue, DEFAULT_SET.venue),
    slot: text(raw.slot, DEFAULT_SET.slot),
    slotKind: slots.has(raw.slotKind as SetSlotKind)
      ? (raw.slotKind as SetSlotKind)
      : "peaktime",
    audience: text(raw.audience, DEFAULT_SET.audience),
    gear: text(raw.gear, DEFAULT_SET.gear),
    notes: text(raw.notes),
    phaseNote: phaseNotes(raw.phaseNote),
    durationMinutes: finite(raw.durationMinutes, DEFAULT_SET.durationMinutes),
    blendMs: blendMsOf(raw.blendMs),
    tracks,
    ...(sourcePool ? { sourcePool } : { sourcePool: undefined }),
  };
  return sanitizeDraftImages(draft);
}

export function decodeStoredDraft(raw: string): SetDraft | null {
  try {
    return normalizeStoredDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function encodeStoredDraft(draft: SetDraft): string {
  return JSON.stringify(
    sanitizeDraftImages({ ...draft, schemaVersion: DRAFT_SCHEMA_VERSION }),
  );
}
