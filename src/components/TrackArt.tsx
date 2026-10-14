"use client";

import { useState } from "react";

/**
 * Cover that never shows a broken-image icon. Blob URLs from the stick are shown while
 * they live (dead ones are stripped when a draft is read back from storage); anything
 * that fails to load becomes the fallback tile.
 */
export function TrackArt({
  url,
  size = 48,
  className,
  fallbackClassName,
}: {
  url: string | null | undefined;
  size?: number;
  className?: string;
  fallbackClassName?: string;
}) {
  const src = url?.trim() || null;
  const [broken, setBroken] = useState<string | null>(null);
  if (!src || broken === src) {
    return (
      <div
        className={
          fallbackClassName ?? (size <= 44 ? "art-fallback sm" : "art-fallback")
        }
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      draggable={false}
      onError={() => setBroken(src)}
    />
  );
}
