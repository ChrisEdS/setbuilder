import assert from "node:assert/strict";
import test from "node:test";
import { assessGigReady, gigReadyBlocks, type GigReadyInput } from "./gig-ready.ts";
import type { SetPhaseId } from "./set.ts";

function track(partial: {
  role?: "groove" | "safety";
  phase?: SetPhaseId;
  filePath?: string;
  keyCamelot?: string;
  energyLevel?: number;
  energySource?: "manual" | "tag" | "measured";
}) {
  return {
    role: partial.role ?? "groove",
    phase: partial.phase ?? "open",
    filePath: "filePath" in partial ? partial.filePath : "/a.mp3",
    keyCamelot: partial.keyCamelot ?? "8A",
    energyLevel: "energyLevel" in partial ? partial.energyLevel : 4,
    energySource: "energySource" in partial ? partial.energySource : ("manual" as const),
  };
}

function ready(partial: Partial<GigReadyInput> & Pick<GigReadyInput, "action">) {
  return assessGigReady({
    tracks: partial.tracks ?? [track({ filePath: "/a.mp3" })],
    fileInSession: partial.fileInSession ?? (() => true),
    health: partial.health,
    action: partial.action,
  });
}

function ids(checks: ReturnType<typeof assessGigReady>) {
  return checks.map((item) => `${item.id}:${item.severity}`);
}

test("stick write blocks when a performance file is not in the session", () => {
  const checks = ready({
    action: "stick",
    tracks: [track({ filePath: "/missing.mp3" }), track({})],
    fileInSession: () => false,
  });
  assert.equal(checks.find((item) => item.id === "files")?.severity, "block");
  assert.equal(checks.find((item) => item.id === "files")?.count, 2);
  assert.equal(gigReadyBlocks(checks), true);
});

test("booth and desk exports only acknowledge missing files", () => {
  for (const action of ["booth", "desk"] as const) {
    const checks = ready({
      action,
      tracks: [track({})],
      fileInSession: () => false,
    });
    assert.equal(checks.find((item) => item.id === "files")?.severity, "ack");
    assert.equal(gigReadyBlocks(checks), false);
  }
});

test("keys, energy, thin plan B and the player check stay acknowledgable", () => {
  const checks = ready({
    action: "booth",
    tracks: [
      track({
        filePath: "/a.mp3",
        keyCamelot: "",
        energyLevel: undefined,
        energySource: undefined,
        phase: "peak",
      }),
      track({ role: "safety", phase: "peak", energyLevel: 2 }),
    ],
    fileInSession: () => true,
  });
  assert.deepEqual(ids(checks), ["keys:ack", "energy:ack", "planB:ack", "heard:ack"]);
  assert.equal(checks.find((item) => item.id === "planB")?.phases?.[0]?.have, 0);
});

test("a broken stick blocks writing and only warns on a booth sheet", () => {
  const stick = ready({ action: "stick", health: { verdict: "broken" } });
  const booth = ready({ action: "booth", health: { verdict: "broken" } });
  assert.equal(stick.find((item) => item.id === "player")?.severity, "block");
  assert.equal(booth.find((item) => item.id === "player")?.severity, "ack");
  assert.equal(gigReadyBlocks(stick), true);
  assert.equal(gigReadyBlocks(booth), false);
});

test("a hidden folder and a ready stick never block", () => {
  const hidden = ready({ action: "stick", health: { verdict: "hiddenFolder" } });
  const ok = ready({
    action: "stick",
    health: { verdict: "ready" },
    tracks: [
      track({ phase: "open" }),
      track({ role: "safety", phase: "open" }),
      track({ role: "safety", phase: "open" }),
    ],
  });
  assert.equal(hidden.find((item) => item.id === "player")?.severity, "ack");
  assert.equal(ok.find((item) => item.id === "player"), undefined);
  assert.deepEqual(ids(ok), ["heard:ack"]);
});
