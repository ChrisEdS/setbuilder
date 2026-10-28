// Area "analysis": keys start with "analysis.". Declare `de` first, then type `en` against it.
const de = {
  // Energy
  "analysis.energy.same": "Energie gleich",
  "analysis.energy.delta": "Energie {delta}",

  // Harmonic relations and mix joins
  "analysis.relation.same": "Gleicher Key",
  "analysis.relation.same.short": "Gleich",
  "analysis.relation.same.hint":
    "Gleicher Camelot-Key. Melodien dürfen überlappen — weich mischen.",
  "analysis.relation.relative": "Relative Dur/Moll",
  "analysis.relation.relative.short": "Relativ",
  "analysis.relation.relative.hint":
    "A↔B auf derselben Zahl, z. B. 8A → 8B. Relatives Dur/Moll, fast so weich wie derselbe Key.",
  "analysis.relation.energyBoost": "Energy Boost (+2)",
  "analysis.relation.energyBoost.short": "+2",
  "analysis.relation.energyBoost.hint":
    "Zwei Schritte vorwärts, gleicher Buchstabe (8A → 10A). Hebt die Energie — sparsam einsetzen.",
  "analysis.relation.adjacent": "Nachbar-Key (±1)",
  "analysis.relation.adjacent.short": "±1",
  "analysis.relation.adjacent.hint":
    "Nächste Zahl auf dem Wheel, gleicher Buchstabe (8A → 9A oder 7A). Sicherer Standard-Mix.",
  "analysis.relation.contrast": "Key-Kontrast",
  "analysis.relation.contrast.short": "Kontrast",
  "analysis.relation.contrast.hint":
    "Weiter als ±1, aber kein Clash. Klingt spannend — mit EQ oder kurzem Break mischen.",
  "analysis.relation.clash": "Key-Clash",
  "analysis.relation.clash.short": "Clash",
  "analysis.relation.clash.hint":
    "Keys liegen weit auseinander. Melodien beißen sich, außer du brichst, filterst oder EQst. Sortieren, tauschen oder den Key ändern senkt die Zahl.",
  "analysis.relation.unknown": "Key offen",
  "analysis.relation.unknown.short": "Offen",
  "analysis.relation.unknown.hint":
    "Mindestens ein Track hat keinen Camelot-Key. In der Setliste setzen, dann zählt der Übergang im Mix-Score.",
  "analysis.harmonic.start.short": "Start",
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
  "analysis.why.excluded":
    "Ausgeschlossen — bleibt beim Kürzen, Auffüllen und bei Andere Songs außerhalb der Performance",
  "analysis.why.filled": "Beim Auffüllen auf den Slot in die Performance geholt",
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
    "SETBUILDER nimmt Tracks aus der Playlist, bis die Ziel-Dauer des Briefs ungefähr erreicht ist. Was nicht in die Performance passt, bleibt als Alternative liegen.",
  "analysis.extractStep.arc.title": "2. Einen Bogen legen",
  "analysis.extractStep.arc.body":
    "Spotify gibt im Dev Mode keine Audio-Features frei. Der Bogen entsteht deshalb aus der BPM, wo sie vorhanden ist, und aus der Katalog-Popularität (oft von Tidal per ISRC). Langsamer und unbekannter öffnet, präsenter peakt, im Release wird es wieder ruhiger. Key und BPM liefert die Tidal-Schnittstelle oft nicht. Verlässlich kommen sie aus rekordbox oder vom Stick.",
  "analysis.extractStep.roles.title": "3. Rollen vergeben",
  "analysis.extractStep.roles.body":
    "Anchor sind die Signature-Momente, im Peak mit Abstand gesetzt. Bridge markiert, was Sorgfalt braucht: Phasenwechsel, Key-Clash, Energy Boost, BPM-Sprung oder zwei Energiestufen und mehr. Gleicher Key, ±1 und A↔B bleiben Groove, das ist der Atem dazwischen. Alternativen sind Plan B aus dem Rest der Playlist.",
  "analysis.extractStep.harmonic.title": "4. Harmonik nachziehen",
  "analysis.extractStep.harmonic.body":
    "„Harmonisch sortieren“ ordnet innerhalb einer Phase nach Camelot, Energie und kleinen BPM-Schritten. Opener und Closer bleiben Anfang und Ende — gepinnt oder als aktuelle erste/letzte Performance-Tracks. Ein bewusster Kontrast vor dem Peak-Anchor bleibt erlaubt. Die Live-Zeile unter jedem Track zeigt den tatsächlichen Übergang, auch nachdem du selbst gezogen oder einen Key geändert hast.",

  // EnergyPath component
  "analysis.energyPath.title": "Energie-Verlauf",
  "analysis.energyPath.note":
    "Energy Level 1–10 pro Track gegen das Zielband der Phase. Energie entscheidet, wie der Raum sich anfühlt. Der Key sorgt nur dafür, dass es nicht schief klingt.",
  "analysis.energyPath.statKnown": "Tracks mit Energie",
  "analysis.energyPath.statKnownHint":
    "Wie viele Performance-Tracks ein Energy Level 1–10 haben (Mixed In Key). Ohne Wert bleibt der Balken leer. In der Setliste setzen oder Tags neu laden.",
  "analysis.energyPath.statJumps": "Sprünge ab 3 Stufen",
  "analysis.energyPath.statJumpsHint":
    "Energie springt um drei oder mehr Stufen. Wirkt abrupt — außer als Reset über einen Break. Reihenfolge oder Energie in der Setliste ändern das.",
  "analysis.energyPath.statOutside": "Außerhalb Phasenband",
  "analysis.energyPath.statOutsideHint":
    "Energy Level liegt nicht im Zielband der Phase (Open eher 3–5, Peak 8–10). Phase oder Energie in der Setliste ändern.",
  "analysis.energyPath.planBHint":
    "Alternativen für diese Phase, wenn der Floor dreht. Mindestens zwei empfohlen. Unter Rollen nachlegen.",
  "analysis.energyPath.targetHint":
    "Das Energie-Fenster dieser Phase. Balken außerhalb sind gelb.",
  "analysis.energyPath.noLevels":
    "Noch keine Energy Levels. Mixed In Key schreibt sie als Kommentar („7A - Energy 6“) oder ins Grouping. In rekordbox die Tags neu laden („Reload Tags“), dann Stick oder die Collection-XML erneut laden. Grouping kommt über die XML, nicht über den USB-export.pdb. Du kannst die Energie auch in der Setliste pro Track von Hand setzen.",
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
  "analysis.harmonic.ariaLabel": "Key-Verlauf",
  "analysis.harmonic.title": "Key-Verlauf",
  "analysis.harmonic.titleEmbedded": "Key-Verlauf",
  "analysis.harmonic.note":
    "Camelot entlang der gespielten Reihenfolge. Karten ziehen zum Umsortieren; unter Sortieren: Perfekt, Harmonisch, Ein-Schritt, Energie, Doppel-Peak, Tempo, BPM-Kette, Camelot-Reise oder Wellen. Opener und Closer bleiben (Pin oder aktuelle Enden). Ein Clash vor dem Peak bleibt erlaubt.",
  "analysis.harmonic.statKeys": "Keys gesetzt",
  "analysis.harmonic.statKeysHint":
    "Anteil der Performance-Tracks mit Camelot-Key. Ohne Key zählt der Übergang nicht im Mix-Score. In der Setliste setzen.",
  "analysis.harmonic.statScore": "Mix-Score",
  "analysis.harmonic.statScoreHint":
    "Mittel aller Übergänge: Key und Energie zu gleichen Teilen, plus eine kleine BPM-Korrektur. Über 75 % ist weich, unter 50 % knallt es oft. Sortieren, ziehen oder Key/Energie ändern das.",
  "analysis.harmonic.statClashes.one": "Key-Clash",
  "analysis.harmonic.statClashes.other": "Key-Clashes",
  "analysis.harmonic.statClashesHint":
    "Übergänge, deren Keys auf dem Camelot-Wheel weit auseinanderliegen. Melodien beißen sich, außer du brichst oder EQst. Sortieren, tauschen oder den Key ändern senkt die Zahl.",
  "analysis.harmonic.camelotHint":
    "{key}: A = Moll (kräftiger), B = Dur (heller). Gleicher Key, ±1 oder A↔B auf derselben Zahl mischt weich. In der Setliste ändern.",
  "analysis.harmonic.camelotOpenHint":
    "Noch kein Camelot-Key. In der Setliste setzen, dann zählt der Übergang im Mix-Score.",
  "analysis.harmonic.advice.ok":
    "Mix-Score {score} % — die Keys liegen nah beieinander. Reihenfolge, Key oder Energie in der Setliste ändern das.",
  "analysis.harmonic.advice.mid":
    "Mix-Score {score} % — mehrere Übergänge sind weit. Sortieren oder einzelne Keys in der Setliste ändern hebt die Zahl.",
  "analysis.harmonic.advice.clashes":
    "{clashes} Clashes, Mix-Score {score} %. Ein Clash heißt: der nächste Key ist weit weg. Sortieren, den Track tauschen oder den Key ändern senkt die Zahl.",
  "analysis.harmonic.advice.clashOne":
    "1 Clash, Mix-Score {score} %. Ein Clash heißt: der nächste Key ist weit weg. Sortieren, den Track tauschen oder den Key ändern löst ihn.",
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
    "Farben folgen dem Camelot Wheel (1–12). **A** = Moll (kräftiger), **B** = Dur (heller). Keys im Bereich „Stick laden & vorbereiten“ importieren oder in der Setliste setzen, dann „Harmonisch sortieren“.",
  "analysis.harmonic.legendLabel": "Camelot Farben",
} as const;

const en: Record<keyof typeof de, string> = {
  "analysis.energy.same": "Energy same",
  "analysis.energy.delta": "Energy {delta}",

  "analysis.relation.same": "same key",
  "analysis.relation.same.short": "Same",
  "analysis.relation.same.hint":
    "Same Camelot key. Melodies can overlap — mix smoothly.",
  "analysis.relation.relative": "Relative major/minor",
  "analysis.relation.relative.short": "Relative",
  "analysis.relation.relative.hint":
    "A↔B on the same number, e.g. 8A → 8B. Relative major/minor, almost as smooth as the same key.",
  "analysis.relation.energyBoost": "Energy Boost (+2)",
  "analysis.relation.energyBoost.short": "+2",
  "analysis.relation.energyBoost.hint":
    "Two steps forward, same letter (8A → 10A). Lifts the energy — use sparingly.",
  "analysis.relation.adjacent": "Adjacent key (±1)",
  "analysis.relation.adjacent.short": "±1",
  "analysis.relation.adjacent.hint":
    "Next number on the wheel, same letter (8A → 9A or 7A). The safe standard mix.",
  "analysis.relation.contrast": "Key contrast",
  "analysis.relation.contrast.short": "Contrast",
  "analysis.relation.contrast.hint":
    "Farther than ±1, but not a clash. Sounds tense — mix with EQ or a short break.",
  "analysis.relation.clash": "Harmonic clash",
  "analysis.relation.clash.short": "Clash",
  "analysis.relation.clash.hint":
    "Keys sit far apart. Melodies fight unless you break, filter or EQ. Sorting, swapping or changing the key lowers the number.",
  "analysis.relation.unknown": "Key unknown",
  "analysis.relation.unknown.short": "Open",
  "analysis.relation.unknown.hint":
    "At least one track has no Camelot key. Set it in the setlist so the transition counts in the mix score.",
  "analysis.harmonic.start.short": "Start",
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
  "analysis.why.excluded":
    "Excluded — stays out of the performance through trim, refill and Different songs",
  "analysis.why.filled": "Brought into the performance when filling to the slot",
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
    "SETBUILDER takes tracks from the playlist until the target duration of the brief is roughly reached. Whatever doesn't fit into the performance stays as an alternative.",
  "analysis.extractStep.arc.title": "2. Lay out an arc",
  "analysis.extractStep.arc.body":
    "In dev mode Spotify doesn't release audio features. So the arc is built from the BPM where it exists and from catalog popularity (often from Tidal via ISRC). Slower and lesser known opens, more present peaks, the release calms down again. The Tidal interface often provides no key or BPM. They reliably come from rekordbox or the stick.",
  "analysis.extractStep.roles.title": "3. Assign roles",
  "analysis.extractStep.roles.body":
    "Anchors are the signature moments, spaced out in the peak. A Bridge marks what needs care: phase change, key clash, Energy Boost, BPM jump or two energy levels and more. Same key, ±1 and A↔B stay Groove, the breath in between. Alternatives are Plan B from the rest of the playlist.",
  "analysis.extractStep.harmonic.title": "4. Refine the harmonics",
  "analysis.extractStep.harmonic.body":
    "“Sort harmonically” orders within a phase by Camelot, energy and small BPM steps. Opener and closer stay at the start and end — pinned or as the current first/last performance tracks. A deliberate contrast before the peak anchor stays allowed. The live line under each track shows the actual transition, even after you have dragged a track or changed a key yourself.",

  "analysis.energyPath.title": "Energy path",
  "analysis.energyPath.note":
    "Energy Level 1–10 per track against the target band of the phase. Energy decides how the room feels. The key only makes sure it doesn't sound off.",
  "analysis.energyPath.statKnown": "Tracks with energy",
  "analysis.energyPath.statKnownHint":
    "How many performance tracks have an Energy Level 1–10 (Mixed In Key). Without a value the bar stays empty. Set it in the setlist or reload tags.",
  "analysis.energyPath.statJumps": "Jumps of 3+ levels",
  "analysis.energyPath.statJumpsHint":
    "Energy jumps three or more levels. Feels abrupt — unless it is a reset over a break. Order or energy in the setlist change this.",
  "analysis.energyPath.statOutside": "Outside phase band",
  "analysis.energyPath.statOutsideHint":
    "Energy Level is outside the phase target band (Open closer to 3–5, Peak 8–10). Change the phase or the energy in the setlist.",
  "analysis.energyPath.planBHint":
    "Alternatives for this phase if the floor turns. At least two recommended. Add more under Roles.",
  "analysis.energyPath.targetHint":
    "The energy window of this phase. Bars outside it turn yellow.",
  "analysis.energyPath.noLevels":
    "No Energy Levels yet. Mixed In Key writes them as a comment (“7A - Energy 6”) or into Grouping. In rekordbox reload the tags (“Reload Tags”), then load the stick or the collection XML again. Grouping comes from the XML, not from the USB export.pdb. You can also set the energy by hand per track in the setlist.",
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
    "Camelot along the played order. Drag cards to reorder; under Sort: Perfect, Harmonic, One-step, Energy, Twin peak, Tempo, BPM chain, Camelot journey or Waves. Opener and closer stay (pin or current ends). A clash before the peak stays allowed.",
  "analysis.harmonic.statKeys": "Keys set",
  "analysis.harmonic.statKeysHint":
    "Share of performance tracks that have a Camelot key. Without a key the transition does not count in the mix score. Set it in the setlist.",
  "analysis.harmonic.statScore": "Mix score",
  "analysis.harmonic.statScoreHint":
    "Average of every transition: key and energy in equal parts, plus a small BPM correction. Above 75 % is smooth, below 50 % often clashes. Sorting, dragging or changing key/energy changes this.",
  "analysis.harmonic.statClashes.one": "Clash",
  "analysis.harmonic.statClashes.other": "Clashes",
  "analysis.harmonic.statClashesHint":
    "Transitions whose keys sit far apart on the Camelot wheel. Melodies fight unless you break or EQ. Sorting, swapping or changing the key lowers the number.",
  "analysis.harmonic.camelotHint":
    "{key}: A = minor (stronger), B = major (lighter). Same key, ±1 or A↔B on the same number mix smoothly. Change it in the setlist.",
  "analysis.harmonic.camelotOpenHint":
    "No Camelot key yet. Set it in the setlist so the transition counts in the mix score.",
  "analysis.harmonic.advice.ok":
    "Mix score {score} % — the keys sit close together. Order, key or energy in the setlist change this.",
  "analysis.harmonic.advice.mid":
    "Mix score {score} % — several transitions are far. Sorting or changing a key in the setlist raises the number.",
  "analysis.harmonic.advice.clashes":
    "{clashes} clashes, mix score {score} %. A clash means the next key is far away. Sorting, swapping the track or changing the key lowers the number.",
  "analysis.harmonic.advice.clashOne":
    "1 clash, mix score {score} %. A clash means the next key is far away. Sorting, swapping the track or changing the key resolves it.",
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
    "Colors follow the Camelot Wheel (1–12). **A** = minor (stronger), **B** = major (lighter). Import keys in the “Load stick & prepare” section or set them in the setlist, then “Sort harmonically”.",
  "analysis.harmonic.legendLabel": "Camelot colors",
};

export const analysis = { de, en };
