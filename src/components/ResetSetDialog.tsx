"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/react";

export function ResetSetDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="stick-dialog reset-set-dialog"
      aria-labelledby="reset-set-title"
      aria-describedby="reset-set-body"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id="reset-set-title">{t("builder.reset.title")}</h2>
      <p id="reset-set-body">{t("builder.reset.body")}</p>
      <div className="stick-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          {t("builder.reset.cancel")}
        </button>
        <button type="button" className="btn danger" onClick={onConfirm}>
          {t("builder.reset.confirm")}
        </button>
      </div>
    </dialog>
  );
}
