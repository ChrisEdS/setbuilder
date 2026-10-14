import assert from "node:assert/strict";
import test from "node:test";
import { buildM3u, buildRekordboxXml } from "./export-booth.ts";
import { pickStreamingMatch } from "./match-link.ts";
import { rankReplacements, swapIntoSlot } from "./replace-track.ts";
import type { SetDraft, SetTrack } from "./set.ts";
import { matchStickFile } from "./stick-audio.ts";

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
  title: "Freitag",
  vibe: "",
  venue: "",
  slot: "",
  slotKind: "peaktime",
  audience: "",
  gear: "",
  durationMinutes: 60,
  tracks: [
    track({ id: "a", name: "Night Drive", filePath: "/Contents/Night Drive.mp3", keyCamelot: "8A" }),
    track({
      id: "b",
      name: "Plan B",
      role: "safety",
      keyCamelot: "8A",
      bpm: "126",
    }),
  ],
};

test("rekordbox XML keeps performance order and a second alternatives playlist", () => {
  const xml = buildRekordboxXml(draft);
  assert.match(xml, /Name="Freitag"/);
  assert.match(xml, /Name="Night Drive"/);
  assert.match(xml, /Tonality="8A"/);
  assert.match(xml, /file:\/\/localhost\/Contents\/Night%20Drive\.mp3/);
  assert.match(xml, /Freitag Alternativen/);
  const main = xml.indexOf("Night Drive");
  const alt = xml.indexOf("Plan B");
  assert.ok(main > 0 && alt > main);
});

test("m3u lists only the performance order", () => {
  const m3u = buildM3u(draft);
  assert.match(m3u, /#EXTM3U/);
  assert.match(m3u, /Ada - Night Drive/);
  assert.match(m3u, /SETFORM - Freitag Alternativen/);
  assert.equal(m3u.includes("Plan B"), false);
});

test("replacement ranking prefers the closer key and bpm", () => {
  const tracks = [
    track({ id: "prev", name: "Prev", keyCamelot: "8A", bpm: "120" }),
    track({ id: "slot", name: "Slot", keyCamelot: "8A", bpm: "128" }),
    track({ id: "next", name: "Next", keyCamelot: "9A", bpm: "130" }),
    track({ id: "close", name: "Close", role: "safety", keyCamelot: "8A", bpm: "129" }),
    track({ id: "far", name: "Far", role: "safety", keyCamelot: "1B", bpm: "100" }),
  ];
  const ranked = rankReplacements(tracks, "slot");
  assert.equal(ranked[0]?.id, "close");
  const swapped = swapIntoSlot(tracks, "slot", "close");
  assert.equal(swapped[1]?.id, "close");
  assert.equal(swapped[1]?.role, "groove");
  assert.equal(swapped.find((item) => item.id === "slot")?.role, "safety");
});

test("streaming match requires the title and prefers the artist", () => {
  const picked = pickStreamingMatch(
    { name: "Night Drive", artists: ["Ada"] },
    [
      { name: "Other Song", artists: ["Ada"], externalUrl: "https://open.spotify.com/track/no", imageUrl: null },
      { name: "Night Drive", artists: ["Someone"], externalUrl: "https://open.spotify.com/track/weak", imageUrl: null },
      { name: "Night Drive (Edit)", artists: ["Ada"], externalUrl: "https://open.spotify.com/track/yes", imageUrl: null },
    ],
  );
  assert.equal(picked?.externalUrl, "https://open.spotify.com/track/yes");
});

test("stick file match accepts the folder prefix the browser adds", () => {
  const files = [
    { name: "Night Drive.mp3", path: "USB/Contents/Night Drive.mp3" },
    { name: "export.pdb", path: "USB/PIONEER/rekordbox/export.pdb" },
  ];
  const hit = matchStickFile(files, "/Contents/Night Drive.mp3", "Night Drive.mp3");
  assert.equal(hit?.name, "Night Drive.mp3");
});
