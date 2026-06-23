import { describe, expect, it } from "vitest";
import {
  migrateDirectnessToOutreachStyle,
  normalizeGoalsConfig,
  resolveDraftOutreachStyle,
} from "@/lib/conversation-goal";

describe("conversation-goal helpers", () => {
  it("normalizes goals without directness", () => {
    expect(
      normalizeGoalsConfig({
        types: ["grow_discord"],
        details: "Invite users naturally.",
      }),
    ).toEqual({
      types: ["grow_discord"],
      details: "Invite users naturally.",
    });
  });

  it("migrates legacy directness to outreach style", () => {
    expect(migrateDirectnessToOutreachStyle(20)).toBe("subtle");
    expect(migrateDirectnessToOutreachStyle(80)).toBe("assertive");
  });

  it("reads outreach style from legacy goal directness", () => {
    expect(
      resolveDraftOutreachStyle({
        id: "org-1",
        name: "Test",
        createdBy: "user-1",
        draftConversationGoals: {
          types: ["custom"],
          details: "Goal",
          directness: 90,
        },
      }),
    ).toBe("assertive");
  });
});
