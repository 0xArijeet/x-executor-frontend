import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

export function OAuthSuccessPage() {
  const [params] = useSearchParams();
  const xUsername = params.get("xUsername");
  const orgId = params.get("orgId");
  const xUserId = params.get("xUserId");
  const webhookId = params.get("webhookId");
  const webhookUrl = params.get("webhookUrl");

  const hasData = Boolean(xUsername || orgId);

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
            {webhookId && (
              <div>
                <dt className="text-muted-foreground">Webhook ID</dt>
                <dd className="font-mono break-all">{webhookId}</dd>
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
          You can close this window. An admin can manage this connection from the dashboard.
        </p>
        <Button variant="outline" asChild>
          <Link to="/login">Admin login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
