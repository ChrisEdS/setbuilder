import { NextResponse } from "next/server";
import { createTidalAuthorizeUrl } from "@/lib/tidal-auth";

export async function GET() {
  try {
    return NextResponse.redirect(await createTidalAuthorizeUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tidal login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
