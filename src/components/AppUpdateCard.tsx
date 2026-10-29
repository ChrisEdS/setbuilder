"use client";

import { useEffect, useState } from "react";
import { Tip } from "@/components/Hint";
import {
  desktopBridge,
  type DesktopInfo,
  type DesktopUpdateEvent,
} from "@/lib/desktop-bridge";
import { useI18n } from "@/lib/i18n/react";
import { isVersionNewer } from "@/lib/version-compare";

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
  | "error"
  | "manual";

const DISMISS_KEY = "setbuilder.update.dismissed";

function looksLikeSignatureFailure(message: string, code?: string) {
  if (code === "signature" || code === "unsigned") return true;
  return /code signature|did not pass validation|code failed to satisfy|specified code requirement/i.test(
    message,
  );
}

function readDismissed(): string | null {
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(version: string) {
  try {
    sessionStorage.setItem(DISMISS_KEY, version);
  } catch {
    /* ignore */
  }
}

async function fetchLatestReleaseTag(): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/ChrisEdS/setbuilder/releases/latest",
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { tag_name?: string };
    const tag = body.tag_name?.trim();
    return tag || null;
  } catch {
    return null;
  }
}

export function AppUpdateCard({ variant = "card" }: { variant?: "card" | "strip" | "banner" }) {
  const { t } = useI18n();
  const bridge = desktopBridge();
  const [web, setWeb] = useState<WebInfo | null>(null);
  const [desktop, setDesktop] = useState<DesktopInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissedFor, setDismissedFor] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readDismissed(),
  );

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
      if (cancelled) return;
      setDesktop(info);
      if (info.updateManualOnly) setPhase((current) => (current === "idle" ? "manual" : current));
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
        setError(
          looksLikeSignatureFailure(event.message, event.code)
            ? t("builder.app.signatureFailed")
            : event.message,
        );
      }
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [bridge, t]);

  const version = desktop?.version || web?.version || "—";
  const channel = desktop
    ? t("builder.app.channelDesktop")
    : t("builder.app.channelWeb");
  const releasesUrl = web?.releasesUrl || "https://github.com/ChrisEdS/setbuilder/releases";
  const manualOnly = Boolean(desktop?.updateManualOnly);
  const canUpdate = Boolean(bridge && desktop?.updateSupported && !manualOnly);

  // Auto-check once desktop info is known (Electron also checks after ~8s).
  useEffect(() => {
    if (!bridge || !desktop) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (desktop.updateSupported && !desktop.updateManualOnly) {
        void bridge.checkForUpdates().catch(() => undefined);
        return;
      }
      // Unsigned / browser: compare against the latest GitHub release tag.
      void (async () => {
        const local = desktop.version || web?.version;
        if (!local) return;
        setPhase((current) => (current === "idle" || current === "manual" ? "checking" : current));
        const tag = await fetchLatestReleaseTag();
        if (cancelled || !tag) {
          if (!cancelled && manualOnly) setPhase("manual");
          return;
        }
        const remote = tag.replace(/^v/i, "");
        if (isVersionNewer(remote, local)) {
          setRemoteVersion(remote);
          setPhase("available");
        } else if (manualOnly) {
          setPhase("manual");
        } else {
          setPhase("current");
        }
      })();
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bridge, desktop, web?.version, manualOnly]);

  // Browser without Electron: still probe GitHub once.
  useEffect(() => {
    if (bridge) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const local = web?.version;
        if (!local || cancelled) return;
        setPhase("checking");
        const tag = await fetchLatestReleaseTag();
        if (cancelled || !tag) {
          if (!cancelled) setPhase("idle");
          return;
        }
        const remote = tag.replace(/^v/i, "");
        if (isVersionNewer(remote, local)) {
          setRemoteVersion(remote);
          setPhase("available");
        } else {
          setPhase("current");
        }
      })();
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bridge, web?.version]);

  async function check() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setPhase("checking");
    try {
      if (bridge && canUpdate) {
        const result = await bridge.checkForUpdates();
        if (!result.ok) {
          setPhase("error");
          setError(
            looksLikeSignatureFailure(result.message || "", result.code)
              ? t("builder.app.signatureFailed")
              : result.message || t("builder.app.checkFailed"),
          );
        }
        return;
      }
      const local = version === "—" ? null : version;
      const tag = await fetchLatestReleaseTag();
      if (!local || !tag) {
        setPhase("error");
        setError(t("builder.app.checkFailed"));
        return;
      }
      const remote = tag.replace(/^v/i, "");
      if (isVersionNewer(remote, local)) {
        setRemoteVersion(remote);
        setPhase("available");
      } else {
        setPhase(manualOnly ? "manual" : "current");
      }
    } catch (caught) {
      setPhase("error");
      setError(caught instanceof Error ? caught.message : t("builder.app.checkFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!bridge || busy || manualOnly) return;
    setBusy(true);
    setError(null);
    setPhase("downloading");
    setProgress(0);
    try {
      const result = await bridge.downloadUpdate();
      if (!result.ok) {
        setPhase("error");
        setError(
          looksLikeSignatureFailure(result.message || "", result.code)
            ? t("builder.app.signatureFailed")
            : result.message || t("builder.app.downloadFailed"),
        );
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
    phase === "manual" || (manualOnly && phase !== "available" && phase !== "ready")
      ? variant === "strip" || variant === "banner"
        ? t("builder.app.statusUnsignedShort")
        : t("builder.app.statusUnsigned")
      : phase === "checking"
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

  const showNotice =
    (phase === "available" || phase === "ready" || phase === "downloading") &&
    remoteVersion &&
    dismissedFor !== remoteVersion;

  const primaryAction =
    phase === "ready" && canUpdate ? (
      <Tip text={t("builder.app.installTip")} disabled={busy}>
        <button type="button" className="btn" disabled={busy} onClick={() => void install()}>
          {t("builder.app.install")}
        </button>
      </Tip>
    ) : phase === "available" && canUpdate ? (
      <Tip text={t("builder.app.downloadTip")} disabled={busy}>
        <button type="button" className="btn" disabled={busy} onClick={() => void download()}>
          {t("builder.app.download")}
        </button>
      </Tip>
    ) : phase === "available" || manualOnly ? (
      <a className="btn" href={releasesUrl} target="_blank" rel="noreferrer">
        {t("builder.app.downloadManual")}
      </a>
    ) : null;

  const actions = canUpdate ? (
    <>
      <Tip text={t("builder.app.checkTip")} disabled={busy}>
        <button
          type="button"
          className={variant === "strip" || variant === "banner" ? "btn ghost" : "btn"}
          disabled={busy || phase === "downloading"}
          onClick={() => void check()}
        >
          {busy && phase === "checking" ? t("builder.app.checking") : t("builder.app.check")}
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
          <button type="button" className="btn" disabled={busy} onClick={() => void install()}>
            {t("builder.app.install")}
          </button>
        </Tip>
      ) : null}
    </>
  ) : (
    <a
      className={variant === "strip" || variant === "banner" ? "btn ghost" : "btn"}
      href={releasesUrl}
      target="_blank"
      rel="noreferrer"
    >
      {manualOnly || phase === "available"
        ? t("builder.app.downloadManual")
        : t("builder.app.openReleases")}
    </a>
  );

  if (variant === "banner") {
    if (!showNotice) return null;
    return (
      <div className="stick-reload app-update-banner" role="status">
        <div className="stick-reload-copy">
          <strong>
            {phase === "ready"
              ? t("builder.app.bannerReadyTitle", { version: remoteVersion })
              : t("builder.app.bannerTitle", { version: remoteVersion })}
          </strong>
          <p>
            {phase === "ready"
              ? t("builder.app.bannerReadyBody")
              : phase === "downloading"
                ? t("builder.app.statusDownloading", { percent: progress })
                : t("builder.app.bannerBody")}
          </p>
        </div>
        <div className="stick-reload-actions">
          {primaryAction}
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (remoteVersion) {
                writeDismissed(remoteVersion);
                setDismissedFor(remoteVersion);
              }
            }}
          >
            {t("builder.app.bannerDismiss")}
          </button>
        </div>
      </div>
    );
  }

  if (variant === "strip") {
    return (
      <div className="app-update-strip" role="status">
        <div className="app-update-strip-copy">
          <strong>{t("builder.app.versionLine", { version, channel })}</strong>
          <span>{statusText}</span>
        </div>
        <div className="app-update-strip-actions">{actions}</div>
      </div>
    );
  }

  return (
    <div className="setup-card app-update-card">
      <h3>{t("builder.app.title")}</h3>
      <p className="app-update-version">
        <strong>{t("builder.app.versionLine", { version, channel })}</strong>
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
      <div className="setup-actions">{actions}</div>
      {phase === "error" && !manualOnly ? (
        <p className="app-update-hint">
          <a href={releasesUrl} target="_blank" rel="noreferrer">
            {t("builder.app.openReleases")}
          </a>
        </p>
      ) : null}
    </div>
  );
}
