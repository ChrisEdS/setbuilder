"use client";

import { useState } from "react";
import { usableImageUrl } from "@/lib/media";

/** Cover that never shows a broken-image icon. Dead blob URLs become the fallback tile. */
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
  const src = usableImageUrl(url);
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
