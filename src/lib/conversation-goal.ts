import type {
  ConversationGoal,
  ConversationGoalsConfig,
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

export type GoalOptionId = "demo" | "intro" | "followup";

export interface GoalOption {
  id: GoalOptionId;
  label: string;
  template: string;
}

export const OUTREACH_STYLE_OPTIONS = [
  { id: "subtle" as const, label: "Subtle" },
  { id: "assertive" as const, label: "Assertive" },
];

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "demo",
    label: "Book a Demo",
    template:
      "Convince the user to schedule a product demo. Highlight key benefits from the reference doc and offer a clear next step to book time.",
  },
  {
    id: "intro",
    label: "Product Introduction",
    template:
      "Introduce the product to a cold lead. Explain what it does, who it's for, and why it might be relevant based on the reference doc.",
  },
  {
    id: "followup",
    label: "Follow Up",
    template:
      "Follow up on a previous conversation or interest signal. Re-engage politely, reference prior context, and nudge toward the next action.",
  },
];

export function buildGoalText(option: GoalOption): string {
  return option.template;
}

export function findGoalOptionById(id: GoalOptionId): GoalOption | undefined {
  return GOAL_OPTIONS.find(option => option.id === id);
}

export function resolveGoalOptionIdFromDetails(details: string): GoalOptionId | null {
  const trimmed = details.trim();
  if (!trimmed) return null;
  const match = GOAL_OPTIONS.find(option => option.template === trimmed);
  return match?.id ?? null;
}

export function isGoalConfigured(goalTemplateText: string): boolean {
  return goalTemplateText.trim().length > 0;
}

export function buildGoalsConfigFromTemplate(templateText: string): ConversationGoalsConfig {
  const details = templateText.trim();
  if (!details) {
    return { ...DEFAULT_CONVERSATION_GOALS };
  }
  return {
    types: ["custom"],
    details,
  };
}

export function buildGoalsConfigFromSelectedGoal(
  selectedGoalId: GoalOptionId | null,
  templateText?: string,
): ConversationGoalsConfig {
  if (templateText !== undefined) {
    return buildGoalsConfigFromTemplate(templateText);
  }
  if (!selectedGoalId) {
    return { ...DEFAULT_CONVERSATION_GOALS };
  }
  const option = findGoalOptionById(selectedGoalId);
  if (!option) {
    return { ...DEFAULT_CONVERSATION_GOALS };
  }
  return buildGoalsConfigFromTemplate(buildGoalText(option));
}

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

export function isReplyConfigDraftValid(
  systemPrompt: string,
  goalTemplateText: string,
): boolean {
  const hasPrompt = systemPrompt.trim().length > 0;
  const hasGoal = isGoalConfigured(goalTemplateText);
  return hasPrompt || hasGoal;
}

export function hasSavedReplyConfig(
  systemPrompt: string,
  goalTemplateText: string,
): boolean {
  return isReplyConfigDraftValid(systemPrompt, goalTemplateText);
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
