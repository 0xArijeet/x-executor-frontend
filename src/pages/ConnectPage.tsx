import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { invitesApi } from "@/lib/hub/api";
import { apiBase, oauthStartUrl, validateHubPublicBaseUrl } from "@/lib/hub/client";
import { getOAuthSuccess } from "@/lib/oauth-session";
import type { InvitePublic } from "@/lib/hub/types";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

// Noah bridge message types
const SRC_EXT = "noah-extension";
const SRC_PAGE = "noah-page";

type ExtStage = "detecting" | "no-ext" | "ready" | "connected";

interface ConnectedPayload {
  ok: boolean;
  handle?: string;
  orgName?: string;
}

export function ConnectPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [meta, setMeta] = useState<InvitePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const oauthConnected = searchParams.get("connected") === "true";
  const oauthHandle = searchParams.get("handle");
  const oauthOrgId = searchParams.get("orgId");
  const oauthError = searchParams.get("error");
  const oauthErrorDesc = searchParams.get("error_description");

  const [extStage, setExtStage] = useState<ExtStage>("detecting");
  const [xLoggedIn, setXLoggedIn] = useState<boolean | null>(null);
  const [connectedHandle, setConnectedHandle] = useState<string | null>(null);

  const extDetected = useRef(false);
  const extTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;
    invitesApi
      .getPublic(token)
      .then(setMeta)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  // Noah bridge: detect extension and listen for events
  useEffect(() => {
    // Check if extension already marked its presence via DOM attribute
    if (document.documentElement.getAttribute("data-noah-ext")) {
      extDetected.current = true;
      setExtStage("ready");
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const d = event.data as { source?: string; type?: string; payload?: unknown };
      if (d?.source !== SRC_EXT) return;

      if (d.type === "NOAH_ANNOUNCE" || d.type === "NOAH_PONG") {
        if (!extDetected.current) {
          extDetected.current = true;
          if (extTimeoutRef.current) clearTimeout(extTimeoutRef.current);
          if (pingRef.current) clearInterval(pingRef.current);
          setExtStage("ready");
        }
      }

      if (d.type === "NOAH_SESSION") {
        const payload = d.payload as { loggedIn?: boolean };
        setXLoggedIn(!!payload?.loggedIn);
      }

      if (d.type === "NOAH_CONNECTED") {
        const payload = d.payload as ConnectedPayload;
        if (payload?.ok) {
          setConnectedHandle(payload.handle ?? null);
          setExtStage("connected");
        }
      }
    }

    window.addEventListener("message", onMessage);

    // Ping the extension periodically until it responds
    const ping = () => window.postMessage({ source: SRC_PAGE, type: "NOAH_PING" }, "*");
    ping();
    pingRef.current = setInterval(ping, 300);

    extTimeoutRef.current = setTimeout(() => {
      if (!extDetected.current) {
        if (pingRef.current) clearInterval(pingRef.current);
        setExtStage("no-ext");
      }
    }, 2500);

    return () => {
      window.removeEventListener("message", onMessage);
      if (extTimeoutRef.current) clearTimeout(extTimeoutRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, []);

  const hubConfigError = validateHubPublicBaseUrl();
  const recentSuccess = token ? getOAuthSuccess(token) : null;
  const hubStartUrl = token && !hubConfigError ? oauthStartUrl(token) : undefined;

  // ── Early exits ──────────────────────────────────────────────────────────

  if (loading) {
    return <p className="text-muted-foreground text-center">Loading invite…</p>;
  }

  // ── OAuth redirect landed back here ─────────────────────────────────────

  if (oauthConnected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle>Account connected</CardTitle>
          </div>
          <CardDescription>
            {meta ? orgLabel(meta.orgName) : oauthOrgId ? `Organization ID: ${oauthOrgId}` : "Connection successful."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {oauthHandle && (
            <p><strong className="text-foreground">@{oauthHandle}</strong> is now connected.</p>
          )}
          <p>You can close this tab. Admins verify the connection in the dashboard under Connections.</p>
        </CardContent>
      </Card>
    );
  }

  if (oauthError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection failed</CardTitle>
          <CardDescription>{meta ? orgLabel(meta.orgName) : "Could not complete authorization."}</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorAlert error={oauthErrorDesc ?? oauthError} />
        </CardContent>
      </Card>
    );
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
      meta.maxUsesReached && meta.connected > 0 && !meta.expired && !meta.revoked;

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

  // ── Connected (extension signalled success) ──────────────────────────────

  if (extStage === "connected") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account connected</CardTitle>
          <CardDescription>{meta ? orgLabel(meta.orgName) : ""}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {connectedHandle
              ? <><strong className="text-foreground">@{connectedHandle}</strong> is now connected.</>
              : "Your X account is now connected."}
          </p>
          <p>You can close this tab. Admins verify the connection in the dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  // ── Main connect card ────────────────────────────────────────────────────

  return (
    <>
      {/* Noah bridge element — read by the extension content script */}
      {token && meta && (
        <div
          id="noah-invite"
          data-invite-token={token}
          data-org-name={meta.orgName}
          data-backend-url={apiBase()}
          style={{ display: "none" }}
        />
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

          {extStage === "detecting" && (
            <p className="text-sm text-muted-foreground">Checking for extension…</p>
          )}

          {extStage === "no-ext" && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3 text-sm">
              <p className="font-medium text-foreground">Install the Noah X Connector</p>
              <p className="text-muted-foreground">
                This link requires the Noah Chrome extension to automatically select and
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

          {extStage === "ready" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3 text-sm">
              {xLoggedIn === false ? (
                <>
                  <p className="font-medium text-foreground">Log into X first</p>
                  <p className="text-muted-foreground">
                    You're not logged into X. Log in at x.com, then return here and click the
                    Noah button that appears on the page.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://x.com/login" target="_blank" rel="noopener noreferrer">
                      Open x.com
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">Extension detected</p>
                  <p className="text-muted-foreground">
                    Click the floating <strong className="text-foreground">Noah</strong> button
                    on this page to select your X account and enter your XChat PIN.
                  </p>
                </>
              )}
              <p className="text-xs text-muted-foreground">Waiting for you to finish…</p>
            </div>
          )}

          {/* Fallback OAuth path (no extension) */}
          {extStage === "no-ext" && (
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
