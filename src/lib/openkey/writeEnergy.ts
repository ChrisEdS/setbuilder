import {
  energyFromRekordboxTags,
  parseEnergyField,
  parseEnergyLevel,
} from "@/lib/energy";

const ENERGY_DESCRIPTION = "EnergyLevel";
const GROW_PADDING = 512;

/** TXXX descriptions Mixed In Key / SETBUILDER / similar tools use for Energy. */
function isEnergyUserText(description: string): boolean {
  const folded = description
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "");
  return (
    folded === "energylevel" ||
    folded === "energy" ||
    folded === "energie" ||
    folded === "mikenergy" ||
    folded === "mixedinkeyenergy" ||
    folded === "energylevel1to10" ||
    folded === "energylevel110"
  );
}

export type Id3Frame = {
  id: string;
  body: Uint8Array;
};

export type Id3Tag = {
  version: 3 | 4;
  frames: Id3Frame[];
  audio: Uint8Array;
};

type StoredFrame = Id3Frame & {
  raw: Uint8Array;
  flags: Uint8Array;
};

type ParsedTag = {
  version: 3 | 4;
  frames: StoredFrame[];
  audio: Uint8Array;
  tagBodySize: number;
  hadTag: boolean;
  hadFooter: boolean;
};

export function readId3(data: Uint8Array): Id3Tag {
  const parsed = readTag(data);
  return {
    version: parsed.version,
    frames: parsed.frames.map((frame) => ({ id: frame.id, body: frame.body })),
    audio: parsed.audio,
  };
}

export function readEnergyFields(data: Uint8Array): {
  energyLevel: string | null;
  comment: string | null;
} {
  const tag = readTag(data);
  let energyLevel: string | null = null;
  let comment: string | null = null;
  for (const frame of tag.frames) {
    const body = logicalBody(tag.version, frame);
    if (frame.id === "TXXX" && energyLevel === null) {
      const field = readTxxx(body);
      if (field?.description === ENERGY_DESCRIPTION) energyLevel = field.value;
    }
    if (frame.id === "COMM" && comment === null) {
      const field = readComm(body);
      if (field?.description === "") comment = field.text;
    }
  }
  return { energyLevel, comment };
}

/**
 * Energy Level from ID3 wherever Mixed In Key / SETBUILDER / rekordbox often put it:
 * TXXX EnergyLevel/Energy, any COMM with `Energy N`, Grouping (TIT1), Remixer (TPE4),
 * Publisher/Label (TPUB). Used when export.pdb has not been refreshed yet.
 */
/** Front-cover (or first) picture from an ID3 APIC frame. */
export function artworkFromId3(
  data: Uint8Array,
): { mime: string; bytes: Uint8Array } | null {
  let parsed: ParsedTag;
  try {
    parsed = readTag(data);
  } catch {
    return null;
  }
  const pictures: { mime: string; type: number; bytes: Uint8Array }[] = [];
  for (const frame of parsed.frames) {
    if (frame.id !== "APIC") continue;
    let body: Uint8Array;
    try {
      body = logicalBody(parsed.version, frame);
    } catch {
      continue;
    }
    const picture = readApic(body);
    if (picture) pictures.push(picture);
  }
  const preferred =
    pictures.find((item) => item.type === 3) ??
    pictures.find((item) => item.type === 0) ??
    pictures[0];
  return preferred
    ? { mime: preferred.mime, bytes: preferred.bytes }
    : null;
}

export function energyLevelFromId3(data: Uint8Array): number | undefined {
  let parsed: ParsedTag;
  try {
    parsed = readTag(data);
  } catch {
    return undefined;
  }

  const txxxEnergyValues: string[] = [];
  const comments: string[] = [];
  let grouping: string | null = null;
  let remixer: string | null = null;
  let label: string | null = null;

  for (const frame of parsed.frames) {
    let body: Uint8Array;
    try {
      body = logicalBody(parsed.version, frame);
    } catch {
      continue;
    }
    if (frame.id === "TXXX") {
      const field = readTxxx(body);
      if (field && isEnergyUserText(field.description)) {
        txxxEnergyValues.push(field.value);
      }
      continue;
    }
    if (frame.id === "COMM") {
      const field = readComm(body);
      if (field?.text) comments.push(field.text);
      continue;
    }
    if (frame.id === "TIT1" && grouping == null) {
      grouping = readTextFrame(body);
      continue;
    }
    if (frame.id === "TPE4" && remixer == null) {
      remixer = readTextFrame(body);
      continue;
    }
    if (frame.id === "TPUB" && label == null) {
      label = readTextFrame(body);
    }
  }

  for (const value of txxxEnergyValues) {
    const level = parseEnergyField(value) ?? parseEnergyLevel(value);
    if (level != null) return level;
  }
  for (const text of comments) {
    const level = parseEnergyLevel(text);
    if (level != null) return level;
  }
  return energyFromRekordboxTags({
    comment: comments[0] ?? null,
    grouping,
    label,
    remixer,
  });
}

export type TagSelection = {
  energy?: number;
  openKey?: string;
  keyLabel?: string;
  bpm?: number;
};

export function writeEnergy(data: Uint8Array, energy: number): Uint8Array {
  return writeTags(data, { energy });
}

export function writeTags(data: Uint8Array, fields: TagSelection): Uint8Array {
  const writesEnergy = fields.energy != null;
  const writesOpenKey = Boolean(fields.openKey);
  const writesMusical = Boolean(fields.keyLabel);
  const writesBpm = fields.bpm != null;
  if (!writesEnergy && !writesOpenKey && !writesMusical && !writesBpm) {
    throw new Error("Choose at least one tag to write");
  }
  if (
    writesEnergy &&
    (!Number.isInteger(fields.energy) ||
      fields.energy! < 1 ||
      fields.energy! > 10)
  ) {
    throw new Error("Energy must be an integer from 1 to 10");
  }
  if (writesBpm && (!Number.isFinite(fields.bpm) || fields.bpm! <= 0)) {
    throw new Error("BPM must be a positive number");
  }
  const parsed = readTag(data);
  const frames = updateFrames(parsed.version, parsed.frames, fields);
  return assemble(parsed, frames);
}

function updateFrames(
  version: 3 | 4,
  frames: StoredFrame[],
  fields: TagSelection,
): StoredFrame[] {
  const writesEnergy = fields.energy != null;
  const writesOpenKey = Boolean(fields.openKey);
  const writesMusical = Boolean(fields.keyLabel);
  const writesKey = writesOpenKey || writesMusical;
  const writesBpm = fields.bpm != null;
  const storeMusicalSeparately = writesOpenKey && writesMusical;
  const tkeyValue = writesOpenKey
    ? fields.openKey!
    : musicalKeyCode(fields.keyLabel!);
  let wroteEnergy = false;
  let wroteComment = false;
  let wroteTkey = false;
  let wroteMusical = false;
  let wroteBpm = false;
  const next: StoredFrame[] = [];

  for (const frame of frames) {
    const protectedFrame = isProtected(version, frame.flags);
    if (
      protectedFrame &&
      writesEnergy &&
      (frame.id === "TXXX" || frame.id === "COMM")
    ) {
      throw new Error(
        "This MP3 has a compressed or encrypted text frame, so it was left unchanged",
      );
    }
    if (protectedFrame && storeMusicalSeparately && frame.id === "TXXX") {
      throw new Error(
        "This MP3 has a compressed or encrypted text frame, so it was left unchanged",
      );
    }
    if (protectedFrame && writesKey && frame.id === "TKEY") {
      throw new Error(
        "This MP3 has a compressed or encrypted key frame, so it was left unchanged",
      );
    }
    if (protectedFrame && writesBpm && frame.id === "TBPM") {
      throw new Error(
        "This MP3 has a compressed or encrypted tempo frame, so it was left unchanged",
      );
    }

    const body = logicalBody(version, frame);
    if (frame.id === "TXXX") {
      const field = readTxxx(body);
      if (writesEnergy && field?.description === ENERGY_DESCRIPTION) {
        if (!wroteEnergy) {
          next.push(
            makeFrame(
              version,
              "TXXX",
              buildTxxx(ENERGY_DESCRIPTION, String(fields.energy)),
            ),
          );
          wroteEnergy = true;
        }
        continue;
      }
      if (storeMusicalSeparately && field?.description === "MusicalKey") {
        if (!wroteMusical) {
          next.push(
            makeFrame(
              version,
              "TXXX",
              buildTxxx("MusicalKey", fields.keyLabel!),
            ),
          );
          wroteMusical = true;
        }
        continue;
      }
    }
    if (writesEnergy && frame.id === "COMM") {
      const field = readComm(body);
      if (field?.description === "") {
        const text = applyEnergyToken(field.text, fields.energy!);
        next.push(
          makeFrame(version, "COMM", buildComm(field.language, "", text)),
        );
        wroteComment = true;
        continue;
      }
    }
    if (writesKey && frame.id === "TKEY") {
      if (!wroteTkey) {
        next.push(makeFrame(version, "TKEY", buildText(tkeyValue)));
        wroteTkey = true;
      }
      continue;
    }
    if (writesBpm && frame.id === "TBPM") {
      if (!wroteBpm) {
        next.push(
          makeFrame(version, "TBPM", buildText(formatTempo(fields.bpm!))),
        );
        wroteBpm = true;
      }
      continue;
    }
    next.push(frame);
  }

  if (writesEnergy && !wroteEnergy) {
    next.push(
      makeFrame(
        version,
        "TXXX",
        buildTxxx(ENERGY_DESCRIPTION, String(fields.energy)),
      ),
    );
  }
  if (writesEnergy && !wroteComment) {
    next.push(
      makeFrame(
        version,
        "COMM",
        buildComm("eng", "", `Energy ${fields.energy}`),
      ),
    );
  }
  if (writesKey && !wroteTkey)
    next.push(makeFrame(version, "TKEY", buildText(tkeyValue)));
  if (storeMusicalSeparately && !wroteMusical) {
    next.push(
      makeFrame(version, "TXXX", buildTxxx("MusicalKey", fields.keyLabel!)),
    );
  }
  if (writesBpm && !wroteBpm)
    next.push(makeFrame(version, "TBPM", buildText(formatTempo(fields.bpm!))));
  return next;
}

function musicalKeyCode(label: string): string {
  const match = /^(.*) (major|minor)$/.exec(label);
  if (!match) return label;
  return match[2] === "minor" ? `${match[1]}m` : match[1];
}

function formatTempo(bpm: number): string {
  const rounded = Math.round(bpm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function buildText(value: string): Uint8Array {
  const text = latin1Bytes(value);
  const body = new Uint8Array(1 + text.length + 1);
  body.set(text, 1);
  return body;
}

export function applyEnergyToken(text: string, energy: number): string {
  const token = `Energy ${energy}`;
  if (/\bEnergy\s+\d{1,2}\b/.test(text)) {
    return text.replace(/\bEnergy\s+\d{1,2}\b/g, token);
  }
  if (text.trim() === "") return token;
  return `${text} | ${token}`;
}

function assemble(parsed: ParsedTag, frames: StoredFrame[]): Uint8Array {
  const frameBytes = concat(frames.map((frame) => frame.raw));
  const fits = parsed.hadTag && frameBytes.length <= parsed.tagBodySize;
  const padding = fits ? parsed.tagBodySize - frameBytes.length : GROW_PADDING;
  const bodySize = frameBytes.length + padding;
  const keepFooter = parsed.hadFooter && fits;
  const header = buildHeader(parsed.version, bodySize, keepFooter);
  const parts = [header, frameBytes, new Uint8Array(padding)];
  if (keepFooter) parts.push(header);
  parts.push(parsed.audio);
  return concat(parts);
}

function readTag(data: Uint8Array): ParsedTag {
  if (
    data.length < 10 ||
    data[0] !== 0x49 ||
    data[1] !== 0x44 ||
    data[2] !== 0x33
  ) {
    return {
      version: 3,
      frames: [],
      audio: data.slice(),
      tagBodySize: 0,
      hadTag: false,
      hadFooter: false,
    };
  }

  const versionByte = data[3];
  if (versionByte === 2) throw new Error("ID3v2.2 is not supported");
  if (versionByte !== 3 && versionByte !== 4)
    throw new Error(`ID3v2.${versionByte} is not supported`);
  const version = versionByte as 3 | 4;
  const flags = data[5];
  const tagBodySize = decodeSyncsafe(data, 6);
  const hadFooter = version === 4 && (flags & 0x10) !== 0;
  const audioStart = 10 + tagBodySize + (hadFooter ? 10 : 0);
  if (audioStart > data.length)
    throw new Error("ID3 tag is larger than the file");

  let body = data.slice(10, 10 + tagBodySize);
  if (version === 3 && (flags & 0x80) !== 0) body = deunsync(body);

  let offset = 0;
  if ((flags & 0x40) !== 0) {
    if (body.length < 4)
      throw new Error(
        "ID3 extended header is truncated, so the file was left unchanged",
      );
    const extendedSize =
      version === 3 ? decodeUint32(body, 0) + 4 : decodeSyncsafe(body, 0);
    if (extendedSize < 4 || extendedSize > body.length) {
      throw new Error(
        "ID3 extended header is invalid, so the file was left unchanged",
      );
    }
    offset = extendedSize;
  }

  const frames: StoredFrame[] = [];
  while (offset + 10 <= body.length) {
    if (body[offset] === 0) break;
    const id = latin1(body.subarray(offset, offset + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size =
      version === 4
        ? decodeSyncsafe(body, offset + 4)
        : decodeUint32(body, offset + 4);
    if (offset + 10 + size > body.length) {
      throw new Error("ID3 frame is truncated, so the file was left unchanged");
    }
    const raw = body.slice(offset, offset + 10 + size);
    frames.push({
      id,
      raw,
      flags: raw.slice(8, 10),
      body: raw.slice(10),
    });
    offset += 10 + size;
  }

  if (offset < body.length && body[offset] !== 0) {
    throw new Error(
      "ID3 tag could not be parsed safely, so the file was left unchanged",
    );
  }

  return {
    version,
    frames,
    audio: data.slice(audioStart),
    tagBodySize,
    hadTag: true,
    hadFooter,
  };
}

function logicalBody(version: 3 | 4, frame: StoredFrame): Uint8Array {
  let body = frame.body;
  if (version === 4 && (frame.flags[1] & 0x02) !== 0) body = deunsync(body);
  if (version === 4 && (frame.flags[1] & 0x01) !== 0) {
    if (body.length < 4)
      throw new Error("ID3 frame is truncated, so the file was left unchanged");
    body = body.subarray(4);
  }
  return body;
}

function isProtected(version: 3 | 4, flags: Uint8Array): boolean {
  if (version === 3) return (flags[1] & 0xe0) !== 0;
  return (flags[1] & 0x4d) !== 0;
}

function deunsync(data: Uint8Array): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(data.length);
  const view = new Uint8Array(buffer);
  let length = 0;
  for (let i = 0; i < data.length; i++) {
    view[length] = data[i];
    length += 1;
    if (data[i] === 0xff && data[i + 1] === 0x00) i += 1;
  }
  return new Uint8Array(buffer, 0, length);
}

function readTextFrame(body: Uint8Array): string | null {
  if (body.length < 1 || body[0] > 3) return null;
  try {
    return readEncoded(body, 1, body[0]).text;
  } catch {
    return null;
  }
}

function readTxxx(
  body: Uint8Array,
): { description: string; value: string } | null {
  if (body.length < 2 || body[0] > 3) return null;
  try {
    const description = readEncoded(body, 1, body[0]);
    const value = readEncoded(body, description.next, body[0]);
    return { description: description.text, value: value.text };
  } catch {
    return null;
  }
}

function sniffImageMime(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "";
}

function readApic(
  body: Uint8Array,
): { mime: string; type: number; bytes: Uint8Array } | null {
  if (body.length < 4 || body[0] > 3) return null;
  try {
    const mimeField = readTerminated(body, 1, 1, latin1);
    if (mimeField.next >= body.length) return null;
    const type = body[mimeField.next];
    const description = readEncoded(body, mimeField.next + 1, body[0]);
    const bytes = body.subarray(description.next);
    if (!bytes.length) return null;
    const declared = mimeField.text.trim().toLowerCase();
    const mime =
      declared.startsWith("image/")
        ? declared
        : sniffImageMime(bytes) ||
          (declared === "jpg" || declared === "jpeg"
            ? "image/jpeg"
            : declared === "png"
              ? "image/png"
              : "");
    if (!mime) return null;
    return { mime, type, bytes };
  } catch {
    return null;
  }
}

function readComm(
  body: Uint8Array,
): { language: string; description: string; text: string } | null {
  if (body.length < 5 || body[0] > 3) return null;
  const language = latin1(body.subarray(1, 4));
  try {
    const description = readEncoded(body, 4, body[0]);
    const text = readEncoded(body, description.next, body[0]);
    return { language, description: description.text, text: text.text };
  } catch {
    return null;
  }
}

function readEncoded(
  data: Uint8Array,
  offset: number,
  encoding: number,
): { text: string; next: number } {
  if (encoding === 0)
    return readTerminated(data, offset, 1, (slice) => latin1(slice));
  if (encoding === 3)
    return readTerminated(data, offset, 1, (slice) => utf8(slice));
  if (encoding === 1) {
    if (
      offset + 1 < data.length &&
      data[offset] === 0xff &&
      data[offset + 1] === 0xfe
    ) {
      return readUtf16(data, offset + 2, true);
    }
    if (
      offset + 1 < data.length &&
      data[offset] === 0xfe &&
      data[offset + 1] === 0xff
    ) {
      return readUtf16(data, offset + 2, false);
    }
    return readUtf16(data, offset, true);
  }
  if (encoding === 2) return readUtf16(data, offset, false);
  throw new Error(`Unsupported ID3 text encoding ${encoding}`);
}

function readTerminated(
  data: Uint8Array,
  offset: number,
  width: number,
  decode: (slice: Uint8Array) => string,
): { text: string; next: number } {
  let end = offset;
  while (end < data.length && data[end] !== 0) end += width;
  const text = decode(data.subarray(offset, end));
  return { text, next: end < data.length ? end + width : end };
}

function readUtf16(
  data: Uint8Array,
  offset: number,
  littleEndian: boolean,
): { text: string; next: number } {
  let end = offset;
  while (end + 1 < data.length && !(data[end] === 0 && data[end + 1] === 0))
    end += 2;
  const units: number[] = [];
  for (let i = offset; i + 1 < end; i += 2) {
    units.push(
      littleEndian
        ? data[i] | (data[i + 1] << 8)
        : (data[i] << 8) | data[i + 1],
    );
  }
  return {
    text: unitsToString(units),
    next: end + 1 < data.length ? end + 2 : end,
  };
}

function buildTxxx(description: string, value: string): Uint8Array {
  const desc = latin1Bytes(description);
  const text = latin1Bytes(value);
  const body = new Uint8Array(1 + desc.length + 1 + text.length + 1);
  body.set(desc, 1);
  body.set(text, 2 + desc.length);
  return body;
}

function buildComm(
  language: string,
  description: string,
  text: string,
): Uint8Array {
  const lang = latin1Bytes(language.padEnd(3, " ").slice(0, 3));
  if (hasUnicode(description) || hasUnicode(text)) {
    const desc = utf16(description, true);
    const value = utf16(text, true);
    const body = new Uint8Array(1 + 3 + desc.length + value.length);
    body[0] = 1;
    body.set(lang, 1);
    body.set(desc, 4);
    body.set(value, 4 + desc.length);
    return body;
  }
  const desc = latin1Bytes(description);
  const value = latin1Bytes(text);
  const body = new Uint8Array(1 + 3 + desc.length + 1 + value.length);
  body.set(lang, 1);
  body.set(desc, 4);
  body.set(value, 5 + desc.length);
  return body;
}

function makeFrame(version: 3 | 4, id: string, body: Uint8Array): StoredFrame {
  const raw = new Uint8Array(10 + body.length);
  raw.set(latin1Bytes(id), 0);
  raw.set(
    version === 4 ? encodeSyncsafe(body.length) : encodeUint32(body.length),
    4,
  );
  raw.set(body, 10);
  return { id, raw, flags: raw.slice(8, 10), body };
}

function buildHeader(
  version: 3 | 4,
  bodySize: number,
  footer: boolean,
): Uint8Array {
  const header = new Uint8Array(10);
  header[0] = 0x49;
  header[1] = 0x44;
  header[2] = 0x33;
  header[3] = version;
  header[5] = footer ? 0x10 : 0;
  header.set(encodeSyncsafe(bodySize), 6);
  return header;
}

function encodeSyncsafe(size: number): Uint8Array {
  return Uint8Array.from([
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f,
  ]);
}

function encodeUint32(size: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, size);
  return bytes;
}

function decodeSyncsafe(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] & 0x7f) << 21) |
    ((data[offset + 1] & 0x7f) << 14) |
    ((data[offset + 2] & 0x7f) << 7) |
    (data[offset + 3] & 0x7f)
  );
}

function decodeUint32(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0);
}

function latin1(data: Uint8Array): string {
  return unitsToString(Array.from(data));
}

function latin1Bytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 255) throw new Error("Text does not fit in Latin-1");
    bytes[i] = code;
  }
  return bytes;
}

function utf8(data: Uint8Array): string {
  return new TextDecoder("utf-8").decode(data);
}

function utf16(text: string, terminated: boolean): Uint8Array {
  const units: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code > 0xffff) {
      const value = code - 0x10000;
      units.push(0xd800 + (value >> 10), 0xdc00 + (value & 0x3ff));
    } else {
      units.push(code);
    }
  }
  const bytes = new Uint8Array(2 + units.length * 2 + (terminated ? 2 : 0));
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < units.length; i++)
    view.setUint16(2 + i * 2, units[i], true);
  return bytes;
}

function hasUnicode(text: string): boolean {
  for (const char of text) {
    if ((char.codePointAt(0) ?? 0) > 255) return true;
  }
  return false;
}

function unitsToString(units: number[]): string {
  let text = "";
  for (let i = 0; i < units.length; i += 4096) {
    text += String.fromCharCode(...units.slice(i, i + 4096));
  }
  return text;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let length = 0;
  for (const part of parts) length += part.length;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
