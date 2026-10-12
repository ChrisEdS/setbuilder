import type { MessageKey, Translate, Vars } from "./core";
import { LANGS } from "./core";
import { messages } from "./messages";

/**
 * Some user-visible texts are stored in the saved draft (`track.why`, generated `track.note`).
 * They are written in the language that was active at creation time but must show in the
 * current one. Each stored text is recognised by matching it against the templates of a
 * registry of message keys (in every language, `{var}` placeholders turned into capture
 * groups) and is then rendered again with `t(key, vars)`. Unknown text stays unchanged.
 */

/**
 * Every key that can end up in a stored `why`.
 * ORDER MATTERS: the first matching key wins, so a key whose template is a prefix of
 * another one (bridgeEnergy / bridgeEnergyJump) must come after the longer one.
 */
export const WHY_KEYS = [
  "analysis.why.groove",
  "analysis.why.peakAnchor",
  "analysis.why.peakContrast",
  "analysis.why.phasePivot",
  "analysis.why.bridgeClash",
  "analysis.why.bridgeEnergyBoost",
  "analysis.why.bridgeContrast",
  "analysis.why.bridgeEnergyJump",
  "analysis.why.bridgeEnergy",
  "analysis.why.bridgeBpm",
  "analysis.why.closing",
  "analysis.why.opener",
  "analysis.why.peakSignature",
  "analysis.why.safetyNet",
  "analysis.why.trimmed",
  "analysis.why.replacementFor",
  "analysis.why.replacedBy",
  "analysis.why.manual",
  // Written by rekordbox-stick.ts (area "exports")
  "exports.stick.whyLibrary",
  "exports.stick.whyHistory",
  "exports.stick.whyPlaylist",
] as const satisfies readonly MessageKey[];

export type WhyKey = (typeof WHY_KEYS)[number];

const RELATION_KEYS = [
  "analysis.relation.same",
  "analysis.relation.relative",
  "analysis.relation.energyBoost",
  "analysis.relation.adjacent",
  "analysis.relation.contrast",
  "analysis.relation.clash",
  "analysis.relation.unknown",
] as const satisfies readonly MessageKey[];

type Template = { key: MessageKey; regex: RegExp; names: string[] };

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "Ersatz für {name}" → /^Ersatz für (.+?)$/s with names ["name"]. */
function compile(key: MessageKey, text: string): Template {
  const names: string[] = [];
  const source = text
    .split(/\{(\w+)\}/)
    .map((part, index) => {
      if (index % 2 === 0) return escapeRegex(part);
      names.push(part);
      return "(.+?)";
    })
    .join("");
  return { key, regex: new RegExp(`^${source}$`, "s"), names };
}

function compileAll(keys: readonly MessageKey[]): Template[] {
  const out: Template[] = [];
  for (const key of keys) {
    for (const lang of LANGS) {
      out.push(compile(key, messages[lang][key]));
    }
  }
  return out;
}

function matchTemplates(
  templates: Template[],
  text: string,
): { key: MessageKey; vars: Vars } | null {
  for (const template of templates) {
    const match = template.regex.exec(text);
    if (!match) continue;
    const vars: Vars = {};
    template.names.forEach((name, index) => {
      vars[name] = match[index + 1];
    });
    return { key: template.key, vars };
  }
  return null;
}

let whyTemplates: Template[] | null = null;
let transitionTemplates: Template[] | null = null;
let relationTemplates: Template[] | null = null;
let safetyNoteTemplates: Template[] | null = null;

/** A stored `track.why` in the current language; unknown text is returned unchanged. */
export function localizeWhy(why: string | undefined, t: Translate): string {
  if (!why) return "";
  whyTemplates ??= compileAll(WHY_KEYS);
  const hit = matchTemplates(whyTemplates, why);
  return hit ? t(hit.key, hit.vars) : why;
}

/**
 * A stored `track.note` in the current language. Only the generated cues are recognised
 * ("open/groove · Übergang: long-blend · Nachbar-Key (±1)" and the Plan B note); a note
 * the user typed or edited is returned unchanged.
 */
export function localizeNote(note: string | undefined, t: Translate): string {
  if (!note) return "";
  safetyNoteTemplates ??= compileAll(["analysis.note.safety"]);
  if (matchTemplates(safetyNoteTemplates, note)) return t("analysis.note.safety");

  const parts = note.split(" · ");
  if (parts.length < 2 || parts.length > 3) return note;
  if (!/^\w+\/\w+$/.test(parts[0])) return note;
  transitionTemplates ??= compileAll(["analysis.note.transition"]);
  const transition = matchTemplates(transitionTemplates, parts[1]);
  if (!transition) return note;
  const out = [parts[0], t("analysis.note.transition", transition.vars)];
  if (parts.length === 3) {
    relationTemplates ??= compileAll(RELATION_KEYS);
    const relation = matchTemplates(relationTemplates, parts[2]);
    if (!relation) return note;
    out.push(t(relation.key));
  }
  return out.join(" · ");
}
