import assert from "node:assert/strict";
import test from "node:test";
import { isVersionNewer } from "./version-compare.ts";

test("isVersionNewer treats equal versions as not newer", () => {
  assert.equal(isVersionNewer("4.6.4", "4.6.4"), false);
  assert.equal(isVersionNewer("v4.6.4", "4.6.4"), false);
});

test("isVersionNewer detects a higher patch, minor, or major", () => {
  assert.equal(isVersionNewer("4.6.5", "4.6.4"), true);
  assert.equal(isVersionNewer("4.7.0", "4.6.9"), true);
  assert.equal(isVersionNewer("5.0.0", "4.9.9"), true);
  assert.equal(isVersionNewer("4.6.3", "4.6.4"), false);
});
