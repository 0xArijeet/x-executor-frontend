import type {
  ConversationGoal,
  ConversationGoalsConfig,
  ConversationGoalType,
  Organization,
  OutreachStyle,
  TeamMember,
} from "@/lib/hub/types";

export const DEFAULT_CONVERSATION_GOALS: ConversationGoalsConfig = {
  types: [],
  details: "",
};

export const DEFAULT_BOT_NAME = "Noah AI";
export const DEFAULT_ESCALATION_CONTACT = "the team";
export const DEFAULT_OUTREACH_STYLE: OutreachStyle = "subtle";

export const OUTREACH_STYLE_OPTIONS: Array<{ value: OutreachStyle; label: string }> = [
  { value: "subtle", label: "Subtle" },
  { value: "assertive", label: "Assertive" },
];

export const GOAL_TYPE_OPTIONS: Array<{ value: ConversationGoalType; label: string }> = [
  { value: "product_signups", label: "Product sign-ups" },
  { value: "grow_discord", label: "Grow Discord" },
  { value: "grow_telegram", label: "Grow Telegram" },
  { value: "book_a_call", label: "Book a call" },
  { value: "collect_leads", label: "Collect leads" },
  { value: "drive_traffic", label: "Drive traffic" },
  { value: "custom", label: "Custom" },
];

function isLegacyGoal(value: unknown): value is ConversationGoal {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.type === "string" && !Array.isArray(record.types);
}

export function migrateDirectnessToOutreachStyle(directness: number): OutreachStyle {
  return directness <= 50 ? "subtle" : "assertive";
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
    };
  } else {
    config = raw;
  }

  const types = [...new Set(config.types)];
  const details = config.details.trim();
  if (types.length === 0 || !details) return undefined;

  return { types, details };
}

export function goalsConfigEqual(
  left: ConversationGoalsConfig,
  right: ConversationGoalsConfig,
): boolean {
  const leftTypes = [...left.types].sort().join(",");
  const rightTypes = [...right.types].sort().join(",");
  return leftTypes === rightTypes && left.details.trim() === right.details.trim();
}

export function teamMembersEqual(left: TeamMember[], right: TeamMember[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((member, index) => {
    const other = right[index];
    return (
      member.username.trim().replace(/^@/, "") === other.username.trim().replace(/^@/, "") &&
      (member.role ?? "") === (other.role ?? "") &&
      (member.topics ?? "") === (other.topics ?? "")
    );
  });
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
    };
  }

  return {
    types: [...raw.types],
    details: raw.details,
  };
}

export function resolvePublishedGoals(
  org: Pick<Organization, "conversationGoals" | "conversationGoal">,
): ConversationGoalsConfig | undefined {
  return normalizeGoalsConfig(org.conversationGoals ?? org.conversationGoal);
}

export function resolveDraftOutreachStyle(org: Organization): OutreachStyle {
  if (org.draftOutreachStyle) return org.draftOutreachStyle;
  if (org.outreachStyle) return org.outreachStyle;

  const legacy =
    org.draftConversationGoals ??
    org.conversationGoals ??
    org.draftConversationGoal ??
    org.conversationGoal;
  if (legacy && typeof legacy === "object" && "directness" in legacy) {
    const directness = (legacy as ConversationGoal).directness;
    if (typeof directness === "number") {
      return migrateDirectnessToOutreachStyle(directness);
    }
  }
  return DEFAULT_OUTREACH_STYLE;
}

export function resolveDraftBotName(org: Organization): string {
  return org.draftBotName ?? org.botName ?? DEFAULT_BOT_NAME;
}

export function resolveDraftTeamMembers(org: Organization): TeamMember[] {
  const members = org.draftTeamMembers ?? org.teamMembers ?? [];
  return members.map(member => ({
    username: member.username.trim().replace(/^@/, ""),
    role: member.role?.trim() || undefined,
    topics: member.topics?.trim() || undefined,
  }));
}

export function resolveDraftEscalationContact(org: Organization): string {
  return org.draftEscalationContact ?? org.escalationContact ?? DEFAULT_ESCALATION_CONTACT;
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

export function normalizeTeamMembersForSave(members: TeamMember[]): TeamMember[] {
  return members
    .map(member => ({
      username: member.username.trim().replace(/^@/, ""),
      role: member.role?.trim() || undefined,
      topics: member.topics?.trim() || undefined,
    }))
    .filter(member => member.username.length > 0);
}
