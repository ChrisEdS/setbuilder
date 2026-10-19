"use client";

import { useId, useState } from "react";
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

/** One length field: a short list, or a typed mm:ss / seconds value. Always stores milliseconds. */
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
  const resolved = resolvedOverlapMs(
    { transition: transition ?? "unset", overlapMs },
    blendMs,
  );
  const [editing, setEditing] = useState<string | null>(null);
  const choices = overlapChoicesMs(transition);

  function commit(raw: string) {
    const ms = parseOverlapInput(raw, overlapLimitMs(durationMs));
    setEditing(null);
    if (ms == null || ms === explicitOverlapMs(overlapMs)) return;
    onCommit(ms);
  }

  return (
    <span className="overlap-field">
      <input
        className={className}
        list={listId}
        value={editing ?? formatDuration(resolved)}
        aria-label={ariaLabel}
        title={title}
        autoComplete="off"
        spellCheck={false}
        onFocus={(event) => {
          setEditing(formatDuration(resolved));
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const next = event.target.value;
          const match = choices.find((ms) => formatDuration(ms) === next.trim());
          if (match != null) {
            setEditing(null);
            if (match !== explicitOverlapMs(overlapMs)) onCommit(match);
            return;
          }
          setEditing(next);
        }}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          (event.currentTarget as HTMLInputElement).blur();
        }}
      />
      <datalist id={listId}>
        {choices.map((ms) => (
          <option key={ms} value={formatDuration(ms)} />
        ))}
      </datalist>
    </span>
  );
}
