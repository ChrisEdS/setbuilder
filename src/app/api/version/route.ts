import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

function packageVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    if (parsed.version?.trim()) return parsed.version.trim();
  } catch {
    /* standalone cwd may differ */
  }
  try {
    const raw = readFileSync(join(__dirname, "../../../../package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    if (parsed.version?.trim()) return parsed.version.trim();
  } catch {
    /* ignore */
  }
  return process.env.npm_package_version?.trim() || "0.0.0";
}

export async function GET() {
  const envVersion = process.env.SETBUILDER_VERSION?.trim();
  const desktop = process.env.SETBUILDER_DESKTOP === "1";
  return NextResponse.json({
    version: envVersion || packageVersion(),
    name: "SETBUILDER",
    desktop,
    channel: desktop ? "desktop" : "web",
    releasesUrl: "https://github.com/ChrisEdS/setbuilder/releases",
  });
}
