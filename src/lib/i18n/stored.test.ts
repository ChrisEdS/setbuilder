import assert from "node:assert/strict";
import test from "node:test";
import { tDe, tEn } from "./core";
import { WHY_KEYS, localizeNote, localizeWhy } from "./stored";
import { messages } from "./messages";

const sample: Record<string, Record<string, string>> = {
  "analysis.why.phasePivot": { from: "open", to: "lift" },
  "analysis.why.bridgeEnergy": { from: 5, to: 7 } as never,
  "analysis.why.bridgeEnergyJump": { from: 9, to: 4 } as never,
  "analysis.why.replacementFor": { name: "Strobe" },
  "analysis.why.replacedBy": { name: "Opus (Extended)" },
};

test("every registered why key round-trips between German and English", () => {
  for (const key of WHY_KEYS) {
    const vars = sample[key];
    const de = tDe(key, vars);
    const en = tEn(key, vars);
    assert.equal(localizeWhy(de, tEn), en, `${key} de → en`);
    assert.equal(localizeWhy(en, tDe), de, `${key} en → de`);
    assert.equal(localizeWhy(de, tDe), de, `${key} de → de`);
    assert.equal(localizeWhy(en, tEn), en, `${key} en → en`);
  }
});

test("why texts keep their variables when switching language", () => {
  assert.equal(
    localizeWhy("Phasen-Pivot open → lift", tEn),
    "Phase pivot open → lift",
  );
  assert.equal(localizeWhy("Ersatz für Strobe", tEn), "Replacement for Strobe");
  assert.equal(localizeWhy("Replaced by Strobe", tDe), "Ersetzt durch Strobe");
  assert.equal(
    localizeWhy("Brücke: Energie 9 → 4 (Sprung, Break oder Reset nötig)", tEn),
    "Bridge: energy 9 → 4 (jump, needs a break or reset)",
  );
  assert.equal(localizeWhy("Brücke: Energie 5 → 7", tEn), "Bridge: energy 5 → 7");
  assert.equal(localizeWhy("Peak-Anchor (Impact, danach Groove)", tEn), "Peak anchor (impact, then groove)");
  assert.equal(localizeWhy("Manuell gesetzt", tEn), "Set manually");
  assert.equal(localizeWhy("Set manually", tDe), "Manuell gesetzt");
});

test("unknown or empty why text is returned unchanged", () => {
  assert.equal(localizeWhy("Mein eigener Kommentar", tEn), "Mein eigener Kommentar");
  assert.equal(localizeWhy("Ersatz für", tEn), "Ersatz für");
  assert.equal(localizeWhy("", tEn), "");
  assert.equal(localizeWhy(undefined, tEn), "");
});

test("registered why keys all exist and have no regex trouble", () => {
  for (const key of WHY_KEYS) {
    assert.ok(key in messages.de, key);
  }
});

test("stored notes are localized, edited notes are not", () => {
  assert.equal(
    localizeNote("open/groove · Übergang: long-blend · Nachbar-Key (±1)", tEn),
    "open/groove · Transition: long-blend · Adjacent key (±1)",
  );
  assert.equal(
    localizeNote("peak/anchor · Transition: break-to-drop · Harmonic clash", tDe),
    "peak/anchor · Übergang: break-to-drop · Harmonic clash",
  );
  assert.equal(localizeNote("lift/groove · Übergang: stem-vocal", tEn), "lift/groove · Transition: stem-vocal");
  assert.equal(localizeNote("Plan B — nur wenn der Raum dreht", tEn), "Plan B — only if the room turns");
  assert.equal(localizeNote("Drop at 2:10 · careful", tEn), "Drop at 2:10 · careful");
  assert.equal(localizeNote(undefined, tEn), "");
});
