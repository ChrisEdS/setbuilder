import { NextResponse } from "next/server";
import { requestT } from "@/lib/i18n/server";
import { isPioneerVolume, repairCommand, runRepairVolume, volumePath } from "@/lib/stick-eject";

function localRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("127.0.0.1:") || host.startsWith("localhost:");
}

export async function POST(request: Request) {
  const t = requestT(request);
  if (!localRequest(request)) {
    return NextResponse.json({ error: t("api.setup.localOnly") }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const path = volumePath(body?.name ?? "");
  if (!path) {
    return NextResponse.json({ error: t("api.repair.badVolume"), repaired: false }, { status: 400 });
  }
  if (!isPioneerVolume(path)) {
    return NextResponse.json({ error: t("api.repair.notPioneer"), repaired: false }, { status: 404 });
  }
  if (!repairCommand(process.platform, path)) {
    return NextResponse.json({ error: t("api.repair.unsupported"), repaired: false }, { status: 400 });
  }
  try {
    await runRepairVolume(path);
    return NextResponse.json({ repaired: true });
  } catch {
    return NextResponse.json({ error: t("api.repair.failed"), repaired: false }, { status: 500 });
  }
}
