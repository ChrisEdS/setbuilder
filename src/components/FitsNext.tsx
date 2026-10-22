"use client";

import { useMemo } from "react";
import type { LibraryRow } from "@/components/LibraryPanel";
import { parseKeyValue } from "@/lib/key-import";
import { useI18n } from "@/lib/i18n/react";
import { rankFitsAfter } from "@/lib/replace-track";
import type { SetTrack } from "@/lib/set";

const SHOWN = 4;

/** Same ranking as “Passt zu”, shown on the focused track. */
export function FitsNext({
  rows,
  track,
  onAdd,
}: {
  rows: LibraryRow[];
  track: SetTrack;
  onAdd: (row: LibraryRow) => void;
}) {
  const { t } = useI18n();
  const matches = useMemo(
    () => rankFitsAfter(rows, track, (raw) => parseKeyValue(raw) || raw, t).slice(0, SHOWN),
    [rows, track, t],
  );
  if (!matches.length) return null;
  return (
    <div className="fits-next">
      <span>{t("builder.fitsNext.title")}</span>
      {matches.map((item) => (
        <button
          key={`${item.row.artist}-${item.row.title}`}
          type="button"
          className="btn ghost fits-next-add"
          title={item.text}
          onClick={() => onAdd(item.row)}
        >
          {item.row.title}
          <em>
            {item.row.key || "—"}
            {item.row.bpm ? ` · ${item.row.bpm}` : ""}
          </em>
        </button>
      ))}
    </div>
  );
}
