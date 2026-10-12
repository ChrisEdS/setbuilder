"use client";

import { useEffect, useRef, useState } from "react";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";

type Status = {
  spotifyConfigured: boolean;
  tidalConfigured: boolean;
  spotifyRedirectUri: string;
  tidalRedirectUri: string;
};

const EMPTY = {
  SPOTIFY_CLIENT_ID: "",
  SPOTIFY_CLIENT_SECRET: "",
  TIDAL_CLIENT_ID: "",
  TIDAL_CLIENT_SECRET: "",
};

export function ConnectionSetup({
  onStatus,
}: {
  onStatus?: (note: string) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [fields, setFields] = useState(EMPTY);
  const onStatusRef = useRef(onStatus);
  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<FieldNotice | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/setup")
      .then((response) => response.json())
      .then((data: Status) => {
        if (cancelled) return;
        setStatus(data);
        onStatusRef.current?.(
          data.spotifyConfigured ? "Spotify bereit" : "Spotify fehlt",
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError({
            text: "Verbindungen konnten nicht gelesen werden.",
            hint: "Seite neu laden. SETFORM muss auf diesem Rechner laufen, nicht auf einem fremden Server.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          text: "Kopieren hat nicht geklappt.",
          hint: "Die Adresse im Feld markieren und selbst kopieren.",
        });
        return;
      }
    }
    setMessage("Adresse kopiert. Die gehört genau so in die Developer-App.");
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
      if (!response.ok) throw new Error(data.error || "Speichern fehlgeschlagen.");
      setStatus(data);
      setFields(EMPTY);
      onStatusRef.current?.(
        data.spotifyConfigured ? "Spotify bereit" : "Spotify fehlt",
      );
      setMessage(
        "Gespeichert. Mit Spotify verbinden und Mit Tidal verbinden benutzen jetzt diese Zugangsdaten.",
      );
    } catch (err) {
      setError({
        text: err instanceof Error ? err.message : "Speichern fehlgeschlagen.",
        hint: "Client ID und Secret ohne Leerzeile einfügen und erneut speichern.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="setups-connect">
      <p className="setups-connect-note">
        Zugangsdaten bleiben auf diesem Rechner. Die Datei musst du nicht
        suchen. Beatport hat keinen Entwickler-Login — den Track-Link direkt
        einfügen.
      </p>

      <section className="setup-card">
        <h3>Spotify {status?.spotifyConfigured ? "· bereit" : "· fehlt"}</h3>
        <ol className="setup-steps">
          <li>
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
              Developer Dashboard öffnen
            </a>
          </li>
          <li>App anlegen und die Redirect URI exakt eintragen.</li>
          <li>Client ID und Secret hier einfügen.</li>
        </ol>
        <div className="setup-field">
          <span>Redirect URI</span>
          <div className="setup-copy">
            <input readOnly value={status?.spotifyRedirectUri ?? ""} aria-label="Spotify Redirect URI" />
            <button
              type="button"
              className="btn ghost"
              onClick={() => void copy(status?.spotifyRedirectUri ?? "")}
            >
              Kopieren
            </button>
          </div>
        </div>
        <div className="setup-fields">
          <label className="setup-field">
            <span>Client ID</span>
            <input
              value={fields.SPOTIFY_CLIENT_ID}
              autoComplete="off"
              placeholder={status?.spotifyConfigured ? "Gespeichert" : "Client ID"}
              onChange={(event) => setField("SPOTIFY_CLIENT_ID", event.target.value)}
            />
          </label>
          <label className="setup-field">
            <span>Client Secret</span>
            <input
              type="password"
              value={fields.SPOTIFY_CLIENT_SECRET}
              autoComplete="off"
              placeholder={status?.spotifyConfigured ? "Gespeichert" : "Client Secret"}
              onChange={(event) => setField("SPOTIFY_CLIENT_SECRET", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="setup-card">
        <h3>Tidal {status?.tidalConfigured ? "· bereit" : "· optional"}</h3>
        <ol className="setup-steps">
          <li>
            <a href="https://developer.tidal.com" target="_blank" rel="noreferrer">
              Tidal Developer öffnen
            </a>
          </li>
          <li>
            Scopes <code>user.read</code> und <code>playlists.read</code> einschalten.
          </li>
          <li>Dieselbe Redirect URI eintragen, dann ID und Secret hier einfügen.</li>
        </ol>
        <div className="setup-field">
          <span>Redirect URI</span>
          <div className="setup-copy">
            <input readOnly value={status?.tidalRedirectUri ?? ""} aria-label="Tidal Redirect URI" />
            <button
              type="button"
              className="btn ghost"
              onClick={() => void copy(status?.tidalRedirectUri ?? "")}
            >
              Kopieren
            </button>
          </div>
        </div>
        <div className="setup-fields">
          <label className="setup-field">
            <span>Client ID</span>
            <input
              value={fields.TIDAL_CLIENT_ID}
              autoComplete="off"
              placeholder={status?.tidalConfigured ? "Gespeichert" : "Client ID"}
              onChange={(event) => setField("TIDAL_CLIENT_ID", event.target.value)}
            />
          </label>
          <label className="setup-field">
            <span>Client Secret</span>
            <input
              type="password"
              value={fields.TIDAL_CLIENT_SECRET}
              autoComplete="off"
              placeholder={status?.tidalConfigured ? "Gespeichert" : "Client Secret"}
              onChange={(event) => setField("TIDAL_CLIENT_SECRET", event.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="setup-connect-save">
        <button type="button" className="btn" disabled={saving} onClick={() => void save()}>
          {saving ? "Speichere…" : "Zugangsdaten speichern"}
        </button>
        {status?.spotifyConfigured ? (
          <a className="button-link" href="/api/auth/login">
            Mit Spotify verbinden
          </a>
        ) : null}
        {status?.tidalConfigured ? (
          <a className="button-link tidal-login" href="/api/auth/tidal/login">
            Mit Tidal verbinden
          </a>
        ) : null}
      </div>
      {message ? <p className="banner status">{message}</p> : null}
      <FieldNoticeView notice={error} />
    </div>
  );
}
