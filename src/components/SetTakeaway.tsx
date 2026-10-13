"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/react";

function Tip({
  text,
  disabled,
  children,
}: {
  text: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="tip" tabIndex={disabled ? 0 : undefined}>
      {children}
      <span className="tip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

/** A small dropdown on top of <details>: closes on outside click, Escape and after a choice. */
function Menu({
  label,
  ariaLabel,
  primary,
  disabled,
  children,
}: {
  label: ReactNode;
  ariaLabel?: string;
  primary?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(event: Event) {
      const node = ref.current;
      if (!node?.open) return;
      if (event.type === "keydown") {
        if ((event as KeyboardEvent).key !== "Escape") return;
        node.open = false;
        node.querySelector<HTMLElement>("summary")?.focus();
        return;
      }
      if (node.contains(event.target as Node)) return;
      node.open = false;
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  /** Arrow keys move through the items, like any menu. */
  function onKeyDown(event: ReactKeyboardEvent<HTMLDetailsElement>) {
    const node = ref.current;
    if (!node) return;
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const items = [
      ...node.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
    ];
    if (!items.length) return;
    event.preventDefault();
    if (!node.open) node.open = true;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = 0;
    if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length;
    if (event.key === "ArrowUp") next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    if (event.key === "End") next = items.length - 1;
    items[next].focus();
  }

  return (
    <details
      ref={ref}
      className={disabled ? "menu menu-disabled" : "menu"}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
    >
      <summary
        className={primary ? "btn menu-trigger" : "btn ghost menu-trigger"}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-disabled={disabled}
      >
        {label}
      </summary>
      <div
        className="menu-panel"
        role="menu"
        onClick={() => {
          if (ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}

function MenuItem({
  title,
  hint,
  disabled,
  danger,
  onClick,
}: {
  title: string;
  hint: string;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={danger ? "menu-item danger" : "menu-item"}
      disabled={disabled || !onClick}
      onClick={onClick}
    >
      <strong>{title}</strong>
      <span>{hint}</span>
    </button>
  );
}

type ToolsProps = {
  canMatch: boolean;
  matchingLinks?: boolean;
  onMatchLinks?: () => void;
  /** The set-wide edit actions that come before the link search. */
  children?: ReactNode;
};

/** "Set bearbeiten": the actions that change the whole set, in the order you use them. */
export function SetTools({ canMatch, matchingLinks, onMatchLinks, children }: ToolsProps) {
  const { t } = useI18n();
  return (
    <div className="set-tools" role="group" aria-label={t("library.tools.label")}>
      <span className="set-tools-label">{t("library.tools.label")}</span>
      {children}
      <Tip disabled={!canMatch} text={t("library.tools.matchTip")}>
        <button
          type="button"
          className="btn ghost"
          onClick={onMatchLinks}
          disabled={!canMatch || matchingLinks}
        >
          {matchingLinks ? t("library.tools.searching") : t("library.tools.matchLinks")}
        </button>
      </Tip>
    </div>
  );
}

type MenusProps = {
  canExport: boolean;
  onExportPdf?: () => void;
  onExportM3u?: () => void;
  onExportRekordbox?: () => void;
  onWriteStick?: () => void;
  onCopyText?: () => void;
  onReset?: () => void;
};

/** Output and the rare, destructive action, both tucked into menus at the top right. */
export function SetMenus({
  canExport,
  onExportPdf,
  onExportM3u,
  onExportRekordbox,
  onWriteStick,
  onCopyText,
  onReset,
}: MenusProps) {
  const { t } = useI18n();
  return (
    <div className="set-menus">
      <Menu label={<>{t("library.menu.take")} <span aria-hidden="true">▾</span></>} primary disabled={!canExport}>
        <MenuItem
          title="PDF"
          hint={t("library.menu.pdfHint")}
          disabled={!canExport}
          onClick={onExportPdf}
        />
        <MenuItem
          title="rekordbox"
          hint={t("library.menu.rekordboxHint")}
          disabled={!canExport}
          onClick={onExportRekordbox}
        />
        <MenuItem
          title={t("library.menu.stick")}
          hint={t("library.menu.stickHint")}
          disabled={!canExport}
          onClick={onWriteStick}
        />
        <MenuItem
          title="M3U"
          hint={t("library.menu.m3uHint")}
          disabled={!canExport}
          onClick={onExportM3u}
        />
        <MenuItem
          title={t("library.menu.copyText")}
          hint={t("library.menu.copyTextHint")}
          disabled={!canExport}
          onClick={onCopyText}
        />
      </Menu>
      {onReset ? (
        <Menu label={<span aria-hidden="true">…</span>} ariaLabel={t("library.menu.more")}>
          <MenuItem
            title={t("library.menu.reset")}
            hint={t("library.menu.resetHint")}
            danger
            onClick={onReset}
          />
        </Menu>
      ) : null}
    </div>
  );
}
