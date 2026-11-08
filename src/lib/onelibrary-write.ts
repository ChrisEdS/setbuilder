/**
 * Writes one playlist into a rekordbox player library (exportLibrary.db).
 *
 * The file is SQLCipher 4: page size 4096, 80 reserved bytes, salt in the first
 * 16 bytes. Playlists land in `playlist` and `playlist_content`, joined to
 * `content` by path. When the file does not open as that database, the bytes
 * are left alone. master.db is never touched.
 */

import { anlzPathsMatch } from "@/lib/anlz-cues";

const PAGE = 4096;
const RESERVE = 80;
const IV_LEN = 16;
const HMAC_LEN = 64;
const SALT_LEN = 16;
const KDF_ITER = 256_000;
const HMAC_ITER = 2;
/** Documented device-library passphrase. It is not shown in the UI. */
const DEVICE_LIBRARY_KEY = "r8gddnr4k847830ar6cqzbkk0el6qytmb3trbbx805jm74vez64i5o8fnrqryqls";
const MAGIC = new Uint8Array([
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
]);

export type OneLibraryPlaylist = {
  name: string;
  paths: string[];
};

export type OneLibraryPlan =
  | { status: "written"; bytes: Uint8Array; trackCount: number }
  | { status: "untouched" };

type SqlStatement = {
  bind(values: readonly unknown[]): boolean;
  step(): boolean;
  get(): unknown[];
  free(): void;
};

type SqlDb = {
  run(sql: string, params?: readonly unknown[]): void;
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  prepare(sql: string): SqlStatement;
  export(): Uint8Array;
  close(): void;
};

type CipherKeys = {
  enc: CryptoKey;
  mac: CryptoKey;
};

const keyCache = new Map<string, Promise<CipherKeys>>();

function bytesOf(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

function webCrypto(): Crypto | null {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle || !cryptoApi.getRandomValues) return null;
  return cryptoApi;
}

function sameMac(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}

function hexSalt(salt: Uint8Array): string {
  return [...salt].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function keysFor(salt: Uint8Array): Promise<CipherKeys | null> {
  const cryptoApi = webCrypto();
  if (!cryptoApi || salt.length !== SALT_LEN) return null;
  const cacheKey = hexSalt(salt);
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const pending = deriveKeys(cryptoApi, salt.slice());
  keyCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (error) {
    keyCache.delete(cacheKey);
    throw error;
  }
}

async function deriveKeys(cryptoApi: Crypto, salt: Uint8Array): Promise<CipherKeys> {
  const passphrase = await cryptoApi.subtle.importKey(
    "raw",
    bytesOf(new TextEncoder().encode(DEVICE_LIBRARY_KEY)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const encBits = await cryptoApi.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-512", salt: bytesOf(salt), iterations: KDF_ITER },
    passphrase,
    256,
  );
  const hmacSalt = salt.slice();
  for (let i = 0; i < hmacSalt.length; i++) hmacSalt[i] = hmacSalt[i]! ^ 0x3a;
  const encRaw = await cryptoApi.subtle.importKey("raw", encBits, "PBKDF2", false, ["deriveBits"]);
  const macBits = await cryptoApi.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-512", salt: bytesOf(hmacSalt), iterations: HMAC_ITER },
    encRaw,
    256,
  );
  const enc = await cryptoApi.subtle.importKey("raw", encBits, { name: "AES-CBC" }, false, [
    "encrypt",
    "decrypt",
  ]);
  const mac = await cryptoApi.subtle.importKey(
    "raw",
    macBits,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  return { enc, mac };
}

/** AES-CBC with no padding. WebCrypto always pads, so the extra block is stripped. */
async function aesCbcRaw(
  cryptoApi: Crypto,
  key: CryptoKey,
  iv: Uint8Array,
  data: Uint8Array,
  mode: "encrypt" | "decrypt",
): Promise<Uint8Array> {
  if (data.length === 0 || data.length % 16 !== 0) throw new Error("block");
  const ivBytes = bytesOf(iv);
  if (mode === "encrypt") {
    const full = new Uint8Array(
      await cryptoApi.subtle.encrypt({ name: "AES-CBC", iv: ivBytes }, key, bytesOf(data)),
    );
    return full.slice(0, data.length);
  }
  const tailIv = data.slice(data.length - 16);
  const pad = new Uint8Array(16).fill(16);
  const padFull = new Uint8Array(
    await cryptoApi.subtle.encrypt({ name: "AES-CBC", iv: bytesOf(tailIv) }, key, bytesOf(pad)),
  );
  const joined = new Uint8Array(data.length + 16);
  joined.set(data, 0);
  joined.set(padFull.subarray(0, 16), data.length);
  return new Uint8Array(
    await cryptoApi.subtle.decrypt({ name: "AES-CBC", iv: ivBytes }, key, bytesOf(joined)),
  );
}

async function pageMac(key: CryptoKey, payload: Uint8Array, pageNo: number): Promise<Uint8Array> {
  const cryptoApi = webCrypto();
  if (!cryptoApi) throw new Error("crypto");
  const body = new Uint8Array(payload.length + 4);
  body.set(payload, 0);
  new DataView(body.buffer).setUint32(payload.length, pageNo, true);
  return new Uint8Array(await cryptoApi.subtle.sign("HMAC", key, bytesOf(body)));
}

function blankPage(page: Uint8Array): boolean {
  for (let i = 0; i < page.length; i++) if (page[i] !== 0) return false;
  return true;
}

async function decryptPage(
  cryptoApi: Crypto,
  file: Uint8Array,
  pageNo: number,
  keys: CipherKeys,
): Promise<Uint8Array | null> {
  const start = (pageNo - 1) * PAGE;
  const page = file.subarray(start, start + PAGE);
  if (page.length !== PAGE) return null;
  if (blankPage(page)) return new Uint8Array(PAGE);
  const offset = pageNo === 1 ? SALT_LEN : 0;
  const size = PAGE - RESERVE - offset;
  const ivAt = PAGE - RESERVE;
  const iv = page.slice(ivAt, ivAt + IV_LEN);
  const stored = page.slice(ivAt + IV_LEN, ivAt + IV_LEN + HMAC_LEN);
  const payload = page.slice(offset, ivAt + IV_LEN);
  const expected = await pageMac(keys.mac, payload, pageNo);
  if (!sameMac(expected, stored)) return null;
  const plain = await aesCbcRaw(cryptoApi, keys.enc, iv, page.slice(offset, offset + size), "decrypt");
  const out = new Uint8Array(PAGE);
  if (pageNo === 1) {
    out.set(MAGIC, 0);
    out.set(plain, SALT_LEN);
  } else {
    out.set(plain, 0);
  }
  return out;
}

async function encryptPage(
  cryptoApi: Crypto,
  logical: Uint8Array,
  pageNo: number,
  salt: Uint8Array,
  keys: CipherKeys,
): Promise<Uint8Array> {
  const out = new Uint8Array(PAGE);
  cryptoApi.getRandomValues(out.subarray(PAGE - RESERVE, PAGE - RESERVE + IV_LEN));
  const iv = out.slice(PAGE - RESERVE, PAGE - RESERVE + IV_LEN);
  const offset = pageNo === 1 ? SALT_LEN : 0;
  const size = PAGE - RESERVE - offset;
  const plain = pageNo === 1 ? logical.subarray(SALT_LEN, SALT_LEN + size) : logical.subarray(0, size);
  const cipher = await aesCbcRaw(cryptoApi, keys.enc, iv, plain, "encrypt");
  if (pageNo === 1) out.set(salt, 0);
  out.set(cipher, offset);
  const mac = await pageMac(keys.mac, out.subarray(offset, PAGE - RESERVE + IV_LEN), pageNo);
  out.set(mac, PAGE - RESERVE + IV_LEN);
  return out;
}

function headerReserve(logical: Uint8Array): number | null {
  if (logical.length < PAGE || logical.length % PAGE !== 0) return null;
  for (let i = 0; i < MAGIC.length; i++) if (logical[i] !== MAGIC[i]) return null;
  const view = new DataView(logical.buffer, logical.byteOffset, logical.byteLength);
  if (view.getUint16(16) !== PAGE) return null;
  return logical[20] ?? null;
}

/** Decrypts a player library. Returns null when the file is not this SQLCipher database. */
export async function decryptOneLibrary(file: Uint8Array): Promise<Uint8Array | null> {
  const cryptoApi = webCrypto();
  if (!cryptoApi || file.length < PAGE || file.length % PAGE !== 0) return null;
  const salt = file.slice(0, SALT_LEN);
  const keys = await keysFor(salt);
  if (!keys) return null;
  const pages = file.length / PAGE;
  const out = new Uint8Array(file.length);
  for (let pageNo = 1; pageNo <= pages; pageNo++) {
    const page = await decryptPage(cryptoApi, file, pageNo, keys);
    if (!page) return null;
    out.set(page, (pageNo - 1) * PAGE);
  }
  if (headerReserve(out) !== RESERVE) return null;
  return out;
}

/** Encrypts a decrypted player library with the salt already stored in the file. */
export async function encryptOneLibrary(logical: Uint8Array, salt: Uint8Array): Promise<Uint8Array | null> {
  const cryptoApi = webCrypto();
  if (!cryptoApi || headerReserve(logical) !== RESERVE || salt.length !== SALT_LEN) return null;
  const keys = await keysFor(salt);
  if (!keys) return null;
  const pages = logical.length / PAGE;
  const out = new Uint8Array(logical.length);
  for (let pageNo = 1; pageNo <= pages; pageNo++) {
    const page = logical.subarray((pageNo - 1) * PAGE, pageNo * PAGE);
    if (blankPage(page)) continue;
    const sealed = await encryptPage(cryptoApi, page, pageNo, salt, keys);
    out.set(sealed, (pageNo - 1) * PAGE);
  }
  return out;
}

async function loadSql() {
  const initSqlJs = (await import("sql.js")).default;
  const locateFile = (file: string) => {
    if (typeof window !== "undefined") return "/sql-wasm.wasm";
    return `${process.cwd()}/node_modules/sql.js/dist/${file}`;
  };
  return initSqlJs({ locateFile });
}

async function openDb(bytes?: Uint8Array): Promise<SqlDb> {
  const SQL = await loadSql();
  return new SQL.Database(bytes) as unknown as SqlDb;
}

function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error("ident");
  return `"${name}"`;
}

function findTable(names: string[], wanted: string): string | null {
  return names.find((name) => name.toLowerCase() === wanted.toLowerCase()) ?? null;
}

function columnNames(db: SqlDb, table: string): string[] {
  const rows = db.exec(`PRAGMA table_info(${quoteIdent(table)})`);
  return (rows[0]?.values ?? []).map((row) => String(row[1]));
}

function sqlTime(date: Date): string {
  const p = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(
    date.getMinutes(),
  )}:${p(date.getSeconds())}`;
}

function nextNumber(values: string[]): number {
  let max = 0;
  for (const value of values) {
    if (/^\d+$/.test(value)) max = Math.max(max, Number(value));
  }
  return max + 1;
}

function rowsOf(db: SqlDb, sql: string, params: readonly unknown[] = []): unknown[][] {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const rows: unknown[][] = [];
    while (statement.step()) rows.push(statement.get());
    return rows;
  } finally {
    statement.free();
  }
}

function contentPath(folder: string, fileName: string): string {
  const folderKey = folder.replaceAll("\\", "/");
  const fileKey = fileName.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!folderKey) return fileName;
  if (!fileKey) return folder;
  if (folderKey.toLowerCase().endsWith(fileKey.toLowerCase())) return folder;
  return `${folder.replace(/[\\/]+$/, "")}/${fileKey}`;
}

function matchContent(rows: { id: string; path: string }[], filePath: string): string | null {
  if (!filePath) return null;
  const hits = rows.filter((row) => row.path && anlzPathsMatch(filePath, row.path));
  if (hits.length !== 1) return null;
  return hits[0]!.id;
}

function insertRow(db: SqlDb, table: string, columns: string[], values: Record<string, string | number | null>) {
  const used = columns.filter((column) => Object.prototype.hasOwnProperty.call(values, column));
  if (!used.length) throw new Error("columns");
  const sql = `INSERT INTO ${quoteIdent(table)} (${used.map(quoteIdent).join(", ")}) VALUES (${used
    .map(() => "?")
    .join(", ")})`;
  db.run(
    sql,
    used.map((column) => values[column] ?? null),
  );
}

function column(list: string[], wanted: string): string | null {
  return list.find((name) => name.toLowerCase() === wanted.toLowerCase()) ?? null;
}

/**
 * Device Library Plus: `playlist`, `playlist_content`, `content`.
 * Returns null when this file is not that schema.
 */
function applyDevicePlaylists(
  db: SqlDb,
  names: string[],
  playlists: OneLibraryPlaylist[],
): OneLibraryPlan | null {
  const playlistTable = findTable(names, "playlist");
  const linkTable = findTable(names, "playlist_content");
  const contentTable = findTable(names, "content");
  if (!playlistTable || !linkTable || !contentTable) return null;

  const playlistCols = columnNames(db, playlistTable);
  const linkCols = columnNames(db, linkTable);
  const contentCols = columnNames(db, contentTable);
  const contentIdCol = column(contentCols, "content_id");
  const pathCol = column(contentCols, "path");
  const playlistIdCol = column(playlistCols, "playlist_id");
  const playlistNameCol = column(playlistCols, "name");
  const linkPlaylistCol = column(linkCols, "playlist_id");
  const linkContentCol = column(linkCols, "content_id");
  const linkSeqCol = column(linkCols, "sequenceNo");
  if (
    !contentIdCol ||
    !pathCol ||
    !playlistIdCol ||
    !playlistNameCol ||
    !linkPlaylistCol ||
    !linkContentCol ||
    !linkSeqCol
  ) {
    return { status: "untouched" };
  }

  const contentRows = rowsOf(
    db,
    `SELECT ${quoteIdent(contentIdCol)}, ${quoteIdent(pathCol)} FROM ${quoteIdent(contentTable)}`,
  ).map((row) => ({ id: String(row[0] ?? ""), path: String(row[1] ?? "") }));
  const existing = rowsOf(
    db,
    `SELECT ${quoteIdent(playlistIdCol)}, ${quoteIdent(playlistNameCol)} FROM ${quoteIdent(playlistTable)}`,
  ).map((row) => ({ id: String(row[0] ?? ""), name: String(row[1] ?? "") }));

  const planned = playlists.map((playlist) => ({
    name: playlist.name,
    contentIds: playlist.paths
      .map((filePath) => matchContent(contentRows, filePath))
      .filter((id): id is string => Boolean(id)),
  }));
  if (planned.some((playlist) => existing.filter((row) => row.name === playlist.name).length > 1)) {
    return { status: "untouched" };
  }
  const writable = planned.filter((playlist) => playlist.contentIds.length > 0);
  if (!writable.length) return { status: "untouched" };

  const seqCol = column(playlistCols, "sequenceNo");
  let playlistSerial = nextNumber(existing.map((row) => row.id));
  let sequence = seqCol
    ? nextNumber(
        rowsOf(db, `SELECT ${quoteIdent(seqCol)} FROM ${quoteIdent(playlistTable)}`).map((row) =>
          String(row[0] ?? ""),
        ),
      )
    : 1;
  const parentCol = column(playlistCols, "playlist_id_parent");
  const parentValues = parentCol
    ? rowsOf(db, `SELECT ${quoteIdent(parentCol)} FROM ${quoteIdent(playlistTable)}`).map((row) => row[0])
    : [];
  const parent: string | number | null = parentValues.some((value) => value === 0 || value === "0")
    ? 0
    : null;

  const written: { name: string; id: string; contentIds: string[] }[] = [];
  for (const playlist of writable) {
    const sameName = existing.filter((row) => row.name === playlist.name);
    let playlistId = sameName[0]?.id ?? "";
    if (!playlistId) {
      playlistId = String(playlistSerial);
      playlistSerial += 1;
      insertRow(db, playlistTable, playlistCols, {
        [playlistIdCol]: playlistId,
        [playlistNameCol]: playlist.name,
        ...(seqCol ? { [seqCol]: sequence } : {}),
        ...(column(playlistCols, "attribute") ? { [column(playlistCols, "attribute")!]: 0 } : {}),
        ...(column(playlistCols, "image_id") ? { [column(playlistCols, "image_id")!]: null } : {}),
        ...(parentCol ? { [parentCol]: parent } : {}),
      });
      sequence += 1;
      existing.push({ id: playlistId, name: playlist.name });
    } else {
      db.run(`DELETE FROM ${quoteIdent(linkTable)} WHERE ${quoteIdent(linkPlaylistCol)} = ?`, [playlistId]);
    }
    playlist.contentIds.forEach((contentId, index) => {
      insertRow(db, linkTable, linkCols, {
        [linkPlaylistCol]: playlistId,
        [linkContentCol]: contentId,
        [linkSeqCol]: index + 1,
      });
    });
    written.push({ name: playlist.name, id: playlistId, contentIds: playlist.contentIds });
  }

  for (const playlist of written) {
    const found = rowsOf(
      db,
      `SELECT ${quoteIdent(linkContentCol)} FROM ${quoteIdent(linkTable)} WHERE ${quoteIdent(linkPlaylistCol)} = ? ORDER BY ${quoteIdent(linkSeqCol)}`,
      [playlist.id],
    ).map((row) => String(row[0] ?? ""));
    const name = rowsOf(
      db,
      `SELECT ${quoteIdent(playlistNameCol)} FROM ${quoteIdent(playlistTable)} WHERE ${quoteIdent(playlistIdCol)} = ?`,
      [playlist.id],
    );
    if (name.length !== 1 || String(name[0]?.[0] ?? "") !== playlist.name) return { status: "untouched" };
    if (found.length !== playlist.contentIds.length || found.some((id, index) => id !== playlist.contentIds[index])) {
      return { status: "untouched" };
    }
  }
  const bytes = db.export();
  const trackCount = written.reduce((sum, playlist) => sum + playlist.contentIds.length, 0);
  return { status: "written", bytes, trackCount };
}

/**
 * Inserts playlists into an already decrypted player library.
 * Returns the original status when the schema or the paths do not match.
 */
export async function applyOneLibraryPlaylists(
  sqliteBytes: Uint8Array,
  playlists: OneLibraryPlaylist[],
  now = new Date(),
): Promise<OneLibraryPlan> {
  if (!playlists.length) return { status: "untouched" };
  const db = await openDb(sqliteBytes.slice());
  try {
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type = 'table'")[0]?.values.map((row) =>
      String(row[0]),
    );
    const names = tables ?? [];
    const device = applyDevicePlaylists(db, names, playlists);
    if (device) return device;
    const playlistTable = findTable(names, "djmdPlaylist");
    const songTable = findTable(names, "djmdSongPlaylist");
    const contentTable = findTable(names, "djmdContent");
    if (!playlistTable || !songTable || !contentTable) return { status: "untouched" };

    const playlistCols = columnNames(db, playlistTable);
    const songCols = columnNames(db, songTable);
    const contentCols = columnNames(db, contentTable);
    const col = (list: string[], wanted: string) =>
      list.find((name) => name.toLowerCase() === wanted.toLowerCase()) ?? null;
    const idCol = col(contentCols, "ID");
    const folderCol = col(contentCols, "FolderPath");
    const fileCol = col(contentCols, "FileNameL");
    const playlistIdCol = col(playlistCols, "ID");
    const playlistNameCol = col(playlistCols, "Name");
    const songPlaylistCol = col(songCols, "PlaylistID");
    const songContentCol = col(songCols, "ContentID");
    const songTrackCol = col(songCols, "TrackNo");
    const songIdCol = col(songCols, "ID");
    if (!idCol || (!folderCol && !fileCol) || !playlistIdCol || !playlistNameCol || !songPlaylistCol || !songContentCol || !songTrackCol || !songIdCol) {
      return { status: "untouched" };
    }

    const selectPath = [quoteIdent(idCol), folderCol ? quoteIdent(folderCol) : "''", fileCol ? quoteIdent(fileCol) : "''"].join(
      ", ",
    );
    const contentRows = rowsOf(db, `SELECT ${selectPath} FROM ${quoteIdent(contentTable)}`).map((row) => ({
      id: String(row[0] ?? ""),
      path: contentPath(folderCol ? String(row[1] ?? "") : "", fileCol ? String(row[2] ?? "") : ""),
    }));

    const existing = rowsOf(
      db,
      `SELECT ${quoteIdent(playlistIdCol)}, ${quoteIdent(playlistNameCol)} FROM ${quoteIdent(playlistTable)}`,
    ).map((row) => ({ id: String(row[0] ?? ""), name: String(row[1] ?? "") }));

    const stamp = sqlTime(now);
    let playlistSerial = nextNumber(existing.map((row) => row.id));
    let songSerial = nextNumber(
      rowsOf(db, `SELECT ${quoteIdent(songIdCol)} FROM ${quoteIdent(songTable)}`).map((row) => String(row[0] ?? "")),
    );
    const usnCols = [playlistTable, songTable].flatMap((table) => {
      const columns = table === playlistTable ? playlistCols : songCols;
      return ["usn", "rb_local_usn"].flatMap((name) => {
        const found = col(columns, name);
        return found ? [{ table, column: found }] : [];
      });
    });
    let usn = 1;
    for (const item of usnCols) {
      const values = rowsOf(db, `SELECT ${quoteIdent(item.column)} FROM ${quoteIdent(item.table)}`).map((row) =>
        String(row[0] ?? ""),
      );
      usn = Math.max(usn, nextNumber(values));
    }

    const written: { name: string; id: string; contentIds: string[] }[] = [];
    for (const playlist of playlists) {
      const contentIds = playlist.paths
        .map((filePath) => matchContent(contentRows, filePath))
        .filter((id): id is string => Boolean(id));
      if (!contentIds.length) continue;
      const sameName = existing.filter((row) => row.name === playlist.name);
      if (sameName.length > 1) return { status: "untouched" };
      let playlistId = sameName[0]?.id ?? "";
      if (!playlistId) {
        playlistId = String(playlistSerial);
        playlistSerial += 1;
        const parentCol = col(playlistCols, "ParentID");
        const parents = parentCol
          ? rowsOf(
              db,
              `SELECT ${quoteIdent(parentCol)} FROM ${quoteIdent(playlistTable)} WHERE ${quoteIdent(parentCol)} IS NOT NULL AND ${quoteIdent(parentCol)} != ''`,
            ).map((row) => String(row[0] ?? ""))
          : [];
        const parent = parents.includes("root") ? "root" : (parents[0] ?? "root");
        const seqCol = col(playlistCols, "Seq");
        const seq = seqCol
          ? nextNumber(
              rowsOf(db, `SELECT ${quoteIdent(seqCol)} FROM ${quoteIdent(playlistTable)}`).map((row) =>
                String(row[0] ?? ""),
              ),
            )
          : 1;
        insertRow(db, playlistTable, playlistCols, {
          [playlistIdCol]: playlistId,
          [playlistNameCol]: playlist.name,
          ...(col(playlistCols, "Seq") ? { [col(playlistCols, "Seq")!]: seq } : {}),
          ...(col(playlistCols, "Attribute") ? { [col(playlistCols, "Attribute")!]: 0 } : {}),
          ...(parentCol ? { [parentCol]: parent } : {}),
          ...(col(playlistCols, "ImagePath") ? { [col(playlistCols, "ImagePath")!]: "" } : {}),
          ...(col(playlistCols, "UUID") ? { [col(playlistCols, "UUID")!]: crypto.randomUUID() } : {}),
          ...(col(playlistCols, "rb_data_status") ? { [col(playlistCols, "rb_data_status")!]: 0 } : {}),
          ...(col(playlistCols, "rb_local_data_status") ? { [col(playlistCols, "rb_local_data_status")!]: 0 } : {}),
          ...(col(playlistCols, "rb_local_deleted") ? { [col(playlistCols, "rb_local_deleted")!]: 0 } : {}),
          ...(col(playlistCols, "rb_local_synced") ? { [col(playlistCols, "rb_local_synced")!]: 0 } : {}),
          ...(col(playlistCols, "usn") ? { [col(playlistCols, "usn")!]: usn } : {}),
          ...(col(playlistCols, "rb_local_usn") ? { [col(playlistCols, "rb_local_usn")!]: usn } : {}),
          ...(col(playlistCols, "created_at") ? { [col(playlistCols, "created_at")!]: stamp } : {}),
          ...(col(playlistCols, "updated_at") ? { [col(playlistCols, "updated_at")!]: stamp } : {}),
        });
        usn += 1;
        existing.push({ id: playlistId, name: playlist.name });
      } else {
        const sets: string[] = [];
        const params: unknown[] = [];
        const touch = (column: string | null, value: string | number) => {
          if (!column) return;
          sets.push(`${quoteIdent(column)} = ?`);
          params.push(value);
        };
        touch(col(playlistCols, "updated_at"), stamp);
        touch(col(playlistCols, "usn"), usn);
        touch(col(playlistCols, "rb_local_usn"), usn);
        if (sets.length) {
          params.push(playlistId);
          db.run(
            `UPDATE ${quoteIdent(playlistTable)} SET ${sets.join(", ")} WHERE ${quoteIdent(playlistIdCol)} = ?`,
            params,
          );
          usn += 1;
        }
        db.run(`DELETE FROM ${quoteIdent(songTable)} WHERE ${quoteIdent(songPlaylistCol)} = ?`, [playlistId]);
      }

      contentIds.forEach((contentId, index) => {
        const songId = String(songSerial);
        songSerial += 1;
        const rowUsn = usn;
        usn += 1;
        insertRow(db, songTable, songCols, {
          [songIdCol]: songId,
          [songPlaylistCol]: playlistId,
          [songContentCol]: contentId,
          [songTrackCol]: index + 1,
          ...(col(songCols, "UUID") ? { [col(songCols, "UUID")!]: crypto.randomUUID() } : {}),
          ...(col(songCols, "rb_data_status") ? { [col(songCols, "rb_data_status")!]: 0 } : {}),
          ...(col(songCols, "rb_local_data_status") ? { [col(songCols, "rb_local_data_status")!]: 0 } : {}),
          ...(col(songCols, "rb_local_deleted") ? { [col(songCols, "rb_local_deleted")!]: 0 } : {}),
          ...(col(songCols, "rb_local_synced") ? { [col(songCols, "rb_local_synced")!]: 0 } : {}),
          ...(col(songCols, "usn") ? { [col(songCols, "usn")!]: rowUsn } : {}),
          ...(col(songCols, "rb_local_usn") ? { [col(songCols, "rb_local_usn")!]: rowUsn } : {}),
          ...(col(songCols, "created_at") ? { [col(songCols, "created_at")!]: stamp } : {}),
          ...(col(songCols, "updated_at") ? { [col(songCols, "updated_at")!]: stamp } : {}),
        });
      });
      written.push({ name: playlist.name, id: playlistId, contentIds });
    }

    if (!written.length) return { status: "untouched" };
    for (const playlist of written) {
      const found = rowsOf(
        db,
        `SELECT ${quoteIdent(songContentCol)} FROM ${quoteIdent(songTable)} WHERE ${quoteIdent(songPlaylistCol)} = ? ORDER BY ${quoteIdent(songTrackCol)}`,
        [playlist.id],
      ).map((row) => String(row[0] ?? ""));
      const name = rowsOf(
        db,
        `SELECT ${quoteIdent(playlistNameCol)} FROM ${quoteIdent(playlistTable)} WHERE ${quoteIdent(playlistIdCol)} = ?`,
        [playlist.id],
      );
      if (name.length !== 1 || String(name[0]?.[0] ?? "") !== playlist.name) return { status: "untouched" };
      if (found.length !== playlist.contentIds.length || found.some((id, index) => id !== playlist.contentIds[index])) {
        return { status: "untouched" };
      }
    }
    const bytes = db.export();
    const trackCount = written.reduce((sum, playlist) => sum + playlist.contentIds.length, 0);
    return { status: "written", bytes, trackCount };
  } catch {
    return { status: "untouched" };
  } finally {
    db.close();
  }
}

async function playlistLanded(
  logical: Uint8Array,
  playlists: OneLibraryPlaylist[],
  trackCount: number,
): Promise<boolean> {
  const db = await openDb(logical);
  try {
    const names = db.exec("SELECT name FROM sqlite_master WHERE type = 'table'")[0]?.values.map((row) =>
      String(row[0]),
    );
    const tableNames = names ?? [];
    const device = Boolean(findTable(tableNames, "playlist") && findTable(tableNames, "playlist_content"));
    const playlistTable = device
      ? findTable(tableNames, "playlist")
      : findTable(tableNames, "djmdPlaylist");
    const songTable = device
      ? findTable(tableNames, "playlist_content")
      : findTable(tableNames, "djmdSongPlaylist");
    if (!playlistTable || !songTable) return false;
    const playlistCols = columnNames(db, playlistTable);
    const songCols = columnNames(db, songTable);
    const nameCol = playlistCols.find((name) => name.toLowerCase() === "name");
    const idCol = playlistCols.find((name) =>
      device ? name.toLowerCase() === "playlist_id" : name.toLowerCase() === "id",
    );
    const songPlaylistCol = songCols.find((name) =>
      device ? name.toLowerCase() === "playlist_id" : name.toLowerCase() === "playlistid",
    );
    if (!nameCol || !idCol || !songPlaylistCol) return false;
    let seen = 0;
    for (const playlist of playlists) {
      const rows = rowsOf(
        db,
        `SELECT ${quoteIdent(idCol)} FROM ${quoteIdent(playlistTable)} WHERE ${quoteIdent(nameCol)} = ?`,
        [playlist.name],
      );
      if (rows.length !== 1) continue;
      const songs = rowsOf(
        db,
        `SELECT 1 FROM ${quoteIdent(songTable)} WHERE ${quoteIdent(songPlaylistCol)} = ?`,
        [rows[0]?.[0]],
      );
      seen += songs.length;
    }
    return seen === trackCount && trackCount > 0;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/**
 * Builds the next player-library file. The input buffer is never modified.
 * A file that cannot be opened comes back as untouched.
 */
export async function updateOneLibrary(
  fileBytes: Uint8Array,
  playlists: OneLibraryPlaylist[],
  now = new Date(),
): Promise<OneLibraryPlan> {
  const original = fileBytes.slice();
  try {
    const logical = await decryptOneLibrary(original);
    if (!logical) return { status: "untouched" };
    const applied = await applyOneLibraryPlaylists(logical, playlists, now);
    if (applied.status !== "written") return { status: "untouched" };
    if (headerReserve(applied.bytes) !== RESERVE) return { status: "untouched" };
    const sealed = await encryptOneLibrary(applied.bytes, original.slice(0, SALT_LEN));
    if (!sealed) return { status: "untouched" };
    const check = await decryptOneLibrary(sealed);
    if (!check || headerReserve(check) !== RESERVE) return { status: "untouched" };
    if (!(await playlistLanded(check, playlists, applied.trackCount))) return { status: "untouched" };
    return { status: "written", bytes: sealed, trackCount: applied.trackCount };
  } catch {
    return { status: "untouched" };
  }
}
