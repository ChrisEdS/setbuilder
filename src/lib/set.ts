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
  /** Free-form DJ comment for manual arrange */
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
  { id: "bridge", label: "Bridge", hint: "Key/BPM/Mood-Pivot" },
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
      "Hier entsteht Erwartung. Kleine BPM-Schritte und verwandte Keys tragen. Die Überraschung sitzt im Detail, nicht im Bruch.",
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

export function phaseWindowLabel(
  durationMinutes: number,
  phaseId: SetPhaseId,
): string {
  let start = 0;
  for (const phase of PHASES) {
    const end = start + durationMinutes * phase.share;
    if (phase.id === phaseId) {
      return `${Math.round(start)}–${Math.round(end)} min`;
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
    body: "Der Floor kann drehen. Alternativen liegen bereit, damit du einen Track tauschen kannst, ohne den Bogen neu zu erfinden. Die gespielte Reihenfolge bleibt die Performance, die Alternativen sind Plan B.",
  },
  {
    title: "Harmonik stützt den Flow",
    body: "Gleicher Key, Relative und Nachbar-Keys tragen einen Übergang. Ein Clash kann Absicht sein, besonders vor einem Peak. Der Key entscheidet nicht allein, ob der Moment stimmt. Slot und Energie kommen zuerst.",
  },
  {
    title: "In Phrasen mischen",
    body: "Ein sauberer Übergang sitzt auf 16, 32 oder 64 Takten. Ein passender Camelot-Key rettet keinen Chorus, der mitten in eine Strophe fällt.",
  },
];

/** How playlist → set extraction works (UI explainer) */
export const EXTRACT_STEPS: { title: string; body: string }[] = [
  {
    title: "1. Auf die Brief-Dauer packen",
    body: "SETFORM nimmt Tracks aus der Playlist, bis die Ziel-Dauer des Briefs ungefähr erreicht ist. Was nicht in die Performance passt, bleibt als Alternative liegen.",
  },
  {
    title: "2. Einen Bogen legen",
    body: "Spotify gibt im Dev Mode keine Audio-Features frei. Der Bogen entsteht deshalb aus der BPM, wo sie vorhanden ist, und aus der Katalog-Popularität (oft von Tidal per ISRC). Langsamer und unbekannter öffnet, präsenter peakt, im Release wird es wieder ruhiger. Key und BPM liefert die Tidal-Schnittstelle oft nicht. Verlässlich kommen sie aus rekordbox oder vom Stick.",
  },
  {
    title: "3. Rollen vergeben",
    body: "Anchor sind die Signature-Momente, im Peak mit Abstand gesetzt. Bridge markiert einen Wechsel von Phase, Key oder BPM. Groove ist der Atem dazwischen. Alternativen sind Plan B aus dem Rest der Playlist.",
  },
  {
    title: "4. Harmonik nachziehen",
    body: "„Harmonisch sortieren“ ordnet innerhalb einer Phase nach Camelot und kleinen BPM-Schritten. Ein bewusster Kontrast vor dem Peak-Anchor bleibt erlaubt. Die Live-Zeile unter jedem Track zeigt den tatsächlichen Übergang, auch nachdem du selbst gezogen oder einen Key geändert hast.",
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
    ...PREP_PRINCIPLES.flatMap((item) => [`• ${item.title}`, `  ${item.body}`]),
    "",
  ];

  for (const phase of PHASES) {
    const phaseTracks = draft.tracks.filter(
      (track) => track.phase === phase.id && track.role !== "safety",
    );
    if (phaseTracks.length === 0) continue;
    const guide = ARC_GUIDE.find((item) => item.phase === phase.id);
    lines.push(
      `## ${phase.label} (${phaseWindowLabel(draft.durationMinutes, phase.id)})`,
    );
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

/** "1 Track" / "3 Tracks" */
export function trackCount(count: number): string {
  return `${count} ${count === 1 ? "Track" : "Tracks"}`;
}
