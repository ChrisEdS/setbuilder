import assert from "node:assert/strict";
import test from "node:test";
import {
  canReshuffleDraft,
  distributeRoles,
  extractSetFromPlaylist,
  fitToSlot,
  reshuffleDraftFromPool,
} from "./extract-set.ts";
import { tEn } from "./i18n/core.ts";
import { DEFAULT_SET, playedDurationMs } from "./set.ts";
import type { SpotifyTrack } from "./spotify.ts";

const mk = (i: number, phase: string, energy?: number) => ({
  id: `t${i}`, name: `T${i}`, artists: ["A"], album: "", durationMs: 6 * 60_000, uri: "", externalUrl: "",
  imageUrl: null, phase, role: "groove", transition: "unset", bpm: "124", keyCamelot: "8A",
  note: "", why: "", safetyAlt: "", energyLevel: energy, source: "rekordbox",
});
test("played time keeps two minutes of every track for the blend", () => {
  assert.equal(playedDurationMs(6 * 60_000), 4 * 60_000);
  assert.equal(playedDurationMs(20_000), 20_000);
  assert.equal(playedDurationMs(90_000), 30_000);
});

test("slot fit trims to the brief and prefers tracks in the phase band", () => {
  const energies = [3,5,4, 5,6,5, 6,7,8,6, 7,9,5,9,8,4, 5,4,6];
  const phases = ["open","open","open","lift","lift","lift","rise","rise","rise","rise","peak","peak","peak","peak","peak","peak","release","release","release"];
  const tracks = energies.map((e,i)=>mk(i,phases[i],e));
  const draft: any = { ...DEFAULT_SET, durationMinutes: 60, tracks };
  const r = fitToSlot(draft);
  const kept = r.draft.tracks.filter((t:any)=>t.role!=="safety");
  const fileMs = kept.reduce((sum: number, track: { durationMs: number }) => sum + track.durationMs, 0);
  assert.ok(r.afterMs < r.beforeMs);
  assert.ok(r.afterMs <= 60 * 60_000 * 1.05);
  assert.ok(fileMs > 60 * 60_000, "file length stays above the slot");
  assert.equal(kept[0].id, "t0");
  assert.equal(kept[kept.length-1].id, "t18");
  const peak = kept.filter((t: { phase: string; energyLevel: number }) => t.phase === "peak");
  assert.ok(peak.length >= 3);
  assert.ok(
    peak.filter((t: { energyLevel: number }) => t.energyLevel >= 8).length >=
      peak.filter((t: { energyLevel: number }) => t.energyLevel < 8).length,
    "peak prefers the phase band",
  );
  assert.equal(r.moved, r.draft.tracks.filter((t:any)=>t.role==="safety").length);
});

test("roles name the phase pivot with labels, and drop legacy machine notes", () => {
  const tracks = [mk(0, "open", 4), mk(1, "lift", 5), mk(2, "lift", 5)];
  tracks[2].note = "lift/groove · Übergang: long-blend · Nachbar-Key (±1)";
  tracks[1].note = "Vocal erst ab 1:30";
  const draft: any = { ...DEFAULT_SET, tracks };
  const de = distributeRoles(draft);
  assert.equal(de.tracks[1].role, "bridge");
  assert.equal(de.tracks[1].why, "Phasen-Pivot Open → Lift");
  assert.equal(de.tracks[1].note, "Vocal erst ab 1:30");
  assert.equal(de.tracks[2].note, "");
  const en = distributeRoles(draft, tEn);
  assert.equal(en.tracks[1].why, "Phase pivot Open → Lift");
});

function spotifyTrack(i: number, over: Partial<SpotifyTrack> = {}): SpotifyTrack {
  return {
    id: `sp${i}`,
    name: `Song ${i}`,
    uri: `spotify:track:${i}`,
    durationMs: 5 * 60_000,
    explicit: false,
    artists: ["Artist"],
    album: "Album",
    imageUrl: null,
    externalUrl: `https://open.spotify.com/track/${i}`,
    catalogBpm: String(120 + (i % 8)),
    catalogKey: `${(i % 12) + 1}A`,
    catalogPopularity: 0.3 + (i % 7) * 0.1,
    ...over,
  };
}

test("extract stores the playlist pool for later reshuffle", () => {
  const crate = Array.from({ length: 40 }, (_, i) => spotifyTrack(i));
  const draft = extractSetFromPlaylist(crate, "Big Night", {
    durationMinutes: 60,
  });
  assert.ok(draft.sourcePool);
  assert.equal(draft.sourcePool?.length, 40);
  assert.ok(canReshuffleDraft(draft));
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  assert.ok(performance.length < 40);
  assert.ok(
    draft.tracks.filter((track) => track.role === "safety").length <= 24,
  );
});

test("reshuffleDraftFromPool keeps the brief and can change the cast", () => {
  const crate = Array.from({ length: 50 }, (_, i) => spotifyTrack(i));
  const draft = extractSetFromPlaylist(crate, "Big Night", {
    durationMinutes: 45,
    title: "Kept Title",
    vibe: "Kept Vibe",
    venue: "Kept Venue",
  });
  const before = draft.tracks
    .filter((track) => track.role !== "safety")
    .map((track) => track.id);

  // A fixed sequence that moves other tracks into the packed prefix.
  // A constant 0 only swaps with the front and can rebuild the same cast.
  let calls = 0;
  const random = () => {
    calls += 1;
    return (calls % 3) / 3;
  };
  const next = reshuffleDraftFromPool(draft, tEn, random);
  assert.ok(calls > 0);
  assert.equal(next.title, "Kept Title");
  assert.equal(next.vibe, "Kept Vibe");
  assert.equal(next.venue, "Kept Venue");
  assert.equal(next.durationMinutes, 45);
  assert.equal(next.sourcePool?.length, draft.sourcePool?.length);
  const after = next.tracks
    .filter((track) => track.role !== "safety")
    .map((track) => track.id);
  assert.notDeepEqual(before, after);
  assert.ok(canReshuffleDraft(next));
});

test("reshuffleDraftFromPool keeps opener and closer pins in the cast", () => {
  const crate = Array.from({ length: 40 }, (_, i) => spotifyTrack(i));
  let draft = extractSetFromPlaylist(crate, "Pinned Night", {
    durationMinutes: 45,
  });
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  // Pin tracks that packTracks would normally drop on a reverse shuffle.
  const openerId = performance[performance.length - 1]?.id ?? performance[0].id;
  const closerId = performance[0]?.id ?? performance[performance.length - 1].id;
  draft = {
    ...draft,
    openerId,
    closerId,
  };
  const next = reshuffleDraftFromPool(draft, tEn, () => 0);
  const nextPerf = next.tracks.filter((track) => track.role !== "safety");
  assert.equal(next.openerId, openerId);
  assert.equal(next.closerId, closerId);
  assert.equal(nextPerf[0]?.id, openerId);
  assert.equal(nextPerf[nextPerf.length - 1]?.id, closerId);
  assert.ok(nextPerf.some((track) => track.id === openerId));
  assert.ok(nextPerf.some((track) => track.id === closerId));
});


test("canReshuffleDraft is false without a usable pool", () => {
  assert.equal(canReshuffleDraft({ ...DEFAULT_SET, tracks: [] }), false);
  const tiny = extractSetFromPlaylist(
    [spotifyTrack(0), spotifyTrack(1)],
    "Tiny",
    { durationMinutes: 60 },
  );
  // Two tracks both fit a 60-min soft pack of at least 8? Actually pack takes
  // both; pool size == performance → cannot reshuffle for a different cast.
  assert.equal(canReshuffleDraft(tiny), false);
});
