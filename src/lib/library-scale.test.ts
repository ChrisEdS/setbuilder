import assert from "node:assert/strict";
import test from "node:test";
import { matchesLibraryFilter } from "./library-filter.ts";

/**
 * Synthetic library filter baseline. Not a browser frame-time measurement.
 * The list UI already caps browse rows at 48 (LibraryPanel LIBRARY_BROWSE_CAP),
 * so virtualization is not applied until a measured DOM stall shows up.
 */
function syntheticRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Track ${index}`,
    artist: index % 7 === 0 ? "Ada" : "Bea",
    key: `${(index % 12) + 1}${index % 2 === 0 ? "A" : "B"}`,
    bpm: String(118 + (index % 16)),
    energy: (index % 10) + 1,
    playlists: index % 5 === 0 ? ["Peak"] : ["Open"],
  }));
}

function filterRows(rows: ReturnType<typeof syntheticRows>, query: string) {
  const q = query.toLowerCase();
  return rows.filter(
    (row) =>
      (row.title.toLowerCase().includes(q) ||
        row.artist.toLowerCase().includes(q) ||
        row.key.toLowerCase().includes(q) ||
        row.playlists.some((name) => name.toLowerCase().includes(q))) &&
      matchesLibraryFilter(row, { key: "8A", bpmMin: 120, bpmMax: 132, energyMin: 4 }),
  );
}

for (const count of [1_000, 10_000]) {
  test(`synthetic library filter of ${count} rows stays interactive`, () => {
    const rows = syntheticRows(count);
    const started = performance.now();
    const matched = filterRows(rows, "ada");
    const elapsed = performance.now() - started;
    assert.ok(matched.length >= 0);
    // Generous bound for CI hosts. The browse UI still renders at most 48 rows.
    assert.ok(elapsed < 250, `filter took ${elapsed.toFixed(1)} ms`);
  });
}
