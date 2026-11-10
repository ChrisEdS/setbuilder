import { connection, NextResponse } from "next/server";
import { requestT } from "@/lib/i18n/server";
import { nodeVolumeIo, resolvePioneerFile } from "@/lib/stick-volume-dir";
import {
  artworkContentType,
  isSafeVolumeName,
  stickArtworkCandidates,
} from "@/lib/stick-volumes";

function localRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("127.0.0.1:") || host.startsWith("localhost:");
}

/** JPEG (or other image) from the mounted stick. Tries the larger `_m` file first. */
export async function GET(request: Request) {
  await connection();
  const t = requestT(request);
  if (!localRequest(request)) {
    return NextResponse.json({ error: t("api.setup.localOnly") }, { status: 403 });
  }
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const candidates = stickArtworkCandidates(url.searchParams.get("path") ?? "");
  if (!isSafeVolumeName(name) || candidates.length === 0) {
    return NextResponse.json({ error: t("api.volume.badPath") }, { status: 400 });
  }
  for (const relative of candidates) {
    const abs = resolvePioneerFile(name, relative);
    if (!abs) continue;
    const stat = nodeVolumeIo.stat(abs);
    if (!stat || stat.isDirectory) continue;
    const type = artworkContentType(relative);
    if (!type) continue;
    const data = await nodeVolumeIo.readFile(abs);
    return new NextResponse(Buffer.from(data), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json({ error: t("api.volume.notFound") }, { status: 404 });
}
