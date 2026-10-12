// Area "crates": keys start with "crates.". Declare `de` first, then type `en` against it.
const de = {
  // RoleCrates: header and toolbar
  "crates.ariaLabel": "Crate-Rollen Übersicht",
  "crates.title": "Crate-Rollen",
  "crates.intro":
    "Titel in eine andere Rolle ziehen. Die Höhe aller Spalten lässt sich am unteren Rand ändern, „Alternativen groß“ verbreitert die Alternativen.",
  "crates.expandAll": "Alle auf",
  "crates.collapseAll": "Alle zu",
  "crates.wideAlternatives": "Alternativen groß",
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
    "Noch keine Alternativen. Beim Extrahieren landen übrige Tracks hier, oder du setzt Tracks selbst auf die Rolle Alternativen.",
  "crates.empty.default": "Noch keine Tracks",

  // RoleCrates: track card
  "crates.card.dragTitle": "In eine andere Rolle ziehen",
  "crates.card.keyUnset": "Key offen",
  "crates.card.keyUnsetTitle": "Key noch setzen",
  "crates.card.energyTitle": "Energy Level {level} von 10",
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
  "crates.replace.unknownArtist": "Unknown",
  "crates.replace.playAria": "{title} abspielen",
  "crates.replace.play": "Abspielen",
  "crates.replace.playNeedsStick":
    "Nur mit gewähltem Stick-Ordner abspielbar",

  // PreviewPlayer
  "crates.player.ariaLabel": "Player",
  "crates.player.prev": "Vorheriger Track",
  "crates.player.next": "Nächster Track",
  "crates.player.close": "Player schließen",
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
  "crates.collapseAll": "Collapse all",
  "crates.wideAlternatives": "Wide alternatives",
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
    "No alternatives yet. When extracting, leftover tracks land here, or you set tracks to the Alternatives role yourself.",
  "crates.empty.default": "No tracks yet",

  "crates.card.dragTitle": "Drag to another role",
  "crates.card.keyUnset": "Key unknown",
  "crates.card.keyUnsetTitle": "Set the key",
  "crates.card.energyTitle": "Energy Level {level} of 10",
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
  "crates.replace.unknownArtist": "Unknown",
  "crates.replace.playAria": "Play {title}",
  "crates.replace.play": "Play",
  "crates.replace.playNeedsStick":
    "Only playable with a stick folder selected",

  "crates.player.ariaLabel": "Player",
  "crates.player.prev": "Previous track",
  "crates.player.next": "Next track",
  "crates.player.close": "Close player",
  "crates.player.then": "then {join}",
  "crates.player.iframeTitle": "{label} player",
  "crates.player.noEmbed": "No embed for this entry.",
  "crates.player.pickStick": "Choose the stick folder and the file plays here.",
  "crates.player.openSource": "Open in source",
};

export const crates = { de, en };
