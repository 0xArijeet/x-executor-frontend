import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FOLLOWER_SYNC_POLL_MS,
  isFollowerSyncInProgress,
  resolveFollowerSyncCounts,
} from "@/lib/campaign-utils";
import { campaignsApi } from "@/lib/hub/api";
import type { CampaignFollower, CampaignStatusResponse } from "@/lib/hub/types";
import { useCallback, useEffect, useState } from "react";

type CampaignFollowerAudienceProps = {
  token: string;
  campaignId: string;
  campaign: CampaignStatusResponse;
  onCampaignUpdated: () => void;
};

const PAGE_SIZE = 50;

export function CampaignFollowerAudience({
  token,
  campaignId,
  campaign,
  onCampaignUpdated,
}: CampaignFollowerAudienceProps) {
  const [followers, setFollowers] = useState<CampaignFollower[]>([]);
  const [total, setTotal] = useState(0);
  const [prospectTotal, setProspectTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [canDmOnly, setCanDmOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSyncing = isFollowerSyncInProgress(campaign);
  const syncComplete = campaign.syncStatus === "completed";
  const isDelivering =
    campaign.status === "pending" ||
    campaign.status === "running" ||
    campaign.status === "paused";
  const showFollowerList = isSyncing || syncComplete || total > 0;

  const loadFollowers = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) return;

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [result, prospectResult] = await Promise.all([
          campaignsApi.listFollowers(token, campaignId, {
            page,
            limit: PAGE_SIZE,
            canDm: canDmOnly ? true : undefined,
            q: search.trim() || undefined,
          }),
          campaignsApi.listFollowers(token, campaignId, {
            page: 1,
            limit: 1,
            canDm: true,
          }),
        ]);
        setFollowers(result.data);
        setTotal(result.total);
        setProspectTotal(prospectResult.total);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, campaignId, page, canDmOnly, search],
  );

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  useEffect(() => {
    if (!isSyncing) return;

    const poll = () => {
      void loadFollowers({ silent: true });
      onCampaignUpdated();
    };

    const id = setInterval(poll, FOLLOWER_SYNC_POLL_MS);
    return () => clearInterval(id);
  }, [isSyncing, loadFollowers, onCampaignUpdated]);

  const { syncedSoFar, reachableCount } = resolveFollowerSyncCounts(campaign, {
    synced: total,
    reachable: prospectTotal,
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">Follower prospects</CardTitle>
          {isSyncing && (
            <Badge variant="secondary" className="animate-pulse">
              Live sync
            </Badge>
          )}
          {isDelivering && (
            <Badge variant="outline">Auto-started</Badge>
          )}
        </div>
        <CardDescription>
          {campaign.targetUsername ? `@${campaign.targetUsername}` : "Target account"}
          {isSyncing
            ? " · campaign starts automatically when sync finishes"
            : isDelivering
              ? ` · sending to ${campaign.totalTargets || reachableCount} prospect(s)`
              : ""}
          {isSyncing && refreshing ? " · updating…" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaign.syncError && (
          <p className="text-sm text-destructive">Sync failed: {campaign.syncError}</p>
        )}

        {!isSyncing && syncComplete && prospectTotal === 0 && campaign.status === "failed" && (
          <p className="text-sm text-muted-foreground">
            No followers with open DMs were found for this account.
          </p>
        )}

        {!isSyncing && syncComplete && prospectTotal > 0 && (
          <p className="text-sm text-muted-foreground">
            Followers who can receive DMs are included automatically — no manual selection needed.
          </p>
        )}

        <ErrorAlert error={error} />

        {showFollowerList && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search followers"
                value={search}
                onChange={e => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="max-w-xs"
                disabled={isSyncing && loading}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={canDmOnly}
                  onChange={e => {
                    setPage(1);
                    setCanDmOnly(e.target.checked);
                  }}
                  disabled={isSyncing && loading}
                />
                Can DM only
              </label>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">
                {isSyncing ? "Loading synced followers…" : "Loading followers…"}
              </p>
            ) : followers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isSyncing
                  ? "Waiting for the first followers — they will appear here as they sync."
                  : "No followers match your filters."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Can DM</th>
                      <th className="px-3 py-2">Included</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followers.map(follower => (
                      <tr key={follower.id} className="border-t border-border">
                        <td className="px-3 py-2 font-mono">@{follower.userName}</td>
                        <td className="px-3 py-2">{follower.name}</td>
                        <td className="px-3 py-2">
                          {follower.canDm ? (
                            <Badge variant="outline">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {follower.canDm ? (
                            <Badge>Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} · {total} shown · {syncedSoFar} synced · {reachableCount} reachable
                {isSyncing ? " (live)" : ""}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(current => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page * PAGE_SIZE >= total || loading}
                  onClick={() => setPage(current => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Up to ~800 followers are synced per target account. Only prospects with open DMs are
          messaged.
        </p>
      </CardContent>
    </Card>
  );
}
