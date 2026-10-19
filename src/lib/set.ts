import { tDe, type Translate } from "@/lib/i18n/core";
import { stickAlternativesPlaylistName } from "@/lib/stick-names";

export type SetPhaseId =
  | "open"
  | "lift"
  | "rise"
  | "peak"
  | "release";

export type TrackRole = "anchor" | "bridge" | "groove" | "safety";

export type TransitionVerb =
  | "long-blend"
  | "eq-swap"
  | "echo-out"
  | "break-to-drop"
  | "stem-vocal"
  | "loop-filter"
  | "power-reset"
  | "unset";

export type SetPhase = {
  id: SetPhaseId;
  label: string;
  hint: string;
  energy: number;
  /** Suggested share of total set length */
  share: number;
};

export type TrackSource =
  | "spotify"
  | "tidal"
  | "soundcloud"
  | "beatport"
  | "rekordbox"
  | "manual";

/** Where an Energy Level came from. A stored 1 with no source is the old failed-scan placeholder. */
export type EnergySource = "tag" | "measured" | "manual";

export type SetTrack = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
  uri: string;
  externalUrl: string;
  imageUrl: string | null;
  phase: SetPhaseId;
  role: TrackRole;
  transition: TransitionVerb;
  bpm: string;
  keyCamelot: string;
  /** Soft energy prior 0–1 (crate position / analysis) */
  energy?: number;
  /** Energy Level 1–10 as Mixed In Key rates it (from a tag, a measurement, or by hand) */
  energyLevel?: number;
  /** Provenance for energyLevel. Missing on older drafts; an anonymous 1 then counts as unknown. */
  energySource?: EnergySource;
  note: string;
  /**
   * Set-only note for booth prep (cue, floor). Not written to MP3 tags —
   * rekordbox/MP3 comments stay on the stick file.
   */
  comment?: string;
  /** Where the track link came from */
  source?: TrackSource;
  /** Path on a rekordbox stick, when the set was imported from export.pdb */
  filePath?: string;
  /** Why this track got this role */
  why?: string;
  safetyAlt: string;
  harmonicFromPrev?:
    | "same"
    | "relative"
    | "adjacent"
    | "energyBoost"
    | "contrast"
    | "clash"
    | "unknown";
};

export type SetSlotKind = "warmup" | "support" | "peaktime" | "closing";

/**
 * Full playlist crate kept after extract so “Different songs” can reshuffle
 * a new performance without re-fetching Spotify/Tidal/stick.
 */
export type SourcePoolTrack = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
  uri: string;
  externalUrl: string;
  imageUrl: string | null;
  bpm?: string;
  keyCamelot?: string;
  energy?: number;
  energyLevel?: number;
  energySource?: EnergySource;
  filePath?: string;
  source?: TrackSource;
  popularity?: number | null;
  catalogPopularity?: number | null;
  catalogBpm?: string;
  catalogKey?: string;
  explicit?: boolean;
  isrc?: string | null;
};

export type SetDraft = {
  /** Version of the persisted draft payload. Missing on drafts written before migration support. */
  schemaVersion?: number;
  title: string;
  vibe: string;
  venue: string;
  slot: string;
  /** Dramaturgie-Rahmen laut Slot (Warm-up / Support / Peak / Closing) */
  slotKind: SetSlotKind;
  audience: string;
  gear: string;
  /** Free-form brief notes (promoter, doors, curfew, …). */
  notes?: string;
  /** Performance track that must stay first (Open). */
  openerId?: string | null;
  /** Performance track that must stay last (Release). */
  closerId?: string | null;
  durationMinutes: number;
  tracks: SetTrack[];
  /** Playlist pool from the last extract (max ~120). Enables reshuffle. */
  sourcePool?: SourcePoolTrack[];
};

export const SLOT_KINDS: {
  id: SetSlotKind;
  label: string;
  hint: string;
}[] = [
  {
    id: "warmup",
    label: "Warm-up",
    hint: "Atmosphäre, Headroom lassen, kein Peak",
  },
  {
    id: "support",
    label: "Support",
    hint: "Boden für den Headliner — Raum lassen",
  },
  {
    id: "peaktime",
    label: "Peak Time",
    hint: "Später Peak, Wellen atmen, Kontraste",
  },
  {
    id: "closing",
    label: "Closing",
    hint: "Nachhall, bewusst landen oder Twist",
  },
];

/** Energy map: low → medium → high → peak → release (DJ.Studio prep model) */
export const PHASES: SetPhase[] = [
  {
    id: "open",
    label: "Open",
    hint: "Low–mid · Headroom lassen",
    energy: 0.28,
    share: 0.17,
  },
  {
    id: "lift",
    label: "Lift",
    hint: "Textures · Vocals einführen",
    energy: 0.48,
    share: 0.25,
  },
  {
    id: "rise",
    label: "Rise",
    hint: "BPM/Mood anheben",
    energy: 0.68,
    share: 0.17,
  },
  {
    id: "peak",
    label: "Peak",
    hint: "Impact + Groove abwechseln",
    energy: 0.95,
    share: 0.25,
  },
  {
    id: "release",
    label: "Release",
    hint: "Kontrolliert landen, nicht maxen",
    energy: 0.4,
    share: 0.16,
  },
];

export const TRACK_ROLES: { id: TrackRole; label: string; hint: string }[] = [
  { id: "anchor", label: "Anchor", hint: "Crowd-Connector / Signature" },
  { id: "bridge", label: "Bridge", hint: "Pivot: Key, BPM, Energie" },
  { id: "groove", label: "Groove", hint: "Atem zwischen Peaks" },
  {
    id: "safety",
    label: "Alternativen",
    hint: "Plan B wenn der Floor dreht",
  },
];

export const TRANSITIONS: { id: TransitionVerb; label: string }[] = [
  { id: "unset", label: "Übergang wählen…" },
  { id: "long-blend", label: "Long blend" },
  { id: "eq-swap", label: "EQ swap" },
  { id: "echo-out", label: "Echo-out" },
  { id: "break-to-drop", label: "Break → drop" },
  { id: "stem-vocal", label: "Stem vocal overlay" },
  { id: "loop-filter", label: "Loop + filter rise" },
  { id: "power-reset", label: "Power-down reset" },
];

export const DEFAULT_SET: SetDraft = {
  title: "Nachtlinie 01",
  vibe: "Tech House → Melodic Peak",
  venue: "Club, mid-size, guter PA",
  slot: "Peak Time · 60 Min",
  slotKind: "peaktime",
  audience: "Locals, dancefloor schon warm",
  gear: "CDJs / USB",
  notes: "",
  durationMinutes: 60,
  tracks: [],
};

/**
 * Arc guidance — DJ.Studio + Rambos Magazine + DJLearn dramaturgy.
 * Peak is a moment, not a plateau; middle breathes in waves (Drive/Density).
 */
export const ARC_GUIDE: {
  phase: SetPhaseId;
  focus: string;
}[] = [
  {
    phase: "open",
    focus:
      "Der Opener gibt Orientierung und lässt Headroom. Neugier, ohne den Abend vorwegzunehmen. Ein Anschluss an das Set davor ist möglich.",
  },
  {
    phase: "lift",
    focus:
      "Drive und Dichte steigen in kleinen Wellen. Nicht nur das Tempo hochziehen: der Floor soll mitkommen und zwischendurch atmen.",
  },
  {
    phase: "rise",
    focus:
      "Hier entsteht Erwartung. Die Energie steigt Stufe für Stufe auf 7 bis 8, kleine BPM-Schritte und verwandte Keys tragen. Die Überraschung sitzt im Detail, nicht im Bruch.",
  },
  {
    phase: "peak",
    focus:
      "Peak Time ist der Moment der größten Aufmerksamkeit, keine Dauer-Härte. Kontraste halten den Impact lebendig.",
  },
  {
    phase: "release",
    focus:
      "Closing und Release lassen den Abend nachklingen. Kontrolliert landen, den Floor nicht abrupt abwürgen.",
  },
];

/** Arc guidance in the current language. `ARC_GUIDE` stays the German export. */
export function arcGuideFor(t: Translate): { phase: SetPhaseId; focus: string }[] {
  return PHASES.map((phase) => ({
    phase: phase.id,
    focus: t(`analysis.arc.${phase.id}`),
  }));
}

export function phaseWindowLabel(
  durationMinutes: number,
  phaseId: SetPhaseId,
  t: Translate = tDe,
): string {
  let start = 0;
  for (const phase of PHASES) {
    const end = start + durationMinutes * phase.share;
    if (phase.id === phaseId) {
      return t("analysis.phaseWindow", {
        start: Math.round(start),
        end: Math.round(end),
      });
    }
    start = end;
  }
  return "";
}

export const PREP_PRINCIPLES: { title: string; body: string }[] = [
  {
    title: "Dramaturgie statt Playlist",
    body: "Die Reihenfolge ist die Geschichte des Abends. Jeder Track verändert, wie der nächste wirkt. Eine starke Sammlung in der Reihenfolge der Playlist ist noch kein Set.",
  },
  {
    title: "Den Slot lesen",
    body: "Warm-up baut Atmosphäre und lässt Headroom. Support trägt den Floor, ohne dem Headliner den Peak zu nehmen. Peak Time setzt den Höhepunkt spät und hält ihn kurz. Closing landet bewusst, statt einfach aufzuhören.",
  },
  {
    title: "Wellen statt Rampe",
    body: "Drive und Dichte sollen atmen. Nicht jede Stelle muss lauter oder schneller sein als die vorherige. Ein ruhigerer Track nach einem Höhepunkt macht den nächsten Peak wieder hörbar.",
  },
  {
    title: "Plan, kein Skript",
    body: "Der Floor kann drehen. Pro Phase sollten mindestens zwei Alternativen bereitliegen, damit du einen Track tauschen kannst, ohne den Bogen neu zu erfinden. Die gespielte Reihenfolge bleibt die Performance, die Alternativen sind Plan B.",
  },
  {
    title: "Energie vor Key vor BPM",
    body: "Erst die Energie: gleiche Stufe oder ±1 ist weich, ein Sprung von drei Stufen braucht einen Break. Dann der Key: gleich, ±1 und A↔B auf derselben Zahl sind sicher, +2 ist ein Energy Boost für selten. Dann die BPM. Der Key zählt vor allem, wo Melodien überlappen, und die Analyse liegt bei etwa 89 %.",
  },
  {
    title: "In Phrasen mischen",
    body: "Ein sauberer Übergang sitzt auf 16, 32 oder 64 Takten. Ein passender Camelot-Key rettet keinen Chorus, der mitten in eine Strophe fällt.",
  },
];

const PREP_KEYS = ["dramaturgy", "slot", "waves", "plan", "energyFirst", "phrases"] as const;

/** Prep principles in the current language. `PREP_PRINCIPLES` stays the German export. */
export function prepPrinciplesFor(t: Translate): { title: string; body: string }[] {
  return PREP_KEYS.map((key) => ({
    title: t(`analysis.prep.${key}.title`),
    body: t(`analysis.prep.${key}.body`),
  }));
}

const EXTRACT_KEYS = ["pack", "arc", "roles", "harmonic"] as const;

/** Extraction steps in the current language. `EXTRACT_STEPS` stays the German export. */
export function extractStepsFor(t: Translate): { title: string; body: string }[] {
  return EXTRACT_KEYS.map((key) => ({
    title: t(`analysis.extractStep.${key}.title`),
    body: t(`analysis.extractStep.${key}.body`),
  }));
}

/** How playlist → set extraction works (UI explainer) */
export const EXTRACT_STEPS: { title: string; body: string }[] = [
  {
    title: "1. Auf die Brief-Dauer packen",
    body: "SETBUILDER nimmt Tracks aus der Playlist, bis die Ziel-Dauer des Briefs ungefähr erreicht ist. Was nicht in die Performance passt, bleibt als Alternative liegen.",
  },
  {
    title: "2. Einen Bogen legen",
    body: "Spotify gibt im Dev Mode keine Audio-Features frei. Der Bogen entsteht deshalb aus der BPM, wo sie vorhanden ist, und aus der Katalog-Popularität (oft von Tidal per ISRC). Langsamer und unbekannter öffnet, präsenter peakt, im Release wird es wieder ruhiger. Key und BPM liefert die Tidal-Schnittstelle oft nicht. Verlässlich kommen sie aus rekordbox oder vom Stick.",
  },
  {
    title: "3. Rollen vergeben",
    body: "Anchor sind die Signature-Momente, im Peak mit Abstand gesetzt. Bridge markiert, was Sorgfalt braucht: Phasenwechsel, Key-Clash, Energy Boost, BPM-Sprung oder zwei Energiestufen und mehr. Gleicher Key, ±1 und A↔B bleiben Groove, das ist der Atem dazwischen. Alternativen sind Plan B aus dem Rest der Playlist.",
  },
  {
    title: "4. Harmonik nachziehen",
    body: "„Harmonisch sortieren“ ordnet innerhalb einer Phase nach Camelot, Energie und kleinen BPM-Schritten. Opener und Closer bleiben Anfang und Ende — gepinnt oder als aktuelle erste/letzte Performance-Tracks. Ein bewusster Kontrast vor dem Peak-Anchor bleibt erlaubt. Die Live-Zeile unter jedem Track zeigt den tatsächlichen Übergang, auch nachdem du selbst gezogen oder einen Key geändert hast.",
  },
];

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function performanceTracks(tracks: SetTrack[]): SetTrack[] {
  return tracks.filter((track) => track.role !== "safety");
}

export function totalDurationMs(tracks: SetTrack[]): number {
  return performanceTracks(tracks).reduce(
    (sum, track) => sum + track.durationMs,
    0,
  );
}

/** Outro (and the blend into the next track) that is not played out. */
export const BLEND_MS = 2 * 60_000;

/**
 * Floor time of one track. Two minutes go to the blend; a short file still
 * counts for up to 30 seconds so it does not disappear from the slot.
 */
export function playedDurationMs(durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min(durationMs, Math.max(durationMs - BLEND_MS, 30_000));
}

/** Playing time of the performance: file lengths minus the blend on each track. */
export function playedTotalMs(tracks: SetTrack[]): number {
  return performanceTracks(tracks).reduce(
    (sum, track) => sum + playedDurationMs(track.durationMs),
    0,
  );
}

export function phaseDurationMs(
  tracks: SetTrack[],
  phase: SetPhaseId,
): number {
  return tracks
    .filter((track) => track.phase === phase && track.role !== "safety")
    .reduce((sum, track) => sum + playedDurationMs(track.durationMs), 0);
}

export function tracksByRole(tracks: SetTrack[], role: TrackRole): SetTrack[] {
  return tracks.filter((track) => track.role === role);
}

/**
 * Stable set position labels that survive role filters.
 * Performance tracks: 1…n in set order. Safety crate: S1…Sn.
 */
export function setPositionById(tracks: SetTrack[]): Map<string, string> {
  const map = new Map<string, string>();
  performanceTracks(tracks).forEach((track, index) => {
    map.set(track.id, String(index + 1));
  });
  tracks
    .filter((track) => track.role === "safety")
    .forEach((track, index) => {
      map.set(track.id, `S${index + 1}`);
    });
  return map;
}

export function exportSetText(draft: SetDraft, t: Translate = tDe): string {
  // A list for the booth: one line per track, no links, no explanations.
  const lines = [
    draft.title,
    [draft.vibe, draft.slot, draft.venue, draft.audience, draft.gear]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" · "),
    t("exports.text.target", {
      target: draft.durationMinutes,
      actual: formatDuration(playedTotalMs(draft.tracks)),
    }),
    ...(draft.notes?.trim() ? [draft.notes.trim(), ""] : [""]),
  ];

  const line = (track: SetTrack) => {
    const artists = track.artists.filter((name) => name && name !== "Unknown").join(", ");
    const meta = [
      track.durationMs ? formatDuration(track.durationMs) : "",
      track.keyCamelot,
      track.bpm,
      track.transition !== "unset" ? t(`domain.transition.${track.transition}`) : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return `${artists ? `${artists} – ` : ""}${track.name}${meta ? `  (${meta})` : ""}`;
  };

  let number = 0;
  for (const phase of PHASES) {
    const phaseTracks = draft.tracks.filter(
      (track) => track.phase === phase.id && track.role !== "safety",
    );
    if (phaseTracks.length === 0) continue;
    lines.push(
      `${t(`domain.phase.${phase.id}.label`)} (${phaseWindowLabel(draft.durationMinutes, phase.id, t)})`,
    );
    for (const track of phaseTracks) {
      number += 1;
      lines.push(`${number}. ${line(track)}`);
      const cue = [track.comment?.trim(), track.safetyAlt?.trim()]
        .filter(Boolean)
        .join(" · ");
      if (cue) lines.push(`   ${cue}`);
    }
    lines.push("");
  }

  const safeties = draft.tracks.filter((track) => track.role === "safety");
  if (safeties.length) {
    lines.push(t("exports.pdf.alternatives"));
    lines.push(
      t("exports.pdf.alternativesWhere", {
        name: stickAlternativesPlaylistName(draft.title, t("exports.pdf.alternatives")),
      }),
    );
    safeties.forEach((track, index) => {
      lines.push(`S${index + 1}. ${line(track)}`);
    });
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

/** Artist line for the UI: the "Unknown" placeholder of hand-made entries reads in the current language. */
export function artistLine(artists: string[], t: Translate = tDe): string {
  const named = artists.filter((name) => name && name !== "Unknown");
  return named.length ? named.join(", ") : t("common.unknown");
}

/** "1 Track" / "3 Tracks" */
export function trackCount(count: number, t: Translate = tDe): string {
  return t(count === 1 ? "analysis.trackCount.one" : "analysis.trackCount.other", { count });
}
