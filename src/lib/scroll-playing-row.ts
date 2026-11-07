/**
 * Scroll the set-list row for the track that is actually playing into view.
 * Library-only previews have no set row. A collapsed set section stays closed.
 * A row the user is editing is left alone.
 *
 * The floating player covers the middle of the list, so viewport-center is not
 * a visible destination. A row that is already fully on screen and clear of
 * .preview-player stays put. Otherwise the row moves into a clear band:
 * above the player when that band can hold the whole row, otherwise below it.
 * When the player leaves only short strips, the row goes to the taller strip
 * and stays fully inside it, overflowing away from the player.
 *
 * That placement runs when playback moves to a new track. The player can still
 * grow or move afterward and cover the row it just cleared. A later change to
 * the player box runs the same placement again. An unchanged box does not
 * scroll, including on animation frames where the row is already clear.
 */

export type ScrollBox = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

export type ScrollDelta = {
  top: number;
  left: number;
};

export type ScrollLimits = {
  minTop: number;
  maxTop: number;
};

/** Last player box seen for the current track. The first sample is a baseline. */
export type PlayingRowWatch = {
  player: ScrollBox | null;
};

const EDITING_FIELD = "input, textarea, select, [contenteditable='true']";

type Strip = {
  top: number;
  bottom: number;
  /** Where a row taller than the strip overflows: away from the player. */
  pin: "start" | "end" | "nearest";
};

export function playingRowScrollDelta(
  row: ScrollBox,
  viewport: { width: number; height: number },
  player: ScrollBox | null,
  limits?: ScrollLimits,
): ScrollDelta | null {
  if (row.width <= 0 || row.height <= 0) return null;
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  const left = horizontalNearest(row, viewport.width);
  if (fullyInView(row, viewport) && !coveredByPlayer(row, player)) {
    return left === 0 ? null : { top: 0, left };
  }
  const strips = clearStrips(row, viewport, player);
  const height = row.bottom - row.top;
  for (const strip of stripOrder(strips, height)) {
    const deltaTop = row.top - placeTop(row, strip);
    if (!reachable(deltaTop, limits)) continue;
    return delta(deltaTop, left);
  }
  return left === 0 ? null : { top: 0, left };
}

function fullyInView(row: ScrollBox, viewport: { width: number; height: number }): boolean {
  return (
    row.top >= 0 &&
    row.left >= 0 &&
    row.bottom <= viewport.height &&
    row.right <= viewport.width
  );
}

function coveredByPlayer(row: ScrollBox, player: ScrollBox | null): boolean {
  if (!player || player.width <= 0 || player.height <= 0) return false;
  return boxesOverlap(row, player);
}

function clearStrips(
  row: ScrollBox,
  viewport: { width: number; height: number },
  player: ScrollBox | null,
): Strip[] {
  const full: Strip = { top: 0, bottom: viewport.height, pin: "nearest" };
  if (!player || player.width <= 0 || player.height <= 0) return [full];
  if (player.right <= row.left || player.left >= row.right) return [full];
  const coverTop = Math.max(player.top, 0);
  const coverBottom = Math.min(player.bottom, viewport.height);
  if (coverBottom <= coverTop) return [full];
  const strips: Strip[] = [];
  if (coverTop > 0) strips.push({ top: 0, bottom: coverTop, pin: "end" });
  if (coverBottom < viewport.height) {
    strips.push({ top: coverBottom, bottom: viewport.height, pin: "start" });
  }
  return strips;
}

/** Above the player first when it can hold the row; otherwise the taller strip. */
function stripOrder(strips: Strip[], rowHeight: number): Strip[] {
  const fitting = strips.filter((strip) => strip.bottom - strip.top >= rowHeight);
  if (fitting.length > 0) return fitting;
  let largest: Strip | null = null;
  for (const strip of strips) {
    if (!largest || strip.bottom - strip.top > largest.bottom - largest.top) {
      largest = strip;
    }
  }
  return largest ? [largest] : [];
}

function placeTop(row: ScrollBox, strip: Strip): number {
  const height = row.bottom - row.top;
  const room = strip.bottom - strip.top;
  if (height <= room) {
    const minTop = strip.top;
    const maxTop = strip.bottom - height;
    return Math.min(Math.max(row.top, minTop), maxTop);
  }
  if (strip.pin === "end") return strip.bottom - height;
  if (strip.pin === "start") return strip.top;
  if (row.top < strip.top && row.bottom > strip.bottom) return row.top;
  if (row.bottom > strip.bottom) return strip.bottom - height;
  if (row.top < strip.top) return strip.top;
  return row.top;
}

function horizontalNearest(row: ScrollBox, viewportWidth: number): number {
  if (row.left < 0 && row.right > viewportWidth) return 0;
  if (row.right > viewportWidth) return row.right - viewportWidth;
  if (row.left < 0) return row.left;
  return 0;
}

function reachable(deltaTop: number, limits: ScrollLimits | undefined): boolean {
  if (!limits) return true;
  return deltaTop >= limits.minTop - 0.5 && deltaTop <= limits.maxTop + 0.5;
}

function delta(top: number, left: number): ScrollDelta | null {
  const dy = Math.abs(top) < 0.5 ? 0 : top;
  const dx = Math.abs(left) < 0.5 ? 0 : left;
  if (dy === 0 && dx === 0) return null;
  return { top: dy, left: dx };
}

function boxesOverlap(a: ScrollBox, b: ScrollBox): boolean {
  return a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left;
}

type RowView = {
  innerWidth: number;
  innerHeight: number;
  scrollBy?(options: { top: number; left: number; behavior?: ScrollBehavior }): void;
  getComputedStyle?(element: Element): { overflowY: string };
  document?: {
    scrollingElement: {
      scrollTop: number;
      scrollHeight: number;
      clientHeight: number;
    } | null;
  };
};

type RowDocument = {
  querySelector(selectors: string): Element | null;
  activeElement: Element | null;
  defaultView: RowView | null;
  body?: Element | null;
};

export function scrollPlayingSetRow(trackId: string, doc: RowDocument = document): boolean {
  const row = findSetRow(doc, trackId);
  if (!row) return false;
  if (insideClosedDetails(row)) return false;
  if (editingSetRow(doc.activeElement)) return false;
  const view = doc.defaultView;
  if (!view) return false;
  const playerNode = doc.querySelector(".preview-player");
  const player =
    playerNode && canMeasure(playerNode) ? playerNode.getBoundingClientRect() : null;
  const scroller = findScroller(row, view);
  const limits = scrollLimits(scroller ?? view.document?.scrollingElement ?? null);
  const move = playingRowScrollDelta(
    row.getBoundingClientRect(),
    { width: view.innerWidth, height: view.innerHeight },
    player,
    limits ?? undefined,
  );
  if (!move) return false;
  const target = scroller ?? view;
  if (typeof target.scrollBy !== "function") return false;
  target.scrollBy({ top: move.top, left: move.left, behavior: "smooth" });
  return true;
}

const GEOMETRY_EPSILON = 0.5;

/** True when the floating player moved or resized enough to re-check the row. */
export function playerGeometryChanged(previous: ScrollBox, next: ScrollBox): boolean {
  return (
    Math.abs(previous.top - next.top) >= GEOMETRY_EPSILON ||
    Math.abs(previous.left - next.left) >= GEOMETRY_EPSILON ||
    Math.abs(previous.bottom - next.bottom) >= GEOMETRY_EPSILON ||
    Math.abs(previous.right - next.right) >= GEOMETRY_EPSILON ||
    Math.abs(previous.width - next.width) >= GEOMETRY_EPSILON ||
    Math.abs(previous.height - next.height) >= GEOMETRY_EPSILON
  );
}

/**
 * Scroll again only after the player box changes and the playing row is no
 * longer fully in a clear band. The first sample records the box and does not
 * scroll: pause, resume, and a stable player are not a new placement.
 */
export function followPlayingRow(
  trackId: string,
  watch: PlayingRowWatch,
  doc: RowDocument = document,
): boolean {
  const next = measurePlayer(doc);
  const previous = watch.player;
  watch.player = next;
  if (!previous || !next || !playerGeometryChanged(previous, next)) return false;
  return scrollPlayingSetRow(trackId, doc);
}

type BoxObserver = {
  observe(target: unknown, options?: unknown): void;
  disconnect(): void;
};

type BoxObserverCtor = new (callback: () => void) => BoxObserver;

/**
 * Keep the current playing row clear of .preview-player when that player
 * later moves or changes size. Stops on the returned cleanup.
 */
export function watchPlayingRowClearance(trackId: string, doc: RowDocument = document): () => void {
  const watch: PlayingRowWatch = { player: null };
  const view = doc.defaultView as (RowView & {
    ResizeObserver?: BoxObserverCtor;
    MutationObserver?: BoxObserverCtor;
    addEventListener?(type: string, listener: () => void): void;
    removeEventListener?(type: string, listener: () => void): void;
    requestAnimationFrame?(callback: () => void): number;
    cancelAnimationFrame?(handle: number): void;
  }) | null;
  let playerNode: Element | null = null;
  let resizeObserver: BoxObserver | null = null;
  let attrObserver: BoxObserver | null = null;
  let treeObserver: BoxObserver | null = null;
  let queued = 0;
  let stopped = false;

  function scheduleFollow() {
    if (stopped) return;
    const raf = view && typeof view.requestAnimationFrame === "function" ? view.requestAnimationFrame.bind(view) : null;
    if (!raf) {
      followPlayingRow(trackId, watch, doc);
      return;
    }
    if (queued) return;
    queued = raf(() => {
      queued = 0;
      if (!stopped) followPlayingRow(trackId, watch, doc);
    });
  }

  function ensureObserved() {
    const node = doc.querySelector(".preview-player");
    if (!node || node === playerNode) return;
    resizeObserver?.disconnect();
    attrObserver?.disconnect();
    playerNode = node;
    resizeObserver = attachObserver(observerCtor(view, "ResizeObserver"), node, undefined, scheduleFollow);
    attrObserver = attachObserver(
      observerCtor(view, "MutationObserver"),
      node,
      { attributes: true, attributeFilter: ["style", "class"] },
      scheduleFollow,
    );
  }

  followPlayingRow(trackId, watch, doc);
  ensureObserved();

  const root = doc.body;
  if (root && root.nodeType === 1) {
    treeObserver = attachObserver(
      observerCtor(view, "MutationObserver"),
      root,
      { childList: true, subtree: true },
      () => {
        if (stopped) return;
        const node = doc.querySelector(".preview-player");
        if (node === playerNode) return;
        resizeObserver?.disconnect();
        attrObserver?.disconnect();
        resizeObserver = null;
        attrObserver = null;
        playerNode = null;
        ensureObserved();
        scheduleFollow();
      },
    );
  }

  const onWindowResize = () => scheduleFollow();
  if (view && typeof view.addEventListener === "function") {
    view.addEventListener("resize", onWindowResize);
  }

  return () => {
    stopped = true;
    if (queued && view && typeof view.cancelAnimationFrame === "function") {
      view.cancelAnimationFrame(queued);
    }
    resizeObserver?.disconnect();
    attrObserver?.disconnect();
    treeObserver?.disconnect();
    if (view && typeof view.removeEventListener === "function") {
      view.removeEventListener("resize", onWindowResize);
    }
  };
}

function measurePlayer(doc: RowDocument): ScrollBox | null {
  const playerNode = doc.querySelector(".preview-player");
  if (!playerNode || !canMeasure(playerNode)) return null;
  const rect = playerNode.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
    width: rect.width,
    height: rect.height,
  };
}

function observerCtor(
  view: { ResizeObserver?: BoxObserverCtor; MutationObserver?: BoxObserverCtor } | null,
  name: "ResizeObserver" | "MutationObserver",
): BoxObserverCtor | null {
  if (view && typeof view[name] === "function") return view[name];
  const globalCtor = globalThis[name];
  return typeof globalCtor === "function" ? (globalCtor as BoxObserverCtor) : null;
}

function attachObserver(
  Ctor: BoxObserverCtor | null,
  node: unknown,
  options: unknown,
  onChange: () => void,
): BoxObserver | null {
  if (!Ctor) return null;
  try {
    const observer = new Ctor(onChange);
    observer.observe(node, options);
    return observer;
  } catch {
    return null;
  }
}

function scrollLimits(node: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
} | null): ScrollLimits | null {
  if (!node) return null;
  const minTop = -node.scrollTop;
  const maxTop = node.scrollHeight - node.clientHeight - node.scrollTop;
  if (!Number.isFinite(minTop) || !Number.isFinite(maxTop)) return null;
  return { minTop, maxTop };
}

function findScroller(row: HTMLElement, view: RowView): HTMLElement | null {
  if (typeof view.getComputedStyle !== "function") return null;
  let parent = row.parentElement;
  while (parent) {
    const overflowY = view.getComputedStyle(parent).overflowY;
    const scrolls =
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      parent.scrollHeight > parent.clientHeight + 1;
    if (scrolls && typeof parent.scrollBy === "function") return parent;
    parent = parent.parentElement;
  }
  return null;
}

function findSetRow(doc: RowDocument, trackId: string): HTMLElement | null {
  if (!trackId) return null;
  const list = doc.querySelector(".manual-list");
  if (!list) return null;
  for (const node of list.querySelectorAll("[data-set-track]")) {
    if (node.getAttribute("data-set-track") !== trackId) continue;
    if (canMeasure(node)) return node;
  }
  return null;
}

function canMeasure(node: Element): node is HTMLElement {
  return typeof (node as HTMLElement).getBoundingClientRect === "function";
}

function insideClosedDetails(row: Element): boolean {
  let parent = row.parentElement;
  while (parent) {
    if (parent.tagName === "DETAILS" && (parent as HTMLDetailsElement).open === false) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

function editingSetRow(active: Element | null): boolean {
  if (!active) return false;
  const row = active.closest(".manual-row");
  if (!row) return false;
  const field = active.closest(EDITING_FIELD);
  return field != null && row.contains(field);
}
