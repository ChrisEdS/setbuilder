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
