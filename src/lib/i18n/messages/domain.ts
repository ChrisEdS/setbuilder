// Area "domain": the fixed vocabulary of a set (slots, phases, roles, transitions).
// Phase names and the role names Anchor / Bridge / Groove stay English in both languages.
const de = {
  "domain.slot.warmup.label": "Warm-up",
  "domain.slot.warmup.hint": "Atmosphäre, Headroom lassen, kein Peak",
  "domain.slot.support.label": "Support",
  "domain.slot.support.hint": "Boden für den Headliner — Raum lassen",
  "domain.slot.peaktime.label": "Peak Time",
  "domain.slot.peaktime.hint": "Später Peak, Wellen atmen, Kontraste",
  "domain.slot.closing.label": "Closing",
  "domain.slot.closing.hint": "Nachhall, bewusst landen oder Twist",

  "domain.phase.open.label": "Open",
  "domain.phase.open.hint": "Aufwärmen, Energie 3–5, Headroom lassen",
  "domain.phase.lift.label": "Lift",
  "domain.phase.lift.hint": "Textures und Vocals, Energie steigt langsam",
  "domain.phase.rise.label": "Rise",
  "domain.phase.rise.hint": "Auf 7–8, BPM und Mood anheben",
  "domain.phase.peak.label": "Peak",
  "domain.phase.peak.hint": "8–10, Impact und Groove abwechseln",
  "domain.phase.release.label": "Release",
  "domain.phase.release.hint": "Landen, 2–3 Stufen runter, nicht maxen",

  "domain.role.anchor.label": "Anchor",
  "domain.role.anchor.hint": "Signature-Moment, Crowd-Connector",
  "domain.role.anchor.explain":
    "Die großen Signature-Tracks, die der Floor kennt. Im Peak mit Abstand setzen — hintereinander verbrennen sie, einzeln tragen sie den Slot.",
  "domain.role.bridge.label": "Bridge",
  "domain.role.bridge.hint": "Sorgfalt: Key-Clash, BPM- oder Energie-Sprung",
  "domain.role.bridge.explain":
    "Übergänge, die du bewusst planst: Key-Clash, BPM-Sprung, Energy Boost oder Phasenwechsel. Hier entscheidest du Cut, EQ oder Break — nicht Autopilot.",
  "domain.role.groove.label": "Groove",
  "domain.role.groove.hint": "Atem zwischen Peaks, weicher Mix",
  "domain.role.groove.explain":
    "Weiche Anschlüsse zwischen den Peaks. Gleicher Key, ±1 oder A↔B — der Atem, der den Floor hält, ohne zu pushen.",
  "domain.role.safety.label": "Alternativen",
  "domain.role.safety.hint": "Plan B, wenn der Floor dreht",
  "domain.role.safety.explain":
    "Ersatz neben der Performance. Zählt nicht in der Spieldauer, bis du ihn einsetzt — wenn der Floor dreht oder ein Anchor nicht trägt.",

  "domain.transition.unset": "—",
  "domain.transition.unset.hint": "Kein Übergang. Der Mix bleibt unmarkiert.",
  "domain.transition.cut": "Cut",
  "domain.transition.cut.hint": "Hart auf der Eins, ohne Blend.",
  "domain.transition.short-blend": "Short blend",
  "domain.transition.short-blend.hint": "Kurzer Blend, 4–8 Takte.",
  "domain.transition.long-blend": "Long blend",
  "domain.transition.long-blend.hint":
    "Langer Überblend, 16–32 Takte. Für gleichen oder nahen Key, Energie ±1.",
  "domain.transition.eq-swap": "EQ swap",
  "domain.transition.eq-swap.hint":
    "Bass raus, Bass rein. Gut bei Clash oder wenn Melodien sich beißen.",
  "domain.transition.echo-out": "Echo-out",
  "domain.transition.echo-out.hint":
    "Track ausklingen lassen, dann neu starten. Reset, wenn Energie oder Key springt.",
  "domain.transition.delay-throw": "Delay throw",
  "domain.transition.delay-throw.hint": "Ein Delay auf die letzte Phrase, dann der nächste Track.",
  "domain.transition.filter-out": "Filter out",
  "domain.transition.filter-out.hint": "Outgoing mit High-Pass ausdünnen, bis der nächste da ist.",
  "domain.transition.loop-filter": "Loop + filter rise",
  "domain.transition.loop-filter.hint":
    "Loop plus Filter hoch. Baut Spannung, überbrückt BPM- oder Key-Abstand.",
  "domain.transition.break-to-drop": "Break → drop",
  "domain.transition.break-to-drop.hint":
    "Im Break wechseln, auf den Drop des Nächsten. Für Energy Boost oder Peak.",
  "domain.transition.double-drop": "Double drop",
  "domain.transition.double-drop.hint": "Beide Drops zusammen, dann einer bleibt.",
  "domain.transition.stem-vocal": "Stem vocal overlay",
  "domain.transition.stem-vocal.hint":
    "Vocal über den nächsten Track legen. Braucht Platz im Mix, nicht bei Clash.",
  "domain.transition.backspin": "Backspin",
  "domain.transition.backspin.hint": "Platte zurück, dann der nächste Track.",
  "domain.transition.power-reset": "Power-down reset",
  "domain.transition.power-reset.hint":
    "Hart raus, Stille, neu rein. Wenn Energie um 3+ fällt oder der Floor dreht.",
} as const;

const en: Record<keyof typeof de, string> = {
  "domain.slot.warmup.label": "Warm-up",
  "domain.slot.warmup.hint": "Atmosphere, leave headroom, no peak",
  "domain.slot.support.label": "Support",
  "domain.slot.support.hint": "Set the stage for the headliner — leave room",
  "domain.slot.peaktime.label": "Peak Time",
  "domain.slot.peaktime.hint": "Late peak, let the waves breathe, contrasts",
  "domain.slot.closing.label": "Closing",
  "domain.slot.closing.hint": "Afterglow, land on purpose or add a twist",

  "domain.phase.open.label": "Open",
  "domain.phase.open.hint": "Warm-up, energy 3–5, leave headroom",
  "domain.phase.lift.label": "Lift",
  "domain.phase.lift.hint": "Textures and vocals, energy rises slowly",
  "domain.phase.rise.label": "Rise",
  "domain.phase.rise.hint": "Up to 7–8, raise BPM and mood",
  "domain.phase.peak.label": "Peak",
  "domain.phase.peak.hint": "8–10, alternate impact and groove",
  "domain.phase.release.label": "Release",
  "domain.phase.release.hint": "Land it, drop 2–3 levels, don't max out",

  "domain.role.anchor.label": "Anchor",
  "domain.role.anchor.hint": "Signature moment, crowd connector",
  "domain.role.anchor.explain":
    "The big signature tracks the floor knows. Space them in the peak — back to back they burn out, one by one they carry the slot.",
  "domain.role.bridge.label": "Bridge",
  "domain.role.bridge.hint": "Needs care: key clash, BPM or energy jump",
  "domain.role.bridge.explain":
    "Transitions you plan on purpose: key clash, BPM jump, energy boost or phase change. Here you choose cut, EQ or break — not autopilot.",
  "domain.role.groove.label": "Groove",
  "domain.role.groove.hint": "Breath between peaks, a smooth mix",
  "domain.role.groove.explain":
    "Soft joins between the peaks. Same key, ±1 or A↔B — the breath that holds the floor without pushing.",
  "domain.role.safety.label": "Alternatives",
  "domain.role.safety.hint": "Plan B when the floor turns",
  "domain.role.safety.explain":
    "Backups beside the performance. They don't count in playtime until you insert them — when the floor turns or an anchor doesn't land.",

  "domain.transition.unset": "—",
  "domain.transition.unset.hint": "No transition. The mix stays unmarked.",
  "domain.transition.cut": "Cut",
  "domain.transition.cut.hint": "Hard on the one, no blend.",
  "domain.transition.short-blend": "Short blend",
  "domain.transition.short-blend.hint": "Short blend, 4–8 bars.",
  "domain.transition.long-blend": "Long blend",
  "domain.transition.long-blend.hint":
    "Long blend, 16–32 bars. For the same or a nearby key, energy ±1.",
  "domain.transition.eq-swap": "EQ swap",
  "domain.transition.eq-swap.hint":
    "Bass out, bass in. Good on a clash or when melodies fight.",
  "domain.transition.echo-out": "Echo-out",
  "domain.transition.echo-out.hint":
    "Let the track ring out, then start fresh. A reset when energy or key jumps.",
  "domain.transition.delay-throw": "Delay throw",
  "domain.transition.delay-throw.hint": "A delay on the last phrase, then the next track.",
  "domain.transition.filter-out": "Filter out",
  "domain.transition.filter-out.hint": "Thin the outgoing track with a high-pass until the next one is in.",
  "domain.transition.loop-filter": "Loop + filter rise",
  "domain.transition.loop-filter.hint":
    "Loop plus a rising filter. Builds tension, bridges a BPM or key gap.",
  "domain.transition.break-to-drop": "Break → drop",
  "domain.transition.break-to-drop.hint":
    "Switch in the break, onto the next drop. For an Energy Boost or the peak.",
  "domain.transition.double-drop": "Double drop",
  "domain.transition.double-drop.hint": "Both drops together, then one stays.",
  "domain.transition.stem-vocal": "Stem vocal overlay",
  "domain.transition.stem-vocal.hint":
    "Lay a vocal over the next track. Needs space in the mix, not on a clash.",
  "domain.transition.backspin": "Backspin",
  "domain.transition.backspin.hint": "Spin the record back, then the next track.",
  "domain.transition.power-reset": "Power-down reset",
  "domain.transition.power-reset.hint":
    "Hard out, silence, back in. When energy drops 3+ or the floor turns.",
};

export const domain = { de, en };
