"use client";

import { useEffect, useMemo, useState } from "react";
import { errorText } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { draftNeedsStickFiles } from "@/lib/media";
import {
  mediaPathsForDraft,
  readRekordboxStick,
  stickLibraryRows,
} from "@/lib/rekordbox-stick";
import { rememberStickFiles, stickFileCount } from "@/lib/stick-audio";
import { enqueueWork } from "@/lib/work-queue";
import {
  hydrateStickMedia,
  loadPersistedStickHandle,
  pickAndRememberStick,
  readStickFromHandle,
  stickPermission,
  stickPicker,
} from "@/lib/stick-session";
import type { LibraryRow } from "@/components/LibraryPanel";
import type { SetDraft } from "@/lib/set";

const DISMISSED_KEY = "setbuilder:stick-reload-dismissed";

/** After a reload the browser no longer holds the stick files. Ask once, calmly. */
export function StickReloadBanner({
  draft,
  onLoaded,
}: {
  draft: SetDraft;
  onLoaded: (rows: LibraryRow[]) => void;
}) {
  const { t } = useI18n();
  const needed = draftNeedsStickFiles(draft);
  const signature = useMemo(
    () =>
      draft.tracks
        .map((track) => track.filePath?.trim())
        .filter(Boolean)
        .sort()
        .join("|"),
    [draft.tracks],
  );
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(DISMISSED_KEY) === signature,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canPick = stickPicker() !== null;

  useEffect(() => {
    let timer: number | undefined;
    if (!needed || stickFileCount() > 0) {
      window.localStorage.removeItem(DISMISSED_KEY);
      timer = window.setTimeout(() => setDismissed(false), 0);
    } else {
      const stored = window.localStorage.getItem(DISMISSED_KEY) === signature;
      timer = window.setTimeout(() => setDismissed(stored), 0);
    }
    return () => window.clearTimeout(timer);
  }, [needed, signature]);

  if (!needed || stickFileCount() > 0 || dismissed) return null;

  async function finish(rows: LibraryRow[]) {
    window.localStorage.removeItem(DISMISSED_KEY);
    setDismissed(false);
    onLoaded(rows);
  }

  async function reconnect() {
    setBusy(true);
    setError(null);
    try {
      const existing = await loadPersistedStickHandle();
      const handle =
        existing && (await stickPermission(existing, "read", true))
          ? existing
          : await pickAndRememberStick("read");
      if (!handle) return;
      await enqueueWork(async () => {
        const stick = await readStickFromHandle(handle);
        await hydrateStickMedia(handle, mediaPathsForDraft(draft, stick.library));
        await finish(stickLibraryRows(stick.library, stick.sets));
      }, {
        operation: "stick-reconnect",
        key: signature,
        label: t("builder.work.stickReconnect"),
        target: handle.name,
      });
    } catch (caught) {
      setError(errorText(caught, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stick-reload" role="status">
      <div className="stick-reload-copy">
        <p>{t("builder.stickReload.body", { title: draft.title.trim() })}</p>
        {error ? (
          <p className="stick-warn" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="stick-reload-actions">
        {canPick ? (
          <button type="button" className="btn" disabled={busy} onClick={() => void reconnect()}>
            {busy ? t("builder.stickReload.busy") : t("builder.stickReload.reconnect")}
          </button>
        ) : (
          <label className={"btn" + (busy ? " is-busy" : "")}>
            {busy ? t("builder.stickReload.busy") : t("builder.stickReload.choose")}
            <input
              type="file"
              hidden
              multiple
              disabled={busy}
              {...{ webkitdirectory: "", directory: "" }}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.currentTarget.value = "";
                if (!files.length) return;
                setBusy(true);
                setError(null);
                void enqueueWork(
                  () => readRekordboxStick(files),
                  {
                    operation: "stick-reconnect",
                    key: signature,
                    label: t("builder.work.stickReconnect"),
                    target: files[0]?.webkitRelativePath.split("/")[0],
                  },
                )
                  .then((stick) => {
                    rememberStickFiles(files);
                    return finish(stickLibraryRows(stick.library, stick.sets));
                  })
                  .catch((caught) => setError(errorText(caught, t)))
                  .finally(() => setBusy(false));
              }}
            />
          </label>
        )}
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            window.localStorage.setItem(DISMISSED_KEY, signature);
            setDismissed(true);
          }}
        >
          {t("builder.stickReload.later")}
        </button>
      </div>
    </div>
  );
}
