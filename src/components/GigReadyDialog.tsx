"use client";

import { useEffect, useRef } from "react";
import { phaseLabel } from "@/lib/i18n/domain";
import { useI18n } from "@/lib/i18n/react";
import { gigReadyBlocks, type GigCheck } from "@/lib/gig-ready";

export function GigReadyDialog({
  open,
  checks,
  onClose,
  onContinue,
}: {
  open: boolean;
  checks: GigCheck[];
  onClose: () => void;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const blocked = gigReadyBlocks(checks);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  function line(check: GigCheck): string {
    if (check.id === "files") {
      return t(check.severity === "block" ? "builder.ready.filesBlock" : "builder.ready.filesAck", {
        count: check.count,
      });
    }
    if (check.id === "keys") return t("builder.ready.keys", { count: check.count });
    if (check.id === "energy") return t("builder.ready.energy", { count: check.count });
    if (check.id === "planB") {
      const phases = (check.phases ?? [])
        .map((item) =>
          t("builder.ready.planBPhase", {
            phase: phaseLabel(t, item.phase),
            have: item.have,
            need: item.need,
          }),
        )
        .join(", ");
      return t("builder.ready.planB", { phases });
    }
    if (check.id === "player" && check.verdict && check.verdict !== "ready") {
      const playerKey = {
        broken: "builder.ready.player.broken",
        empty: "builder.ready.player.empty",
        needsRekordbox: "builder.ready.player.needsRekordbox",
        hiddenFolder: "builder.ready.player.hiddenFolder",
        incomplete: "builder.ready.player.incomplete",
      } as const;
      return t(playerKey[check.verdict]);
    }
    return t("builder.ready.heard");
  }

  return (
    <dialog
      ref={dialog}
      className="stick-dialog gig-ready-dialog"
      aria-labelledby="gig-ready-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id="gig-ready-title">{t("builder.ready.title")}</h2>
      <p>{t("builder.ready.intro")}</p>
      <ul className="gig-ready-list">
        {checks.map((check) => (
          <li key={check.id} className={check.severity === "block" ? "is-block" : undefined}>
            {check.severity === "block" ? <strong>{t("builder.ready.block")}. </strong> : null}
            {line(check)}
          </li>
        ))}
      </ul>
      <div className="stick-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          {t("builder.ready.close")}
        </button>
        {blocked ? null : (
          <button type="button" className="btn primary" onClick={onContinue}>
            {t("builder.ready.continue")}
          </button>
        )}
      </div>
    </dialog>
  );
}
