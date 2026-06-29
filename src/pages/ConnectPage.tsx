import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { invitesApi } from "@/lib/hub/api";
import { apiBase, oauthStartUrl, validateHubPublicBaseUrl } from "@/lib/hub/client";
import { getOAuthSuccess } from "@/lib/oauth-session";
import type { InvitePublic } from "@/lib/hub/types";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export function ConnectPage() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<InvitePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(null);
  const extTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    invitesApi
      .getPublic(token)
      .then(setMeta)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  // Listen for the extension's ready signal (posted from content script via window.postMessage).
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      if ((event.data as { type?: string })?.type === "OMNIBOT_EXT_READY") {
        setExtensionDetected(true);
        if (extTimeoutRef.current) clearTimeout(extTimeoutRef.current);
      }
    }
    window.addEventListener("message", onMessage);
    // Give the extension 2 seconds to announce itself; after that assume not installed.
    extTimeoutRef.current = setTimeout(() => {
      setExtensionDetected(prev => (prev === null ? false : prev));
    }, 2000);
    return () => {
      window.removeEventListener("message", onMessage);
      if (extTimeoutRef.current) clearTimeout(extTimeoutRef.current);
    };
  }, []);

  const invalid = meta && (meta.expired || meta.revoked || meta.maxUsesReached);
  const hubConfigError = validateHubPublicBaseUrl();
  const recentSuccess = token ? getOAuthSuccess(token) : null;
  const hubStartUrl = token && !hubConfigError ? oauthStartUrl(token) : undefined;

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

  return (
    <>
      {/* Meta tags for the extension content script. */}
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

          {extensionDetected === false && (
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

          {extensionDetected === true && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">Extension detected</p>
              <p className="text-muted-foreground">
                Open the <strong className="text-foreground">Omnibot X Connector</strong> popup in
                your browser toolbar, select the X account to connect, enter your XChat PIN, then
                authorize with X.
              </p>
            </div>
          )}

          {extensionDetected === null && (
            <p className="text-sm text-muted-foreground">Checking for extension…</p>
          )}

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
        </CardContent>
      </Card>
    </>
  );
}

function orgLabel(name: string) {
  return <>You are connecting to <strong>{name}</strong>.</>;
}
