import { NextResponse } from "next/server";
import { clearTidalUserTokens } from "@/lib/tidal-auth";

export async function POST() {
  await clearTidalUserTokens();
  return NextResponse.json({ ok: true });
}
