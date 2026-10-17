"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";
import { Tip } from "@/components/Hint";
import { type MessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";

type Status = {
  spotifyConfigured: boolean;
  tidalConfigured: boolean;
  spotifyRedirectUri: string;
  tidalRedirectUri: string;
};

/** Fills `{name}` placeholders of a translated text with elements (code, strong …). */
function rich(text: string, parts: Record<string, ReactNode>): ReactNode[] {
  return text.split(/(\{\w+\})/).map((chunk, index) => {
    const name = /^\{(\w+)\}$/.exec(chunk)?.[1];
    return name && name in parts ? <Fragment key={index}>{parts[name]}</Fragment> : chunk;
  });
}

/** A notice kept as message keys (or a server text), so it follows the language switcher. */
type NoticeState = {
  textKey?: MessageKey;
  /** Text that came from the server or the browser; shown as received. */
  raw?: string;
  hintKey: MessageKey;
};

const EMPTY = {
  SPOTIFY_CLIENT_ID: "",
  SPOTIFY_CLIENT_SECRET: "",
  TIDAL_CLIENT_ID: "",
  TIDAL_CLIENT_SECRET: "",
};

function ServiceCard({
  title,
  ready,
  dashboardHref,
  dashboardLabel,
  help,
  redirectUri,
  redirectAria,
  idValue,
  secretValue,
  onId,
  onSecret,
  onCopy,
  storedPlaceholder,
  t,
}: {
  title: string;
  ready: boolean;
  dashboardHref: string;
  dashboardLabel: string;
  help: ReactNode;
  redirectUri: string;
  redirectAria: string;
  idValue: string;
  secretValue: string;
  onId: (value: string) => void;
  onSecret: (value: string) => void;
  onCopy: () => void;
  storedPlaceholder: boolean;
  t: (key: MessageKey) => string;
}) {
  return (
    <section className={`setup-service${ready ? " is-ready" : ""}`}>
      <header className="setup-service-head">
        <div className="setup-service-title">
          <h3>{title}</h3>
          <span className={`setup-badge${ready ? " ready" : ""}`}>
            {ready ? t("library.connection.badgeReady") : t("library.connection.badgeOptional")}
          </span>
        </div>
        <a className="setup-service-link" href={dashboardHref} target="_blank" rel="noreferrer">
          {dashboardLabel}
        </a>
      </header>
      <p className="setup-service-help">{help}</p>
      <div className="setup-field">
        <span>{t("library.connection.redirectLabel")}</span>
        <div className="setup-copy">
          <input readOnly value={redirectUri} aria-label={redirectAria} />
          <Tip text={t("library.connection.copyUriTip")} end>
            <button type="button" className="btn ghost" onClick={onCopy}>
              {t("common.copy")}
            </button>
          </Tip>
        </div>
      </div>
      <div className="setup-fields">
        <label className="setup-field">
          <span>Client ID</span>
          <input
            value={idValue}
            autoComplete="off"
            placeholder={storedPlaceholder ? t("library.connection.stored") : "Client ID"}
            onChange={(event) => onId(event.target.value)}
          />
        </label>
        <label className="setup-field">
          <span>Client Secret</span>
          <input
            type="password"
            value={secretValue}
            autoComplete="off"
            placeholder={storedPlaceholder ? t("library.connection.stored") : "Client Secret"}
            onChange={(event) => onSecret(event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

export function ConnectionSetup({
  onStatus,
}: {
  onStatus?: (note: string) => void;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);
  const [fields, setFields] = useState(EMPTY);
  const onStatusRef = useRef(onStatus);
  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);
  const [message, setMessage] = useState<MessageKey | null>(null);
  const [error, setError] = useState<NoticeState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/setup")
      .then((response) => response.json())
      .then((data: Status) => {
        if (cancelled) return;
        setStatus(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError({
            textKey: "library.connection.readFailed.text",
            hintKey: "library.connection.readFailed.hint",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tell the parent the state in the current language: on load, after saving and after a language switch.
  const spotifyConfigured = status?.spotifyConfigured;
  useEffect(() => {
    if (spotifyConfigured === undefined) return;
    onStatusRef.current?.(
      t(spotifyConfigured ? "library.connection.spotifyReady" : "library.connection.spotifyMissing"),
    );
  }, [status, spotifyConfigured, t]);

  function setField(key: keyof typeof EMPTY, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = value;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      const ok = document.execCommand("copy");
      helper.remove();
      if (!ok) {
        setMessage(null);
        setError({
          textKey: "library.connection.copyFailed.text",
          hintKey: "library.connection.copyFailed.hint",
        });
        return;
      }
    }
    setMessage("library.connection.copied");
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await response.json()) as Status & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "");
      setStatus(data);
      setFields(EMPTY);
      setMessage("library.connection.saved");
    } catch (err) {
      setError({
        raw: err instanceof Error && err.message ? err.message : undefined,
        textKey: "library.connection.saveFailed.text",
        hintKey: "library.connection.saveFailed.hint",
      });
    } finally {
      setSaving(false);
    }
  }

  const notice: FieldNotice | null = error
    ? {
        text: error.raw ?? (error.textKey ? t(error.textKey) : ""),
        hint: t(error.hintKey),
      }
    : null;

  return (
    <div className="setups-connect">
      <p className="setups-connect-note">{t("library.connection.note")}</p>

      <div className="setups-services">
        <ServiceCard
          title={
            status?.spotifyConfigured
              ? t("library.connection.spotifyTitleReady")
              : t("library.connection.spotifyTitleMissing")
          }
          ready={Boolean(status?.spotifyConfigured)}
          dashboardHref="https://developer.spotify.com/dashboard"
          dashboardLabel={t("library.connection.spotifyOpen")}
          help={t("library.connection.spotifyHelp")}
          redirectUri={status?.spotifyRedirectUri ?? ""}
          redirectAria="Spotify Redirect URI"
          idValue={fields.SPOTIFY_CLIENT_ID}
          secretValue={fields.SPOTIFY_CLIENT_SECRET}
          onId={(value) => setField("SPOTIFY_CLIENT_ID", value)}
          onSecret={(value) => setField("SPOTIFY_CLIENT_SECRET", value)}
          onCopy={() => void copy(status?.spotifyRedirectUri ?? "")}
          storedPlaceholder={Boolean(status?.spotifyConfigured)}
          t={t}
        />

        <ServiceCard
          title={
            status?.tidalConfigured
              ? t("library.connection.tidalTitleReady")
              : t("library.connection.tidalTitleOptional")
          }
          ready={Boolean(status?.tidalConfigured)}
          dashboardHref="https://developer.tidal.com"
          dashboardLabel={t("library.connection.tidalOpen")}
          help={rich(t("library.connection.tidalHelp"), {
            read: <code>user.read</code>,
            playlists: <code>playlists.read</code>,
          })}
          redirectUri={status?.tidalRedirectUri ?? ""}
          redirectAria="Tidal Redirect URI"
          idValue={fields.TIDAL_CLIENT_ID}
          secretValue={fields.TIDAL_CLIENT_SECRET}
          onId={(value) => setField("TIDAL_CLIENT_ID", value)}
          onSecret={(value) => setField("TIDAL_CLIENT_SECRET", value)}
          onCopy={() => void copy(status?.tidalRedirectUri ?? "")}
          storedPlaceholder={Boolean(status?.tidalConfigured)}
          t={t}
        />
      </div>

      <div className="setup-connect-save">
        <Tip text={t("library.connection.saveTip")} disabled={saving}>
          <button type="button" className="btn" disabled={saving} onClick={() => void save()}>
            {saving ? t("library.connection.saving") : t("library.connection.save")}
          </button>
        </Tip>
        {status?.spotifyConfigured ? (
          <a className="button-link" href="/api/auth/login">
            {t("library.connection.connectSpotify")}
          </a>
        ) : null}
        {status?.tidalConfigured ? (
          <a className="button-link tidal-login" href="/api/auth/tidal/login">
            {t("library.connection.connectTidal")}
          </a>
        ) : null}
      </div>
      {message ? (
        <p className="banner status">
          {t(message, {
            spotify: t("library.connection.connectSpotify"),
            tidal: t("library.connection.connectTidal"),
          })}
        </p>
      ) : null}
      <FieldNoticeView notice={notice} />
    </div>
  );
}
