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
  note: string;
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

export type SetDraft = {
  title: string;
  vibe: string;
  venue: string;
  slot: string;
  /** Dramaturgie-Rahmen laut Slot (Warm-up / Support / Peak / Closing) */
  slotKind: SetSlotKind;
  audience: string;
  gear: string;
  durationMinutes: number;
  tracks: SetTrack[];
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
    hint: "Nachhall, bewusst landen oder twist",
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
  { id: "bridge", label: "Bridge", hint: "Key/BPM/Mood-Pivot" },
  { id: "groove", label: "Groove", hint: "Atem zwischen Peaks" },
  {
    id: "safety",
    label: "Alternativen",
    hint: "Plan B wenn der Floor dreht",
  },
];

export const TRANSITIONS: { id: TransitionVerb; label: string }[] = [
  { id: "unset", label: "Transition wählen…" },
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
  durationMinutes: 60,
  tracks: [],
};

/**
 * Arc guidance — DJ.Studio + Rambos Magazine + DJLearn dramaturgy.
 * Peak is a moment, not a plateau; middle breathes in waves (Drive/Density).
 */
export const ARC_GUIDE = [
  {
    phase: "open" as SetPhaseId,
    window: "00:00–10:00",
    focus:
      "Opener gibt Orientierung — Neugier, ohne alles vorwegzunehmen; Anschluss an DJ davor möglich",
  },
  {
    phase: "lift" as SetPhaseId,
    window: "10:00–25:00",
    focus:
      "Drive & Density steigern (nicht nur BPM); kleine Wellen, Raum zum Atmen",
  },
  {
    phase: "rise" as SetPhaseId,
    window: "25:00–35:00",
    focus:
      "Erwartung aufbauen — ±2–4 BPM / Relative Keys; Überraschung in kleinen Details",
  },
  {
    phase: "peak" as SetPhaseId,
    window: "35:00–50:00",
    focus:
      "Peak Time = maximale Aufmerksamkeit, nicht Dauer-Härte; Kontraste halten Impact lebendig",
  },
  {
    phase: "release" as SetPhaseId,
    window: "50:00–60:00",
    focus:
      "Closing/Release mit Nachhall — kontrolliert landen, Floor nicht abrupt killen",
  },
];

export const PREP_PRINCIPLES = [
  "Dramaturgie statt Playlist: jeder Track verändert, wie der nächste wirkt — Reihenfolge ist Story, nicht nur Sammlung.",
  "Slot lesen: Warm-up peakt nicht. Peak Time peakt spät und kurz. Closing landet bewusst.",
  "Wellen statt Rampe: Drive und Density atmen lassen — nicht nur BPM hochdrücken.",
  "Plan, kein Script: Safety-Alternates bereithalten, wenn der Floor dreht.",
  "Harmonik stützt den Flow — ersetzt aber keine Energie-Entscheidung.",
  "Phrasing in 16/32/64: Key allein rettet keinen Chorus-on-Verse-Clash.",
];

/** How playlist → set extraction works (UI explainer) */
export const EXTRACT_STEPS: { title: string; body: string }[] = [
  {
    title: "1. Auf die Brief-Dauer packen",
    body: "Tracks werden in Playlist-Reihenfolge (Crate-Order) genommen, bis die Ziel-Minuten voll sind. Der Rest landet als Safety.",
  },
  {
    title: "2. Phasen nach Laufzeit",
    body: "Open → Lift → Rise → Peak → Release bekommen feste Anteile der Set-Länge. Frühe Crate-Tracks starten eher soft, spätere eher peaken.",
  },
  {
    title: "3. Rollen vergeben",
    body: "Anchor = Signature/Peak-Momente (mit Abstand). Bridge = Key-/BPM-/Mood-Pivot. Groove = Atem zwischen Peaks. Safety = Plan B aus dem Rest.",
  },
  {
    title: "4. Harmonik optional nachziehen",
    body: "Innerhalb einer Phase sortiert SETFORM nach Camelot + kleinen BPM-Schritten. Ein bewusster Kontrast vor dem Peak-Anchor bleibt erlaubt.",
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

export function phaseDurationMs(
  tracks: SetTrack[],
  phase: SetPhaseId,
): number {
  return totalDurationMs(
    tracks.filter((track) => track.phase === phase && track.role !== "safety"),
  );
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

export function exportSetText(draft: SetDraft): string {
  const lines = [
    draft.title,
    `${draft.vibe}`,
    `Venue: ${draft.venue}`,
    `Slot: ${draft.slot}`,
    `Audience: ${draft.audience}`,
    `Gear: ${draft.gear}`,
    `Ziel: ${draft.durationMinutes} min · Ist: ${formatDuration(totalDurationMs(draft.tracks))}`,
    "",
    "Prep-Prinzipien:",
    ...PREP_PRINCIPLES.map((item) => `• ${item}`),
    "",
  ];

  for (const phase of PHASES) {
    const phaseTracks = draft.tracks.filter(
      (track) => track.phase === phase.id && track.role !== "safety",
    );
    if (phaseTracks.length === 0) continue;
    const guide = ARC_GUIDE.find((item) => item.phase === phase.id);
    lines.push(`## ${phase.label}${guide ? ` (${guide.window})` : ""}`);
    if (guide) lines.push(guide.focus);
    phaseTracks.forEach((track, index) => {
      const meta = [
        track.role,
        track.bpm ? `${track.bpm} BPM` : null,
        track.keyCamelot || null,
        track.transition !== "unset" ? track.transition : null,
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(
        `${index + 1}. ${track.artists.join(", ")} – ${track.name} (${formatDuration(track.durationMs)}) [${meta}]`,
      );
      if (track.note) lines.push(`   Cue: ${track.note}`);
      if (track.safetyAlt) lines.push(`   Safety: ${track.safetyAlt}`);
      lines.push(`   ${track.externalUrl}`);
    });
    lines.push("");
  }

  const safeties = draft.tracks.filter((track) => track.role === "safety");
  if (safeties.length) {
    lines.push("## Safety nets");
    safeties.forEach((track, index) => {
      lines.push(
        `${index + 1}. ${track.artists.join(", ")} – ${track.name} (${formatDuration(track.durationMs)})`,
      );
      if (track.why) lines.push(`   ${track.why}`);
      lines.push(`   ${track.externalUrl}`);
    });
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}
