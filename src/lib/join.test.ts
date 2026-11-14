import assert from "node:assert/strict";
import test from "node:test";
import type { AnlzBeat } from "./anlz-cues";
import type { AnlzPhrase } from "./anlz-cues";
import {
  cueStartMs,
  driftCorrection,
  equalPowerGains,
  expectedIncomingMs,
  gridSyncRate,
  joinPlan,
  mixBarsLeft,
  mixClock,
  nearestDownbeatMs,
  outgoingStartMs,
  overlapFromDrag,
  overlapFromVisibleDrag,
  phaseAlignedStartMs,
  phraseAlignedStartMs,
  phraseAt,
  overlapFromEndDrag,
  quantizeSlipMs,
  sharedJoinView,
  slipStartMs,
  JOIN_PLAYHEAD,
  JOIN_SEEK_MS,
  syncedIncomingRate,
  syncRate,
} from "./join.ts";

const downbeat = (timeMs: number): AnlzBeat => ({ timeMs, beat: 1 });

test("the outgoing overlap starts at the file end minus the planned length", () => {
  assert.equal(outgoingStartMs(100_000, 30_000), 70_000);
  assert.equal(outgoingStartMs(100_000, 400_000), 0);
  assert.equal(outgoingStartMs(0, 30_000), 0);
});

test("hot cue A is the incoming start, otherwise the file start", () => {
  assert.equal(cueStartMs([{ slot: 0, timeMs: 5_000 }]), 5_000);
  assert.equal(cueStartMs([{ slot: 1, timeMs: 5_000 }]), 0);
  assert.equal(cueStartMs(undefined), 0);
});

test("sync matches the played outgoing BPM and keeps the rate inside an octave", () => {
  assert.equal(syncRate(128, 0, 120), 128 / 120);
  assert.equal(syncRate(128, 10, 128), 1.1);
  assert.equal(syncRate(0, 0, 120), null);
  assert.equal(syncRate(80, 0, 200), 0.5);
});

test("grid rate matches wall-time bars when metadata BPM is the same", () => {
  const outgoing = Array.from({ length: 20 }, (_, index) => downbeat(index * 1_960));
  const incoming = Array.from({ length: 20 }, (_, index) => downbeat(index * 2_000));
  const rate = gridSyncRate(outgoing, incoming, 9_800, 10_000, 122, 122, 0);
  assert.ok(rate != null);
  assert.ok(Math.abs(rate - 2_000 / 1_960) < 1e-9);
  assert.ok(Math.abs(1_960 / 1 - 2_000 / rate) < 1e-6);
  const fallback = gridSyncRate(null, null, 0, 0, 122, 120, 0);
  assert.equal(fallback, syncRate(122, 0, 120));
});

test("sync sits the incoming mix on a downbeat", () => {
  const bars = (offset: number, step: number) =>
    Array.from({ length: 40 }, (_, index) => downbeat(offset + index * step));
  const plan = joinPlan({
    outgoingDurationMs: 80_000,
    overlapMs: 31_000,
    incomingCueMs: 100,
    outgoingBpm: 122,
    incomingBpm: 122,
    pitchPercent: 0,
    sync: true,
    outgoingBeats: bars(0, 1_960),
    incomingBeats: bars(80, 2_000),
  });
  assert.equal(plan.outStartMs % 1_960, 0);
  assert.equal((plan.inStartMs - 80) % 2_000, 0);
  assert.ok(Math.abs(plan.inRate - 2_000 / 1_960) < 1e-6);
  assert.equal(plan.phase, true);
});

test("equal power starts on the outgoing track and ends on the incoming one", () => {
  const start = equalPowerGains(0);
  const mid = equalPowerGains(0.5);
  const end = equalPowerGains(1);
  assert.ok(Math.abs(start.outgoing - 1) < 1e-9);
  assert.ok(Math.abs(start.incoming) < 1e-9);
  assert.ok(Math.abs(end.outgoing) < 1e-9);
  assert.ok(Math.abs(end.incoming - 1) < 1e-9);
  assert.ok(Math.abs(mid.outgoing - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(mid.incoming - Math.SQRT1_2) < 1e-9);
});

test("phase shifts the incoming start by less than half a beat", () => {
  const beats = [downbeat(0), downbeat(500)];
  const aligned = phaseAlignedStartMs(0, 100, beats, beats, 120, 120);
  assert.equal(aligned.phase, true);
  assert.ok(Math.abs(aligned.startMs - 100) < 1);
  const untouched = phaseAlignedStartMs(0, 100, null, beats, 120, 120);
  assert.equal(untouched.phase, false);
  assert.equal(untouched.startMs, 0);
});

test("phase that would leave the file takes the other direction", () => {
  const incoming = [downbeat(79), downbeat(579)];
  const outgoing = [downbeat(0), downbeat(500)];
  const aligned = phaseAlignedStartMs(79, 300, outgoing, incoming, 120, 120);
  assert.equal(aligned.phase, true);
  assert.ok(aligned.startMs > 79);
  const beat = 500;
  const phase = ((aligned.startMs - 79) % beat) / beat;
  assert.ok(Math.abs(phase - 0.6) < 0.02);
});

test("phase follows the grid spacing instead of the metadata BPM", () => {
  const outgoing = [downbeat(0), downbeat(480), downbeat(960)];
  const incoming = [downbeat(50), downbeat(530), downbeat(1010)];
  const aligned = phaseAlignedStartMs(50, 480, outgoing, incoming, 120, 120);
  assert.equal(aligned.phase, true);
  assert.ok(Math.abs(aligned.startMs - 50) < 0.05);
});

test("sync puts both downbeats on the mix point when one is within half a bar", () => {
  const bars = (offset: number) =>
    Array.from({ length: 40 }, (_, index) => downbeat(offset + index * 2_000));
  const plan = joinPlan({
    outgoingDurationMs: 80_000,
    overlapMs: 31_000,
    incomingCueMs: 0,
    outgoingBpm: 120,
    incomingBpm: 120,
    pitchPercent: 0,
    sync: true,
    outgoingBeats: bars(0),
    incomingBeats: bars(79),
  });
  assert.equal(plan.outStartMs, 50_000);
  assert.ok(Math.abs(plan.inStartMs - 79) < 0.05);
  assert.equal(plan.phase, true);
});

test("the incoming clock is nudged only past the drift threshold", () => {
  assert.equal(expectedIncomingMs(1_000, 2_000, 1.1), 3_200);
  assert.equal(driftCorrection(3_210, 3_200), null);
  assert.equal(driftCorrection(3_230, 3_200), null);
  assert.equal(driftCorrection(3_200 + JOIN_SEEK_MS + 1, 3_200), 3_200);
});

test("dragging the wave pulls the start earlier and stays inside the file", () => {
  assert.equal(slipStartMs(40_000, 10, 100, 20_000, 180_000), 38_000);
  assert.equal(slipStartMs(1_000, 50, 100, 20_000, 180_000), 0);
  assert.equal(slipStartMs(170_000, -100, 100, 20_000, 180_000), 180_000);
});

test("both starts sit on one playhead even when a track has no lead-in", () => {
  const fraction = (start: number, view: { startMs: number; endMs: number }) =>
    (start - view.startMs) / (view.endMs - view.startMs);
  const out = sharedJoinView(40_000, 1, 30_000, 1);
  const inn = sharedJoinView(0, 122 / 120, 30_000, 1);
  assert.ok(Math.abs(fraction(40_000, out) - JOIN_PLAYHEAD) < 1e-6);
  assert.ok(Math.abs(fraction(0, inn) - JOIN_PLAYHEAD) < 1e-6);
  assert.ok(inn.startMs < 0);
  const later = 5_000;
  const outHead = fraction(40_000 + later, out);
  const inHead = fraction(later * (122 / 120), inn);
  assert.ok(Math.abs(outHead - inHead) < 1e-6);
  const closer = sharedJoinView(0, 1, 30_000, 4);
  assert.ok(Math.abs(fraction(0, closer) - JOIN_PLAYHEAD) < 1e-6);
  assert.ok(closer.endMs - closer.startMs < inn.endMs - inn.startMs);
});

test("dragging the overlap end lengthens the mix", () => {
  assert.equal(overlapFromEndDrag(30_000, 10, 100, 8_000, 180_000), 30_000 + 10 * (8_000 / 100));
  assert.equal(overlapFromEndDrag(1_000, 500, 100, 8_000, 5_000), 5_000);
});

test("dragging across the visible window shortens the overlap", () => {
  assert.equal(overlapFromVisibleDrag(30_000, 10, 100, 8_000, 180_000), 30_000 - 10 * (8_000 / 100));
  assert.equal(overlapFromVisibleDrag(1_000, -500, 100, 8_000, 5_000), 5_000);
});

test("dragging the edge shortens the overlap and stays inside the file", () => {
  assert.equal(overlapFromDrag(30_000, 10, 100, 8_000, 180_000), 30_000 - 10 * (38_000 / 100));
  assert.equal(overlapFromDrag(1_000, -500, 100, 8_000, 5_000), 5_000);
  assert.equal(overlapFromDrag(1_000, 500, 100, 8_000, 5_000), 0);
});

test("a chosen cue starts that side and stays on the cue", () => {
  const plan = joinPlan({
    outgoingDurationMs: 180_000,
    overlapMs: 30_000,
    incomingCueMs: 12_000,
    outgoingAnchorMs: 40_000,
    incomingLocked: true,
    outgoingBpm: 120,
    incomingBpm: 120,
    pitchPercent: 0,
    sync: true,
    outgoingBeats: [downbeat(0), downbeat(2_000)],
    incomingBeats: [downbeat(0), downbeat(2_000)],
  });
  assert.equal(plan.outStartMs, 40_000);
  assert.equal(plan.inStartMs, 12_000);
  assert.equal(plan.phase, false);
});

test("a nudge bends the incoming tempo and a small drift only eases it", () => {
  assert.equal(syncedIncomingRate(1, 0, 0), 1);
  assert.ok(syncedIncomingRate(1, 0, 1) > 1);
  assert.ok(syncedIncomingRate(1, 0, -1) < 1);
  assert.ok(syncedIncomingRate(1, 10, 0) > 1);
  assert.ok(syncedIncomingRate(1, 10, 0) < 1.04);
  assert.ok(syncedIncomingRate(1, 40, 0) > 1);
  assert.ok(syncedIncomingRate(1, 40, 0) <= 1.04);
});

test("the mix edge shares one x even when the tempos differ", () => {
  const plan = joinPlan({
    outgoingDurationMs: 180_000,
    overlapMs: 30_000,
    incomingCueMs: 20_000,
    outgoingAnchorMs: 40_000,
    outgoingBpm: 122,
    incomingBpm: 120,
    pitchPercent: 0,
    sync: true,
    outgoingBeats: null,
    incomingBeats: null,
  });
  assert.equal(plan.outViewEndMs, 70_000);
  const outSpan = plan.outViewEndMs - plan.outViewStartMs;
  const inSpan = plan.inViewEndMs - plan.inViewStartMs;
  const outEdge = (plan.outStartMs - plan.outViewStartMs) / outSpan;
  const inEdge = (plan.inStartMs - plan.inViewStartMs) / inSpan;
  assert.ok(Math.abs(outEdge - inEdge) < 1e-6);
  const later = 10_000;
  const outHead = (plan.outStartMs + later * plan.outRate - plan.outViewStartMs) / outSpan;
  const inHead = (plan.inStartMs + later * plan.inRate - plan.inViewStartMs) / inSpan;
  assert.ok(Math.abs(outHead - inHead) < 1e-6);
});

test("the join window lines both waves up on one playhead", () => {
  const plan = joinPlan({
    outgoingDurationMs: 180_000,
    overlapMs: 30_000,
    incomingCueMs: 0,
    outgoingBpm: 120,
    incomingBpm: 120,
    pitchPercent: 0,
    sync: true,
    outgoingBeats: [downbeat(0), downbeat(2_000)],
    incomingBeats: [downbeat(0), downbeat(2_000)],
  });
  assert.equal(plan.outStartMs, 150_000);
  assert.equal(plan.outRate, 1);
  assert.equal(plan.inRate, 1);
  assert.equal(plan.phase, true);
  assert.equal(plan.outViewEndMs - plan.outViewStartMs, plan.inViewEndMs - plan.inViewStartMs);
});

function phrase(name: AnlzPhrase["name"], timeMs: number, endMs: number): AnlzPhrase {
  return { beat: 1, endBeat: 8, timeMs, endMs, name };
}

test("quantize snap lands on the nearest downbeat inside the file", () => {
  const beats = [downbeat(0), downbeat(2_000), downbeat(4_000)];
  assert.equal(nearestDownbeatMs(beats, 2_100, 120), 2_000);
  assert.equal(quantizeSlipMs(2_100, beats, 120, 10_000), 2_000);
  assert.equal(quantizeSlipMs(50, beats, 120, 10_000), 0);
  assert.equal(quantizeSlipMs(8_000, null, 120, 10_000), 8_000);
});

test("mix remaining is whole bars and a clock", () => {
  assert.equal(mixBarsLeft(64_000, 120), 32);
  assert.equal(mixClock(64_000), "1:04");
  assert.equal(mixBarsLeft(0, 120), 0);
});

test("phrase at the mix is the band that contains the time", () => {
  const phrases = [phrase("outro", 0, 16_000), phrase("chorus", 16_000, 32_000)];
  assert.equal(phraseAt(phrases, 8_000)?.name, "outro");
  assert.equal(phraseAt(phrases, 16_000)?.name, "chorus");
});

test("phrase lock sits the incoming intro on the outgoing outro", () => {
  const beats = Array.from({ length: 40 }, (_, index) => downbeat(index * 2_000));
  const outgoing = [phrase("outro", 0, 80_000)];
  const incoming = [phrase("intro", 0, 16_000), phrase("chorus", 16_000, 32_000)];
  const aligned = phraseAlignedStartMs(0, 8_000, beats, beats, 120, 120, outgoing, incoming);
  assert.equal(aligned.phase, true);
  assert.ok(Math.abs(aligned.startMs - 8_000) < 1);
  const plan = joinPlan({
    outgoingDurationMs: 80_000,
    overlapMs: 16_000,
    incomingCueMs: 0,
    outgoingBpm: 120,
    incomingBpm: 120,
    pitchPercent: 0,
    sync: true,
    outgoingBeats: beats,
    incomingBeats: beats,
    outgoingPhrases: outgoing,
    incomingPhrases: incoming,
  });
  assert.equal(plan.phase, true);
  assert.ok(plan.inStartMs >= 0);
});
