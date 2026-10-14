"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type Props = {
  text: string;
  children?: ReactNode;
  className?: string;
  /** Hide the “?” when a nearby empty-state paragraph already explains the same thing. */
  mark?: boolean;
};

/** Visible “?” — hover or tap shows the explanation. Native title is too easy to miss. */
export function Hint({ text, children, className, mark = true }: Props) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !mark) return;
    function onPointer(event: PointerEvent) {
      if (ref.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mark]);

  if (!mark) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      ref={ref}
      className={["tip", "hint", open ? "is-open" : "", className].filter(Boolean).join(" ")}
    >
      {children}
      <button
        type="button"
        className="hint-mark"
        aria-label={text}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        ?
      </button>
      <span className="tip-bubble" role="tooltip" id={id}>
        {text}
      </span>
    </span>
  );
}
