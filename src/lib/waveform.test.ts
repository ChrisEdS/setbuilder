import assert from "node:assert/strict";
import test from "node:test";
import { fitLead, trackLead, waveformBands, waveformPeaks, waveformWindow, zoomAround, zoomWindow } from "./waveform.ts";

test("peaks follow the body and the loudest sample in each bucket", () => {
  const samples = new Float32Array(8);
  samples[0] = 0.1;
  samples[1] = -0.5;
  samples[4] = 1;
  const peaks = waveformPeaks(samples, 2);
  assert.equal(peaks.high[0], 0.5);
  assert.equal(peaks.high[1], 1);
  assert.ok(peaks.low[0] > 0);
  assert.ok(peaks.low[0] < peaks.high[0]);
  assert.ok(peaks.low[1] > 0);
  assert.ok(peaks.low[1] < peaks.high[1]);
});

test("zooming keeps the time under the pointer and stays inside the track", () => {
  const closer = zoomAround(0, 1, 0.5, 2);
  assert.equal(closer.zoom, 2);
  assert.equal(closer.start, 0.25);

  const edge = zoomAround(0.5, 4, 1, 2);
  assert.equal(edge.zoom, 2);
  assert.equal(edge.start, 0.25);

  const limited = zoomAround(0, 1, 0, 1000);
  assert.equal(limited.zoom, 128);
  assert.equal(limited.start, 0);
});

test("the start of the wave keeps three bars before the first downbeat", () => {
  const beats = [
    { timeMs: 0, beat: 1 },
    { timeMs: 500, beat: 2 },
    { timeMs: 2000, beat: 1 },
  ];
  const lead = trackLead(beats, "120");
  assert.equal(lead.first, 0);
  assert.equal(lead.pad, 6);
  const pad = lead.pad / 180;
  const full = waveformWindow(1, 0, pad);
  assert.ok(full.start < 0);
  assert.ok(full.span > 1);
  const origin = -pad;
  const zoomed = fitLead(0, 0.25, 0, origin, 0);
  assert.equal(zoomed, 0);
  const anchor = (0 - full.start) / full.span;
  const nextSpan = 1 / 16;
  const proposed = zoomWindow(full.start, full.span, anchor, nextSpan, origin);
  const close = fitLead(proposed, nextSpan, 0, origin, 0);
  assert.equal(close, proposed);
  assert.ok(close > origin);
  assert.ok(-close < nextSpan * 0.25);
  assert.equal(waveformWindow(16, close, pad).span, nextSpan);
  const parked = fitLead(origin, nextSpan, 0, origin, 0);
  assert.ok(parked > origin);
  assert.ok(parked < 0);
  assert.ok((0 - parked) / nextSpan < 0.5);
  const centered = Math.max(origin, -nextSpan / 2);
  const followed = fitLead(centered, nextSpan, 0, origin, 0);
  assert.ok((0 - followed) / nextSpan < 0.5);
  assert.equal(fitLead(origin, nextSpan, origin / 2, origin, 0), origin);
  const scrolled = waveformWindow(16, origin, pad);
  assert.equal(scrolled.start, origin);
  assert.equal(scrolled.span, nextSpan);
  assert.equal(fitLead(0.4, 0.25, 0.5, origin, 0), 0.4);
});

test("three bands keep a slow body and a spike in the top", () => {
  const samples = new Float32Array(4000);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * 80 * index) / 4000) * 0.4;
  }
  samples[2000] = 1;
  const bands = waveformBands(samples, 4000, 8);
  assert.equal(bands.low.length, 8);
  assert.ok(bands.low[1] > 0.05);
  assert.ok(bands.high[4] > bands.high[0]);
});

test("an empty buffer still returns the requested buckets", () => {
  const peaks = waveformPeaks(new Float32Array(), 4);
  assert.equal(peaks.low.length, 4);
  assert.equal(peaks.high[3], 0);
});
