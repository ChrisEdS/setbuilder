"use client";

import { useEffect, useState } from "react";
import { Tip } from "@/components/Hint";
import {
  desktopBridge,
  type DesktopInfo,
  type DesktopUpdateEvent,
} from "@/lib/desktop-bridge";
import { useI18n } from "@/lib/i18n/react";

type WebInfo = {
  version: string;
  name: string;
  desktop: boolean;
  channel: string;
  releasesUrl: string;
};

type Phase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "current"
  | "error";

export function AppUpdateCard() {
  const { t } = useI18n();
  const bridge = desktopBridge();
  const [web, setWeb] = useState<WebInfo | null>(null);
  const [desktop, setDesktop] = useState<DesktopInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/version")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: WebInfo | null) => {
        if (!cancelled && body?.version) setWeb(body);
      })
      .catch(() => {
        /* version line stays empty until desktop info arrives */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bridge) return;
    let cancelled = false;
    void bridge.getInfo().then((info) => {
      if (!cancelled) setDesktop(info);
    });
    const stop = bridge.onUpdateEvent((event: DesktopUpdateEvent) => {
      if (event.type === "checking") {
        setPhase("checking");
        setError(null);
      } else if (event.type === "available") {
        setPhase("available");
        setRemoteVersion(event.version);
        setError(null);
      } else if (event.type === "not-available") {
        setPhase("current");
        setRemoteVersion(event.version);
        setError(null);
      } else if (event.type === "progress") {
        setPhase("downloading");
        setProgress(Math.round(event.percent));
      } else if (event.type === "downloaded") {
        setPhase("ready");
        setRemoteVersion(event.version);
        setProgress(100);
        setError(null);
      } else if (event.type === "error") {
        setPhase("error");
        setError(event.message);
      }
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [bridge]);

  const version = desktop?.version || web?.version || "—";
  const channel = desktop
    ? t("builder.app.channelDesktop")
    : t("builder.app.channelWeb");
  const releasesUrl = web?.releasesUrl || "https://github.com/ChrisEdS/setbuilder/releases";
  const canUpdate = Boolean(bridge && desktop?.updateSupported);

  async function check() {
    if (!bridge || busy) return;
    setBusy(true);
    setError(null);
    setPhase("checking");
    try {
      const result = await bridge.checkForUpdates();
      if (!result.ok) {
        setPhase("error");
        setError(result.message || t("builder.app.checkFailed"));
      }
    } catch (caught) {
      setPhase("error");
      setError(caught instanceof Error ? caught.message : t("builder.app.checkFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!bridge || busy) return;
    setBusy(true);
    setError(null);
    setPhase("downloading");
    setProgress(0);
    try {
      const result = await bridge.downloadUpdate();
      if (!result.ok) {
        setPhase("error");
        setError(result.message || t("builder.app.downloadFailed"));
      }
    } catch (caught) {
      setPhase("error");
      setError(caught instanceof Error ? caught.message : t("builder.app.downloadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function install() {
    if (!bridge || busy) return;
    setBusy(true);
    try {
      await bridge.installUpdate();
    } catch (caught) {
      setPhase("error");
      setError(caught instanceof Error ? caught.message : t("builder.app.installFailed"));
      setBusy(false);
    }
  }

  const statusText =
    phase === "checking"
      ? t("builder.app.statusChecking")
      : phase === "available" && remoteVersion
        ? t("builder.app.statusAvailable", { version: remoteVersion })
        : phase === "downloading"
          ? t("builder.app.statusDownloading", { percent: progress })
          : phase === "ready" && remoteVersion
            ? t("builder.app.statusReady", { version: remoteVersion })
            : phase === "current"
              ? t("builder.app.statusCurrent")
              : phase === "error" && error
                ? error
                : t("builder.app.statusIdle");

  return (
    <div className="setup-card app-update-card">
      <h3>{t("builder.app.title")}</h3>
      <p className="app-update-version">
        <strong>
          {t("builder.app.versionLine", { version, channel })}
        </strong>
      </p>
      {desktop ? (
        <p className="app-update-meta">
          {t("builder.app.runtime", {
            electron: desktop.electron,
            platform: desktop.platform,
            arch: desktop.arch,
          })}
        </p>
      ) : null}
      <p className="app-update-status" role="status">
        {statusText}
      </p>
      <div className="setup-actions">
        {canUpdate ? (
          <>
            <Tip text={t("builder.app.checkTip")} disabled={busy}>
              <button
                type="button"
                className="btn"
                disabled={busy || phase === "downloading"}
                onClick={() => void check()}
              >
                {busy && phase === "checking"
                  ? t("builder.app.checking")
                  : t("builder.app.check")}
              </button>
            </Tip>
            {phase === "available" ? (
              <Tip text={t("builder.app.downloadTip")} disabled={busy}>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => void download()}
                >
                  {t("builder.app.download")}
                </button>
              </Tip>
            ) : null}
            {phase === "ready" ? (
              <Tip text={t("builder.app.installTip")} disabled={busy}>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void install()}
                >
                  {t("builder.app.install")}
                </button>
              </Tip>
            ) : null}
          </>
        ) : (
          <a className="btn ghost" href={releasesUrl} target="_blank" rel="noreferrer">
            {t("builder.app.openReleases")}
          </a>
        )}
      </div>
    </div>
  );
}
