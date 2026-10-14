"use client";

import { useState } from "react";
import { errorText } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { draftNeedsStickFiles } from "@/lib/media";
import {
  mediaPathsForDraft,
  readRekordboxStick,
  stickLibraryRows,
} from "@/lib/rekordbox-stick";
import { rememberStickFiles, stickFileCount } from "@/lib/stick-audio";
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

/** After a reload the browser no longer holds the stick files. Ask once, calmly. */
export function StickReloadBanner({
  draft,
  onLoaded,
}: {
  draft: SetDraft;
  onLoaded: (rows: LibraryRow[]) => void;
}) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canPick = stickPicker() !== null;

  if (!draftNeedsStickFiles(draft) || stickFileCount() > 0 || dismissed) return null;

  async function finish(rows: LibraryRow[]) {
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
      const stick = await readStickFromHandle(handle);
      await hydrateStickMedia(handle, mediaPathsForDraft(draft, stick.library));
      await finish(stickLibraryRows(stick.library, stick.sets));
    } catch (caught) {
      setError(errorText(caught, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stick-reload" role="status">
      <div>
        <strong>{t("builder.stickReload.title")}</strong>
        <p>{t("builder.stickReload.body")}</p>
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
                void readRekordboxStick(files)
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
        <button type="button" className="btn ghost" onClick={() => setDismissed(true)}>
          {t("builder.stickReload.later")}
        </button>
      </div>
    </div>
  );
}
