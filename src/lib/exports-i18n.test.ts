import assert from "node:assert/strict";
import test from "node:test";
import { buildRekordboxXml } from "./export-booth.ts";
import { buildSetPrintHtml } from "./export-pdf.ts";
import { tDe, tEn } from "./i18n/core.ts";
import { errorText } from "./i18n/error.ts";
import { parseRekordboxPdb } from "./rekordbox-pdb.ts";
import {
  applyStickSet,
  applyStickSetMode,
  libraryTrackToSetTrack,
} from "./rekordbox-stick.ts";
import { exportSetText, type SetDraft, type SetTrack } from "./set.ts";

function track(partial: Partial<SetTrack> & Pick<SetTrack, "id" | "name">): SetTrack {
  return {
    artists: ["Ada"],
    album: "",
    durationMs: 180_000,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase: "lift",
    role: "groove",
    transition: "unset",
    bpm: "128",
    keyCamelot: "8A",
    note: "",
    comment: "",
    safetyAlt: "",
    ...partial,
  };
}

const draft: SetDraft = {
  title: "Friday",
  vibe: "Tech House",
  venue: "Club",
  slot: "Peak Time",
  slotKind: "peaktime",
  audience: "Locals",
  gear: "CDJs",
  durationMinutes: 60,
  tracks: [
    track({ id: "a", name: "Night Drive", transition: "eq-swap", why: "Opener" }),
    track({
      id: "b",
      name: "Second",
      phase: "peak",
      role: "anchor",
      keyCamelot: "9A",
      durationMs: 0,
    }),
    track({ id: "c", name: "Spare", role: "safety", safetyAlt: "swap" }),
  ],
};

test("PDF html stays German by default and switches to English with t", () => {
  const de = buildSetPrintHtml(draft);
  assert.match(de, /<html lang="de">/);
  assert.match(de, /<title>Friday — Ausdruck<\/title>/);
  assert.match(de, /Von davor/);
  assert.match(de, /Alternativen/);
  assert.doesNotMatch(de, /Warum|Opener/);
  assert.match(de, /Drucken \/ PDF/);
  assert.match(de, /1 Performance · 1 Alternativen|2 Performance · 1 Alternativen/);
  assert.match(de, /Dauer einzelner Tracks offen/);

  const en = buildSetPrintHtml(draft, tEn);
  assert.match(en, /<html lang="en">/);
  assert.match(en, /<title>Friday — Printout<\/title>/);
  assert.match(en, /From previous/);
  assert.match(en, /<h2>Alternatives<\/h2>/);
  assert.doesNotMatch(en, /Why|Opener/);
  assert.match(en, /Print \/ PDF/);
  assert.match(en, /2 Performance · 1 Alternatives/);
  assert.match(en, /track lengths unknown/);
  assert.match(en, /Backup note: swap/);
  assert.doesNotMatch(en, /Von davor|Ausdruck|Warum|Übergang/);
});

test("text export is English with tEn and unchanged in German", () => {
  const de = exportSetText(draft);
  assert.match(de, /Ziel: 60 min · Ist: /);
  assert.doesNotMatch(de, /Prep-Prinzipien/);
  assert.match(de, /Auf dem Stick: Playlist „SETBUILDER - Friday Alternativen“/);
  const en = exportSetText(draft, tEn);
  assert.match(en, /Target: 60 min · Actual: /);
  assert.doesNotMatch(en, /Prep principles/);
  assert.doesNotMatch(en, /Ziel:|Prep-Prinzipien|Dramaturgie/);
  assert.match(en, /On the stick: playlist “SETBUILDER - Friday Alternatives”/);
});

test("PDF names the stick playlist where the alternatives live", () => {
  const de = buildSetPrintHtml(draft);
  assert.match(de, /Auf dem Stick: Playlist „SETBUILDER - Friday Alternativen“/);
  const en = buildSetPrintHtml(draft, tEn);
  assert.match(en, /On the stick: playlist “SETBUILDER - Friday Alternatives”/);
});

test("rekordbox XML names the alternatives playlist per language", () => {
  assert.match(buildRekordboxXml(draft), /Friday Alternativen/);
  const en = buildRekordboxXml(draft, tEn);
  assert.match(en, /Friday Alternatives/);
  assert.match(en, /Path missing — relink the file in rekordbox/);
  assert.match(buildRekordboxXml(draft), /Pfad fehlt — in rekordbox der Datei zuordnen/);
});

test("set-only comments print and copy but never become rekordbox Comments", () => {
  const noted = {
    ...draft,
    tracks: [
      track({
        id: "note",
        name: "Cue Track",
        filePath: "/Cue Track.mp3",
        comment: "Bring vocal in after 32",
      }),
    ],
  };
  assert.match(buildSetPrintHtml(noted), /Bring vocal in after 32/);
  assert.match(exportSetText(noted), /Bring vocal in after 32/);
  assert.doesNotMatch(buildRekordboxXml(noted), /Bring vocal in after 32/);
});

test("importer errors carry keys and keep the German message", () => {
  assert.throws(() => parseRekordboxPdb(new ArrayBuffer(8)), /zu klein/);
  try {
    parseRekordboxPdb(new ArrayBuffer(8));
    assert.fail("expected an error");
  } catch (error) {
    assert.equal(errorText(error, tDe), "Die Datei ist zu klein für eine rekordbox export.pdb.");
    assert.equal(errorText(error, tEn), "The file is too small to be a rekordbox export.pdb.");
  }
});

test("stick set helpers accept a translator", () => {
  const set = {
    id: "p:1",
    name: "Set",
    path: "Set",
    kind: "history" as const,
    missing: 0,
    tracks: [
      {
        id: "1",
        title: "T",
        artist: "A",
        album: "",
        bpm: "120",
        keyRaw: "8A",
        keyCamelot: "8A",
        durationMs: 1000,
        comment: "",
        filePath: "",
      },
    ],
  };
  // distributeRoles may replace the reason, but the call must accept a translator.
  assert.equal(applyStickSet(draft, set, tEn).tracks.length, 1);
  const picked = libraryTrackToSetTrack(
    { artist: "A", title: "T", key: "8A", bpm: "120" },
    "open",
    "groove",
    tEn,
  );
  assert.equal(picked.why, "Added to the set from the stick library");
});

test("stick set replace and merge normalize and deduplicate tracks", () => {
  const set = {
    id: "p:2",
    name: "Incoming",
    path: "Incoming",
    kind: "playlist" as const,
    missing: 0,
    tracks: [
      {
        id: "a",
        title: "Duplicate",
        artist: "A",
        album: "",
        bpm: "120",
        keyRaw: "8A",
        keyCamelot: "8A",
        durationMs: 1000,
        comment: "",
        filePath: "",
      },
      {
        id: "new",
        title: "Fresh",
        artist: "B",
        album: "",
        bpm: "121",
        keyRaw: "9A",
        keyCamelot: "9A",
        durationMs: 1000,
        comment: "",
        filePath: "",
      },
    ],
  };
  const replaced = applyStickSetMode(draft, set, "replace");
  assert.equal(replaced.title, "Incoming");
  assert.deepEqual(replaced.tracks.map((item) => item.id), [
    "rekordbox:p:2:a:0",
    "rekordbox:p:2:new:1",
  ]);
  const current = {
    ...draft,
    tracks: draft.tracks.map((item, index) =>
      index === 0 ? { ...item, id: "rekordbox:p:2:a:0" } : item,
    ),
  };
  const merged = applyStickSetMode(current, set, "merge");
  assert.equal(merged.title, "Friday");
  assert.deepEqual(merged.tracks.map((item) => item.id), [
    "rekordbox:p:2:a:0",
    "b",
    "c",
    "rekordbox:p:2:new:1",
  ]);
});

test("the printout and the text list stay short for a three hour set", () => {
  const long: SetDraft = {
    ...draft,
    durationMinutes: 180,
    tracks: Array.from({ length: 40 }, (_, i) =>
      track({
        id: `t${i}`,
        name: `Track ${i + 1}`,
        phase: (["open", "lift", "rise", "peak", "release"] as const)[Math.floor(i / 8)],
        durationMs: 270_000,
        externalUrl: "https://example.com/very/long/link",
        why: "Long explanation that does not belong on paper",
        comment: "7A - Energy 6",
      }),
    ),
  };
  const html = buildSetPrintHtml(long);
  assert.equal((html.match(/<tr>/g) ?? []).length, 40 + 1); // 40 tracks + the header row
  assert.doesNotMatch(html, /example\.com|Long explanation/);
  assert.match(html, /Energy 6/);
  const text = exportSetText(long);
  assert.doesNotMatch(text, /example\.com|Long explanation/);
  assert.ok(text.split("\n").length < 100);
});
