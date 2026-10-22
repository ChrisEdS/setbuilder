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
    <div className="fits-next" role="group" aria-label={t("builder.fitsNext.title")}>
      <span>{t("builder.fitsNext.title")}</span>
      {matches.map((item) => {
        const meta = [item.row.key, item.row.bpm].filter(Boolean).join(" · ");
        return (
          <button
            key={`${item.row.artist}-${item.row.title}`}
            type="button"
            className="fits-next-add"
            title={item.text}
            aria-label={t("builder.fitsNext.add", {
              title: meta ? `${item.row.title}, ${meta}` : item.row.title,
            })}
            onClick={() => onAdd(item.row)}
          >
            <span className="fits-next-title">{item.row.title}</span>
            <em>
              {item.row.key || "—"}
              {item.row.bpm ? ` · ${item.row.bpm}` : ""}
            </em>
          </button>
        );
      })}
    </div>
  );
}
