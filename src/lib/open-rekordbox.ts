/**
 * Find and launch rekordbox on this machine. Used so the stick can be
 * opened as a device and ejected from rekordbox after SETBUILDER writes.
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

export function applicationNames(dir: string, read = readdirSync): string[] {
  try {
    return read(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/** Candidate install paths, first match wins. */
export function rekordboxCandidates(
  platform: string,
  env: NodeJS.ProcessEnv,
  applications: string[] = [],
): string[] {
  if (platform === "darwin") {
    const paths = [
      "/Applications/rekordbox 7.app",
      "/Applications/rekordbox 6.app",
      "/Applications/rekordbox.app",
      "/Applications/rekordbox 7/rekordbox.app",
      "/Applications/rekordbox 6/rekordbox.app",
      "/Applications/rekordbox/rekordbox.app",
    ];
    for (const name of applications) {
      if (/^rekordbox.*\.app$/i.test(name)) paths.push(`/Applications/${name}`);
      else if (/^rekordbox/i.test(name)) paths.push(`/Applications/${name}/rekordbox.app`);
    }
    return [...new Set(paths)];
  }
  if (platform === "win32") {
    const roots = [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA].filter(
      (value): value is string => Boolean(value),
    );
    const names = ["rekordbox 7", "rekordbox 6", "rekordbox"];
    return roots.flatMap((root) => names.map((name) => `${root}\\Pioneer\\${name}\\rekordbox.exe`));
  }
  return [];
}

export function pickExisting(
  paths: string[],
  exists: (path: string) => boolean = existsSync,
): string | null {
  return paths.find((path) => exists(path)) ?? null;
}

export function findRekordboxApp(
  platform = process.platform,
  env = process.env,
): string | null {
  const applications = platform === "darwin" ? applicationNames("/Applications") : [];
  return pickExisting(rekordboxCandidates(platform, env, applications));
}

export function openCommand(
  platform: string,
  appPath: string,
): { command: string; args: string[] } {
  if (platform === "darwin") return { command: "open", args: ["-a", appPath] };
  return { command: appPath, args: [] };
}

export function launchRekordbox(appPath: string, platform = process.platform): void {
  const { command, args } = openCommand(platform, appPath);
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}
