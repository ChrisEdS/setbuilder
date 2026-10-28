/**
 * Nested drawers (Replace + Guide) must not restore body overflow while
 * another lock is still held — that left the page unable to scroll.
 */
const locks = new Set<symbol>();

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => undefined;
  const id = Symbol("ui-scroll-lock");
  const first = locks.size === 0;
  locks.add(id);
  if (first) document.body.style.overflow = "hidden";
  return () => {
    locks.delete(id);
    if (locks.size === 0) document.body.style.overflow = "";
  };
}

/** Drop a lock left behind by HMR or a missed cleanup. */
export function clearBodyScrollLock(): void {
  locks.clear();
  if (typeof document !== "undefined") document.body.style.overflow = "";
}
