"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/react";

export function PlaylistLoadDialog({
  name,
  open,
  onClose,
  onReplace,
  onMerge,
}: {
  name: string;
  open: boolean;
  onClose: () => void;
  onReplace: () => void;
  onMerge: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  // Keep the last playlist name while `name` clears on close, so the title
  // does not blank before the dialog finishes closing.
  const [shownName, setShownName] = useState(name);
  if (name && name !== shownName) setShownName(name);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      // Keep Enter off Replace. The dialog itself takes focus; the buttons stay in order.
      node.focus();
    }
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="stick-dialog playlist-load-dialog"
      aria-labelledby="playlist-load-title"
      aria-describedby="playlist-load-body"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id="playlist-load-title">
        {t("builder.playlist.confirmTitle", { name: shownName })}
      </h2>
      <div className="stick-write-copy">
        <p id="playlist-load-body" className="modal-status">
          {t("builder.playlist.confirmBody")}
        </p>
        <p className="modal-next">{t("builder.playlist.confirmNext")}</p>
      </div>
      <div className="stick-actions">
        <button type="button" className="btn danger" onClick={onReplace}>
          {t("builder.playlist.replace")}
        </button>
        <button type="button" className="btn" onClick={onMerge}>
          {t("builder.playlist.merge")}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          {t("builder.playlist.cancel")}
        </button>
      </div>
    </dialog>
  );
}
