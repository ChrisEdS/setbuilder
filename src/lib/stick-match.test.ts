import assert from "node:assert/strict";
import test from "node:test";
import { parseRekordboxPdb } from "./rekordbox-pdb.ts";
import { suggestStickMatches } from "./stick-match.ts";
import { fixture } from "./testing/pdb-fixture.ts";

test("suggests a title that only differs by a mix suffix", () => {
  const library = parseRekordboxPdb(fixture());
  const suggestions = suggestStickMatches(
    [{ name: "Night Drive (Original Mix)", artists: ["Ada"] }],
    library,
  );
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.candidates[0]?.title, "Night Drive");
  assert.equal(suggestions[0]?.candidates[0]?.id, 7);
});

test("does not suggest an unrelated title", () => {
  const library = parseRekordboxPdb(fixture());
  assert.deepEqual(
    suggestStickMatches([{ name: "Completely Different", artists: ["Nobody"] }], library),
    [],
  );
});

test("duplicate stick rows with the same artist and title collapse to one candidate", () => {
  const library = parseRekordboxPdb(fixture());
  const base = library.tracks.find((track) => track.title === "Night Drive");
  assert.ok(base);
  library.tracks.push(
    { ...base, id: 9001, filePath: "/dup/a.mp3" },
    { ...base, id: 9002, filePath: "/dup/b.mp3" },
  );
  const suggestions = suggestStickMatches(
    [{ name: "Night Drive (Original Mix)", artists: ["Ada"] }],
    library,
  );
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.candidates.length, 1);
  assert.equal(suggestions[0]?.candidates[0]?.title, "Night Drive");
});
