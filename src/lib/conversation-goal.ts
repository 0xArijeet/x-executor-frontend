import type {
  ConversationGoal,
  ConversationGoalsConfig,
  ConversationGoalType,
  Organization,
} from "@/lib/hub/types";

export const DEFAULT_CONVERSATION_GOALS: ConversationGoalsConfig = {
  types: [],
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

function isLegacyGoal(value: unknown): value is ConversationGoal {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.type === "string" && !Array.isArray(record.types);
}

export function normalizeGoalsConfig(
  raw: ConversationGoalsConfig | ConversationGoal | undefined,
): ConversationGoalsConfig | undefined {
  if (!raw) return undefined;

  let config: ConversationGoalsConfig;
  if (isLegacyGoal(raw)) {
    config = {
      types: [raw.type],
      details: raw.details,
      directness: raw.directness,
    };
  } else {
    config = raw;
  }

  const types = [...new Set(config.types)];
  const details = config.details.trim();
  if (types.length === 0 || !details) return undefined;

  return { types, details, directness: config.directness };
}

export function goalsConfigEqual(
  left: ConversationGoalsConfig,
  right: ConversationGoalsConfig,
): boolean {
  const leftTypes = [...left.types].sort().join(",");
  const rightTypes = [...right.types].sort().join(",");
  return (
    leftTypes === rightTypes &&
    left.details.trim() === right.details.trim() &&
    left.directness === right.directness
  );
}

export function resolveDraftGoals(
  org: Pick<
    Organization,
    | "draftConversationGoals"
    | "conversationGoals"
    | "draftConversationGoal"
    | "conversationGoal"
  >,
): ConversationGoalsConfig {
  const raw =
    org.draftConversationGoals ??
    org.conversationGoals ??
    org.draftConversationGoal ??
    org.conversationGoal;
  if (!raw) return { ...DEFAULT_CONVERSATION_GOALS };

  if (isLegacyGoal(raw)) {
    return {
      types: [raw.type],
      details: raw.details,
      directness: raw.directness,
    };
  }

  return {
    types: [...raw.types],
    details: raw.details,
    directness: raw.directness,
  };
}

export function resolvePublishedGoals(
  org: Pick<Organization, "conversationGoals" | "conversationGoal">,
): ConversationGoalsConfig | undefined {
  return normalizeGoalsConfig(org.conversationGoals ?? org.conversationGoal);
}

export function hasPublishedReplyConfig(
  org: Pick<Organization, "conversationGoals" | "conversationGoal" | "systemPrompt"> | null | undefined,
): boolean {
  return Boolean(normalizeGoalsConfig(org?.conversationGoals ?? org?.conversationGoal) || org?.systemPrompt?.trim());
}

export function isGoalsSelectionValid(goals: ConversationGoalsConfig): boolean {
  return goals.types.length === 0 || goals.details.trim().length > 0;
}

export function isReplyConfigDraftValid(systemPrompt: string, goals: ConversationGoalsConfig): boolean {
  const hasPrompt = systemPrompt.trim().length > 0;
  const hasGoals = goals.types.length > 0 && goals.details.trim().length > 0;
  if (goals.types.length > 0 && !goals.details.trim()) return false;
  return hasPrompt || hasGoals;
}

export function toggleGoalType(
  types: ConversationGoalType[],
  value: ConversationGoalType,
): ConversationGoalType[] {
  return types.includes(value) ? types.filter(type => type !== value) : [...types, value];
}

export function hasSavedReplyConfig(systemPrompt: string, goals: ConversationGoalsConfig): boolean {
  return isReplyConfigDraftValid(systemPrompt, goals);
}
