import assert from "node:assert/strict";
import test from "node:test";
import { energyMenuGate } from "./energy-menu";

test("energy menu asks for a stick before it lists actions", () => {
  assert.equal(energyMenuGate({ stickReady: false, fileCount: 0 }), "stick");
  assert.equal(energyMenuGate({ stickReady: false, fileCount: 4 }), "stick");
});

test("energy menu asks for file paths when the stick is connected but unused", () => {
  assert.equal(energyMenuGate({ stickReady: true, fileCount: 0 }), "files");
});

test("energy menu keeps the four actions once files exist", () => {
  assert.equal(energyMenuGate({ stickReady: true, fileCount: 1 }), "actions");
  assert.equal(energyMenuGate({ stickReady: true, fileCount: 12 }), "actions");
});
