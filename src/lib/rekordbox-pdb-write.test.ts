import assert from "node:assert/strict";
import test from "node:test";
import { parseRekordboxPdb } from "./rekordbox-pdb.ts";
import { addPlaylistToPdb, verifyPdbUpdate, PdbWriteError } from "./rekordbox-pdb-write.ts";
import {
  ENTRY_LAST,
  ENTRY_RESERVED,
  PAGE,
  TRACK_PAGE,
  TREE_PAGE,
  TREE_RESERVED,
  fixture,
} from "./testing/pdb-fixture.ts";


test("adds one playlist and leaves everything else byte for byte alone", () => {
  const source = fixture();
  const before = parseRekordboxPdb(source.slice(0));
  const result = addPlaylistToPdb(source, { name: "SETFORM - Friday", trackIds: [7, 8, 7] });

  assert.equal(result.buffer.byteLength, source.byteLength);
  assert.ok(result.changedPages.length <= 2);
  const after = parseRekordboxPdb(result.buffer.slice(0));
  assert.deepEqual(after.tracks, before.tracks);
  const added = after.playlists.find((playlist) => playlist.id === result.playlistId);
  assert.ok(added);
  assert.equal(added.name, "SETFORM - Friday");
  assert.equal(added.path, "SETFORM - Friday");
  assert.deepEqual(added.trackIds, [7, 8, 7]);
  for (const old of before.playlists) {
    assert.deepEqual(
      after.playlists.find((item) => item.kind === old.kind && item.id === old.id),
      old,
    );
  }
  // The input buffer itself is never modified.
  assert.deepEqual(new Uint8Array(source), new Uint8Array(fixture()));
});

test("pages that were not touched are identical", () => {
  const source = fixture();
  const result = addPlaylistToPdb(source, { name: "A", trackIds: [7] });
  const a = new Uint8Array(source);
  const b = new Uint8Array(result.buffer);
  for (let page = 1; page < a.length / PAGE; page++) {
    if (result.changedPages.includes(page)) continue;
    assert.deepEqual(a.slice(page * PAGE, (page + 1) * PAGE), b.slice(page * PAGE, (page + 1) * PAGE));
  }
});

test("a name that already exists at the root gets a number", () => {
  const first = addPlaylistToPdb(fixture(), { name: "Set", trackIds: [7] });
  const second = addPlaylistToPdb(first.buffer, { name: "Set", trackIds: [7] });
  assert.equal(second.name, "Set (2)");
  assert.notEqual(second.playlistId, first.playlistId);
  const names = parseRekordboxPdb(second.buffer.slice(0)).playlists.map((item) => item.name);
  assert.ok(names.includes("Set") && names.includes("Set (2)"));
});

test("writes names with umlauts as UTF-16", () => {
  const result = addPlaylistToPdb(fixture(), { name: "Früh Set", trackIds: [7] });
  const added = parseRekordboxPdb(result.buffer.slice(0)).playlists.find(
    (playlist) => playlist.id === result.playlistId,
  );
  assert.equal(added?.name, "Früh Set");
});

test("more than 16 entries crosses into a second row group", () => {
  const ids = Array.from({ length: 40 }, (_, i) => (i % 2 ? 7 : 8));
  const result = addPlaylistToPdb(fixture(), { name: "Long", trackIds: ids });
  const added = parseRekordboxPdb(result.buffer.slice(0)).playlists.find(
    (playlist) => playlist.id === result.playlistId,
  );
  assert.deepEqual(added?.trackIds, ids);
});

test("spills entries to an earlier page when the last page is nearly full", () => {
  const source = fixture({ fillEntryLastPage: true });
  const ids = Array.from({ length: 12 }, () => 7);
  const result = addPlaylistToPdb(source, { name: "Spill", trackIds: ids });
  const added = parseRekordboxPdb(result.buffer.slice(0)).playlists.find(
    (playlist) => playlist.id === result.playlistId,
  );
  assert.deepEqual(added?.trackIds, ids);
  assert.deepEqual(result.allocated, []);
  assert.equal(result.buffer.byteLength, source.byteLength);
});

test("takes the reserved page when the entries table is full, and the file grows by one page", () => {
  const source = fixture({ fillEntryLastPage: true, fillEntryFirstPage: true });
  const ids = Array.from({ length: 30 }, (_, i) => (i % 2 ? 7 : 8));
  const result = addPlaylistToPdb(source, { name: "Grow", trackIds: ids });
  assert.deepEqual(result.allocated, [{ table: 8, page: ENTRY_RESERVED }]);
  assert.equal(result.buffer.byteLength, source.byteLength + PAGE);
  const view = new DataView(result.buffer);
  assert.equal(view.getUint32(0x0c, true), 13); // next unused page moved on
  const after = parseRekordboxPdb(result.buffer.slice(0));
  assert.deepEqual(after.playlists.find((item) => item.id === result.playlistId)?.trackIds, ids);
  // The old last page now points to the new one; the new page ends the chain.
  assert.equal(view.getUint32(ENTRY_LAST * PAGE + 12, true), ENTRY_RESERVED);
  assert.equal(view.getUint32(ENTRY_RESERVED * PAGE + 12, true), 12);
  // And it can be written to again.
  const again = addPlaylistToPdb(result.buffer, { name: "Again", trackIds: [7] });
  assert.ok(parseRekordboxPdb(again.buffer.slice(0)).playlists.some((item) => item.name === "Again"));
});

test("takes the blank reserved page inside the file when the tree table is full", () => {
  const source = fixture({ fillTree: true });
  const result = addPlaylistToPdb(source, { name: "Tree", trackIds: [7] });
  assert.deepEqual(result.allocated, [{ table: 7, page: TREE_RESERVED }]);
  assert.equal(result.buffer.byteLength, source.byteLength);
  const names = parseRekordboxPdb(result.buffer.slice(0)).playlists.map((item) => item.name);
  assert.ok(names.includes("Tree"));
});

test("refuses, and changes nothing, when the reserved page is not blank", () => {
  const source = fixture({ fillTree: true });
  new Uint8Array(source)[TREE_RESERVED * PAGE + 100] = 1;
  const copy = new Uint8Array(source).slice();
  assert.throws(
    () => addPlaylistToPdb(source, { name: "X", trackIds: [7] }),
    (error: unknown) => error instanceof PdbWriteError && error.key === "exports.pdbWrite.unsupported",
  );
  assert.deepEqual(new Uint8Array(source), copy);
});

test("never writes into a page whose header does not match its content", () => {
  const source = fixture();
  // used_size = 0 although the page holds rows
  new DataView(source).setUint16(TREE_PAGE * PAGE + 0x1e, 0, true);
  const damaged = new Uint8Array(source).slice();
  const result = addPlaylistToPdb(source, { name: "X", trackIds: [7] });
  assert.ok(!result.changedPages.includes(TREE_PAGE));
  assert.deepEqual(result.allocated, [{ table: 7, page: TREE_RESERVED }]);
  const after = new Uint8Array(result.buffer);
  assert.deepEqual(after.slice(TREE_PAGE * PAGE, (TREE_PAGE + 1) * PAGE), damaged.slice(TREE_PAGE * PAGE, (TREE_PAGE + 1) * PAGE));

  // ...and when there is no clean place either, it refuses.
  new Uint8Array(source)[TREE_RESERVED * PAGE + 100] = 1;
  assert.throws(
    () => addPlaylistToPdb(source, { name: "X", trackIds: [7] }),
    (error: unknown) => error instanceof PdbWriteError && error.key === "exports.pdbWrite.unsupported",
  );
});

test("refuses tracks the database does not know", () => {
  assert.throws(
    () => addPlaylistToPdb(fixture(), { name: "X", trackIds: [7, 999] }),
    (error: unknown) => error instanceof PdbWriteError && error.key === "exports.pdbWrite.unknownTracks",
  );
});

test("verification catches any other change", () => {
  const source = fixture();
  const result = addPlaylistToPdb(source, { name: "A", trackIds: [7] });
  const expected = {
    playlistId: result.playlistId,
    name: result.name,
    trackIds: [7],
    changedPages: result.changedPages,
    allocated: result.allocated,
  };
  verifyPdbUpdate(source, result.buffer, expected);

  const tampered = result.buffer.slice(0);
  new Uint8Array(tampered)[TRACK_PAGE * PAGE + 0x30] ^= 0xff; // inside the track page
  assert.throws(() => verifyPdbUpdate(source, tampered, expected), PdbWriteError);

  const wrongName = { ...expected, name: "B" };
  assert.throws(() => verifyPdbUpdate(source, result.buffer, wrongName), PdbWriteError);

  const shorter = result.buffer.slice(0, result.buffer.byteLength - PAGE);
  assert.throws(() => verifyPdbUpdate(source, shorter, expected), PdbWriteError);
});

