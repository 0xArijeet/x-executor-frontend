import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { CampaignTargetProfile } from "@/components/CampaignTargetProfile";
import { CampaignStatusBadge } from "@/components/CampaignStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  formatCampaignAudienceLabel,
  formatCampaignProgressLabel,
  isCampaignPolling,
} from "@/lib/campaign-utils";
import { campaignsApi } from "@/lib/hub/api";
import type { CampaignListStats, CampaignSummary } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

export function CampaignsListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [stats, setStats] = useState<CampaignListStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function applyResponse(res: { data: CampaignSummary[]; stats: CampaignListStats }) {
    setCampaigns(res.data);
    setStats(res.stats);
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    campaignsApi
      .list(token)
      .then(applyResponse)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const hasPollingCampaigns = campaigns.some(campaign =>
    isCampaignPolling(campaign.status, campaign.syncStatus),
  );

  useEffect(() => {
    if (!token || !hasPollingCampaigns) return;
    const id = setInterval(() => {
      campaignsApi
        .list(token)
        .then(applyResponse)
        .catch(() => undefined);
    }, 15_000);
    return () => clearInterval(id);
  }, [token, hasPollingCampaigns]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-muted-foreground">
            Outbound DM campaigns for this organization.
          </p>
        </div>
        {orgId && (
          <Button asChild size="sm">
            <Link to={`/orgs/${orgId}/campaigns/new`}>New campaign</Link>
          </Button>
        )}
      </div>

      <ErrorAlert error={error} />

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Campaigns", value: stats.total },
            { label: "Active", value: stats.active },
            { label: "Total sent", value: stats.totalSent.toLocaleString() },
            { label: "Total replies", value: stats.totalReplies.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground space-y-2">
            <p>No campaigns yet.</p>
            <p className="text-sm">
              Create a campaign to send one message to many X users with automatic pacing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <Card key={campaign.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">
                      <Link
                        to={`/orgs/${orgId}/campaigns/${campaign.id}`}
                        className="hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="space-y-2">
                      <span>Created {new Date(campaign.createdAt).toLocaleString()}</span>
                      {campaign.audienceType === "followers" && campaign.targetUsername ? (
                        <CampaignTargetProfile
                          targetUsername={campaign.targetUsername}
                          targetDisplayName={campaign.targetDisplayName}
                          targetProfilePictureUrl={campaign.targetProfilePictureUrl}
                          targetIsVerified={campaign.targetIsVerified}
                          targetIsBlueVerified={campaign.targetIsBlueVerified}
                          targetIsIdentityVerified={campaign.targetIsIdentityVerified}
                          targetFollowersCount={campaign.targetFollowersCount}
                          size="sm"
                        />
                      ) : formatCampaignAudienceLabel(campaign) ? (
                        <span>{formatCampaignAudienceLabel(campaign)}</span>
                      ) : null}
                      {campaign.completedAt
                        ? `Completed ${new Date(campaign.completedAt).toLocaleString()}`
                        : ""}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {campaign.audienceType === "followers" && (
                      <Badge variant="outline">Followers</Badge>
                    )}
                    <CampaignStatusBadge status={campaign.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-muted-foreground">
                  {formatCampaignProgressLabel(campaign)}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/orgs/${orgId}/campaigns/${campaign.id}`}>
                    {campaign.status === "draft" ? "View campaign" : "View progress"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link to={`/orgs/${orgId}`} className="text-primary underline">
          Back to connections
        </Link>
      </p>
    </div>
  );
}
