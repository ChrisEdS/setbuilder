"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ActionIcon } from "@/components/ActionIcon";
import type { ComponentProps } from "react";
import { useI18n } from "@/lib/i18n/react";
import type { MessageKey } from "@/lib/i18n/messages";
import { lockBodyScroll } from "@/lib/ui-scroll-lock";

type Props = {
  onClose: () => void;
};

type IconName = ComponentProps<typeof ActionIcon>["name"];

const ROW_ICONS: {
  icon: IconName;
  nameKey: MessageKey;
  tipKey: MessageKey;
}[] = [
  { icon: "play", nameKey: "builder.row.play", tipKey: "builder.row.playTip" },
  { icon: "pause", nameKey: "builder.row.pause", tipKey: "builder.row.pauseTip" },
  { icon: "rehearse", nameKey: "builder.row.rehearse", tipKey: "builder.row.rehearseTip" },
  { icon: "up", nameKey: "builder.row.moveUp", tipKey: "builder.row.moveUpTip" },
  { icon: "down", nameKey: "builder.row.moveDown", tipKey: "builder.row.moveDownTip" },
  { icon: "place", nameKey: "builder.row.placeInSet", tipKey: "builder.row.placeInSetTip" },
  { icon: "exchange", nameKey: "builder.row.exchange", tipKey: "builder.row.exchangeTitle" },
  { icon: "replace", nameKey: "builder.row.replace", tipKey: "builder.row.replaceTitle" },
  { icon: "opener", nameKey: "builder.row.setOpener", tipKey: "builder.row.setOpenerTitle" },
  { icon: "closer", nameKey: "builder.row.setCloser", tipKey: "builder.row.setCloserTitle" },
  { icon: "keep", nameKey: "builder.row.setKeep", tipKey: "builder.row.setKeepTitle" },
  { icon: "pin", nameKey: "builder.row.setPin", tipKey: "builder.row.setPinTitle" },
  { icon: "unsort", nameKey: "builder.row.unsort", tipKey: "builder.row.unsortTip" },
  { icon: "exclude", nameKey: "builder.row.setExclude", tipKey: "builder.row.setExcludeTitle" },
  { icon: "more", nameKey: "builder.list.moreTools", tipKey: "builder.list.moreToolsTip" },
  { icon: "remove", nameKey: "builder.row.remove", tipKey: "builder.row.removeTip" },
];

/** Row action icons in set-list order. Same slide-over panel as the set guide. */
export function SetRowIconsDrawer({ onClose }: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    const unlockScroll = lockBodyScroll();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      returnFocusRef.current?.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="guide-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        id="set-row-icons-guide"
        className="guide-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-row-icons-guide-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="guide-head">
          <h2 id="set-row-icons-guide-title">{t("builder.list.iconsLegendTitle")}</h2>
          <button type="button" className="guide-close" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
        <ul className="icons-legend-list">
          {ROW_ICONS.map(({ icon, nameKey, tipKey }) => (
            <li key={icon} className="icons-legend-item">
              <span className="icons-legend-icon" aria-hidden="true">
                <ActionIcon name={icon} />
              </span>
              <div className="icons-legend-copy">
                <strong>{t(nameKey)}</strong>
                <p>{t(tipKey)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
