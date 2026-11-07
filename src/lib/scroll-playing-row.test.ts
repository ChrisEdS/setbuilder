import assert from "node:assert/strict";
import test from "node:test";
import {
  followPlayingRow,
  playerGeometryChanged,
  playingRowScrollDelta,
  scrollPlayingSetRow,
  watchPlayingRowClearance,
  type ScrollBox,
  type ScrollDelta,
  type ScrollLimits,
} from "./scroll-playing-row.ts";

const view = { width: 1000, height: 800 };
const player: ScrollBox = {
  top: 640,
  left: 200,
  bottom: 780,
  right: 800,
  width: 600,
  height: 140,
};

function box(top: number, bottom: number, left = 0, right = 900): ScrollBox {
  return {
    top,
    left,
    bottom,
    right,
    width: right - left,
    height: bottom - top,
  };
}

function move(
  row: ScrollBox,
  playerBox: ScrollBox | null,
  limits?: ScrollLimits,
): ScrollDelta | null {
  return playingRowScrollDelta(row, view, playerBox, limits);
}

function landed(row: ScrollBox, delta: ScrollDelta | null): ScrollBox {
  const top = row.top - (delta ? delta.top : 0);
  return box(top, top + (row.bottom - row.top), row.left, row.right);
}

function overlaps(a: ScrollBox, b: ScrollBox): boolean {
  return a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left;
}

test("a fully visible row that clears the player does not scroll", () => {
  assert.equal(move(box(120, 200), player), null);
});

test("a row already in the band below the player stays there", () => {
  const lowerPlayer = box(200, 480, 200, 800);
  assert.equal(move(box(560, 640), lowerPlayer), null);
});

test("a covered row moves into the band above the player", () => {
  const deck = box(180, 640, 40, 860);
  const row = box(400, 480);
  const delta = move(row, deck);
  const next = landed(row, delta);
  assert.deepEqual(delta, { top: 300, left: 0 });
  assert.equal(next.bottom, deck.top);
  assert.equal(overlaps(next, deck), false);
  assert.ok(next.top >= 0 && next.bottom <= view.height);
});

test("nearest would park a lower row under the player, so it sits just above", () => {
  const low = box(900, 980);
  const delta = move(low, player);
  const next = landed(low, delta);
  assert.deepEqual(delta, { top: 340, left: 0 });
  assert.equal(next.bottom, player.top);
  assert.equal(overlaps(next, player), false);

  const covered = box(700, 780);
  const lifted = move(covered, player);
  assert.deepEqual(lifted, { top: 140, left: 0 });
  assert.equal(overlaps(landed(covered, lifted), player), false);
});

test("a row above the fold moves the shortest distance that clears the player", () => {
  assert.deepEqual(move(box(-120, -40), player), { top: -120, left: 0 });
});

test("a row below the fold uses the lower band when the player covers the top", () => {
  const topPlayer = { ...player, top: 0, bottom: 140, height: 140 };
  const row = box(900, 980);
  const delta = move(row, topPlayer);
  const next = landed(row, delta);
  assert.deepEqual(delta, { top: 180, left: 0 });
  assert.equal(next.bottom, view.height);
  assert.equal(next.top > topPlayer.bottom, true);
  assert.equal(overlaps(next, topPlayer), false);
});

test("the lower band is used when the upper band cannot hold the row", () => {
  const deck = box(40, 620, 40, 860);
  const row = box(200, 280);
  const delta = move(row, deck);
  const next = landed(row, delta);
  assert.deepEqual(delta, { top: -420, left: 0 });
  assert.equal(next.top, deck.bottom);
  assert.equal(overlaps(next, deck), false);
});

test("a player that covers almost the whole list uses the taller strip", () => {
  const deck = box(30, 750, 40, 860);
  const row = box(300, 380);
  const delta = move(row, deck);
  const next = landed(row, delta);
  assert.equal(delta && delta.top, -450);
  assert.equal(next.top, deck.bottom);
  assert.equal(overlaps(next, deck), false);
  assert.ok(next.top < view.height && next.bottom > deck.bottom);

  const upper = box(70, 770, 40, 860);
  const pinned = move(row, upper);
  const raised = landed(row, pinned);
  assert.equal(raised.bottom, upper.top);
  assert.equal(overlaps(raised, upper), false);
});

test("equal remaining strips prefer the band above the player", () => {
  const deck = box(100, 700, 40, 860);
  const row = box(400, 580);
  const raised = landed(row, move(row, deck));
  assert.equal(raised.bottom, deck.top);
  assert.equal(overlaps(raised, deck), false);
});

test("when the page cannot reach the upper band, the row uses the lower one", () => {
  const deck = box(180, 640, 40, 860);
  const row = box(900, 980);
  const blocked = move(row, deck, { minTop: 0, maxTop: 200 });
  const next = landed(row, blocked);
  assert.deepEqual(blocked, { top: 180, left: 0 });
  assert.equal(next.top >= deck.bottom && next.bottom <= view.height, true);
  assert.equal(overlaps(next, deck), false);
  assert.equal(move(row, deck, { minTop: 0, maxTop: 20 }), null);
});

test("a hidden row does not scroll", () => {
  assert.equal(move(box(0, 0), player), null);
});

test("scrollPlayingSetRow scrolls only a visible set row for the playing id", () => {
  const scrolled: ScrollDelta[] = [];
  const doc = fakeDocument({
    trackId: "playing",
    row: box(900, 980),
    player,
    scrolled,
  });

  assert.equal(scrollPlayingSetRow("playing", doc), true);
  assert.deepEqual(scrolled, [{ top: 340, left: 0, behavior: "smooth" }]);

  scrolled.length = 0;
  assert.equal(scrollPlayingSetRow("library-only", doc), false);
  assert.deepEqual(scrolled, []);
});

test("scrollPlayingSetRow leaves a fully visible row where it is", () => {
  const scrolled: ScrollDelta[] = [];
  const doc = fakeDocument({
    trackId: "playing",
    row: box(120, 200),
    player,
    scrolled,
  });
  assert.equal(scrollPlayingSetRow("playing", doc), false);
  assert.deepEqual(scrolled, []);
});

test("scrollPlayingSetRow does not open a collapsed set or scroll it", () => {
  const scrolled: ScrollDelta[] = [];
  const doc = fakeDocument({
    trackId: "playing",
    row: box(900, 980),
    player,
    scrolled,
    sectionOpen: false,
  });
  assert.equal(doc.section.open, false);
  assert.equal(scrollPlayingSetRow("playing", doc), false);
  assert.equal(doc.section.open, false);
  assert.deepEqual(scrolled, []);
});

test("scrollPlayingSetRow does not steal a set row the user is editing", () => {
  const scrolled: ScrollDelta[] = [];
  const doc = fakeDocument({
    trackId: "playing",
    row: box(900, 980),
    player,
    scrolled,
    editing: true,
  });
  assert.equal(scrollPlayingSetRow("playing", doc), false);
  assert.deepEqual(scrolled, []);
});

test("scrollPlayingSetRow still scrolls when focus is outside the set list", () => {
  const scrolled: ScrollDelta[] = [];
  const doc = fakeDocument({
    trackId: "playing",
    row: box(-80, 0),
    player,
    scrolled,
    editingOutside: true,
  });
  assert.equal(scrollPlayingSetRow("playing", doc), true);
  assert.deepEqual(scrolled, [{ top: -80, left: 0, behavior: "smooth" }]);
});

test("scrollPlayingSetRow follows the page scroll limit", () => {
  const scrolled: ScrollDelta[] = [];
  const deck = box(180, 640, 40, 860);
  const doc = fakeDocument({
    trackId: "playing",
    row: box(900, 980),
    player: deck,
    scrolled,
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 800,
  });
  assert.equal(scrollPlayingSetRow("playing", doc), true);
  assert.deepEqual(scrolled, [{ top: 180, left: 0, behavior: "smooth" }]);
});

test("a stable player box is not a scroll, including subpixel jitter", () => {
  const before = box(402, 780, 200, 800);
  const jitter = box(402.2, 780.2, 200, 800);
  assert.equal(playerGeometryChanged(before, before), false);
  assert.equal(playerGeometryChanged(before, jitter), false);
  assert.equal(playerGeometryChanged(before, box(361, 780, 200, 800)), true);
});

test("pause or resume does not scroll, and a later player growth does", () => {
  const scrolled: ScrollDelta[] = [];
  const deck = box(402, 780, 200, 800);
  const row = box(322, 402);
  const doc = fakeDocument({
    trackId: "playing",
    row,
    player: deck,
    scrolled,
  });
  const watch = { player: null };
  assert.equal(followPlayingRow("playing", watch, doc), false);
  assert.equal(followPlayingRow("playing", watch, doc), false);
  assert.deepEqual(scrolled, []);

  deck.top = 361;
  deck.height = deck.bottom - deck.top;
  assert.equal(followPlayingRow("playing", watch, doc), true);
  const next = landed(row, scrolled[0]);
  assert.equal(scrolled[0].top, 41);
  assert.equal(next.bottom, deck.top);
  assert.equal(overlaps(next, deck), false);
  assert.ok(next.top >= 0 && next.bottom <= view.height);

  assert.equal(followPlayingRow("playing", watch, doc), false);
  assert.equal(scrolled.length, 1);
});

test("a player move that still leaves the row clear does not scroll", () => {
  const scrolled: ScrollDelta[] = [];
  const deck = box(640, 780, 200, 800);
  const doc = fakeDocument({
    trackId: "playing",
    row: box(120, 200),
    player: deck,
    scrolled,
  });
  const watch = { player: null };
  assert.equal(followPlayingRow("playing", watch, doc), false);
  deck.top = 500;
  deck.height = deck.bottom - deck.top;
  assert.equal(followPlayingRow("playing", watch, doc), false);
  assert.deepEqual(scrolled, []);
});

test("a growing player does not scroll a set row the user is editing", () => {
  const scrolled: ScrollDelta[] = [];
  const deck = box(402, 780, 200, 800);
  const doc = fakeDocument({
    trackId: "playing",
    row: box(322, 402),
    player: deck,
    scrolled,
    editing: true,
  });
  const watch = { player: null };
  assert.equal(followPlayingRow("playing", watch, doc), false);
  deck.top = 361;
  deck.height = deck.bottom - deck.top;
  assert.equal(followPlayingRow("playing", watch, doc), false);
  assert.deepEqual(scrolled, []);
});

test("watchPlayingRowClearance scrolls again when the player is resized over the row", () => {
  const scrolled: ScrollDelta[] = [];
  const deck = box(402, 780, 200, 800);
  const row = box(322, 402);
  const doc = fakeDocument({
    trackId: "playing",
    row,
    player: deck,
    scrolled,
  });
  let notify = () => {};
  function ResizeObserver(callback: () => void) {
    notify = () => callback();
  }
  ResizeObserver.prototype.observe = function () {};
  ResizeObserver.prototype.disconnect = function () {};
  doc.defaultView.ResizeObserver = ResizeObserver;
  const stop = watchPlayingRowClearance("playing", doc);
  assert.deepEqual(scrolled, []);

  deck.top = 361;
  deck.height = deck.bottom - deck.top;
  notify();
  const next = landed(row, scrolled[0]);
  assert.equal(scrolled.length, 1);
  assert.equal(next.bottom, deck.top);
  assert.equal(overlaps(next, deck), false);

  notify();
  assert.equal(scrolled.length, 1);
  stop();
});

function fakeDocument(options: {
  trackId: string;
  row: ScrollBox;
  player: ScrollBox | null;
  scrolled: { top: number; left: number; behavior?: string }[];
  sectionOpen?: boolean;
  editing?: boolean;
  editingOutside?: boolean;
  scrollTop?: number;
  scrollHeight?: number;
  clientHeight?: number;
}) {
  const section = {
    tagName: "DETAILS",
    open: options.sectionOpen !== false,
    parentElement: null as null,
  };
  const list = {
    parentElement: section,
    tagName: "OL",
    querySelectorAll(selector: string) {
      return selector === "[data-set-track]" ? [row] : [];
    },
  };
  const row = {
    tagName: "LI",
    parentElement: list,
    getAttribute(name: string) {
      return name === "data-set-track" ? options.trackId : null;
    },
    getBoundingClientRect() {
      return options.row;
    },
    contains(node: unknown) {
      return node === field;
    },
  };
  const field = {
    tagName: "TEXTAREA",
    closest(selector: string) {
      if (selector === ".manual-row") return row;
      if (selector.includes("textarea")) return field;
      return null;
    },
  };
  const outside = {
    tagName: "INPUT",
    closest() {
      return null;
    },
  };
  const playerNode = options.player
    ? {
        getBoundingClientRect() {
          return options.player;
        },
      }
    : null;
  const doc = {
    section,
    querySelector(selector: string) {
      if (selector === ".manual-list") return list;
      if (selector === ".preview-player") return playerNode;
      return null;
    },
    activeElement: options.editing ? field : options.editingOutside ? outside : null,
    defaultView: {
      innerWidth: view.width,
      innerHeight: view.height,
      scrollBy(arg: { top: number; left: number; behavior?: string }) {
        options.scrolled.push(arg);
      },
      document:
        options.scrollHeight == null
          ? undefined
          : {
              scrollingElement: {
                scrollTop: options.scrollTop ?? 0,
                scrollHeight: options.scrollHeight,
                clientHeight: options.clientHeight ?? view.height,
              },
            },
    },
  };
  return doc;
}
