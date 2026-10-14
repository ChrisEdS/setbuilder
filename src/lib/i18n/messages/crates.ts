// Area "crates": keys start with "crates.". Declare `de` first, then type `en` against it.
const de = {
  // RoleCrates: header and toolbar
  "crates.ariaLabel": "Crate-Rollen Übersicht",
  "crates.title": "Crate-Rollen",
  "crates.intro":
    "Titel in eine andere Rolle ziehen. Die Höhe aller Spalten lässt sich am unteren Rand ändern, „Alternativen groß“ verbreitert die Alternativen.",
  "crates.expandAll": "Alle auf",
  "crates.expandAllTip": "Alle Rollen-Spalten aufklappen.",
  "crates.collapseAll": "Alle zu",
  "crates.collapseAllTip": "Alle Rollen-Spalten zuklappen — mehr Übersicht.",
  "crates.wideAlternatives": "Alternativen groß",
  "crates.wideAlternativesTip":
    "Alternativen-Spalte verbreitern und öffnen — Plan B im Blick.",
  "crates.explain": "Rollen kurz erklärt",

  // RoleCrates: columns
  "crates.col.collapse": "{role} zuklappen",
  "crates.col.expand": "{role} aufklappen",
  "crates.col.widthReset": "{role} Breite zurücksetzen",
  "crates.col.widen": "{role} verbreitern",
  "crates.col.widenTitle": "Breiter anzeigen",
  "crates.col.resizeAria": "{role}-Höhe ziehen",
  "crates.col.resizeTitle": "Höhe ziehen",
  "crates.empty.drop": "Hier ablegen",
  "crates.empty.safety":
    "Noch keine Alternativen. Hier landen Tracks, die du auf die Rolle Alternativen setzt, die „Ersatz“ aus dem Set nimmt oder die „Auf Slot kürzen“ herausnimmt.",
  "crates.empty.default": "Noch keine Tracks. In der Setliste die Rolle setzen oder eine Karte hierher ziehen.",

  // RoleCrates: track card
  "crates.card.dragTitle": "In eine andere Rolle ziehen",
  "crates.card.keyUnset": "Key offen",
  "crates.card.keyUnsetTitle": "Key noch setzen",
  "crates.card.camelotHint":
    "{key}: A = Moll, B = Dur. Gleicher Key, ±1 oder A↔B mischt weich.",
  "crates.card.energyTitle":
    "Energy {level} von 10 — wie hart der Track wirkt. In der Setliste ändern.",
  "crates.card.altFor": "Alt für: {name}",
  "crates.card.phase": "Phase",
  "crates.card.phaseAria": "Phase für {name}",
  "crates.card.role": "Rolle",
  "crates.card.roleAria": "Rolle für {name}",
  "crates.card.removeAria": "{name} aus dem Set entfernen",
  "crates.card.removeTitle": "Aus dem Set entfernen",

  // RoleCrates: safety swap and phase tools of an Alternative
  "crates.swap.anyway": "Trotzdem einsetzen",
  "crates.swap.instead": "Statt Fokus einsetzen",
  "crates.safety.replacesFor": "Ersatz für",
  "crates.safety.replacesAria": "Ersatz für Phase, {name}",
  "crates.safety.fit": "✓ Passt zu {phase} (E{level}), zählt als Plan B.",
  "crates.safety.unknown": "Ohne Energie zählt die gewählte Phase: {phase}.",
  "crates.safety.below":
    "⚠ E{level} liegt unter dem {phase}-Band {min}–{max} und zählt nicht.",
  "crates.safety.above":
    "⚠ E{level} liegt über dem {phase}-Band {min}–{max} und zählt nicht.",
  "crates.safety.setPhase": "Auf {phase} setzen",

  // RoleCrates: Plan B strip
  "crates.planB.ariaLabel": "Plan B pro Phase",
  "crates.planB.chipCovered": "Gedeckt. Antippen für weitere Vorschläge.",
  "crates.planB.chipGap": "Lücke. Antippen für Vorschläge.",
  "crates.planB.fill": "Lücken füllen",
  "crates.planB.fillCount": "Lücken füllen ({count})",
  "crates.planB.fillTitle": "Setzt die besten Vorschläge in alle Lücken.",
  "crates.planB.fillNone": "Keine passenden Titel gefunden.",
  "crates.planB.loadLibrary": "Bibliothek laden",
  "crates.planB.show": "Zu den Alternativen",
  "crates.planB.allCovered":
    "Jede Phase hat mindestens {min} passende Alternativen.",
  "crates.planB.noLibrary":
    "Ohne Bibliothek gibt es keine Vorschläge. Du kannst Titel auch selbst als Alternativen setzen oder in der Bibliothek die Rolle „Alternativen“ wählen.",
  "crates.planB.suggestMissing":
    "· {missing} fehlen, Energie {min}–{max}, Key und BPM passend",
  "crates.planB.suggestCovered":
    "· gedeckt, Energie {min}–{max}, Key und BPM passend",
  "crates.planB.noMatches": "Keine passenden Titel in der Bibliothek.",
  "crates.planB.add": "+ Alternative",
  "crates.planB.addAria":
    "{title} als Alternative für {phase} einsetzen",

  // ReplaceMenu
  "crates.replace.ariaLabel": "Alternative einsetzen",
  "crates.replace.title": "Ersatz einsetzen",
  "crates.replace.empty":
    "Keine Alternativen. Einen Track auf die Rolle Alternativen setzen oder die Stick-Bibliothek laden.",
  "crates.replace.groupMine": "Aus deinen Alternativen",
  "crates.replace.groupLibrary":
    "Aus der Bibliothek, passend zu Vorgänger und Nachfolger",
  "crates.replace.insert": "Einsetzen",
  "crates.replace.unknownArtist": "unbekannt",
  "crates.replace.playAria": "{title} abspielen",
  "crates.replace.play": "Abspielen",
  "crates.replace.playNeedsStick":
    "Nur mit gewähltem Stick-Ordner abspielbar",

  // PreviewPlayer
  "crates.player.ariaLabel": "Player",
  "crates.player.prev": "Vorheriger Track",
  "crates.player.prevTip": "Zum vorherigen Track in der Performance-Reihenfolge.",
  "crates.player.next": "Nächster Track",
  "crates.player.nextTip": "Zum nächsten Track in der Performance-Reihenfolge.",
  "crates.player.close": "Player schließen",
  "crates.player.closeTip": "Player-Leiste schließen.",
  "crates.player.then": "danach {join}",
  "crates.player.iframeTitle": "{label} Player",
  "crates.player.noEmbed": "Kein Embed für diesen Eintrag.",
  "crates.player.pickStick": "Stick-Ordner wählen, dann spielt die Datei hier.",
  "crates.player.openSource": "In der Quelle öffnen",
} as const;

const en: Record<keyof typeof de, string> = {
  "crates.ariaLabel": "Crate roles overview",
  "crates.title": "Crate roles",
  "crates.intro":
    "Drag a track into another role. Change the height of all columns at the bottom edge, “Wide alternatives” widens the Alternatives.",
  "crates.expandAll": "Expand all",
  "crates.expandAllTip": "Expand all role columns.",
  "crates.collapseAll": "Collapse all",
  "crates.collapseAllTip": "Collapse all role columns — more overview.",
  "crates.wideAlternatives": "Wide alternatives",
  "crates.wideAlternativesTip":
    "Widen and open the Alternatives column — Plan B in view.",
  "crates.explain": "Roles at a glance",

  "crates.col.collapse": "Collapse {role}",
  "crates.col.expand": "Expand {role}",
  "crates.col.widthReset": "Reset {role} width",
  "crates.col.widen": "Widen {role}",
  "crates.col.widenTitle": "Show wider",
  "crates.col.resizeAria": "Drag {role} height",
  "crates.col.resizeTitle": "Drag to resize height",
  "crates.empty.drop": "Drop here",
  "crates.empty.safety":
    "No alternatives yet. Tracks land here when you set them to the Alternatives role, when “Replace” takes them out of the set, or when “Trim to slot” removes them.",
  "crates.empty.default": "No tracks yet. Set the role in the setlist or drag a card here.",

  "crates.card.dragTitle": "Drag to another role",
  "crates.card.keyUnset": "Key unknown",
  "crates.card.keyUnsetTitle": "Set the key",
  "crates.card.camelotHint":
    "{key}: A = minor, B = major. Same key, ±1 or A↔B mix smoothly.",
  "crates.card.energyTitle":
    "Energy {level} of 10 — how hard the track hits. Change it in the setlist.",
  "crates.card.altFor": "Alt for: {name}",
  "crates.card.phase": "Phase",
  "crates.card.phaseAria": "Phase for {name}",
  "crates.card.role": "Role",
  "crates.card.roleAria": "Role for {name}",
  "crates.card.removeAria": "Remove {name} from the set",
  "crates.card.removeTitle": "Remove from the set",

  "crates.swap.anyway": "Insert anyway",
  "crates.swap.instead": "Insert instead of focus",
  "crates.safety.replacesFor": "Replaces",
  "crates.safety.replacesAria": "Replaces phase, {name}",
  "crates.safety.fit": "✓ Fits {phase} (E{level}), counts as Plan B.",
  "crates.safety.unknown": "Without energy, the chosen phase counts: {phase}.",
  "crates.safety.below":
    "⚠ E{level} is below the {phase} band {min}–{max} and doesn't count.",
  "crates.safety.above":
    "⚠ E{level} is above the {phase} band {min}–{max} and doesn't count.",
  "crates.safety.setPhase": "Set to {phase}",

  "crates.planB.ariaLabel": "Plan B per phase",
  "crates.planB.chipCovered": "Covered. Tap for more suggestions.",
  "crates.planB.chipGap": "Gap. Tap for suggestions.",
  "crates.planB.fill": "Fill gaps",
  "crates.planB.fillCount": "Fill gaps ({count})",
  "crates.planB.fillTitle": "Puts the best suggestions into all gaps.",
  "crates.planB.fillNone": "No matching tracks found.",
  "crates.planB.loadLibrary": "Load library",
  "crates.planB.show": "Go to alternatives",
  "crates.planB.allCovered":
    "Every phase has at least {min} fitting alternatives.",
  "crates.planB.noLibrary":
    "Without a library there are no suggestions. You can also set tracks as alternatives yourself or pick the role “Alternatives” in the library.",
  "crates.planB.suggestMissing":
    "· {missing} missing, energy {min}–{max}, key and BPM matching",
  "crates.planB.suggestCovered":
    "· covered, energy {min}–{max}, key and BPM matching",
  "crates.planB.noMatches": "No matching tracks in the library.",
  "crates.planB.add": "+ Alternative",
  "crates.planB.addAria": "Insert {title} as alternative for {phase}",

  "crates.replace.ariaLabel": "Insert alternative",
  "crates.replace.title": "Insert replacement",
  "crates.replace.empty":
    "No alternatives. Set a track to the Alternatives role or load the stick library.",
  "crates.replace.groupMine": "From your alternatives",
  "crates.replace.groupLibrary":
    "From the library, fitting the previous and next track",
  "crates.replace.insert": "Insert",
  "crates.replace.unknownArtist": "unknown",
  "crates.replace.playAria": "Play {title}",
  "crates.replace.play": "Play",
  "crates.replace.playNeedsStick":
    "Only playable with a stick folder selected",

  "crates.player.ariaLabel": "Player",
  "crates.player.prev": "Previous track",
  "crates.player.prevTip": "Go to the previous track in the performance order.",
  "crates.player.next": "Next track",
  "crates.player.nextTip": "Go to the next track in the performance order.",
  "crates.player.close": "Close player",
  "crates.player.closeTip": "Close the player bar.",
  "crates.player.then": "then {join}",
  "crates.player.iframeTitle": "{label} player",
  "crates.player.noEmbed": "No embed for this entry.",
  "crates.player.pickStick": "Choose the stick folder and the file plays here.",
  "crates.player.openSource": "Open in source",
};

export const crates = { de, en };
