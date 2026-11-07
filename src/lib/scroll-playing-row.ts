/**
 * Scroll the set-list row for the track that is actually playing into view.
 * Library-only previews have no set row. A collapsed set section stays closed.
 * A row the user is editing is left alone. A row already fully visible, and not
 * covered by the floating player, does not move the page.
 */

export type ScrollBox = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

const EDITING_FIELD = "input, textarea, select, [contenteditable='true']";

export function playingRowScrollBlock(
  row: ScrollBox,
  viewport: { width: number; height: number },
  player: ScrollBox | null,
): "nearest" | "center" | null {
  if (row.width <= 0 || row.height <= 0) return null;
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  const settled = rowAfterNearest(row, viewport.height);
  if (player && player.width > 0 && player.height > 0 && boxesOverlap(settled, player)) {
    return "center";
  }
  const fullyVisible =
    row.top >= 0 &&
    row.left >= 0 &&
    row.bottom <= viewport.height &&
    row.right <= viewport.width;
  if (fullyVisible) return null;
  return "nearest";
}

function rowAfterNearest(row: ScrollBox, viewportHeight: number): ScrollBox {
  let dy = 0;
  if (row.top < 0 && row.bottom > viewportHeight) dy = 0;
  else if (row.bottom > viewportHeight) dy = viewportHeight - row.bottom;
  else if (row.top < 0) dy = -row.top;
  if (dy === 0) return row;
  return { ...row, top: row.top + dy, bottom: row.bottom + dy };
}

function boxesOverlap(a: ScrollBox, b: ScrollBox): boolean {
  return a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left;
}

type RowDocument = {
  querySelector(selectors: string): Element | null;
  activeElement: Element | null;
  defaultView: { innerWidth: number; innerHeight: number } | null;
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
  const block = playingRowScrollBlock(row.getBoundingClientRect(), {
    width: view.innerWidth,
    height: view.innerHeight,
  }, player);
  if (!block) return false;
  row.scrollIntoView({ behavior: "smooth", block, inline: "nearest" });
  return true;
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
  return (
    typeof (node as HTMLElement).getBoundingClientRect === "function" &&
    typeof (node as HTMLElement).scrollIntoView === "function"
  );
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
