import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { CampaignStatusBadge } from "@/components/CampaignStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { campaignsApi } from "@/lib/hub/api";
import type { CampaignSummary } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

export function CampaignsListPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    campaignsApi
      .list(token)
      .then(setCampaigns)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

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
                    <CardDescription>
                      Created {new Date(campaign.createdAt).toLocaleString()}
                      {campaign.completedAt
                        ? ` · Completed ${new Date(campaign.completedAt).toLocaleString()}`
                        : ""}
                    </CardDescription>
                  </div>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-muted-foreground">
                  {campaign.messagesSent + campaign.failedCount} of {campaign.totalTargets} processed
                  {" · "}
                  {campaign.progressPercent}% complete
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/orgs/${orgId}/campaigns/${campaign.id}`}>View progress</Link>
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
