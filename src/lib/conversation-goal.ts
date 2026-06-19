import type { ConversationGoal, ConversationGoalType, Organization } from "@/lib/hub/types";

export const DEFAULT_CONVERSATION_GOAL: ConversationGoal = {
  type: "custom",
  details: "",
  directness: 50,
};

export const GOAL_TYPE_OPTIONS: Array<{ value: ConversationGoalType; label: string }> = [
  { value: "product_signups", label: "Product sign-ups" },
  { value: "grow_discord", label: "Grow Discord" },
  { value: "grow_telegram", label: "Grow Telegram" },
  { value: "book_a_call", label: "Book a call" },
  { value: "collect_leads", label: "Collect leads" },
  { value: "drive_traffic", label: "Drive traffic" },
  { value: "custom", label: "Custom" },
];

export function directnessLabel(value: number): string {
  if (value <= 33) return "Subtle";
  if (value <= 66) return "Balanced";
  return "Direct";
}

export function goalsEqual(left: ConversationGoal, right: ConversationGoal): boolean {
  return (
    left.type === right.type &&
    left.details.trim() === right.details.trim() &&
    left.directness === right.directness
  );
}

export function resolveDraftGoal(
  org: Pick<Organization, "draftConversationGoal" | "conversationGoal">,
): ConversationGoal {
  return org.draftConversationGoal ?? org.conversationGoal ?? DEFAULT_CONVERSATION_GOAL;
}

export function hasPublishedReplyConfig(
  org: Pick<Organization, "conversationGoal" | "systemPrompt"> | null | undefined,
): boolean {
  return Boolean(org?.conversationGoal?.details?.trim() || org?.systemPrompt?.trim());
}

export function isGoalDraftValid(goal: ConversationGoal): boolean {
  return goal.details.trim().length > 0;
}
