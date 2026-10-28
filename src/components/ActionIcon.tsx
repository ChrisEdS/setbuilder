import type { ReactNode, SVGProps } from "react";

type ActionIconName =
  | "play"
  | "pause"
  | "up"
  | "down"
  | "energy"
  | "replace"
  | "exchange"
  | "opener"
  | "closer"
  | "pin"
  | "exclude"
  | "rehearse"
  | "remove";

const svgProps: SVGProps<SVGSVGElement> = {
  className: "action-icon",
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  "aria-hidden": true,
};

export function ActionIcon({ name }: { name: ActionIconName }) {
  if (name === "play") {
    return (
      <svg {...svgProps} data-icon="play" fill="currentColor">
        <path d="M9 6.8v10.4L18 12 9 6.8Z" />
      </svg>
    );
  }
  if (name === "pause") {
    return (
      <svg {...svgProps} data-icon="pause" fill="currentColor">
        <path d="M8 6h2.75v12H8V6Zm5.25 0H16v12h-2.75V6Z" />
      </svg>
    );
  }

  const strokes: Record<
    Exclude<ActionIconName, "play" | "pause">,
    ReactNode
  > = {
    up: <path d="m7.5 11 4.5-4.5L16.5 11M12 7v11" />,
    down: <path d="m7.5 13 4.5 4.5L16.5 13M12 17V6" />,
    energy: <path d="m13 3-7 10.5h6.25L11.5 21 19 10.5h-6.25L13 3Z" />,
    replace: (
      <>
        <path d="M19.5 7.5H9" />
        <path d="m16.5 4.5 3 3-3 3" />
        <path d="M4.5 16.5H15" />
        <path d="m7.5 13.5-3 3 3 3" />
      </>
    ),
    exchange: (
      <>
        <path d="M7 8h11" />
        <path d="m15 5 3 3-3 3" />
        <path d="M17 16H6" />
        <path d="m9 13-3 3 3 3" />
      </>
    ),
    opener: (
      <>
        <path d="M7 21V4" />
        <path d="M7 5h10l-2.4 3.4L17 12H7" />
      </>
    ),
    closer: (
      <>
        <path d="M7 21V4" />
        <path d="M7 4h12v8H7z" />
        <path d="M7 4h6v4H7z" fill="currentColor" stroke="none" />
        <path d="M13 8h6v4h-6z" fill="currentColor" stroke="none" />
      </>
    ),
    pin: (
      <>
        <path d="M9 10.5 12 4l3 6.5" />
        <path d="M8 10.5h8" />
        <path d="M12 10.5V20" />
      </>
    ),
    exclude: (
      <>
        <circle cx="12" cy="12" r="7.25" />
        <path d="M8 8l8 8" />
      </>
    ),
    rehearse: (
      <>
        <path d="M5 8h5" />
        <path d="M9.5 12h5" />
        <path d="M14 16h5" />
        <path d="M10 8v4M14 12v4" />
      </>
    ),
    remove: (
      <>
        <path d="M5 7h14" />
        <path d="M9.5 7V5h5v2" />
        <path d="m8 7 .8 12.5h6.4L16 7" />
        <path d="M10.5 11v5M13.5 11v5" />
      </>
    ),
  };

  return (
    <svg
      {...svgProps}
      data-icon={name}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {strokes[name]}
    </svg>
  );
}
