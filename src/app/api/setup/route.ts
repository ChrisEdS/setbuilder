import { NextResponse } from "next/server";
import { errorText } from "@/lib/i18n/error";
import { requestT } from "@/lib/i18n/server";
import {
  connectionStatus,
  saveConnectionSecrets,
  type SecretKey,
} from "@/lib/local-config";

function localRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("127.0.0.1:") || host.startsWith("localhost:");
}

export async function GET(request: Request) {
  if (!localRequest(request)) {
    return NextResponse.json({ error: requestT(request)("api.setup.localOnly") }, { status: 403 });
  }
  return NextResponse.json(connectionStatus());
}

export async function POST(request: Request) {
  const t = requestT(request);
  if (!localRequest(request)) {
    return NextResponse.json({ error: t("api.setup.localOnly") }, { status: 403 });
  }
  const body = (await request.json()) as Partial<Record<SecretKey, string>>;
  try {
    return NextResponse.json(saveConnectionSecrets(body));
  } catch (error) {
    return NextResponse.json(
      { error: errorText(error, t, "api.setup.saveFailed") },
      { status: 400 },
    );
  }
}
