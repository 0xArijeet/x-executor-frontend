import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { invitesApi } from "@/lib/hub/api";
import { oauthStartUrl } from "@/lib/hub/client";
import type { InvitePublic } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function ConnectPage() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<InvitePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    invitesApi
      .getPublic(token)
      .then(setMeta)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const invalid =
    meta && (meta.expired || meta.revoked || meta.maxUsesReached);

  function handleConnect() {
    if (!token) return;
    window.location.href = oauthStartUrl(token);
  }

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

  if (invalid && meta) {
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
    <Card>
      <CardHeader>
        <CardTitle>Connect your X account</CardTitle>
        <CardDescription>
          {meta ? orgLabel(meta.orgName) : "Authorize access for this organization."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorAlert error={error} />
        <p className="text-sm text-muted-foreground">
          You will be redirected to X to sign in. No Hub account is required.
        </p>
        <Button className="w-full" size="lg" onClick={handleConnect}>
          Connect with X
        </Button>
      </CardContent>
    </Card>
  );
}

function orgLabel(name: string) {
  return <>You are connecting to <strong>{name}</strong>.</>;
}
