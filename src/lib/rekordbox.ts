import { parseBpm } from "@/lib/harmonic";
import { parseEnergyLevel } from "@/lib/energy";
import { tDe, type Translate } from "@/lib/i18n/core";
import { LocalizedError } from "@/lib/i18n/error";
import { parseKeyValue, type KeyImportRow } from "@/lib/key-import";

export type RekordboxParseResult = {
  source: "xml" | "db" | "csv";
  rows: KeyImportRow[];
  trackCount: number;
  warning?: string;
};

function rowFromFields(
  artist: string,
  title: string,
  keyRaw: string,
  bpmRaw: string,
  comment = "",
): KeyImportRow | null {
  const keyCamelot = parseKeyValue(keyRaw);
  const bpmNum = parseBpm(bpmRaw);
  if (!title && !artist) return null;
  const energyLevel = parseEnergyLevel(comment);
  if (!keyCamelot && bpmNum == null) return null;
  return {
    artist: artist.trim(),
    title: title.trim(),
    keyRaw: keyRaw.trim(),
    keyCamelot,
    bpm: bpmNum != null ? String(Math.round(bpmNum)) : "",
    ...(energyLevel != null ? { energyLevel } : {}),
  };
}

/** Parse rekordbox XML collection export (File → Export Collection in XML). */
export function parseRekordboxXml(xmlText: string): RekordboxParseResult {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new LocalizedError(
      "exports.rekordbox.invalidXml",
      undefined,
      "Ungültiges XML — rekordbox Export Collection (.xml) erwartet.",
    );
  }

  const tracks = Array.from(doc.querySelectorAll("TRACK, Track, track"));
  const rows: KeyImportRow[] = [];

  for (const track of tracks) {
    // Skip playlist leaf references without Name
    const title =
      track.getAttribute("Name") ||
      track.getAttribute("Title") ||
      track.getAttribute("name") ||
      "";
    if (!title) continue;

    const artist =
      track.getAttribute("Artist") ||
      track.getAttribute("artist") ||
      "";
    const keyRaw =
      track.getAttribute("Tonality") ||
      track.getAttribute("Key") ||
      track.getAttribute("tonality") ||
      track.getAttribute("key") ||
      "";
    const bpmRaw =
      track.getAttribute("AverageBpm") ||
      track.getAttribute("Bpm") ||
      track.getAttribute("AverageBPM") ||
      track.getAttribute("Tempo") ||
      "";

    const row = rowFromFields(
      artist,
      title,
      keyRaw,
      bpmRaw,
      track.getAttribute("Comments") || track.getAttribute("Comment") || "",
    );
    if (row) rows.push(row);
  }

  if (!rows.length) {
    throw new LocalizedError(
      "exports.rekordbox.noKeyTracks",
      undefined,
      "Keine Tracks mit Key/BPM im XML gefunden. In rekordbox: Analysis → Key analysieren, dann Collection als XML exportieren.",
    );
  }

  return { source: "xml", rows, trackCount: rows.length };
}

/**
 * Try reading an unencrypted rekordbox SQLite DB (older exports / decrypted master.db).
 * rekordbox 6+ master.db is SQLCipher-encrypted — then we guide users to XML export.
 */
export async function parseRekordboxDb(
  buffer: ArrayBuffer,
  t: Translate = tDe,
): Promise<RekordboxParseResult> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: () => "/sql-wasm.wasm",
  });

  let db: InstanceType<typeof SQL.Database>;
  try {
    db = new SQL.Database(new Uint8Array(buffer));
  } catch {
    throw new LocalizedError(
      "exports.rekordbox.dbEncrypted",
      undefined,
      "rekordbox master.db ist verschlüsselt (SQLCipher ab v6). Bitte in rekordbox: File → Export Collection in XML… und die .xml hier laden.",
    );
  }

  try {
    const tables = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const tableNames = (tables[0]?.values ?? []).map((row) => String(row[0]));

    // Prefer djmdContent (rekordbox 6 schema) or classic content tables
    const contentTable =
      tableNames.find((name) => name.toLowerCase() === "djmdcontent") ||
      tableNames.find((name) => /content/i.test(name) && !/cue|history/i.test(name));

    if (!contentTable) {
      const shown = tableNames.slice(0, 8).join(", ");
      throw new LocalizedError(
        shown ? "exports.rekordbox.noContentTable" : "exports.rekordbox.noContentTableEmpty",
        shown ? { tables: shown } : undefined,
        `Keine Content-Tabelle gefunden (${shown || "leer"}). Nutze XML-Export.`,
      );
    }

    const colInfo = db.exec(`PRAGMA table_info("${contentTable.replaceAll('"', '""')}")`);
    const colNames = (colInfo[0]?.values ?? []).map((row) => String(row[1]));

    const pick = (...candidates: string[]) =>
      colNames.find((name) =>
        candidates.some((candidate) => name.toLowerCase() === candidate.toLowerCase()),
      );

    const titleCol = pick("Title", "Name", "title", "name");
    const artistCol =
      pick("ArtistName", "Artist", "artist", "ArtistCommnets") || null;
    const keyCol = pick("Key", "Tonality", "key", "tonality");
    const bpmCol = pick("BPM", "Bpm", "Tempo", "AverageBpm", "bpm");
    const commentCol = pick("Commnt", "Comments", "Comment") || null;

    if (!titleCol) {
      throw new LocalizedError(
        "exports.rekordbox.noTitleColumn",
        undefined,
        "Title-Spalte in der DB nicht gefunden — bitte XML exportieren.",
      );
    }

    // Artist may live in related table; try stock columns first
    const selectCols = [titleCol, keyCol, bpmCol, artistCol, commentCol]
      .filter(Boolean)
      .map((name) => `"${String(name).replaceAll('"', '""')}"`)
      .join(", ");

    const result = db.exec(
      `SELECT ${selectCols} FROM "${contentTable.replaceAll('"', '""')}" LIMIT 20000`,
    );

    const values = result[0]?.values ?? [];
    const rows: KeyImportRow[] = [];

    for (const value of values) {
      const title = String(value[0] ?? "");
      let keyRaw = "";
      let bpmRaw = "";
      let artist = "";
      // Order follows selectCols construction
      let idx = 1;
      if (keyCol) {
        keyRaw = String(value[idx++] ?? "");
      }
      if (bpmCol) {
        bpmRaw = String(value[idx++] ?? "");
      }
      if (artistCol) {
        artist = String(value[idx++] ?? "");
      }
      let comment = "";
      if (commentCol) {
        comment = String(value[idx++] ?? "");
      }

      const row = rowFromFields(artist, title, keyRaw, bpmRaw, comment);
      if (row) rows.push(row);
    }

    // Try join artist table if artist empty and djmdArtist exists
    if (
      rows.some((row) => !row.artist) &&
      tableNames.some((name) => name.toLowerCase() === "djmdartist")
    ) {
      // Best-effort left as warning — XML is more reliable for artist+key pairs
    }

    if (!rows.length) {
      throw new LocalizedError(
        "exports.rekordbox.dbNoRows",
        undefined,
        "DB gelesen, aber keine Key/BPM-Zeilen. In rekordbox Keys analysieren oder XML exportieren.",
      );
    }

    return {
      source: "db",
      rows,
      trackCount: rows.length,
      warning: t("exports.rekordbox.dbWarning"),
    };
  } finally {
    db.close();
  }
}

export async function parseRekordboxFile(
  file: File,
  t: Translate = tDe,
): Promise<RekordboxParseResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xml")) {
    return parseRekordboxXml(await file.text());
  }

  if (name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv")) {
    const { parseKeyImportText } = await import("@/lib/key-import");
    const rows = parseKeyImportText(await file.text());
    if (!rows.length) {
      throw new LocalizedError(
        "exports.rekordbox.csvNoColumns",
        undefined,
        "CSV ohne erkennbare Artist/Title/Key/BPM-Spalten.",
      );
    }
    return { source: "csv", rows, trackCount: rows.length };
  }

  if (name.endsWith(".db") || name.endsWith(".sqlite") || name.endsWith(".sqlite3")) {
    return parseRekordboxDb(await file.arrayBuffer(), t);
  }

  // Sniff XML
  const head = await file.slice(0, 200).text();
  if (head.includes("DJ_PLAYLISTS") || head.includes("<TRACK")) {
    return parseRekordboxXml(await file.text());
  }

  throw new LocalizedError(
    "exports.rekordbox.unsupportedFile",
    undefined,
    "Bitte rekordbox Collection-XML (.xml), CSV oder master.db hochladen.",
  );
}
