import { CampaignFollowerAudience } from "@/components/CampaignFollowerAudience";
import { CampaignTargetProfile } from "@/components/CampaignTargetProfile";
import { FollowerSyncStats } from "@/components/FollowerSyncStats";
import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { CampaignStatusBadge } from "@/components/CampaignStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRelativeEta, canStopCampaign, isCampaignPolling, isFollowerSyncInProgress, resolveFollowerSyncCounts } from "@/lib/campaign-utils";
import { CAMPAIGN_DAY_LABELS, minuteToTimeOption } from "@/lib/campaign-schedule";
import { isAdmin, useOrgRole } from "@/lib/auth/RequireOrgRole";
import { useAuth } from "@/lib/auth/AuthContext";
import { campaignsApi, connectionsApi } from "@/lib/hub/api";
import type { CampaignStatusResponse, Connection } from "@/lib/hub/types";
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
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [controlling, setControlling] = useState(false);

  function load() {
    if (!token || !campaignId) return;
    campaignsApi
      .getStatus(token, campaignId)
      .then(result => {
        setCampaign(result);
        setNameDraft(result.name);
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) return;
    connectionsApi
      .list(token)
      .then(setConnections)
      .catch(() => setConnections([]));
  }, [token, orgId]);

  useEffect(() => {
    load();
  }, [token, orgId, campaignId]);

  useEffect(() => {
    if (!campaign) return;
    if (!isCampaignPolling(campaign.status, campaign.syncStatus)) return;
    const intervalMs =
      campaign.status === "syncing" || campaign.syncStatus === "syncing" ? 5_000 : 15_000;
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [campaign?.status, campaign?.syncStatus, token, orgId, campaignId]);

  async function handleSaveName() {
    if (!token || !campaignId || !admin) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === campaign?.name) return;
    setNameError(null);
    setSavingName(true);
    try {
      const result = await campaignsApi.updateName(token, campaignId, trimmed);
      setCampaign(current =>
        current ? { ...current, name: result.name, updatedAt: result.updatedAt } : current,
      );
      setNameDraft(result.name);
    } catch (err) {
      setNameError(errorMessage(err));
    } finally {
      setSavingName(false);
    }
  }

  async function handleControl(action: "pause" | "resume" | "stop") {
    if (!token || !campaignId || !admin || !campaign) return;

    if (action === "stop") {
      const confirmed = confirm(
        "Stop this campaign? Pending messages will be cancelled. Messages already in flight may still send.",
      );
      if (!confirmed) return;
    }

    setControlError(null);
    setControlling(true);
    try {
      const result =
        action === "pause"
          ? await campaignsApi.pause(token, campaignId)
          : action === "resume"
            ? await campaignsApi.resume(token, campaignId)
            : await campaignsApi.stop(token, campaignId);

      setCampaign(current =>
        current
          ? {
              ...current,
              status: result.status,
              cancelledCount: result.cancelledCount,
              completedAt: result.completedAt ?? current.completedAt,
              stoppedAt: result.stoppedAt,
              updatedAt: result.updatedAt,
              remaining: action === "stop" ? 0 : current.remaining,
            }
          : current,
      );
      load();
    } catch (err) {
      setControlError(errorMessage(err));
    } finally {
      setControlling(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading campaign…</p>;
  if (!campaign) return <ErrorAlert error={error ?? "Campaign not found"} />;

  const eta = formatRelativeEta(campaign.expectedEndAt);
  const processed =
    campaign.messagesSent + campaign.failedCount + (campaign.cancelledCount ?? 0);
  const senderUsernames =
    campaign.connectionIds
      ?.map(connectionId => connections.find(c => c.id === connectionId)?.xUsername)
      .filter((username): username is string => !!username)
      .map(username => `@${username}`) ?? [];
  const senderSummary =
    senderUsernames.length > 0
      ? senderUsernames.join(", ")
      : campaign.accountsToUse
        ? `${campaign.accountsToUse} account(s)`
        : null;
  const canPause = campaign.status === "running";
  const canResume = campaign.status === "paused";
  const canStop = canStopCampaign(campaign.status);
  const isActiveDelivery =
    campaign.status === "pending" ||
    campaign.status === "running" ||
    campaign.status === "paused";
  const followerCounts =
    campaign.audienceType === "followers" ? resolveFollowerSyncCounts(campaign) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{campaign.name}</h1>
          <p className="text-muted-foreground font-mono text-xs mt-1">{campaign.id}</p>
          {campaign.audienceType === "followers" && campaign.targetUsername && (
            <div className="mt-3">
              <CampaignTargetProfile
                targetUsername={campaign.targetUsername}
                targetDisplayName={campaign.targetDisplayName}
                targetProfilePictureUrl={campaign.targetProfilePictureUrl}
                targetIsVerified={campaign.targetIsVerified}
                targetIsBlueVerified={campaign.targetIsBlueVerified}
                targetIsIdentityVerified={campaign.targetIsIdentityVerified}
                targetFollowersCount={campaign.targetFollowersCount}
              />
            </div>
          )}
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      {admin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Campaign name</CardTitle>
            <CardDescription>Rename this campaign at any time.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1 space-y-2">
              <Input
                value={nameDraft}
                maxLength={100}
                onChange={e => setNameDraft(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={
                savingName ||
                nameDraft.trim().length === 0 ||
                nameDraft.trim() === campaign.name
              }
              onClick={handleSaveName}
            >
              {savingName ? "Saving…" : "Save name"}
            </Button>
          </CardContent>
        </Card>
      )}

      <ErrorAlert error={nameError} />

      <ErrorAlert error={controlError} />

      <ErrorAlert error={error} />

      {campaign.status === "paused" && campaign.pauseReason && (
        <Card className="mb-6 border-amber-500/40">
          <CardContent className="py-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Campaign paused.</strong> {campaign.pauseReason}
          </CardContent>
        </Card>
      )}

      {followerCounts && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Follower sync</CardTitle>
            <CardDescription>
              {isFollowerSyncInProgress(campaign)
                ? "Live counts while followers are fetched from X"
                : "Final audience size for this campaign"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FollowerSyncStats
              syncedSoFar={followerCounts.syncedSoFar}
              reachableCount={followerCounts.reachableCount}
              isSyncing={followerCounts.isSyncing}
            />
          </CardContent>
        </Card>
      )}

      {campaign.audienceType === "followers" && token && campaignId && (
        <CampaignFollowerAudience
          token={token}
          campaignId={campaignId}
          campaign={campaign}
          onCampaignUpdated={load}
        />
      )}

      {admin && (canPause || canResume || canStop) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Campaign controls</CardTitle>
            <CardDescription>
              Pause to hold new sends, resume to continue, or stop to cancel remaining messages
              {campaign.status === "draft" || campaign.status === "syncing"
                ? " (including before start)."
                : "."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canPause && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={controlling}
                onClick={() => handleControl("pause")}
              >
                {controlling ? "Working…" : "Pause"}
              </Button>
            )}
            {canResume && (
              <Button
                type="button"
                size="sm"
                disabled={controlling}
                onClick={() => handleControl("resume")}
              >
                {controlling ? "Working…" : "Resume"}
              </Button>
            )}
            {canStop && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={controlling}
                onClick={() => handleControl("stop")}
              >
                {controlling ? "Working…" : "Stop"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {campaign.status === "failed" && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="py-4 text-sm">
            {campaign.audienceType === "followers" && campaign.syncStatus === "failed" ? (
              <>
                Follower sync failed{campaign.syncError ? `: ${campaign.syncError}` : "."}
              </>
            ) : (
              <>
                Campaign planning failed — usually because no connected accounts have an auth token.{" "}
                <Link to={`/orgs/${orgId}`} className="text-primary underline">
                  Configure connections
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Delivery</CardTitle>
          <CardDescription>
            {campaign.audienceType === "followers" && isFollowerSyncInProgress(campaign)
              ? "Syncing prospects — delivery starts automatically when sync completes."
              : campaign.audienceType === "followers" &&
                  campaign.syncStatus === "completed" &&
                  campaign.status === "pending" &&
                  campaign.totalTargets === 0
                ? "Starting delivery…"
                : `${processed} of ${campaign.totalTargets} processed`}
            {senderSummary ? ` · sending from ${senderSummary}` : ""}
            {eta && isActiveDelivery ? ` · ${eta}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(campaign.progressPercent, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatBlock label="Sent" value={campaign.messagesSent} />
            <StatBlock label="Failed" value={campaign.failedCount} />
            <StatBlock label="Cancelled" value={campaign.cancelledCount ?? 0} />
            <StatBlock label="Replies" value={campaign.repliesReceived} />
            <StatBlock label="Remaining" value={campaign.remaining} />
          </div>
          {campaign.expectedEndAt && isActiveDelivery && (
            <p className="text-xs text-muted-foreground">
              Estimated finish: {new Date(campaign.expectedEndAt).toLocaleString()}
            </p>
          )}
          {campaign.stoppedAt && (
            <p className="text-xs text-muted-foreground">
              Stopped: {new Date(campaign.stoppedAt).toLocaleString()}
            </p>
          )}
          {campaign.completedAt && campaign.status !== "stopped" && (
            <p className="text-xs text-muted-foreground">
              Completed: {new Date(campaign.completedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {campaign.schedule && campaign.schedule.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Schedule</CardTitle>
            <CardDescription>
              {campaign.dmsPerHour} DMs/hour per account ·{" "}
              {campaign.dailyLimitPerAccount ?? 2000} daily cap · {campaign.timezone ?? "UTC"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {campaign.schedule
              .filter(day => day.enabled)
              .map(day => (
                <p key={day.dayOfWeek} className="text-muted-foreground">
                  {CAMPAIGN_DAY_LABELS[day.dayOfWeek]}: {minuteToTimeOption(day.startMinute)} –{" "}
                  {minuteToTimeOption(day.endMinute)}
                </p>
              ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Message</CardTitle>
          <CardDescription>
            {campaign.audienceType === "followers" && isFollowerSyncInProgress(campaign)
              ? "Message preview — targets set automatically after sync"
              : `${campaign.totalTargets} targets`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3">{campaign.messageText}</p>
          {campaign.targetUsernames.length > 0 && (
            <details className="text-muted-foreground">
              <summary className="cursor-pointer text-foreground">
                Target usernames ({campaign.targetUsernames.length})
              </summary>
              <p className="mt-2 font-mono text-xs break-all">
                {campaign.targetUsernames.map(u => `@${u}`).join(", ")}
              </p>
            </details>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        {admin && (
          <>
            <Link to={`/orgs/${orgId}/campaigns`} className="text-primary underline">
              All campaigns
            </Link>
            {" · "}
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
