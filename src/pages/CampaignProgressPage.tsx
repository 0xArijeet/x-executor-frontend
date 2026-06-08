import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { CampaignStatusBadge } from "@/components/CampaignStatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeEta, isCampaignActive } from "@/lib/campaign-utils";
import { isAdmin, useOrgRole } from "@/lib/auth/RequireOrgRole";
import { useAuth } from "@/lib/auth/AuthContext";
import { campaignsApi } from "@/lib/hub/api";
import type { CampaignStatusResponse } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function StatBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function CampaignProgressPage() {
  const { orgId, campaignId } = useParams<{ orgId: string; campaignId: string }>();
  const { token } = useAuth();
  const role = useOrgRole(orgId);
  const admin = isAdmin(role);
  const [campaign, setCampaign] = useState<CampaignStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token || !orgId || !campaignId) return;
    campaignsApi
      .getStatus(token, orgId, campaignId)
      .then(setCampaign)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token, orgId, campaignId]);

  useEffect(() => {
    if (!campaign || !isCampaignActive(campaign.status)) return;
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [campaign?.status, token, orgId, campaignId]);

  if (loading) return <p className="text-muted-foreground">Loading campaign…</p>;
  if (!campaign) return <ErrorAlert error={error ?? "Campaign not found"} />;

  const eta = formatRelativeEta(campaign.expectedEndAt);
  const processed = campaign.messagesSent + campaign.failedCount;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Campaign progress</h1>
          <p className="text-muted-foreground font-mono text-xs mt-1">{campaign.id}</p>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      <ErrorAlert error={error} />

      {campaign.status === "failed" && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="py-4 text-sm">
            Campaign planning failed — usually because no connected accounts have an auth token.{" "}
            <Link to={`/orgs/${orgId}`} className="text-primary underline">
              Configure connections
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Delivery</CardTitle>
          <CardDescription>
            {processed} of {campaign.totalTargets} processed
            {eta && isCampaignActive(campaign.status) ? ` · ${eta}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(campaign.progressPercent, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBlock label="Sent" value={campaign.messagesSent} />
            <StatBlock label="Failed" value={campaign.failedCount} />
            <StatBlock label="Replies" value={campaign.repliesReceived} />
            <StatBlock label="Remaining" value={campaign.remaining} />
          </div>
          {campaign.expectedEndAt && isCampaignActive(campaign.status) && (
            <p className="text-xs text-muted-foreground">
              Estimated finish: {new Date(campaign.expectedEndAt).toLocaleString()}
            </p>
          )}
          {campaign.completedAt && (
            <p className="text-xs text-muted-foreground">
              Completed: {new Date(campaign.completedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Message</CardTitle>
          <CardDescription>{campaign.totalTargets} targets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3">{campaign.messageText}</p>
          <details className="text-muted-foreground">
            <summary className="cursor-pointer text-foreground">Target usernames ({campaign.targetUsernames.length})</summary>
            <p className="mt-2 font-mono text-xs break-all">
              {campaign.targetUsernames.map(u => `@${u}`).join(", ")}
            </p>
          </details>
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        {admin && (
          <>
            <Link to={`/orgs/${orgId}/campaigns/new`} className="text-primary underline">
              New campaign
            </Link>
            {" · "}
          </>
        )}
        <Link to={`/orgs/${orgId}`} className="text-primary underline">
          Connections
        </Link>
      </p>
    </div>
  );
}
