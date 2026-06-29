import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { invitesApi, connectAttemptApi } from "@/lib/hub/api";
import { apiBase, oauthStartUrl, validateHubPublicBaseUrl } from "@/lib/hub/client";
import { getOAuthSuccess } from "@/lib/oauth-session";
import type { InvitePublic } from "@/lib/hub/types";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

interface XSession {
  twuid: string;
  username: string;
  authToken: string;
  ct0: string;
}

type Step =
  | "detecting"
  | "no-ext"
  | "pick-account"
  | "creating"
  | "enter-pin"
  | "validating"
  | "error";

export function ConnectPage() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<InvitePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extension-driven flow state
  const [step, setStep] = useState<Step>("detecting");
  const [sessions, setSessions] = useState<XSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<XSession | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);

  const extDetected = useRef(false);
  const sessionsRef = useRef<XSession[]>([]);
  const extTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    invitesApi
      .getPublic(token)
      .then(setMeta)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data as { type?: string; sessions?: XSession[] };

      if (data?.type === "OMNIBOT_EXT_READY") {
        extDetected.current = true;
        if (extTimeoutRef.current) clearTimeout(extTimeoutRef.current);
        // Transition to pick-account once we have sessions (may arrive in either order)
        if (sessionsRef.current.length > 0 || step === "detecting") {
          setStep(s => s === "detecting" ? "pick-account" : s);
        }
      }

      if (data?.type === "OMNIBOT_SESSIONS") {
        const incoming = data.sessions ?? [];
        sessionsRef.current = incoming;
        setSessions(incoming);
        if (extDetected.current) {
          setStep(s => s === "detecting" || s === "pick-account" ? "pick-account" : s);
        }
      }
    }

    window.addEventListener("message", onMessage);
    extTimeoutRef.current = setTimeout(() => {
      if (!extDetected.current) setStep("no-ext");
    }, 2000);

    return () => {
      window.removeEventListener("message", onMessage);
      if (extTimeoutRef.current) clearTimeout(extTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hubConfigError = validateHubPublicBaseUrl();
  const recentSuccess = token ? getOAuthSuccess(token) : null;
  const hubStartUrl = token && !hubConfigError ? oauthStartUrl(token) : undefined;

  async function handlePickAccount(session: XSession) {
    if (!token) return;
    setSelectedSession(session);
    setStep("creating");
    setFlowError(null);
    try {
      const result = await connectAttemptApi.create(token, session.authToken, session.ct0, session.twuid);
      setNonce(result.nonce);
      setStep("enter-pin");
    } catch (err) {
      setFlowError(errorMessage(err));
      setStep("error");
    }
  }

  async function handleValidatePin() {
    if (!nonce) return;
    const trimmed = pin.trim();
    if (!/^\d{4,8}$/.test(trimmed)) {
      setPinError("PIN must be 4–8 digits.");
      return;
    }
    setPinError(null);
    setStep("validating");
    try {
      await connectAttemptApi.validatePin(nonce, trimmed);
      // Redirect to Twitter OAuth — this navigates away from the page.
      window.location.href = connectAttemptApi.oauthStartUrl(nonce);
    } catch (err) {
      setPinError(errorMessage(err));
      setStep("enter-pin");
    }
  }

  function resetFlow() {
    extDetected.current = false;
    sessionsRef.current = [];
    setSessions([]);
    setSelectedSession(null);
    setNonce(null);
    setPin("");
    setPinError(null);
    setFlowError(null);
    setStep("detecting");
    extTimeoutRef.current = setTimeout(() => {
      if (!extDetected.current) setStep("no-ext");
    }, 2000);
  }

  // ── Early exits for invalid / already-connected states ──────────────────

  if (loading) {
    return <p className="text-muted-foreground text-center">Loading invite…</p>;
  }

  if (error && !meta) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid invite</CardTitle>
          <CardDescription>This invite link is not valid.</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorAlert error={error} />
        </CardContent>
      </Card>
    );
  }

  if (recentSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Already connected</CardTitle>
          <CardDescription>
            {meta ? orgLabel(meta.orgName) : "This invite was used successfully."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">@{recentSuccess.xUsername}</strong> was linked on this device.
            You do not need to authorize again.
          </p>
          <p>You can close this tab. Admins verify the connection in the dashboard under Connections.</p>
        </CardContent>
      </Card>
    );
  }

  const invalid = meta && (meta.expired || meta.revoked || meta.maxUsesReached);
  if (invalid && meta) {
    const usedSuccessfully =
      meta.maxUsesReached && (meta.useCount ?? 0) > 0 && !meta.expired && !meta.revoked;

    if (usedSuccessfully) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Connection complete</CardTitle>
            <CardDescription>{orgLabel(meta.orgName)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              An X account was already authorized through this invite. You do not need to connect again
              unless your admin gave you a new invite link.
            </p>
            <p>
              Admins can confirm the linked account under <strong className="text-foreground">Connections</strong>{" "}
              in the dashboard.
            </p>
          </CardContent>
        </Card>
      );
    }

    const reason = meta.revoked
      ? "This invite has been revoked."
      : meta.expired
        ? "This invite has expired."
        : "This invite has reached its maximum number of uses.";
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cannot connect</CardTitle>
          <CardDescription>{orgLabel(meta.orgName)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{reason}</p>
        </CardContent>
      </Card>
    );
  }

  // ── Main connect flow ────────────────────────────────────────────────────

  return (
    <>
      {token && (
        <>
          <meta id="omnibot-invite-token" content={token} />
          <meta id="omnibot-api-base" content={apiBase()} />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connect your X account</CardTitle>
          <CardDescription>
            {meta ? orgLabel(meta.orgName) : "Authorize access for this organization."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ErrorAlert error={hubConfigError ?? error} />

          {/* ── Step: detecting extension ── */}
          {step === "detecting" && (
            <p className="text-sm text-muted-foreground">Checking for extension…</p>
          )}

          {/* ── Step: no extension ── */}
          {step === "no-ext" && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3 text-sm">
              <p className="font-medium text-foreground">Install the Omnibot X Connector</p>
              <p className="text-muted-foreground">
                This link requires the Omnibot Chrome extension to automatically select and
                authorize your X account without sharing your password.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://chrome.google.com/webstore/detail/omnibot-x-connector"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Install extension →
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                After installing, return to this page and refresh.
              </p>
            </div>
          )}

          {/* ── Step: pick account ── */}
          {step === "pick-account" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Step 1 — Select your X account</p>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No X sessions found. Make sure you are logged into x.com in this browser.
                </p>
              ) : (
                sessions.map(session => (
                  <button
                    key={session.twuid}
                    onClick={() => handlePickAccount(session)}
                    className="w-full text-left rounded-lg border border-border bg-card hover:bg-muted/50 p-4 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">@{session.twuid}</p>
                    <p className="text-xs text-muted-foreground">ID: {session.twuid}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── Step: creating attempt ── */}
          {step === "creating" && (
            <p className="text-sm text-muted-foreground">Starting connection…</p>
          )}

          {/* ── Step: enter PIN ── */}
          {step === "enter-pin" && selectedSession && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Step 2 — Enter XChat PIN</p>
              <p className="text-sm text-muted-foreground">
                Enter the XChat PIN for account <strong className="text-foreground">@{selectedSession.twuid}</strong>.
              </p>
              <Input
                type="password"
                inputMode="numeric"
                placeholder="4–8 digit PIN"
                maxLength={8}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void handleValidatePin(); }}
                autoFocus
              />
              {pinError && <p className="text-sm text-destructive">{pinError}</p>}
              <Button onClick={() => void handleValidatePin()} className="w-full">
                Validate PIN &amp; Authorize with X
              </Button>
            </div>
          )}

          {/* ── Step: validating PIN ── */}
          {step === "validating" && (
            <p className="text-sm text-muted-foreground">Validating PIN and redirecting to X…</p>
          )}

          {/* ── Step: error ── */}
          {step === "error" && (
            <div className="space-y-3">
              <ErrorAlert error={flowError ?? "An error occurred."} />
              <Button variant="outline" onClick={resetFlow} className="w-full">
                Try again
              </Button>
            </div>
          )}

          {/* ── Fallback: authorize without extension ── */}
          {(step === "no-ext") && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Authorize without extension
              </p>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Already logged into X?</strong> That only means you are signed in
                  at x.com. You still need to tap the button below and{" "}
                  <strong className="text-foreground">authorize this app</strong> on the X screen.
                </p>
                <p>Each invite links one X account to this organization. No dashboard login is required.</p>
              </div>
              {hubStartUrl ? (
                <Button className="w-full" size="lg" asChild>
                  <a href={hubStartUrl} rel="noopener noreferrer">
                    Authorize with X
                  </a>
                </Button>
              ) : (
                <Button className="w-full" size="lg" disabled>
                  Authorize with X
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function orgLabel(name: string) {
  return <>You are connecting to <strong>{name}</strong>.</>;
}
