// Area "analysis": keys start with "analysis.". Declare `de` first, then type `en` against it.
const de = {
  // Energy
  "analysis.energy.same": "Energie gleich",
  "analysis.energy.delta": "Energie {delta}",

  // Harmonic relations and mix joins
  "analysis.relation.same": "gleiche Key",
  "analysis.relation.relative": "Relative Dur/Moll",
  "analysis.relation.energyBoost": "Energy Boost (+2)",
  "analysis.relation.adjacent": "Nachbar-Key (±1)",
  "analysis.relation.contrast": "Key-Contrast",
  "analysis.relation.clash": "Harmonic clash",
  "analysis.relation.unknown": "Key offen",
  "analysis.mix.energyJump": "{energy} (Sprung)",
  "analysis.side.before": "davor",
  "analysis.side.after": "danach",
  "analysis.key.open": "Key offen",
  "analysis.bpm.open": "BPM offen",

  // Stored "why" texts (see src/lib/i18n/stored.ts)
  "analysis.why.groove": "Groove-Atem im Arc",
  "analysis.why.peakAnchor": "Peak-Anchor (Impact, danach Groove)",
  "analysis.why.peakContrast": "Peak-Signature / Key-Contrast Moment",
  "analysis.why.phasePivot": "Phasen-Pivot {from} → {to}",
  "analysis.why.bridgeClash": "Brücke: Key-Clash, kurz überlappen oder per Break wechseln",
  "analysis.why.bridgeEnergyBoost": "Brücke: Energy Boost (+2)",
  "analysis.why.bridgeContrast": "Brücke: Key-Contrast",
  "analysis.why.bridgeEnergy": "Brücke: Energie {from} → {to}",
  "analysis.why.bridgeEnergyJump":
    "Brücke: Energie {from} → {to} (Sprung, Break oder Reset nötig)",
  "analysis.why.bridgeBpm": "Brücke: BPM-Sprung (>3)",
  "analysis.why.closing": "Closing-Anchor — kontrolliert landen",
  "analysis.why.opener": "Opener — Headroom, Long Blend",
  "analysis.why.peakSignature": "Peak-Signature — bewusster Contrast vor Release",
  "analysis.why.safetyNet":
    "Safety net aus Playlist-Rest (nicht in der Performance-Reihenfolge)",
  "analysis.why.trimmed": "Beim Kürzen auf den Slot unter Alternativen gelegt",
  "analysis.why.replacementFor": "Ersatz für {name}",
  "analysis.why.replacedBy": "Ersetzt durch {name}",
  "analysis.why.manual": "Manuell gesetzt",

  // Stored notes
  "analysis.note.transition": "Übergang: {transition}",
  "analysis.note.safety": "Plan B — nur wenn der Raum dreht",

  // Set extraction
  "analysis.extract.noTracks": "Playlist enthält keine abspielbaren Tracks.",
  "analysis.extract.vibe": "Aus Playlist: {name}",
  "analysis.extract.slot": "{minutes} Min · harmonic arc",

  // Set prose
  "analysis.phaseWindow": "{start}–{end} min",
  "analysis.trackCount.one": "{count} Track",
  "analysis.trackCount.other": "{count} Tracks",
  "analysis.arc.open":
    "Der Opener gibt Orientierung und lässt Headroom. Neugier, ohne den Abend vorwegzunehmen. Ein Anschluss an das Set davor ist möglich.",
  "analysis.arc.lift":
    "Drive und Dichte steigen in kleinen Wellen. Nicht nur das Tempo hochziehen: der Floor soll mitkommen und zwischendurch atmen.",
  "analysis.arc.rise":
    "Hier entsteht Erwartung. Die Energie steigt Stufe für Stufe auf 7 bis 8, kleine BPM-Schritte und verwandte Keys tragen. Die Überraschung sitzt im Detail, nicht im Bruch.",
  "analysis.arc.peak":
    "Peak Time ist der Moment der größten Aufmerksamkeit, keine Dauer-Härte. Kontraste halten den Impact lebendig.",
  "analysis.arc.release":
    "Closing und Release lassen den Abend nachklingen. Kontrolliert landen, den Floor nicht abrupt abwürgen.",
  "analysis.prep.dramaturgy.title": "Dramaturgie statt Playlist",
  "analysis.prep.dramaturgy.body":
    "Die Reihenfolge ist die Geschichte des Abends. Jeder Track verändert, wie der nächste wirkt. Eine starke Sammlung in der Reihenfolge der Playlist ist noch kein Set.",
  "analysis.prep.slot.title": "Den Slot lesen",
  "analysis.prep.slot.body":
    "Warm-up baut Atmosphäre und lässt Headroom. Support trägt den Floor, ohne dem Headliner den Peak zu nehmen. Peak Time setzt den Höhepunkt spät und hält ihn kurz. Closing landet bewusst, statt einfach aufzuhören.",
  "analysis.prep.waves.title": "Wellen statt Rampe",
  "analysis.prep.waves.body":
    "Drive und Dichte sollen atmen. Nicht jede Stelle muss lauter oder schneller sein als die vorherige. Ein ruhigerer Track nach einem Höhepunkt macht den nächsten Peak wieder hörbar.",
  "analysis.prep.plan.title": "Plan, kein Skript",
  "analysis.prep.plan.body":
    "Der Floor kann drehen. Pro Phase sollten mindestens zwei Alternativen bereitliegen, damit du einen Track tauschen kannst, ohne den Bogen neu zu erfinden. Die gespielte Reihenfolge bleibt die Performance, die Alternativen sind Plan B.",
  "analysis.prep.energyFirst.title": "Energie vor Key vor BPM",
  "analysis.prep.energyFirst.body":
    "Erst die Energie: gleiche Stufe oder ±1 ist weich, ein Sprung von drei Stufen braucht einen Break. Dann der Key: gleich, ±1 und A↔B auf derselben Zahl sind sicher, +2 ist ein Energy Boost für selten. Dann die BPM. Der Key zählt vor allem, wo Melodien überlappen, und die Analyse liegt bei etwa 89 %.",
  "analysis.prep.phrases.title": "In Phrasen mischen",
  "analysis.prep.phrases.body":
    "Ein sauberer Übergang sitzt auf 16, 32 oder 64 Takten. Ein passender Camelot-Key rettet keinen Chorus, der mitten in eine Strophe fällt.",
  "analysis.extractStep.pack.title": "1. Auf die Brief-Dauer packen",
  "analysis.extractStep.pack.body":
    "SETFORM nimmt Tracks aus der Playlist, bis die Ziel-Dauer des Briefs ungefähr erreicht ist. Was nicht in die Performance passt, bleibt als Alternative liegen.",
  "analysis.extractStep.arc.title": "2. Einen Bogen legen",
  "analysis.extractStep.arc.body":
    "Spotify gibt im Dev Mode keine Audio-Features frei. Der Bogen entsteht deshalb aus der BPM, wo sie vorhanden ist, und aus der Katalog-Popularität (oft von Tidal per ISRC). Langsamer und unbekannter öffnet, präsenter peakt, im Release wird es wieder ruhiger. Key und BPM liefert die Tidal-Schnittstelle oft nicht. Verlässlich kommen sie aus rekordbox oder vom Stick.",
  "analysis.extractStep.roles.title": "3. Rollen vergeben",
  "analysis.extractStep.roles.body":
    "Anchor sind die Signature-Momente, im Peak mit Abstand gesetzt. Bridge markiert, was Sorgfalt braucht: Phasenwechsel, Key-Clash, Energy Boost, BPM-Sprung oder zwei Energiestufen und mehr. Gleicher Key, ±1 und A↔B bleiben Groove, das ist der Atem dazwischen. Alternativen sind Plan B aus dem Rest der Playlist.",
  "analysis.extractStep.harmonic.title": "4. Harmonik nachziehen",
  "analysis.extractStep.harmonic.body":
    "„Harmonisch sortieren“ ordnet innerhalb einer Phase nach Camelot, Energie und kleinen BPM-Schritten. Ein bewusster Kontrast vor dem Peak-Anchor bleibt erlaubt. Die Live-Zeile unter jedem Track zeigt den tatsächlichen Übergang, auch nachdem du selbst gezogen oder einen Key geändert hast.",

  // EnergyPath component
  "analysis.energyPath.title": "Energie-Verlauf",
  "analysis.energyPath.note":
    "Energy Level 1–10 pro Track gegen das Zielband der Phase. Energie entscheidet, wie der Raum sich anfühlt. Der Key sorgt nur dafür, dass es nicht schief klingt.",
  "analysis.energyPath.statKnown": "Tracks mit Energie",
  "analysis.energyPath.statJumps": "Sprünge ab 3 Stufen",
  "analysis.energyPath.statOutside": "Außerhalb Phasenband",
  "analysis.energyPath.noLevels":
    "Noch keine Energy Levels. Mixed In Key schreibt sie als Kommentar („7A - Energy 6“) in deine rekordbox-Tracks. In rekordbox die Tags neu laden („Reload Tags“), dann Stick oder Collection erneut laden. Du kannst die Energie auch in der Setliste pro Track von Hand setzen.",
  "analysis.energyPath.target": "Ziel {min}–{max}",
  "analysis.energyPath.bandLabel": "Ziel",
  "analysis.energyPath.planB": "Plan B: {count}",
  "analysis.energyPath.planBThin": "Plan B: {count} · mind. {min} empfohlen",
  "analysis.energyPath.trackEnergy": "{name} · Energy {level}",
  "analysis.energyPath.trackEnergyUnknown": "{name} · Energy offen",
  "analysis.energyPath.foldTitle": "Energie, Key und BPM: was zählt wann",
  "analysis.energyPath.step1.title": "1. Energie zuerst",
  "analysis.energyPath.step1.body":
    "Gleiche Stufe oder ±1 ist weich. Ein Sprung von 5 auf 7 wirkt abrupt, 9 auf 5 verliert die Tanzfläche, außer als bewusster Reset. Ein Set ist eine Welle: aufwärmen bei 3–5, stufenweise auf 7–8, Peak 8–10, dann 2–3 Stufen runter und neu aufbauen.",
  "analysis.energyPath.step2.title": "2. Dann der Key",
  "analysis.energyPath.step2.body":
    "Sicher sind gleicher Key, ±1 Zahl und A↔B auf derselben Zahl. Energy Boost ist +2 mit gleichem Buchstaben, sparsam einsetzen. Alles andere geht nur mit kurzem Übergang, Break oder EQ.",
  "analysis.energyPath.step3.title": "3. Dann BPM",
  "analysis.energyPath.step3.body":
    "Kleine Schritte gleicht der Pitch aus. Größere Sprünge brauchen einen Break oder Reset. Phrasen sauber auf 16 oder 32 Takte legen.",
  "analysis.energyPath.step4.title": "Hören schlägt Analyse",
  "analysis.energyPath.step4.body":
    "Mixed In Key liegt beim Key bei etwa 89 %. Klingt ein Übergang falsch, den relativen Dur- oder Moll-Key probieren. Kritische Übergänge vorher testen und pro Richtung zwei Ausweichtracks bereithalten.",

  // HarmonicPath component. `**text**` marks bold text.
  "analysis.harmonic.ariaLabel": "Harmonic path",
  "analysis.harmonic.title": "Harmonic Path",
  "analysis.harmonic.titleEmbedded": "Key-Verlauf",
  "analysis.harmonic.note":
    "Camelot entlang der gespielten Reihenfolge. „Harmonisch sortieren“ rückt verwandte Keys zusammen und folgt dabei der Energie, soweit Energy Levels da sind. Ein Clash vor dem Peak bleibt erlaubt.",
  "analysis.harmonic.harmonize": "Harmonisch sortieren",
  "analysis.harmonic.statKeys": "Keys gesetzt",
  "analysis.harmonic.statScore": "Mix-Score",
  "analysis.harmonic.statClashes": "Clashes",
  "analysis.harmonic.emptyTitle": "Noch kein Set.",
  "analysis.harmonic.emptyHint":
    "Zuerst eine Playlist vom Stick laden, dann erscheint hier der Key-Verlauf.",
  "analysis.harmonic.start": "Start",
  "analysis.harmonic.foldTitle": "Camelot & Mix-Score erklärt",
  "analysis.harmonic.explain1":
    "**Mix-Score** bewertet jeden Übergang aus Key und, wenn vorhanden, Energie zu gleichen Teilen, dazu eine kleine BPM-Korrektur. Sicher sind gleicher Key, ±1 Zahl und A↔B auf derselben Zahl. **Energy Boost** ist +2 mit gleichem Buchstaben, sparsam einsetzen. Clashes brauchen einen Break oder kurzen Übergang.",
  "analysis.harmonic.explain2":
    "Der Key ist ein Startpunkt, kein Freifahrtschein. Er zählt vor allem, wenn Melodien überlappen, und die Analyse liegt bei etwa 89 %. Bei einem Clash lohnt der Blick auf den relativen Dur- oder Moll-Key.",
  "analysis.harmonic.explain3":
    "Farben folgen dem Camelot Wheel (1–12). **A** = Moll (kräftiger), **B** = Dur (heller). Keys im Bereich „Set laden & Keys“ importieren oder in der Setliste setzen, dann „Harmonisch sortieren“.",
  "analysis.harmonic.legendLabel": "Camelot Farben",
} as const;

const en: Record<keyof typeof de, string> = {
  "analysis.energy.same": "Energy same",
  "analysis.energy.delta": "Energy {delta}",

  "analysis.relation.same": "same key",
  "analysis.relation.relative": "Relative major/minor",
  "analysis.relation.energyBoost": "Energy Boost (+2)",
  "analysis.relation.adjacent": "Adjacent key (±1)",
  "analysis.relation.contrast": "Key contrast",
  "analysis.relation.clash": "Harmonic clash",
  "analysis.relation.unknown": "Key unknown",
  "analysis.mix.energyJump": "{energy} (jump)",
  "analysis.side.before": "before",
  "analysis.side.after": "after",
  "analysis.key.open": "Key unknown",
  "analysis.bpm.open": "BPM unknown",

  "analysis.why.groove": "Groove breather in the arc",
  "analysis.why.peakAnchor": "Peak anchor (impact, then groove)",
  "analysis.why.peakContrast": "Peak signature / key contrast moment",
  "analysis.why.phasePivot": "Phase pivot {from} → {to}",
  "analysis.why.bridgeClash": "Bridge: key clash, overlap briefly or switch on a break",
  "analysis.why.bridgeEnergyBoost": "Bridge: Energy Boost (+2)",
  "analysis.why.bridgeContrast": "Bridge: key contrast",
  "analysis.why.bridgeEnergy": "Bridge: energy {from} → {to}",
  "analysis.why.bridgeEnergyJump":
    "Bridge: energy {from} → {to} (jump, needs a break or reset)",
  "analysis.why.bridgeBpm": "Bridge: BPM jump (>3)",
  "analysis.why.closing": "Closing anchor — land it in control",
  "analysis.why.opener": "Opener — headroom, long blend",
  "analysis.why.peakSignature": "Peak signature — deliberate contrast before release",
  "analysis.why.safetyNet":
    "Safety net from the rest of the playlist (not in the performance order)",
  "analysis.why.trimmed": "Moved to Alternatives when trimming to the slot",
  "analysis.why.replacementFor": "Replacement for {name}",
  "analysis.why.replacedBy": "Replaced by {name}",
  "analysis.why.manual": "Set manually",

  "analysis.note.transition": "Transition: {transition}",
  "analysis.note.safety": "Plan B — only if the room turns",

  "analysis.extract.noTracks": "The playlist has no playable tracks.",
  "analysis.extract.vibe": "From playlist: {name}",
  "analysis.extract.slot": "{minutes} min · harmonic arc",

  "analysis.phaseWindow": "{start}–{end} min",
  "analysis.trackCount.one": "{count} track",
  "analysis.trackCount.other": "{count} tracks",
  "analysis.arc.open":
    "The opener gives orientation and leaves headroom. Curiosity without giving the night away. A link to the set before is possible.",
  "analysis.arc.lift":
    "Drive and density rise in small waves. Don't just push the tempo: the floor should come along and breathe in between.",
  "analysis.arc.rise":
    "This is where anticipation builds. Energy climbs step by step to 7 or 8, small BPM steps and related keys carry it. The surprise sits in the detail, not in a break.",
  "analysis.arc.peak":
    "Peak time is the moment of greatest attention, not constant hardness. Contrast keeps the impact alive.",
  "analysis.arc.release":
    "Closing and release let the night ring out. Land in control, don't choke the floor abruptly.",
  "analysis.prep.dramaturgy.title": "Dramaturgy, not a playlist",
  "analysis.prep.dramaturgy.body":
    "The order is the story of the night. Every track changes how the next one lands. A strong collection in playlist order is not a set yet.",
  "analysis.prep.slot.title": "Read the slot",
  "analysis.prep.slot.body":
    "A warm-up builds atmosphere and leaves headroom. Support carries the floor without taking the peak from the headliner. Peak time puts the high point late and keeps it short. A closing lands on purpose instead of just stopping.",
  "analysis.prep.waves.title": "Waves, not a ramp",
  "analysis.prep.waves.body":
    "Drive and density should breathe. Not every moment has to be louder or faster than the one before. A calmer track after a high point makes the next peak audible again.",
  "analysis.prep.plan.title": "A plan, not a script",
  "analysis.prep.plan.body":
    "The floor can turn. Keep at least two alternatives ready per phase, so you can swap a track without reinventing the arc. The played order stays the performance, the alternatives are Plan B.",
  "analysis.prep.energyFirst.title": "Energy before key before BPM",
  "analysis.prep.energyFirst.body":
    "Energy first: the same level or ±1 is smooth, a jump of three levels needs a break. Then the key: same, ±1 and A↔B on the same number are safe, +2 is an Energy Boost for rare use. Then the BPM. The key matters mostly where melodies overlap, and the analysis is accurate about 89 % of the time.",
  "analysis.prep.phrases.title": "Mix in phrases",
  "analysis.prep.phrases.body":
    "A clean transition sits on 16, 32 or 64 bars. A matching Camelot key won't save a chorus that lands in the middle of a verse.",
  "analysis.extractStep.pack.title": "1. Pack to the brief duration",
  "analysis.extractStep.pack.body":
    "SETFORM takes tracks from the playlist until the target duration of the brief is roughly reached. Whatever doesn't fit into the performance stays as an alternative.",
  "analysis.extractStep.arc.title": "2. Lay out an arc",
  "analysis.extractStep.arc.body":
    "In dev mode Spotify doesn't release audio features. So the arc is built from the BPM where it exists and from catalog popularity (often from Tidal via ISRC). Slower and lesser known opens, more present peaks, the release calms down again. The Tidal interface often provides no key or BPM. They reliably come from rekordbox or the stick.",
  "analysis.extractStep.roles.title": "3. Assign roles",
  "analysis.extractStep.roles.body":
    "Anchors are the signature moments, spaced out in the peak. A Bridge marks what needs care: phase change, key clash, Energy Boost, BPM jump or two energy levels and more. Same key, ±1 and A↔B stay Groove, the breath in between. Alternatives are Plan B from the rest of the playlist.",
  "analysis.extractStep.harmonic.title": "4. Refine the harmonics",
  "analysis.extractStep.harmonic.body":
    "“Sort harmonically” orders within a phase by Camelot, energy and small BPM steps. A deliberate contrast before the peak anchor stays allowed. The live line under each track shows the actual transition, even after you have dragged a track or changed a key yourself.",

  "analysis.energyPath.title": "Energy path",
  "analysis.energyPath.note":
    "Energy Level 1–10 per track against the target band of the phase. Energy decides how the room feels. The key only makes sure it doesn't sound off.",
  "analysis.energyPath.statKnown": "Tracks with energy",
  "analysis.energyPath.statJumps": "Jumps of 3+ levels",
  "analysis.energyPath.statOutside": "Outside phase band",
  "analysis.energyPath.noLevels":
    "No Energy Levels yet. Mixed In Key writes them as a comment (“7A - Energy 6”) into your rekordbox tracks. In rekordbox reload the tags (“Reload Tags”), then load the stick or collection again. You can also set the energy by hand per track in the setlist.",
  "analysis.energyPath.target": "Target {min}–{max}",
  "analysis.energyPath.bandLabel": "Target",
  "analysis.energyPath.planB": "Plan B: {count}",
  "analysis.energyPath.planBThin": "Plan B: {count} · at least {min} recommended",
  "analysis.energyPath.trackEnergy": "{name} · Energy {level}",
  "analysis.energyPath.trackEnergyUnknown": "{name} · Energy unknown",
  "analysis.energyPath.foldTitle": "Energy, key and BPM: what matters when",
  "analysis.energyPath.step1.title": "1. Energy first",
  "analysis.energyPath.step1.body":
    "The same level or ±1 is smooth. A jump from 5 to 7 feels abrupt, 9 to 5 loses the floor unless it is a deliberate reset. A set is a wave: warm up at 3–5, step up to 7–8, peak at 8–10, then drop 2–3 levels and build again.",
  "analysis.energyPath.step2.title": "2. Then the key",
  "analysis.energyPath.step2.body":
    "Safe moves are the same key, ±1 number and A↔B on the same number. Energy Boost is +2 with the same letter, use it sparingly. Everything else only works with a short transition, a break or EQ.",
  "analysis.energyPath.step3.title": "3. Then BPM",
  "analysis.energyPath.step3.body":
    "Pitch evens out small steps. Bigger jumps need a break or a reset. Line phrases up cleanly on 16 or 32 bars.",
  "analysis.energyPath.step4.title": "Ears beat analysis",
  "analysis.energyPath.step4.body":
    "Mixed In Key is right about 89 % of the time on key. If a transition sounds wrong, try the relative major or minor key. Test critical transitions beforehand and keep two backup tracks ready per direction.",

  "analysis.harmonic.ariaLabel": "Harmonic path",
  "analysis.harmonic.title": "Harmonic Path",
  "analysis.harmonic.titleEmbedded": "Key path",
  "analysis.harmonic.note":
    "Camelot along the played order. “Sort harmonically” moves related keys together and follows the energy as far as Energy Levels exist. A clash before the peak stays allowed.",
  "analysis.harmonic.harmonize": "Sort harmonically",
  "analysis.harmonic.statKeys": "Keys set",
  "analysis.harmonic.statScore": "Mix score",
  "analysis.harmonic.statClashes": "Clashes",
  "analysis.harmonic.emptyTitle": "No set yet.",
  "analysis.harmonic.emptyHint":
    "Load a playlist from the stick first, then the key path shows up here.",
  "analysis.harmonic.start": "Start",
  "analysis.harmonic.foldTitle": "Camelot & mix score explained",
  "analysis.harmonic.explain1":
    "**Mix score** rates every transition from key and, where available, energy in equal parts, plus a small BPM correction. Safe moves are the same key, ±1 number and A↔B on the same number. **Energy Boost** is +2 with the same letter, use it sparingly. Clashes need a break or a short transition.",
  "analysis.harmonic.explain2":
    "The key is a starting point, not a free pass. It matters mostly when melodies overlap, and the analysis is accurate about 89 % of the time. With a clash it is worth trying the relative major or minor key.",
  "analysis.harmonic.explain3":
    "Colors follow the Camelot Wheel (1–12). **A** = minor (stronger), **B** = major (lighter). Import keys in the “Load set & keys” section or set them in the setlist, then “Sort harmonically”.",
  "analysis.harmonic.legendLabel": "Camelot colors",
};

export const analysis = { de, en };
