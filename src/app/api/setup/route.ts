import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Nur lokal." }, { status: 403 });
  }
  return NextResponse.json(connectionStatus());
}

export async function POST(request: Request) {
  if (!localRequest(request)) {
    return NextResponse.json({ error: "Nur lokal." }, { status: 403 });
  }
  const body = (await request.json()) as Partial<Record<SecretKey, string>>;
  try {
    return NextResponse.json(saveConnectionSecrets(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
