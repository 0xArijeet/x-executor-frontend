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
import type { CampaignDailyStat, CampaignStatusResponse, CampaignScheduleDay, ContactedUser, UpdateCampaignSettingsInput } from "@/lib/hub/types";
import type { Connection } from "@/lib/hub/types";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
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
  const [dailyStats, setDailyStats] = useState<CampaignDailyStat[]>([]);
  const [contactedUsers, setContactedUsers] = useState<ContactedUser[]>([]);
  const [contactedTotal, setContactedTotal] = useState(0);
  const [contactedPage, setContactedPage] = useState(1);
  const [loadingContacted, setLoadingContacted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<UpdateCampaignSettingsInput>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const dailyStatsFetched = useRef(false);

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

  useEffect(() => {
    if (!token || !campaignId || dailyStatsFetched.current) return;
    dailyStatsFetched.current = true;
    campaignsApi.getDailyStats(token, campaignId).then(setDailyStats).catch(() => {});
  }, [token, campaignId]);

  useEffect(() => {
    if (!token || !campaignId) return;
    setLoadingContacted(true);
    campaignsApi
      .getContactedUsers(token, campaignId, { page: contactedPage, limit: 25 })
      .then(res => { setContactedUsers(res.data); setContactedTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoadingContacted(false));
  }, [token, campaignId, contactedPage]);

  async function handleSaveSettings() {
    if (!token || !campaignId || !admin) return;
    setSavingSettings(true);
    setSettingsError(null);
    try {
      const result = await campaignsApi.updateSettings(token, campaignId, settingsDraft);
      setCampaign(current =>
        current
          ? {
              ...current,
              dmsPerHour: result.dmsPerHour,
              dailyLimitPerAccount: result.dailyLimitPerAccount ?? current.dailyLimitPerAccount,
              schedule: (result.schedule as CampaignScheduleDay[] | undefined) ?? current.schedule,
            }
          : current,
      );
      setSettingsOpen(false);
    } catch (err) {
      setSettingsError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading campaign…</p>;
  if (!campaign) return <ErrorAlert error={error ?? "Campaign not found"} />;

  const eta = formatRelativeEta(campaign.expectedEndAt);
  const processed =
    campaign.messagesSent + campaign.failedCount + (campaign.cancelledCount ?? 0);
  const replyRate =
    campaign.messagesSent > 0
      ? ((campaign.repliesReceived / campaign.messagesSent) * 100).toFixed(1) + "%"
      : "—";
  const maxDailySent = Math.max(...dailyStats.map(d => d.sent), 1);
  const contactedPageCount = Math.ceil(contactedTotal / 25);
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatBlock label="Sent" value={campaign.messagesSent} />
            <StatBlock label="Failed" value={campaign.failedCount} />
            <StatBlock label="Cancelled" value={campaign.cancelledCount ?? 0} />
            <StatBlock label="Replies" value={campaign.repliesReceived} />
            <StatBlock label="Reply rate" value={replyRate} />
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

      {dailyStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Messages per day</CardTitle>
            <CardDescription>DMs sent each calendar day (UTC)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24 overflow-x-auto">
              {dailyStats.map(stat => (
                <div
                  key={stat.date}
                  className="flex flex-col items-center gap-0.5 min-w-[2rem] flex-1 group relative"
                  title={`${stat.date}: ${stat.sent} sent, ${stat.failed} failed`}
                >
                  <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                    <div
                      className="w-full bg-primary rounded-t-sm"
                      style={{ height: `${Math.round((stat.sent / maxDailySent) * 80)}px` }}
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground rotate-45 origin-left mt-1 whitespace-nowrap">
                    {stat.date.slice(5)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {campaign.schedule && campaign.schedule.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Schedule</CardTitle>
                <CardDescription>
                  {campaign.dmsPerHour} DMs/hour per account ·{" "}
                  {campaign.dailyLimitPerAccount ?? 400} daily cap · {campaign.timezone ?? "UTC"}
                </CardDescription>
              </div>
              {admin && !["completed", "stopped", "failed"].includes(campaign.status) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSettingsDraft({
                      dmsPerHour: campaign.dmsPerHour,
                      dailyLimitPerAccount: campaign.dailyLimitPerAccount,
                    });
                    setSettingsOpen(o => !o);
                  }}
                >
                  {settingsOpen ? "Cancel" : "Edit rate"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-sm">
              {campaign.schedule
                .filter(day => day.enabled)
                .map(day => (
                  <p key={day.dayOfWeek} className="text-muted-foreground">
                    {CAMPAIGN_DAY_LABELS[day.dayOfWeek]}: {minuteToTimeOption(day.startMinute)} –{" "}
                    {minuteToTimeOption(day.endMinute)}
                  </p>
                ))}
            </div>
            {settingsOpen && (
              <div className="border-t border-border pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div className="space-y-1">
                    <Label htmlFor="dmsPerHour">DMs / hour</Label>
                    <Input
                      id="dmsPerHour"
                      type="number"
                      min={1}
                      max={1000}
                      value={settingsDraft.dmsPerHour ?? ""}
                      onChange={e =>
                        setSettingsDraft(d => ({
                          ...d,
                          dmsPerHour: parseInt(e.target.value, 10) || undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dailyCap">Daily cap / account</Label>
                    <Input
                      id="dailyCap"
                      type="number"
                      min={1}
                      max={10000}
                      value={settingsDraft.dailyLimitPerAccount ?? ""}
                      onChange={e =>
                        setSettingsDraft(d => ({
                          ...d,
                          dailyLimitPerAccount: parseInt(e.target.value, 10) || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
                <ErrorAlert error={settingsError} />
                <Button
                  type="button"
                  size="sm"
                  disabled={savingSettings}
                  onClick={handleSaveSettings}
                >
                  {savingSettings ? "Saving…" : "Save rate"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {contactedTotal > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Contacted users</CardTitle>
            <CardDescription>{contactedTotal.toLocaleString()} users received a DM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingContacted ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Username</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Sent at</th>
                      <th className="pb-2 font-medium">Replied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactedUsers.map((user, i) => (
                      <tr key={`${user.recipientUsername}-${i}`} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">@{user.recipientUsername}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              user.status === "sent"
                                ? "bg-green-500/10 text-green-600"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">
                          {user.sentAt ? new Date(user.sentAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 text-xs">
                          {user.replyReceived ? "✓" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {contactedPageCount > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={contactedPage <= 1}
                  onClick={() => setContactedPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  {contactedPage} / {contactedPageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={contactedPage >= contactedPageCount}
                  onClick={() => setContactedPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
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
