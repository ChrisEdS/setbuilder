import type { SVGProps } from "react";
import type { TrackSource } from "@/lib/set";
import { sourceLabel } from "@/lib/music-link";
import { Tip } from "@/components/Hint";

const svgProps: SVGProps<SVGSVGElement> = {
  className: "source-badge-icon",
  viewBox: "0 0 24 24",
  width: 16,
  height: 16,
  "aria-hidden": true,
};

function SourceGlyph({ source }: { source: TrackSource }) {
  switch (source) {
    case "spotify":
      return (
        <svg {...svgProps} fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4c-.2.3-.5.4-.8.2-2.2-1.3-5-1.6-8.3-.9-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 3.6-.8 6.7-.5 9.2 1 .3.2.4.6.3.9Zm1.1-2.5c-.2.4-.6.5-.9.3-2.5-1.5-6.4-2-9.4-1.1-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 3.4-1 7.7-.5 10.6 1.2.3.2.4.6.1 1Zm.1-2.6c-3-1.8-8-2-10.9-1.1-.4.1-.9-.1-1-.6-.1-.4.1-.9.6-1 3.3-1 8.8-.8 12.2 1.2.4.2.5.7.3 1.1-.2.3-.7.5-1.2.4Z" />
        </svg>
      );
    case "tidal":
      return (
        <svg {...svgProps} fill="currentColor">
          <path d="m5.5 10 3-3 3 3-3 3-3-3Zm6.5 0 3-3 3 3-3 3-3-3Zm-3.25 3.25 3-3 3 3-3 3-3-3Z" />
        </svg>
      );
    case "soundcloud":
      return (
        <svg {...svgProps} fill="currentColor">
          <path d="M3.5 14.5v2h1v-3.5h-1v1.5Zm1.8 2h1V11h-1v5.5Zm1.8 0h1V9.8h-1v6.7Zm1.8 0h1V8.8h-1v7.7Zm1.8 0h1V10.5h-1v6Zm1.9 0c2.5.1 4.3-1.6 4.3-3.6S16.2 9 13.8 9c-.5 0-1 .1-1.4.3v7.2Z" />
        </svg>
      );
    case "beatport":
      return (
        <svg {...svgProps} fill="currentColor">
          <path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-2.2 4.6 7 3.9-7 3.9V8.1Z" />
        </svg>
      );
    case "rekordbox":
      // Compact “rb” mark in brand red — clearer than a fake disc logo.
      return (
        <svg {...svgProps} fill="currentColor">
          <path d="M7.2 6.8h4.1c2.1 0 3.4 1.1 3.4 2.9 0 1.3-.7 2.2-1.8 2.6l2.3 4.9h-2.3l-2.1-4.5H9.2v4.5H7.2V6.8Zm2 1.7v2.6h1.8c.9 0 1.5-.5 1.5-1.3s-.6-1.3-1.5-1.3H9.2Z" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M7.5 8h9M7.5 12h9M7.5 16h6" />
        </svg>
      );
  }
}

/** Brand mark for track source — logo only; name lives in the tip / aria-label. */
export function SourceBadge({
  source,
  tip,
  className = "",
  /** Sit inside phrasing content (e.g. a title <span>) — Tip renders as span. */
  inline = false,
}: {
  source: TrackSource | undefined;
  tip: string;
  className?: string;
  inline?: boolean;
}) {
  const resolved: TrackSource = source || "manual";
  const label = sourceLabel(resolved);
  const tipText = tip.trim() ? `${label}. ${tip.trim()}` : label;
  const markClass = ["source-badge", `source-${resolved}`].filter(Boolean).join(" ");
  const mark = (
    <em className={markClass} aria-label={label}>
      <SourceGlyph source={resolved} />
      <span className="sr-only">{label}</span>
    </em>
  );
  if (!tipText) return mark;
  return (
    <Tip text={tipText} className={className} as={inline ? "span" : "div"}>
      {mark}
    </Tip>
  );
}
