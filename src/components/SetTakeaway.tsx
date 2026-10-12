"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

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
  return (
    <div className="set-tools" role="group" aria-label="Set bearbeiten">
      <span className="set-tools-label">Set bearbeiten</span>
      {children}
      <Tip
        disabled={!canMatch}
        text="Sucht für Tracks ohne Adresse einen Spotify-Treffer und hängt den Link an. Titel und Artist müssen passen."
      >
        <button
          type="button"
          className="btn ghost"
          onClick={onMatchLinks}
          disabled={!canMatch || matchingLinks}
        >
          {matchingLinks ? "Suche…" : "Links suchen"}
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
  onCopyText?: () => void;
  onReset?: () => void;
};

/** Output and the rare, destructive action, both tucked into menus at the top right. */
export function SetMenus({
  canExport,
  onExportPdf,
  onExportM3u,
  onExportRekordbox,
  onCopyText,
  onReset,
}: MenusProps) {
  return (
    <div className="set-menus">
      <Menu label={<>Mitnehmen <span aria-hidden="true">▾</span></>} primary disabled={!canExport}>
        <MenuItem
          title="PDF"
          hint="Druckansicht mit Brief, Reihenfolge, Key, BPM, Übergang und Alternativen. Im Dialog „Als PDF speichern“ wählen."
          disabled={!canExport}
          onClick={onExportPdf}
        />
        <MenuItem
          title="rekordbox"
          hint="XML zum Import: Performance und Alternativen als zwei Playlists."
          disabled={!canExport}
          onClick={onExportRekordbox}
        />
        <MenuItem
          title="M3U"
          hint="Playlist der Performance-Reihenfolge für Player, die M3U lesen."
          disabled={!canExport}
          onClick={onExportM3u}
        />
        <MenuItem
          title="Text kopieren"
          hint="Set mit Brief, Kommentaren und Prinzipien in die Zwischenablage."
          disabled={!canExport}
          onClick={onCopyText}
        />
      </Menu>
      {onReset ? (
        <Menu label={<span aria-hidden="true">…</span>} ariaLabel="Weitere Aktionen">
          <MenuItem
            title="Zurücksetzen"
            hint="Set leeren und zum leeren Brief zurück. Gespeicherte Setups bleiben."
            danger
            onClick={onReset}
          />
        </Menu>
      ) : null}
    </div>
  );
}
