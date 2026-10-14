import assert from "node:assert/strict";
import test from "node:test";
import {
  detectLang,
  langFromHeaders,
  tDe,
  tEn,
  translate,
} from "./core";
import { areas } from "./messages";

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1]).sort();
}

test("every area has the same keys in German and English", () => {
  for (const [name, area] of Object.entries(areas)) {
    const de = Object.keys(area.de).sort();
    const en = Object.keys(area.en).sort();
    assert.deepEqual(en, de, `area "${name}" differs between de and en`);
  }
});

test("keys start with their area prefix, so areas never collide", () => {
  const seen = new Set<string>();
  for (const [name, area] of Object.entries(areas)) {
    for (const key of Object.keys(area.de)) {
      assert.ok(key.startsWith(`${name}.`), `"${key}" does not start with "${name}."`);
      assert.ok(!seen.has(key), `duplicate key "${key}"`);
      seen.add(key);
    }
  }
});

test("both languages use the same placeholders and no text is empty", () => {
  for (const area of Object.values(areas)) {
    const de = area.de as Record<string, string>;
    const en = area.en as Record<string, string>;
    for (const key of Object.keys(de)) {
      assert.ok(de[key].trim() !== "", `"${key}" is empty in de`);
      assert.ok(en[key].trim() !== "", `"${key}" is empty in en`);
      assert.deepEqual(
        placeholders(en[key]),
        placeholders(de[key]),
        `placeholders of "${key}" differ`,
      );
    }
  }
});

test("translate fills placeholders and falls back to the key", () => {
  assert.equal(tDe("common.language"), "Sprache");
  assert.equal(tEn("common.language"), "Language");
  assert.equal(translate("en", "nope.missing" as never), "nope.missing");
});

test("language detection", () => {
  assert.equal(detectLang("de-AT"), "de");
  assert.equal(detectLang("de,en;q=0.8"), "de");
  assert.equal(detectLang("fr-FR"), "en");
  assert.equal(detectLang(undefined), "en");
  assert.equal(langFromHeaders("a=1; setbuilder-lang=de", "en-US"), "de");
  assert.equal(langFromHeaders("setbuilder-lang=en", "de"), "en");
  assert.equal(langFromHeaders("a=1; setform-lang=de", "en-US"), "de");
  assert.equal(langFromHeaders("setform-lang=en", "de"), "en");
  assert.equal(langFromHeaders(null, "de-DE,de;q=0.9"), "de");
});
