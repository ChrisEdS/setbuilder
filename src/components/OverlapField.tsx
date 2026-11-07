"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  explicitOverlapMs,
  formatDuration,
  overlapChoicesMs,
  overlapLimitMs,
  parseOverlapInput,
  resolvedOverlapMs,
  type TransitionVerb,
} from "@/lib/set";

type Props = {
  transition: TransitionVerb | undefined;
  overlapMs?: number;
  blendMs: number;
  durationMs?: number;
  title: string;
  ariaLabel: string;
  className?: string;
  onCommit: (overlapMs: number) => void;
};

type Choice = { ms: number; label: string };

/**
 * Typed overlap, plus the distinct preset lengths.
 * A native datalist filters suggestions to the text already in the field, so a
 * value of 2:00 opened a menu whose only row was 2:00. The list here always
 * shows every preset. The field stays editable (mm:ss or seconds) and stores
 * milliseconds.
 */
export function OverlapField({
  transition,
  overlapMs,
  blendMs,
  durationMs,
  title,
  ariaLabel,
  className,
  onCommit,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const resolved = resolvedOverlapMs(
    { transition: transition ?? "unset", overlapMs },
    blendMs,
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const options = useMemo(() => presetChoices(transition), [transition]);
  const currentLabel = formatDuration(resolved);
  const showMenu = open && options.length > 1 && box != null;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.max(rect.width, 76);
      const height = options.length * 30 + 10;
      const gap = 4;
      const below = rect.bottom + gap;
      const spaceBelow = window.innerHeight - below;
      const top =
        spaceBelow < height && rect.top - gap - height > 8 ? rect.top - gap - height : below;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setBox({ top, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, options.length]);

  function commit(raw: string) {
    const ms = parseOverlapInput(raw, overlapLimitMs(durationMs));
    setEditing(null);
    setOpen(false);
    if (ms == null || ms === explicitOverlapMs(overlapMs)) return;
    onCommit(ms);
  }

  function pick(ms: number) {
    setEditing(null);
    setOpen(false);
    if (ms !== explicitOverlapMs(overlapMs)) onCommit(ms);
  }

  const draft = (editing ?? currentLabel).trim();
  const selectedLabel = options.some((item) => item.label === draft) ? draft : currentLabel;

  return (
    <span className="overlap-field">
      <input
        ref={inputRef}
        className={className}
        value={editing ?? currentLabel}
        aria-label={ariaLabel}
        aria-expanded={showMenu}
        aria-controls={showMenu ? listId : undefined}
        aria-autocomplete="list"
        title={title}
        autoComplete="off"
        spellCheck={false}
        onFocus={(event) => {
          setEditing(currentLabel);
          setOpen(true);
          event.currentTarget.select();
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          const match = options.find((item) => item.label === next.trim());
          if (match) {
            pick(match.ms);
            return;
          }
          setEditing(next);
          setOpen(true);
        }}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setEditing(null);
            setOpen(false);
            return;
          }
          if (event.key !== "Enter") return;
          event.preventDefault();
          event.currentTarget.blur();
        }}
      />
      {showMenu
        ? createPortal(
            <ul
              id={listId}
              className="overlap-choices"
              role="listbox"
              aria-label={ariaLabel}
              style={{ top: box.top, left: box.left, width: box.width }}
            >
              {options.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={item.label === selectedLabel}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(item.ms);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </span>
  );
}

/** Distinct mm:ss presets. A verb default outside the usual set is included once. */
function presetChoices(transition: TransitionVerb | undefined): Choice[] {
  const seen = new Set<string>();
  const choices: Choice[] = [];
  for (const ms of overlapChoicesMs(transition)) {
    const label = formatDuration(ms);
    if (seen.has(label)) continue;
    seen.add(label);
    choices.push({ ms, label });
  }
  return choices;
}
