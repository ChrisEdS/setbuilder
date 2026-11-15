import assert from "node:assert/strict";
import test from "node:test";
import {
  TIP_FOCUS_DELAY_MS,
  TIP_HIDE_DELAY_MS,
  TIP_SHOW_DELAY_MS,
  TIP_SKIP_DELAY_MS,
  tipClaimActive,
  tipGetOpenCount,
  tipNoteClosed,
  tipNoteOpened,
  tipReleaseActive,
  tipHostHasOpenDetails,
  tipResetSessionForTests,
  tipShouldCommitShow,
  tipShowDelay,
} from "./tip-session.ts";

test("tipShowDelay is warm after an open tip or a recent close", () => {
  tipResetSessionForTests();
  const now = 1_000_000;
  assert.equal(tipShowDelay("pointer", 0, 0, now), TIP_SHOW_DELAY_MS);
  assert.equal(tipShowDelay("pointer", 1, 0, now), TIP_SKIP_DELAY_MS);
  assert.equal(tipShowDelay("pointer", 0, now - 50, now), TIP_SKIP_DELAY_MS);
  assert.equal(tipShowDelay("focus", 0, 0, now), TIP_FOCUS_DELAY_MS);
  assert.equal(TIP_HIDE_DELAY_MS, 60);
});

test("tipShouldCommitShow requires interest and not quiet", () => {
  assert.equal(tipShouldCommitShow(true, false), true);
  assert.equal(tipShouldCommitShow(false, false), false);
  assert.equal(tipShouldCommitShow(true, true), false);
});

test("tipHostHasOpenDetails is true only for an open nested details menu", () => {
  assert.equal(tipHostHasOpenDetails(null), false);
  assert.equal(
    tipHostHasOpenDetails({
      querySelector: (sel) => (sel === "details[open]" ? null : {}),
    }),
    false,
  );
  assert.equal(
    tipHostHasOpenDetails({
      querySelector: (sel) => (sel === "details[open]" ? { open: true } : null),
    }),
    true,
  );
});

test("tipClaimActive closes the previous tip so only one bubble stays", () => {
  tipResetSessionForTests();
  let firstClosed = 0;
  let secondClosed = 0;
  const first = () => {
    firstClosed += 1;
  };
  const second = () => {
    secondClosed += 1;
  };
  tipClaimActive(first);
  tipClaimActive(second);
  assert.equal(firstClosed, 1);
  assert.equal(secondClosed, 0);
  tipReleaseActive(second);
  tipClaimActive(first);
  assert.equal(firstClosed, 1);
});

test("open count tracks note opened/closed", () => {
  tipResetSessionForTests();
  tipNoteOpened();
  tipNoteOpened();
  assert.equal(tipGetOpenCount(), 2);
  tipNoteClosed();
  assert.equal(tipGetOpenCount(), 1);
  tipNoteClosed();
  tipNoteClosed();
  assert.equal(tipGetOpenCount(), 0);
});
