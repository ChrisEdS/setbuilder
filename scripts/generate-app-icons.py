#!/usr/bin/env python3
"""One-off raster icons from the SETBUILDER mark (dark ground + waveform bars)."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "app"

BG = (0x18, 0x18, 0x18)
BARS = [
    # (x0_frac, y0_frac, w_frac, h_frac, color) — fractions of canvas
    (0.125, 0.625, 0.125, 0.1875, (0x4A, 0x4A, 0x4A)),
    (0.28125, 0.5, 0.125, 0.3125, (0x6A, 0x6A, 0x6A)),
    (0.4375, 0.34375, 0.125, 0.46875, (0x9A, 0x9A, 0x9A)),
    (0.59375, 0.1875, 0.125, 0.625, (0x1E, 0xD7, 0x60)),
    (0.75, 0.46875, 0.125, 0.34375, (0x5A, 0x5A, 0x5A)),
]
RADIUS_FRAC = 14 / 64


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def write_png(path: Path, size: int) -> None:
    w = h = size
    radius = max(1, int(round(size * RADIUS_FRAC)))
    pixels = bytearray()
    for y in range(h):
        pixels.append(0)  # filter type 0
        for x in range(w):
            in_round = _in_rounded_rect(x, y, w, h, radius)
            if not in_round:
                pixels.extend((0, 0, 0, 0))
                continue
            color = BG
            for x0f, y0f, wf, hf, bar in BARS:
                x0 = int(round(x0f * w))
                y0 = int(round(y0f * h))
                bw = max(1, int(round(wf * w)))
                bh = max(1, int(round(hf * h)))
                rx = max(1, bw // 4)
                if _in_rounded_rect(x - x0, y - y0, bw, bh, rx) and 0 <= x - x0 < bw and 0 <= y - y0 < bh:
                    color = bar
                    break
            pixels.extend((*color, 255))

    raw = zlib.compress(bytes(pixels), 9)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    data = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", raw)
        + _png_chunk(b"IEND", b"")
    )
    path.write_bytes(data)


def _in_rounded_rect(px: int, py: int, w: int, h: int, r: int) -> bool:
    if px < 0 or py < 0 or px >= w or py >= h:
        return False
    if px < r and py < r:
        return (px - r) ** 2 + (py - r) ** 2 <= r * r
    if px >= w - r and py < r:
        return (px - (w - r - 1)) ** 2 + (py - r) ** 2 <= r * r
    if px < r and py >= h - r:
        return (px - r) ** 2 + (py - (h - r - 1)) ** 2 <= r * r
    if px >= w - r and py >= h - r:
        return (px - (w - r - 1)) ** 2 + (py - (h - r - 1)) ** 2 <= r * r
    return True


def write_ico(path: Path, sizes: tuple[int, ...]) -> None:
    images: list[tuple[int, bytes]] = []
    for s in sizes:
        png_path = path.with_suffix(f".{s}.tmp.png")
        write_png(png_path, s)
        images.append((s, png_path.read_bytes()))
        png_path.unlink()

    # ICONDIR + ICONDIRENTRY per image + PNG payload
    count = len(images)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count
    entries = bytearray()
    blobs = bytearray()
    for s, data in images:
        w_byte = s if s < 256 else 0
        h_byte = s if s < 256 else 0
        entries.extend(struct.pack("<BBBBHHII", w_byte, h_byte, 0, 0, 1, 32, len(data), offset))
        blobs.extend(data)
        offset += len(data)
    path.write_bytes(header + bytes(entries) + bytes(blobs))


def main() -> None:
    APP.mkdir(parents=True, exist_ok=True)
    write_png(APP / "icon.png", 32)
    write_png(APP / "apple-icon.png", 180)
    write_ico(APP / "favicon.ico", (16, 32))


if __name__ == "__main__":
    main()
