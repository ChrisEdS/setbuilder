"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { Tip } from "@/components/Hint";
import { useI18n } from "@/lib/i18n/react";
import { energyMenuGate } from "@/lib/energy-menu";
import { SET_SORTS } from "@/lib/sort-set";
import type { SetSortTechnique } from "@/lib/sort-set";

/** A small dropdown on top of <details>: closes on outside click, Escape and after a choice. */
function Menu({
  label,
  ariaLabel,
  primary,
  disabled,
  className,
  title,
  plain,
  children,
}: {
  label: ReactNode;
  ariaLabel?: string;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  /** Row pills, not the large toolbar button. */
  plain?: boolean;
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
      ...node.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)',
      ),
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
      className={["menu", disabled ? "menu-disabled" : "", className].filter(Boolean).join(" ")}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
    >
      <summary
        className={
          plain ? "menu-trigger" : primary ? "btn menu-trigger" : "btn ghost menu-trigger"
        }
        aria-label={ariaLabel}
        title={title}
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
  primary,
  onClick,
}: {
  title: string;
  hint: string;
  disabled?: boolean;
  danger?: boolean;
  /** Emphasize the main takeaway action (usually stick write). */
  primary?: boolean;
  onClick?: () => void;
}) {
  const className = [
    "menu-item",
    danger ? "danger" : "",
    primary ? "is-primary" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      disabled={disabled || !onClick}
      onClick={onClick}
    >
      <strong>{title}</strong>
      <span>{hint}</span>
    </button>
  );
}

function MenuGroup({ label }: { label: string }) {
  return (
    <p className="menu-group" role="presentation">
      {label}
    </p>
  );
}

export function SetEnergyMenu({
  busy,
  stickReady,
  fileCount,
  missingCount,
  knownCount,
  onChooseStick,
  onReadTags,
  onMeasureMissing,
  onMeasureAll,
  onWrite,
}: {
  busy?: boolean;
  stickReady: boolean;
  fileCount: number;
  missingCount: number;
  knownCount: number;
  /** Existing stick picker. Shown only when the stick itself is missing. */
  onChooseStick?: () => void;
  onReadTags: () => void;
  onMeasureMissing: () => void;
  onMeasureAll: () => void;
  onWrite: () => void;
}) {
  const { t } = useI18n();
  const gate = energyMenuGate({ stickReady, fileCount });
  const locked = Boolean(busy);
  return (
    <Menu
      label={
        <>
          {busy ? t("builder.tool.energyBusy") : t("builder.tool.energy")}{" "}
          <span aria-hidden="true">▾</span>
        </>
      }
      ariaLabel={t("builder.tool.energy")}
      title={locked ? t("builder.tool.energyBusy") : undefined}
      disabled={locked}
    >
      {gate === "stick" ? (
        <>
          <p className="menu-prereq" role="presentation">
            {t("builder.energy.noStick")}
          </p>
          {onChooseStick ? (
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={onChooseStick}
            >
              <strong>{t("library.stick.choose")}</strong>
            </button>
          ) : null}
        </>
      ) : gate === "files" ? (
        <p className="menu-prereq" role="presentation">
          {t("builder.energy.noFile")}
        </p>
      ) : (
        <>
          <MenuItem
            title={t("builder.energy.menu.read")}
            hint={t("builder.energy.menu.readHint", { count: fileCount })}
            disabled={fileCount === 0}
            onClick={onReadTags}
          />
          <MenuItem
            title={t("builder.energy.menu.missing")}
            hint={t("builder.energy.menu.missingHint", { count: missingCount })}
            disabled={missingCount === 0}
            onClick={onMeasureMissing}
          />
          <MenuItem
            title={t("builder.energy.menu.all")}
            hint={t("builder.energy.menu.allHint", { count: fileCount })}
            disabled={fileCount === 0}
            onClick={onMeasureAll}
          />
          <MenuItem
            title={t("builder.energy.menu.write")}
            hint={t("builder.energy.menu.writeHint", { count: knownCount })}
            disabled={knownCount === 0}
            onClick={onWrite}
          />
        </>
      )}
    </Menu>
  );
}

/** Per-track control: measure the file again, or set the level by hand. */
export function TrackEnergyMenu({
  name,
  busy,
  level,
  onMeasure,
  onSetLevel,
}: {
  name: string;
  busy?: boolean;
  level?: number;
  onMeasure: () => void;
  onSetLevel: (level: number) => void;
}) {
  const { t } = useI18n();
  return (
    <Tip text={t("builder.row.energyRedoTip")}>
      <Menu
        className="track-energy"
        plain
        label={<ActionIcon name="energy" />}
        ariaLabel={t("builder.row.energyRedoAria", { name })}
      >
        <MenuItem
          title={t("builder.row.energyMenu.measure")}
          hint={t("builder.row.energyRedoTip")}
          disabled={busy}
          onClick={onMeasure}
        />
        <MenuGroup label={t("builder.row.energyMenu.set")} />
        <div
          className="energy-level-pick"
          role="group"
          aria-label={t("builder.row.energyMenu.set")}
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={level === value}
              aria-label={t("builder.row.energy", { level: value })}
              onClick={() => onSetLevel(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </Menu>
    </Tip>
  );
}

export function SetSortMenu({
  disabled,
  onSort,
}: {
  disabled?: boolean;
  onSort: (technique: SetSortTechnique) => void;
}) {
  const { t } = useI18n();
  return (
    <Menu
      label={
        <>
          {t("builder.tool.sort")} <span aria-hidden="true">▾</span>
        </>
      }
      disabled={disabled}
    >
      {SET_SORTS.map((id) => (
        <MenuItem
          key={id}
          title={t(`builder.sort.${id}`)}
          hint={t(`builder.sort.${id}Hint`)}
          disabled={disabled}
          onClick={() => onSort(id)}
        />
      ))}
    </Menu>
  );
}

type ToolsProps = {
  canMatch: boolean;
  matchingLinks?: boolean;
  onMatchLinks?: () => void;
  /** The set-wide edit actions that come before the link search. */
  children?: ReactNode;
  /** Far-right actions (e.g. reset). */
  trailing?: ReactNode;
};

/** "Set bearbeiten": the actions that change the whole set, in the order you use them. */
export function SetTools({
  canMatch,
  matchingLinks,
  onMatchLinks,
  children,
  trailing,
}: ToolsProps) {
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
      {trailing}
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
};

/** Export actions tucked into a menu at the top right. */
export function SetMenus({
  canExport,
  onExportPdf,
  onExportM3u,
  onExportRekordbox,
  onWriteStick,
  onCopyText,
}: MenusProps) {
  const { t } = useI18n();
  return (
    <div className="set-menus">
      <Menu label={<>{t("library.menu.take")} <span aria-hidden="true">▾</span></>} primary disabled={!canExport}>
        <MenuGroup label={t("library.menu.groupPlayer")} />
        <MenuItem
          title={t("library.menu.stick")}
          hint={t("library.menu.stickHint")}
          primary
          disabled={!canExport}
          onClick={onWriteStick}
        />
        <MenuGroup label={t("library.menu.groupBooth")} />
        <MenuItem
          title={t("library.menu.pdf")}
          hint={t("library.menu.pdfHint")}
          disabled={!canExport}
          onClick={onExportPdf}
        />
        <MenuItem
          title={t("library.menu.copyText")}
          hint={t("library.menu.copyTextHint")}
          disabled={!canExport}
          onClick={onCopyText}
        />
        <MenuGroup label={t("library.menu.groupDesk")} />
        <MenuItem
          title={t("library.menu.rekordbox")}
          hint={t("library.menu.rekordboxHint")}
          disabled={!canExport}
          onClick={onExportRekordbox}
        />
        <MenuItem
          title={t("library.menu.m3u")}
          hint={t("library.menu.m3uHint")}
          disabled={!canExport}
          onClick={onExportM3u}
        />
      </Menu>
    </div>
  );
}
