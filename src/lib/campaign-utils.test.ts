import { expect, test } from "bun:test";
import { formatRelativeEta, isCampaignActive, parseTargetUsernames } from "./campaign-utils";

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

test("formatRelativeEta returns null when missing", () => {
  expect(formatRelativeEta(undefined)).toBeNull();
});
