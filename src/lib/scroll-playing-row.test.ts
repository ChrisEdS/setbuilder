import assert from "node:assert/strict";
import test from "node:test";
import { playingRowScrollBlock, scrollPlayingSetRow, type ScrollBox } from "./scroll-playing-row.ts";

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

test("a fully visible row that clears the player does not scroll", () => {
  assert.equal(playingRowScrollBlock(box(120, 200), view, player), null);
});

test("nearest would park a lower row under the player, so the block is center", () => {
  assert.equal(playingRowScrollBlock(box(900, 980), view, player), "center");
  assert.equal(playingRowScrollBlock(box(700, 780), view, player), "center");
});

test("a row above the fold uses nearest when that clears the player", () => {
  assert.equal(playingRowScrollBlock(box(-120, -40), view, player), "nearest");
});

test("a row below the fold uses nearest when the player does not cover that edge", () => {
  const topPlayer = { ...player, top: 0, bottom: 140 };
  assert.equal(playingRowScrollBlock(box(900, 980), view, topPlayer), "nearest");
});

test("a hidden row does not scroll", () => {
  assert.equal(playingRowScrollBlock(box(0, 0), view, player), null);
});

test("scrollPlayingSetRow scrolls only a visible set row for the playing id", () => {
  const scrolled: { behavior: string; block: string; inline: string }[] = [];
  const doc = fakeDocument({
    trackId: "playing",
    row: box(900, 980),
    player,
    scrolled,
  });

  assert.equal(scrollPlayingSetRow("playing", doc), true);
  assert.deepEqual(scrolled, [{ behavior: "smooth", block: "center", inline: "nearest" }]);

  scrolled.length = 0;
  assert.equal(scrollPlayingSetRow("library-only", doc), false);
  assert.deepEqual(scrolled, []);
});

test("scrollPlayingSetRow leaves a fully visible row where it is", () => {
  const scrolled: unknown[] = [];
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
  const scrolled: unknown[] = [];
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
  const scrolled: unknown[] = [];
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
  const scrolled: { block: string }[] = [];
  const doc = fakeDocument({
    trackId: "playing",
    row: box(-80, 0),
    player,
    scrolled,
    editingOutside: true,
  });
  assert.equal(scrollPlayingSetRow("playing", doc), true);
  assert.equal(scrolled[0]?.block, "nearest");
});

function fakeDocument(options: {
  trackId: string;
  row: ScrollBox;
  player: ScrollBox | null;
  scrolled: { behavior: string; block: string; inline: string }[];
  sectionOpen?: boolean;
  editing?: boolean;
  editingOutside?: boolean;
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
    scrollIntoView(arg: { behavior: string; block: string; inline: string }) {
      options.scrolled.push(arg);
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
        scrollIntoView() {},
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
    defaultView: { innerWidth: view.width, innerHeight: view.height },
  };
  return doc;
}
