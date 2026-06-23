export function parseTargetUsernames(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,]+/)
        .map(u => u.trim().replace(/^@/, "").toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function formatRelativeEta(expectedEndAt: string | undefined): string | null {
  if (!expectedEndAt) return null;
  const ms = new Date(expectedEndAt).getTime() - Date.now();
  if (ms <= 0) return "Any moment now";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `~${minutes} min remaining`;
  const hours = Math.ceil(minutes / 60);
  return `~${hours} hr remaining`;
}

export function isCampaignActive(status: string): boolean {
  return status === "pending" || status === "running" || status === "paused";
}

export function isCampaignPolling(status: string, syncStatus?: string): boolean {
  return (
    isCampaignActive(status) ||
    status === "syncing" ||
    syncStatus === "syncing"
  );
}

export function isFollowerSyncInProgress(campaign: {
  status: string;
  syncStatus?: string;
}): boolean {
  return campaign.status === "syncing" || campaign.syncStatus === "syncing";
}

export const FOLLOWER_SYNC_POLL_MS = 3_000;

export function resolveFollowerSyncCounts(
  campaign: {
    status: string;
    syncStatus?: string;
    syncedFollowerCount?: number;
    canDmFollowerCount?: number;
    totalTargets: number;
  },
  live?: { synced?: number; reachable?: number },
): { syncedSoFar: number; reachableCount: number; isSyncing: boolean } {
  const isSyncing = isFollowerSyncInProgress(campaign);
  const isDelivering =
    campaign.status === "pending" ||
    campaign.status === "running" ||
    campaign.status === "paused";

  const syncedSoFar = Math.max(campaign.syncedFollowerCount ?? 0, live?.synced ?? 0);
  const reachableCount = isDelivering
    ? campaign.totalTargets
    : Math.max(campaign.canDmFollowerCount ?? 0, live?.reachable ?? 0);

  return { syncedSoFar, reachableCount, isSyncing };
}

export function canStopCampaign(status: string): boolean {
  return ["pending", "running", "paused", "draft", "syncing"].includes(status);
}

export function formatCampaignAudienceLabel(campaign: {
  audienceType?: string;
  targetUsername?: string;
  totalTargets: number;
  syncedFollowerCount?: number;
  canDmFollowerCount?: number;
  status: string;
  syncStatus?: string;
}): string | null {
  if (campaign.audienceType === "followers") {
    const target = campaign.targetUsername ? `@${campaign.targetUsername}` : "target account";
    const { syncedSoFar, reachableCount } = resolveFollowerSyncCounts(campaign);
    if (campaign.status === "syncing") {
      return `Followers of ${target} · ${syncedSoFar} synced · ${reachableCount} reachable`;
    }
    if (campaign.status === "draft") {
      return `Followers of ${target} · awaiting start`;
    }
    if (
      campaign.syncStatus === "completed" &&
      (campaign.status === "pending" ||
        campaign.status === "running" ||
        campaign.status === "paused")
    ) {
      return `Followers of ${target} · ${campaign.totalTargets} prospect(s)`;
    }
    return `Followers of ${target}`;
  }
  if (campaign.totalTargets > 0) {
    return `${campaign.totalTargets} manual target(s)`;
  }
  return null;
}

export function formatCampaignProgressLabel(campaign: {
  status: string;
  syncStatus?: string;
  syncedFollowerCount?: number;
  canDmFollowerCount?: number;
  totalTargets: number;
  messagesSent: number;
  failedCount: number;
  progressPercent: number;
}): string {
  if (campaign.status === "syncing") {
    const { syncedSoFar, reachableCount } = resolveFollowerSyncCounts(campaign);
    return `${syncedSoFar} synced · ${reachableCount} reachable — auto-starts when ready`;
  }
  if (campaign.status === "draft") {
    return "Awaiting start";
  }
  const processed = campaign.messagesSent + campaign.failedCount;
  return `${processed} of ${campaign.totalTargets} processed · ${campaign.progressPercent}% complete`;
}
