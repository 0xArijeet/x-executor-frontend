import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveOAuthSuccess } from "@/lib/oauth-session";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

export function OAuthSuccessPage() {
  const [params] = useSearchParams();
  const oauthError = params.get("error");
  const oauthErrorDescription = params.get("error_description");
  const xUsername = params.get("xUsername");
  const orgId = params.get("orgId");
  const xUserId = params.get("xUserId");
  const webhookUrl = params.get("webhookUrl");
  const subscribed = params.get("subscribed");
  const inviteToken = params.get("invite");

  const hasData = Boolean(xUsername || orgId);

  useEffect(() => {
    if (xUsername && inviteToken) {
      saveOAuthSuccess(inviteToken, xUsername);
    }
  }, [xUsername, inviteToken]);

  if (oauthError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection failed</CardTitle>
          <CardDescription>X did not complete authorization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{oauthErrorDescription ?? oauthError}</p>
          <p className="text-muted-foreground">
            Ask your admin to verify Hub <code className="text-xs">X_REDIRECT_URI</code> matches the X Developer
            Portal callback URL, then open the invite link again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>OAuth redirect incomplete</CardTitle>
          <CardDescription>
            This page did not receive connection details from Hub.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            If you just authorized on X, Hub may have the wrong{" "}
            <code className="text-xs">OAUTH_SUCCESS_REDIRECT_URL</code>. It must be exactly:
          </p>
          <p className="font-mono text-xs break-all">
            https://&lt;your-vercel-app&gt;/oauth/success
          </p>
          <p>Do not point it at <code className="text-xs">/connect</code> or <code className="text-xs">/login</code>.</p>
          <p>Ask your admin to fix Hub env, redeploy Hub, and send a new invite link.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <CardTitle>Connected successfully</CardTitle>
        </div>
        <CardDescription>
          {xUsername ? (
            <>Your X account <strong>@{xUsername}</strong> is now linked.</>
          ) : (
            "Your X account is now linked to the organization."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData && (
          <dl className="space-y-2 text-sm">
            {orgId && (
              <div>
                <dt className="text-muted-foreground">Organization ID</dt>
                <dd className="font-mono break-all">{orgId}</dd>
              </div>
            )}
            {xUserId && (
              <div>
                <dt className="text-muted-foreground">X user ID</dt>
                <dd className="font-mono break-all">{xUserId}</dd>
              </div>
            )}
            {subscribed !== null && (
              <div>
                <dt className="text-muted-foreground">X subscription</dt>
                <dd>{subscribed === "true" ? "Active" : "Pending — check Hub logs"}</dd>
              </div>
            )}
            {webhookUrl && (
              <div>
                <dt className="text-muted-foreground">Webhook URL</dt>
                <dd>
                  <a href={webhookUrl} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                    {webhookUrl}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        )}
        <p className="text-sm text-muted-foreground">
          You can close this window. An admin must set the <strong className="text-foreground">auth token</strong> and{" "}
          <strong className="text-foreground">XChat PIN</strong> on this connection before automated DM replies work.
        </p>
        <Button variant="outline" asChild>
          <Link to="/login">Admin login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
