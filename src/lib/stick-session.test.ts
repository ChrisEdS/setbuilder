import assert from "node:assert/strict";
import test from "node:test";
import { stickPicker } from "./stick-session.ts";

test("stickPicker does not touch window on the server", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(stickPicker(), null);
});
