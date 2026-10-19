/**
 * Locate the 45-second energy window in a file without decoding the rest.
 * A full club track in AudioContext is what makes every measurement throw.
 */

import {
  ENERGY_WINDOW_SECONDS,
  energySampleSpan,
} from "./energy";

export type AudioKind = "wav" | "aiff" | "mp3" | "other";

export type WavLayout = {
  format: "pcm" | "float";
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  blockAlign: number;
  dataOffset: number;
  dataSize: number;
};

export type AiffLayout = {
  channels: number;
  frames: number;
  bitsPerSample: number;
  sampleRate: number;
  /** Byte offset of the first sample in the file. */
  dataOffset: number;
  dataSize: number;
  /** Little-endian PCM (AIFC "sowt"). AIFF itself is big-endian. */
  littleEndian: boolean;
};

export type Mp3Probe = {
  audioStart: number;
  sampleRate: number;
  samplesPerFrame: number;
  frameBytes: number;
  avgBytesPerSecond: number;
  durationSeconds: number;
  cbr: boolean;
};

export type ByteRange = { start: number; end: number };

const BITRATE_V1_L1 = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0];
const BITRATE_V1_L2 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0];
const BITRATE_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATE_V2_L1 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0];
const BITRATE_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATE_V1 = [44100, 48000, 32000];
const RATE_V2 = [22050, 24000, 16000];
const RATE_V25 = [11025, 12000, 8000];

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i < length && offset + i < bytes.length; i++) {
    text += String.fromCharCode(bytes[offset + i]);
  }
  return text;
}

function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function u16be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32be(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function writeAscii(out: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) out[offset + i] = text.charCodeAt(i);
}

function writeU16le(out: Uint8Array, offset: number, value: number): void {
  out[offset] = value & 0xff;
  out[offset + 1] = (value >> 8) & 0xff;
}

function writeU32le(out: Uint8Array, offset: number, value: number): void {
  out[offset] = value & 0xff;
  out[offset + 1] = (value >> 8) & 0xff;
  out[offset + 2] = (value >> 16) & 0xff;
  out[offset + 3] = (value >> 24) & 0xff;
}

/** Bytes occupied by an ID3v2 header, including the 10-byte header and optional footer. */
export function id3v2Size(bytes: Uint8Array): number {
  if (bytes.length < 10) return 0;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0;
  if ((bytes[3] !== 3 && bytes[3] !== 4) || (bytes[5] & 0x80) !== 0) return 0;
  const size =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);
  const footer = bytes[3] === 4 && (bytes[5] & 0x10) !== 0 ? 10 : 0;
  return 10 + size + footer;
}

/** How much of the file the ID3 parser needs. Energy tags sit at the front. */
export function id3PrefixLength(header: Uint8Array, fileSize: number): number {
  const tag = id3v2Size(header);
  // Artwork can pad a tag, but a multi-megabyte claim must not pull in the audio.
  const cap = 8 * 1024 * 1024;
  if (tag > 0) return Math.min(fileSize, tag, cap);
  return Math.min(fileSize, 10);
}

export function sniffAudio(prefix: Uint8Array, name = ""): AudioKind {
  if (prefix.length >= 12 && ascii(prefix, 0, 4) === "RIFF" && ascii(prefix, 8, 4) === "WAVE") {
    return "wav";
  }
  if (prefix.length >= 12 && ascii(prefix, 0, 4) === "FORM") {
    const form = ascii(prefix, 8, 4);
    if (form === "AIFF" || form === "AIFC") return "aiff";
  }
  if (id3v2Size(prefix) > 0 || findMp3Frame(prefix, 0) >= 0) return "mp3";
  const folded = name.toLowerCase();
  if (folded.endsWith(".mp3") || folded.endsWith(".mp2")) return "mp3";
  if (folded.endsWith(".wav") || folded.endsWith(".wave")) return "wav";
  if (folded.endsWith(".aif") || folded.endsWith(".aiff") || folded.endsWith(".aifc")) {
    return "aiff";
  }
  return "other";
}

type Mp3Frame = {
  bitrateKbps: number;
  sampleRate: number;
  samplesPerFrame: number;
  frameBytes: number;
  mpeg1: boolean;
  mono: boolean;
};

function bitrateKbps(mpeg1: boolean, layer: 1 | 2 | 3, index: number): number {
  if (layer === 1) return (mpeg1 ? BITRATE_V1_L1 : BITRATE_V2_L1)[index] ?? 0;
  if (layer === 2) return (mpeg1 ? BITRATE_V1_L2 : BITRATE_V2_L3)[index] ?? 0;
  return (mpeg1 ? BITRATE_V1_L3 : BITRATE_V2_L3)[index] ?? 0;
}

function mp3Frame(bytes: Uint8Array, offset: number): Mp3Frame | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  const b0 = bytes[offset];
  const b1 = bytes[offset + 1];
  const b2 = bytes[offset + 2];
  const b3 = bytes[offset + 3];
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return null;
  const versionBits = (b1 >> 3) & 0x3;
  const layerBits = (b1 >> 1) & 0x3;
  if (versionBits === 1 || layerBits === 0) return null;
  const bitrateIndex = (b2 >> 4) & 0xf;
  const rateIndex = (b2 >> 2) & 0x3;
  const padding = (b2 >> 1) & 0x1;
  if (bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const mpeg1 = versionBits === 3;
  const mpeg25 = versionBits === 0;
  const layer = (layerBits === 3 ? 1 : layerBits === 2 ? 2 : 3) as 1 | 2 | 3;
  const sampleRate = mpeg1
    ? RATE_V1[rateIndex]
    : mpeg25
      ? RATE_V25[rateIndex]
      : RATE_V2[rateIndex];
  const bitrate = bitrateKbps(mpeg1, layer, bitrateIndex);
  if (!bitrate || !sampleRate) return null;
  let frameBytes: number;
  let samplesPerFrame: number;
  if (layer === 1) {
    samplesPerFrame = 384;
    frameBytes = Math.floor((12 * bitrate * 1000) / sampleRate + padding) * 4;
  } else {
    samplesPerFrame = mpeg1 ? 1152 : 576;
    const coeff = mpeg1 ? 144 : 72;
    frameBytes = Math.floor((coeff * bitrate * 1000) / sampleRate + padding);
  }
  if (frameBytes < 4) return null;
  const mono = ((b3 >> 6) & 0x3) === 3;
  return { bitrateKbps: bitrate, sampleRate, samplesPerFrame, frameBytes, mpeg1, mono };
}

/** Offset of the first frame whose next frame also syncs, or -1. */
export function findMp3Frame(bytes: Uint8Array, from = 0): number {
  const limit = Math.min(bytes.length - 4, from + 8192);
  for (let i = Math.max(0, from); i <= limit; i++) {
    const frame = mp3Frame(bytes, i);
    if (!frame) continue;
    const next = i + frame.frameBytes;
    if (next + 4 <= bytes.length && !mp3Frame(bytes, next)) continue;
    return i;
  }
  return -1;
}

function xingFrameCount(bytes: Uint8Array, offset: number, frame: Mp3Frame): number | null {
  const side = frame.mpeg1 ? (frame.mono ? 17 : 32) : frame.mono ? 9 : 17;
  const tagAt = offset + 4 + side;
  if (tagAt + 16 > bytes.length) return null;
  const tag = ascii(bytes, tagAt, 4);
  if (tag !== "Xing" && tag !== "Info") return null;
  const flags = u32be(bytes, tagAt + 4);
  if ((flags & 0x1) === 0) return null;
  const frames = u32be(bytes, tagAt + 8);
  return frames > 0 ? frames : null;
}

/**
 * Bitrate and duration from the first frames after `audioStart`.
 * `prefix` is the bytes beginning at audioStart, not the whole file.
 */
export function probeMp3(
  prefix: Uint8Array,
  fileSize: number,
  audioStart: number,
): Mp3Probe | null {
  const at = findMp3Frame(prefix, 0);
  if (at < 0) return null;
  const frame = mp3Frame(prefix, at);
  if (!frame) return null;
  const audioBytes = Math.max(0, fileSize - audioStart);
  const frames = xingFrameCount(prefix, at, frame);
  const nominal = (frame.bitrateKbps * 1000) / 8;
  let durationSeconds: number;
  let avgBytesPerSecond: number;
  let cbr: boolean;
  if (frames != null) {
    durationSeconds = (frames * frame.samplesPerFrame) / frame.sampleRate;
    avgBytesPerSecond = durationSeconds > 0 ? audioBytes / durationSeconds : nominal;
    const tag = ascii(
      prefix,
      at + 4 + (frame.mpeg1 ? (frame.mono ? 17 : 32) : frame.mono ? 9 : 17),
      4,
    );
    cbr = tag === "Info";
  } else {
    avgBytesPerSecond = nominal;
    durationSeconds = avgBytesPerSecond > 0 ? audioBytes / avgBytesPerSecond : 0;
    cbr = true;
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  return {
    audioStart,
    sampleRate: frame.sampleRate,
    samplesPerFrame: frame.samplesPerFrame,
    frameBytes: frame.frameBytes,
    avgBytesPerSecond,
    durationSeconds,
    cbr,
  };
}

/**
 * Byte range of the energy window. Null when the whole file is already
 * shorter than the window and should be decoded as-is.
 */
export function mp3WindowRange(probe: Mp3Probe, fileSize: number): ByteRange | null {
  if (probe.durationSeconds <= ENERGY_WINDOW_SECONDS) return null;
  const totalFrames = Math.floor(probe.durationSeconds * probe.sampleRate);
  const span = energySampleSpan(totalFrames, probe.sampleRate);
  if (!span) return null;
  const startTime = span.start / probe.sampleRate;
  let start: number;
  if (probe.cbr && probe.frameBytes > 0 && probe.samplesPerFrame > 0) {
    const index = Math.max(
      0,
      Math.floor((startTime * probe.sampleRate) / probe.samplesPerFrame),
    );
    start = probe.audioStart + index * probe.frameBytes;
  } else {
    start = probe.audioStart + Math.floor(startTime * probe.avgBytesPerSecond);
  }
  const end = Math.min(
    fileSize,
    start + Math.ceil(ENERGY_WINDOW_SECONDS * probe.avgBytesPerSecond) + probe.frameBytes,
  );
  if (start < 0 || end <= start) return null;
  return { start, end };
}

export function parseWavLayout(prefix: Uint8Array): WavLayout | null {
  if (prefix.length < 12) return null;
  if (ascii(prefix, 0, 4) !== "RIFF" || ascii(prefix, 8, 4) !== "WAVE") return null;
  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let blockAlign = 0;
  let format: "pcm" | "float" = "pcm";
  let dataOffset = 0;
  let dataSize = 0;
  let foundFmt = false;
  let foundData = false;
  while (offset + 8 <= prefix.length) {
    const id = ascii(prefix, offset, 4);
    const size = u32le(prefix, offset + 4);
    const body = offset + 8;
    if (body > prefix.length || size > 0x7fffffff) return null;
    if (id === "fmt " && body + 16 <= prefix.length) {
      let audioFormat = u16le(prefix, body);
      channels = u16le(prefix, body + 2);
      sampleRate = u32le(prefix, body + 4);
      blockAlign = u16le(prefix, body + 12);
      bitsPerSample = u16le(prefix, body + 14);
      if (audioFormat === 0xfffe) {
        // WAVE_FORMAT_EXTENSIBLE stores the real format at the start of SubFormat.
        if (size < 40 || body + 40 > prefix.length) return null;
        audioFormat = u16le(prefix, body + 24);
      }
      if (audioFormat !== 1 && audioFormat !== 3) return null;
      if (
        ![8, 16, 24, 32].includes(bitsPerSample) ||
        (audioFormat === 3 && bitsPerSample !== 32) ||
        blockAlign !== channels * (bitsPerSample / 8)
      ) {
        return null;
      }
      format = audioFormat === 3 ? "float" : "pcm";
      foundFmt = true;
    }
    if (id === "data") {
      dataOffset = body;
      dataSize = size;
      foundData = true;
      break;
    }
    const step = size + (size % 2);
    const next = body + step;
    if (!Number.isSafeInteger(next) || next <= offset || next > prefix.length) {
      return null;
    }
    offset = next;
  }
  if (!foundFmt || !foundData || sampleRate <= 0 || channels <= 0 || blockAlign <= 0) {
    return null;
  }
  return {
    format,
    channels,
    sampleRate,
    bitsPerSample,
    blockAlign,
    dataOffset,
    dataSize,
  };
}

export function pcmWindowRange(
  dataOffset: number,
  dataBytes: number,
  sampleRate: number,
  blockAlign: number,
): (ByteRange & { positioned: boolean }) | null {
  if (blockAlign <= 0 || dataBytes < blockAlign) return null;
  const totalFrames = Math.floor(dataBytes / blockAlign);
  const span = energySampleSpan(totalFrames, sampleRate);
  if (!span) {
    const end = dataOffset + totalFrames * blockAlign;
    return { start: dataOffset, end, positioned: false };
  }
  const start = dataOffset + span.start * blockAlign;
  const end = start + span.count * blockAlign;
  return { start, end, positioned: true };
}

export function buildPcmWav(options: {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  pcm: Uint8Array;
  format?: "pcm" | "float";
}): Uint8Array {
  const { channels, sampleRate, bitsPerSample, pcm, format = "pcm" } = options;
  const blockAlign = Math.max(1, channels * Math.ceil(bitsPerSample / 8));
  const byteRate = sampleRate * blockAlign;
  const out = new Uint8Array(44 + pcm.length);
  writeAscii(out, 0, "RIFF");
  writeU32le(out, 4, 36 + pcm.length);
  writeAscii(out, 8, "WAVE");
  writeAscii(out, 12, "fmt ");
  writeU32le(out, 16, 16);
  writeU16le(out, 20, format === "float" ? 3 : 1);
  writeU16le(out, 22, channels);
  writeU32le(out, 24, sampleRate);
  writeU32le(out, 28, byteRate);
  writeU16le(out, 32, blockAlign);
  writeU16le(out, 34, bitsPerSample);
  writeAscii(out, 36, "data");
  writeU32le(out, 40, pcm.length);
  out.set(pcm, 44);
  return out;
}

/** 80-bit SANE float, used by AIFF sample rates. */
export function extended80(bytes: Uint8Array, offset: number): number {
  if (offset + 10 > bytes.length) return 0;
  const sign = (bytes[offset] & 0x80) !== 0;
  const exponent = ((bytes[offset] & 0x7f) << 8) | bytes[offset + 1];
  let mantissa = 0;
  for (let i = 0; i < 8; i++) mantissa = mantissa * 256 + bytes[offset + 2 + i];
  if (exponent === 0 && mantissa === 0) return 0;
  const value = mantissa * 2 ** (exponent - 16383 - 63);
  return sign ? -value : value;
}

export function parseAiffLayout(prefix: Uint8Array): AiffLayout | null {
  if (prefix.length < 12) return null;
  if (ascii(prefix, 0, 4) !== "FORM") return null;
  const form = ascii(prefix, 8, 4);
  if (form !== "AIFF" && form !== "AIFC") return null;
  let offset = 12;
  let channels = 0;
  let frames = 0;
  let bitsPerSample = 0;
  let sampleRate = 0;
  let littleEndian = false;
  let foundComm = false;
  let dataOffset = 0;
  let dataSize = 0;
  let foundData = false;
  while (offset + 8 <= prefix.length) {
    const id = ascii(prefix, offset, 4);
    const size = u32be(prefix, offset + 4);
    const body = offset + 8;
    if (id === "COMM" && body + 18 <= prefix.length) {
      channels = u16be(prefix, body);
      frames = u32be(prefix, body + 2);
      bitsPerSample = u16be(prefix, body + 6);
      sampleRate = Math.round(extended80(prefix, body + 8));
      if (form === "AIFC" && body + 22 <= prefix.length) {
        const compression = ascii(prefix, body + 18, 4);
        if (compression === "sowt") littleEndian = true;
        else if (compression !== "NONE" && compression !== "twos" && compression !== "raw ") {
          return null;
        }
      }
      foundComm = true;
    }
    if (id === "SSND" && body + 8 <= prefix.length) {
      const soundOffset = u32be(prefix, body);
      dataOffset = body + 8 + soundOffset;
      dataSize = Math.max(0, size - 8 - soundOffset);
      foundData = true;
      break;
    }
    const step = size + (size % 2);
    offset = body + step;
  }
  if (
    !foundComm ||
    !foundData ||
    channels <= 0 ||
    sampleRate <= 0 ||
    (bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 8)
  ) {
    return null;
  }
  return {
    channels,
    frames,
    bitsPerSample,
    sampleRate,
    dataOffset,
    dataSize,
    littleEndian,
  };
}

export function swapEndianPcm(pcm: Uint8Array, bytesPerSample: number): Uint8Array {
  if (bytesPerSample <= 1) return pcm;
  const out = new Uint8Array(pcm.length - (pcm.length % bytesPerSample));
  for (let i = 0; i + bytesPerSample <= pcm.length; i += bytesPerSample) {
    for (let b = 0; b < bytesPerSample; b++) {
      out[i + b] = pcm[i + bytesPerSample - 1 - b];
    }
  }
  return out;
}
