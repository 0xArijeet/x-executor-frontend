import { expect, test } from "bun:test";
import {
  canStopCampaign,
  FOLLOWER_SYNC_POLL_MS,
  formatCampaignAudienceLabel,
  formatCampaignProgressLabel,
  formatRelativeEta,
  isCampaignActive,
  isCampaignPolling,
  isFollowerSyncInProgress,
  parseTargetUsernames,
  resolveFollowerSyncCounts,
} from "./campaign-utils";

test("parseTargetUsernames deduplicates and normalizes", () => {
  expect(parseTargetUsernames("@Alice\nbob, Alice\n  ")).toEqual(["alice", "bob"]);
});

test("isCampaignActive for pending, running, and paused", () => {
  expect(isCampaignActive("pending")).toBe(true);
  expect(isCampaignActive("running")).toBe(true);
  expect(isCampaignActive("paused")).toBe(true);
  expect(isCampaignActive("stopped")).toBe(false);
  expect(isCampaignActive("completed")).toBe(false);
});

test("isFollowerSyncInProgress detects active sync", () => {
  expect(isFollowerSyncInProgress({ status: "syncing", syncStatus: "syncing" })).toBe(true);
  expect(isFollowerSyncInProgress({ status: "draft", syncStatus: "completed" })).toBe(false);
  expect(FOLLOWER_SYNC_POLL_MS).toBe(3000);
});

test("canStopCampaign includes draft and syncing", () => {
  expect(canStopCampaign("draft")).toBe(true);
  expect(canStopCampaign("syncing")).toBe(true);
  expect(canStopCampaign("completed")).toBe(false);
});

test("resolveFollowerSyncCounts prefers live DB totals during sync", () => {
  expect(
    resolveFollowerSyncCounts(
      {
        status: "syncing",
        syncStatus: "syncing",
        syncedFollowerCount: 120,
        canDmFollowerCount: 45,
        totalTargets: 0,
      },
      { synced: 125, reachable: 48 },
    ),
  ).toEqual({
    syncedSoFar: 125,
    reachableCount: 48,
    isSyncing: true,
  });
});

test("resolveFollowerSyncCounts uses totalTargets once delivering", () => {
  expect(
    resolveFollowerSyncCounts({
      status: "running",
      syncedFollowerCount: 200,
      canDmFollowerCount: 80,
      totalTargets: 80,
    }),
  ).toEqual({
    syncedSoFar: 200,
    reachableCount: 80,
    isSyncing: false,
  });
});

test("formatCampaignAudienceLabel for follower campaigns", () => {
  expect(
    formatCampaignAudienceLabel({
      audienceType: "followers",
      targetUsername: "alice",
      totalTargets: 0,
      syncedFollowerCount: 42,
      canDmFollowerCount: 17,
      status: "syncing",
      syncStatus: "syncing",
    }),
  ).toContain("42 synced · 17 reachable");
});

test("formatCampaignProgressLabel for draft and syncing", () => {
  expect(
    formatCampaignProgressLabel({
      status: "syncing",
      syncedFollowerCount: 10,
      canDmFollowerCount: 4,
      totalTargets: 0,
      messagesSent: 0,
      failedCount: 0,
      progressPercent: 0,
    }),
  ).toBe("10 synced · 4 reachable — auto-starts when ready");

  expect(
    formatCampaignProgressLabel({
      status: "draft",
      totalTargets: 0,
      messagesSent: 0,
      failedCount: 0,
      progressPercent: 0,
    }),
  ).toBe("Awaiting start");
});

test("formatRelativeEta returns null when missing", () => {
  expect(formatRelativeEta(undefined)).toBeNull();
});
