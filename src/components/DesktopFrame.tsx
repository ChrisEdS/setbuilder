"use client";

import { useLayoutEffect } from "react";

/**
 * The desktop window uses a hidden titlebar, so page content otherwise
 * scrolls under the macOS traffic lights. The shell strips "Electron" from
 * the user agent, so the preload bridge is the signal (`platform: "darwin"`).
 *
 * After changing `desktop/electron/preload.js`, restart Electron — hot reload
 * does not re-run the preload script. `main.js` also sets `data-frame="mac"`
 * on dom-ready as a fallback when the bridge is already there.
 */
export function DesktopFrame() {
  useLayoutEffect(() => {
    if (window.setbuilderDesktop?.platform !== "darwin") return;
    document.documentElement.dataset.frame = "mac";
    return () => {
      delete document.documentElement.dataset.frame;
    };
  }, []);
  return null;
}
