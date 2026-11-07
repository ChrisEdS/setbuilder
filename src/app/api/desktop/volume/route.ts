import { connection, NextResponse } from "next/server";
import { requestT } from "@/lib/i18n/server";
import { volumePath } from "@/lib/stick-eject";
import {
  abortAtomicWrite,
  appendAtomicWrite,
  beginAtomicWrite,
  commitAtomicWrite,
  nodeVolumeIo,
  readFileRange,
  resolvePioneerFile,
} from "@/lib/stick-volume-dir";

const CHUNK_LIMIT = 8 * 1024 * 1024;
const WRITE_ID = /^[a-f0-9]{32}$/;

function localRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("127.0.0.1:") || host.startsWith("localhost:");
}

function parentOf(file: string): string {
  const slash = file.lastIndexOf("/");
  if (slash <= 0) return "/";
  return file.slice(0, slash);
}

export async function GET(request: Request) {
  await connection();
  const t = requestT(request);
  if (!localRequest(request)) {
    return NextResponse.json({ error: t("api.setup.localOnly") }, { status: 403 });
  }
  const url = new URL(request.url);
  const abs = resolvePioneerFile(url.searchParams.get("name") ?? "", url.searchParams.get("path") ?? "");
  if (!abs) {
    return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
  }
  const stat = nodeVolumeIo.stat(abs);
  if (!stat || stat.isDirectory) {
    return NextResponse.json({ error: t("api.volume.notFound") }, { status: 404 });
  }
  const range = request.headers.get("range");
  const headers = {
    "Content-Type": "application/octet-stream",
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
  };
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) {
      return NextResponse.json({ error: t("api.volume.badPath") }, { status: 416 });
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) + 1 : stat.size;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= stat.size || end <= start) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}` },
      });
    }
    const bounded = Math.min(end, stat.size);
    const slice = await readFileRange(abs, start, bounded);
    return new NextResponse(Buffer.from(slice), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${start + slice.byteLength - 1}/${stat.size}`,
        "Content-Length": String(slice.byteLength),
      },
    });
  }
  const data = await nodeVolumeIo.readFile(abs);
  return new NextResponse(Buffer.from(data), {
    headers: { ...headers, "Content-Length": String(data.byteLength) },
  });
}

export async function PUT(request: Request) {
  await connection();
  const t = requestT(request);
  if (!localRequest(request)) {
    return NextResponse.json({ error: t("api.setup.localOnly") }, { status: 403 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("op") !== "chunk") {
    return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
  }
  const id = url.searchParams.get("id") ?? "";
  if (!WRITE_ID.test(id)) {
    return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > CHUNK_LIMIT) {
    return NextResponse.json({ error: t("api.volume.failed") }, { status: 413 });
  }
  const ok = await appendAtomicWrite(id, bytes);
  if (!ok) return NextResponse.json({ error: t("api.volume.notFound") }, { status: 404 });
  return NextResponse.json({ ok: true });
}

type VolumeBody = { op?: string; name?: string; path?: string; id?: string };

export async function POST(request: Request) {
  await connection();
  const t = requestT(request);
  if (!localRequest(request)) {
    return NextResponse.json({ error: t("api.setup.localOnly") }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as VolumeBody | null;
  const op = body?.op ?? "";
  try {
    if (op === "write-commit") {
      const id = body?.id ?? "";
      if (!WRITE_ID.test(id) || !(await commitAtomicWrite(id))) {
        return NextResponse.json({ error: t("api.volume.notFound") }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    if (op === "write-abort") {
      const id = body?.id ?? "";
      if (WRITE_ID.test(id)) await abortAtomicWrite(id);
      return NextResponse.json({ ok: true });
    }

    const name = body?.name ?? "";
    const relative = body?.path ?? "";
    if (!volumePath(name)) {
      return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
    }
    const abs = resolvePioneerFile(name, relative);
    if (!abs) {
      return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
    }
    const stat = nodeVolumeIo.stat(abs);

    if (op === "stat") {
      if (!stat) return NextResponse.json({ error: t("api.volume.notFound") }, { status: 404 });
      return NextResponse.json({
        kind: stat.isDirectory ? "dir" : "file",
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      });
    }
    if (op === "entries") {
      if (!stat?.isDirectory) {
        return NextResponse.json({ error: t("api.volume.notFound") }, { status: 404 });
      }
      const entries = nodeVolumeIo
        .readdir(abs)
        .filter((entry) => entry !== "." && entry !== ".." && !/[\\/\0]/.test(entry))
        .map((entry) => {
          const child = nodeVolumeIo.stat(`${abs}/${entry}`);
          return { name: entry, kind: child?.isDirectory ? "dir" : "file" };
        });
      return NextResponse.json({ entries });
    }
    if (op === "mkdir") {
      if (stat?.isDirectory) return NextResponse.json({ ok: true });
      if (stat) return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
      await nodeVolumeIo.mkdir(abs);
      return NextResponse.json({ ok: true });
    }
    if (op === "remove") {
      if (!stat) return NextResponse.json({ ok: true });
      await nodeVolumeIo.remove(abs);
      return NextResponse.json({ ok: true });
    }
    if (op === "write-begin") {
      if (!relative.trim() || stat?.isDirectory) {
        return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
      }
      const parent = nodeVolumeIo.stat(parentOf(abs));
      if (!parent?.isDirectory) {
        return NextResponse.json({ error: t("api.volume.notFound") }, { status: 404 });
      }
      const id = await beginAtomicWrite(abs);
      return NextResponse.json({ id });
    }
    return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
  } catch {
    return NextResponse.json({ error: t("api.volume.failed") }, { status: 500 });
  }
}
