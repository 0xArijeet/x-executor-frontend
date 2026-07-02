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
import { analyticsApi, campaignsApi } from "@/lib/hub/api";
import type { AnalyticsOverview, CampaignListStats, CampaignSummary } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

export function CampaignsListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [stats, setStats] = useState<CampaignListStats | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
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
    Promise.all([
      campaignsApi.list(token),
      analyticsApi.overview(token),
    ])
      .then(([campaignRes, analyticsRes]) => {
        applyResponse(campaignRes);
        setOverview(analyticsRes);
      })
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

      {overview && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Reachouts" value={overview.totalReachouts.toLocaleString()} />
          <StatCard label="Total Conversations" value={overview.totalConversations.toLocaleString()} />
          <StatCard label="Total Replies Sent" value={overview.totalRepliesSent.toLocaleString()} />
          <StatCard label="Total Handoffs" value={overview.totalHandoffs.toLocaleString()} />
        </div>
      )}

      {(overview || stats) && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="No. of Campaigns" value={overview?.campaignCount ?? stats?.total ?? 0} />
          <StatCard
            label="Total Replies (Campaigns)"
            value={(overview?.totalCampaignReplies ?? stats?.totalReplies ?? 0).toLocaleString()}
          />
          <StatCard
            label="Campaign Reachouts"
            value={(overview?.totalReachouts ?? stats?.totalSent ?? 0).toLocaleString()}
          />
          <StatCard
            label="Reply Rate"
            value={overview ? `${overview.replyRate.toFixed(1)}%` : "—"}
          />
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
          {campaigns.map(campaign => {
            const replies = campaign.repliesReceived ?? 0;
            const replyRate =
              campaign.messagesSent > 0
                ? ((replies / campaign.messagesSent) * 100).toFixed(1)
                : "0.0";

            return (
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
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p className="text-muted-foreground">
                      {formatCampaignProgressLabel(campaign)}
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/orgs/${orgId}/campaigns/${campaign.id}`}>
                        {campaign.status === "draft" ? "View campaign" : "View progress"}
                      </Link>
                    </Button>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      Replies: <span className="font-medium text-foreground">{replies}</span>
                    </span>
                    <span>
                      Reply rate: <span className="font-medium text-foreground">{replyRate}%</span>
                    </span>
                    <span>
                      Targets: <span className="font-medium text-foreground">{campaign.totalTargets.toLocaleString()}</span>
                    </span>
                    <span>
                      Reached: <span className="font-medium text-foreground">{campaign.messagesSent.toLocaleString()}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
