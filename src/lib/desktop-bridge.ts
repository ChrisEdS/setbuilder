/** Types for the Electron preload bridge (SETBUILDER desktop shell). */

export type DesktopUpdateEvent =
  | { type: "checking" }
  | { type: "available"; version: string }
  | { type: "not-available"; version: string }
  | { type: "progress"; percent: number }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string };

export type DesktopInfo = {
  version: string;
  name: string;
  packaged: boolean;
  platform: NodeJS.Platform;
  arch: string;
  electron: string;
  updateSupported: boolean;
};

export type DesktopBridge = {
  getInfo: () => Promise<DesktopInfo>;
  checkForUpdates: () => Promise<{ ok: boolean; message?: string }>;
  downloadUpdate: () => Promise<{ ok: boolean; message?: string }>;
  installUpdate: () => Promise<{ ok: boolean; message?: string }>;
  onUpdateEvent: (callback: (event: DesktopUpdateEvent) => void) => () => void;
};

declare global {
  interface Window {
    setbuilderDesktop?: DesktopBridge;
  }
}

export function desktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  return window.setbuilderDesktop ?? null;
}
