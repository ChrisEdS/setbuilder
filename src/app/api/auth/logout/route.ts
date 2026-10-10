import { NextResponse } from "next/server";
import { clearUserTokens } from "@/lib/spotify-auth";

export async function POST() {
  await clearUserTokens();
  return NextResponse.json({ ok: true });
}
