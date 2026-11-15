/** Shared tip session: one active bubble, warm delays, dismiss helpers for Tip. */

/** Wait before the first tip, so sweeping across controls does not flash one. */
export const TIP_SHOW_DELAY_MS = 450;
/** Once a tip is open (or just closed), the next neighbor can appear sooner. */
export const TIP_SKIP_DELAY_MS = 100;
export const TIP_SKIP_GRACE_MS = 120;
/** Keyboard focus still waits briefly so tabbing does not strobe every tip. */
export const TIP_FOCUS_DELAY_MS = 180;
/** Leave hides almost immediately; long enough to ignore a one-frame gap. */
export const TIP_HIDE_DELAY_MS = 60;

let openTipCount = 0;
let lastTipClosedAt = 0;
let activeCloser: (() => void) | null = null;

export function tipGetOpenCount(): number {
  return openTipCount;
}

export function tipGetLastClosedAt(): number {
  return lastTipClosedAt;
}

export function tipShowDelay(
  source: "pointer" | "focus",
  openCount = openTipCount,
  lastClosedAt = lastTipClosedAt,
  now = Date.now(),
): number {
  if (source === "focus") return TIP_FOCUS_DELAY_MS;
  const warm = openCount > 0 || now - lastClosedAt < TIP_SKIP_GRACE_MS;
  return warm ? TIP_SKIP_DELAY_MS : TIP_SHOW_DELAY_MS;
}

/** Only commit a delayed show if the user is still interested and not quiet. */
export function tipShouldCommitShow(interested: boolean, quiet: boolean): boolean {
  return interested && !quiet;
}

/**
 * True when a Tip host wraps an open `<details>` menu (energy / sort / …).
 * Hover and focus must not resurrect a tip over that panel.
 */
export function tipHostHasOpenDetails(
  host: { querySelector: (selectors: string) => unknown } | null | undefined,
): boolean {
  if (!host) return false;
  return host.querySelector("details[open]") != null;
}

export function tipNoteOpened(): void {
  openTipCount += 1;
}

export function tipNoteClosed(): void {
  openTipCount = Math.max(0, openTipCount - 1);
  lastTipClosedAt = Date.now();
}

/**
 * Register this tip as the only active portal. Closing the previous active
 * tip prevents a stuck bubble when focus/hover jumps without a clean leave.
 */
export function tipClaimActive(closer: () => void): void {
  if (activeCloser && activeCloser !== closer) {
    const previous = activeCloser;
    activeCloser = closer;
    previous();
    return;
  }
  activeCloser = closer;
}

export function tipReleaseActive(closer: () => void): void {
  if (activeCloser === closer) activeCloser = null;
}

/** Test helper — reset module globals between cases. */
export function tipResetSessionForTests(): void {
  openTipCount = 0;
  lastTipClosedAt = 0;
  activeCloser = null;
}
