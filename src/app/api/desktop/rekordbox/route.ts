import { NextResponse } from "next/server";
import { requestT } from "@/lib/i18n/server";
import { findRekordboxApp, launchRekordbox } from "@/lib/open-rekordbox";

function localRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("127.0.0.1:") || host.startsWith("localhost:");
}

export async function GET(request: Request) {
  if (!localRequest(request)) {
    return NextResponse.json({ error: requestT(request)("api.setup.localOnly") }, { status: 403 });
  }
  const path = findRekordboxApp();
  return NextResponse.json({ available: Boolean(path) });
}

export async function POST(request: Request) {
  const t = requestT(request);
  if (!localRequest(request)) {
    return NextResponse.json({ error: t("api.setup.localOnly") }, { status: 403 });
  }
  const path = findRekordboxApp();
  if (!path) {
    return NextResponse.json({ error: t("api.rekordbox.notFound"), opened: false }, { status: 404 });
  }
  try {
    launchRekordbox(path);
    return NextResponse.json({ opened: true });
  } catch {
    return NextResponse.json({ error: t("api.rekordbox.openFailed"), opened: false }, { status: 500 });
  }
}
