"use client";

import { useEffect } from "react";

/**
 * The desktop window uses a hidden titlebar, so page content otherwise
 * scrolls under the macOS traffic lights. Mark the document when that
 * shell is the one on screen.
 */
export function DesktopFrame() {
  useEffect(() => {
    const ua = navigator.userAgent;
    if (!/Electron/i.test(ua) || !/Mac OS X/i.test(ua)) return;
    document.documentElement.dataset.frame = "mac";
    return () => {
      delete document.documentElement.dataset.frame;
    };
  }, []);
  return null;
}
