import assert from "node:assert/strict";
import test from "node:test";
import {
  canReshuffleDraft,
  distributeRoles,
  extractSetFromPlaylist,
  fitToSlot,
  undoTrimToSlot,
  reshuffleDraftFromPool,
} from "./extract-set.ts";
import { tEn } from "./i18n/core.ts";
import { DEFAULT_SET, playedDurationMs, playedTotalMs, trackPlayedMs } from "./set.ts";
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

test("a shorter mix leaves more of the file in the slot", () => {
  assert.equal(playedDurationMs(6 * 60_000, 30_000), 5.5 * 60_000);
  assert.equal(playedDurationMs(6 * 60_000, 99_000), 4 * 60_000);
});

test("an explicit overlap is the length the clock subtracts", () => {
  const file = 6 * 60_000;
  assert.equal(
    trackPlayedMs({ durationMs: file, transition: "unset", overlapMs: 90_000 }, 120_000),
    4.5 * 60_000,
  );
  assert.equal(trackPlayedMs({ durationMs: file, transition: "unset" }, 120_000), 4 * 60_000);
  assert.equal(trackPlayedMs({ durationMs: file, transition: "cut" }, 120_000), file);
});

test("a planned transition replaces the average blend on that track", () => {
  const file = 6 * 60_000;
  assert.equal(trackPlayedMs({ durationMs: file, transition: "unset" }, 120_000), 4 * 60_000);
  assert.equal(trackPlayedMs({ durationMs: file, transition: "cut" }, 120_000), file);
  assert.equal(trackPlayedMs({ durationMs: file, transition: "short-blend" }, 120_000), file - 15_000);
  assert.equal(trackPlayedMs({ durationMs: file, transition: "long-blend" }, 120_000), file - 60_000);
  const tracks = [mk(0, "open"), { ...mk(1, "lift"), transition: "cut" as const }];
  assert.equal(playedTotalMs(tracks, 120_000), 10 * 60_000);
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

test("undo trim restores moved tracks and keeps later notes and reorders", () => {
  const energies = [3,5,4, 5,6,5, 6,7,8,6, 7,9,5,9,8,4, 5,4,6];
  const phases = ["open","open","open","lift","lift","lift","rise","rise","rise","rise","peak","peak","peak","peak","peak","peak","release","release","release"];
  const tracks = energies.map((e, i) => mk(i, phases[i], e));
  const draft: any = { ...DEFAULT_SET, durationMinutes: 60, tracks };
  const fitted = fitToSlot(draft);
  assert.ok(fitted.restore.length > 0);
  assert.equal(fitted.restore.length, fitted.moved);
  const movedIds = new Set(fitted.restore.map((move) => move.id));
  for (const move of fitted.restore) {
    const before = tracks.find((track) => track.id === move.id);
    assert.ok(before);
    assert.equal(move.role, before.role);
    assert.equal(move.phase, before.phase);
    assert.equal(move.index, tracks.findIndex((track) => track.id === move.id));
    assert.equal(fitted.draft.tracks.find((track) => track.id === move.id)?.role, "safety");
  }

  const kept = fitted.draft.tracks.filter((track) => !movedIds.has(track.id));
  assert.ok(kept.length >= 2);
  const noteId = kept[0].id;
  const swapA = kept[kept.length - 2].id;
  const swapB = kept[kept.length - 1].id;
  const movedNoteId = fitted.restore[0].id;
  const edited = fitted.draft.tracks.map((track) => {
    if (track.id === noteId) return { ...track, note: "floor cue", role: "anchor" as const };
    if (track.id === movedNoteId) return { ...track, note: "booth cue" };
    return track;
  });
  const swapFrom = edited.findIndex((track) => track.id === swapA);
  const swapTo = edited.findIndex((track) => track.id === swapB);
  const swapped = [...edited];
  [swapped[swapFrom], swapped[swapTo]] = [swapped[swapTo], swapped[swapFrom]];

  const undone = undoTrimToSlot({ ...fitted.draft, tracks: swapped }, fitted.restore);
  for (const move of fitted.restore) {
    const track = undone.tracks.find((item) => item.id === move.id);
    assert.ok(track);
    assert.equal(track.role, move.role);
    assert.equal(track.phase, move.phase);
    assert.equal(track.why ?? "", move.why ?? "");
    assert.equal(undone.tracks[move.index]?.id, move.id);
  }
  const noted = undone.tracks.find((track) => track.id === noteId);
  assert.equal(noted?.note, "floor cue");
  assert.equal(noted?.role, "anchor");
  assert.equal(undone.tracks.find((track) => track.id === movedNoteId)?.note, "booth cue");
  const pos = (id: string) => undone.tracks.findIndex((track) => track.id === id);
  assert.ok(pos(swapB) < pos(swapA));
  assert.equal(undoTrimToSlot(fitted.draft, []), fitted.draft);
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
    notes: "Doors 22:00 · curfew 04:00",
  });
  assert.ok(draft.sourcePool);
  assert.equal(draft.sourcePool?.length, 40);
  assert.ok(canReshuffleDraft(draft));
  assert.equal(draft.notes, "Doors 22:00 · curfew 04:00");
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

test("reshuffleDraftFromPool keeps a mid pin in the performance", () => {
  const crate = Array.from({ length: 40 }, (_, i) => spotifyTrack(i));
  let draft = extractSetFromPlaylist(crate, "Pinned Night", {
    durationMinutes: 45,
  });
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  const mid = performance[Math.floor(performance.length / 2)]?.id;
  assert.ok(mid);
  draft = { ...draft, pinnedIds: [mid] };
  const next = reshuffleDraftFromPool(draft, tEn, () => 0);
  const nextPerf = next.tracks.filter((track) => track.role !== "safety");
  assert.ok(nextPerf.some((track) => track.id === mid));
  assert.ok(next.pinnedIds?.includes(mid));
  assert.equal(next.tracks.find((track) => track.id === mid)?.role === "safety", false);
});

test("slot fit keeps opener, closer and a mid pin in the performance", () => {
  const energies = [3, 5, 4, 5, 6, 5, 6, 7, 8, 6, 7, 9, 5, 9, 8, 4, 5, 4, 6];
  const phases = ["open", "open", "open", "lift", "lift", "lift", "rise", "rise", "rise", "rise", "peak", "peak", "peak", "peak", "peak", "peak", "release", "release", "release"];
  const tracks = energies.map((energy, index) => mk(index, phases[index], energy));
  const draft: any = {
    ...DEFAULT_SET,
    durationMinutes: 60,
    tracks,
    openerId: "t0",
    closerId: "t18",
    pinnedIds: ["t12"],
  };
  const fitted = fitToSlot(draft);
  const kept = fitted.draft.tracks.filter((track: { role: string }) => track.role !== "safety");
  for (const id of ["t0", "t18", "t12"]) {
    assert.ok(kept.some((track: { id: string }) => track.id === id), id);
  }
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
