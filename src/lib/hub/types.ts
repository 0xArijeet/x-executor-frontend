export type OrgRole = "owner" | "admin" | "member";

export type User = {
  id: string;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
};

export type Organization = {
  id: string;
  name: string;
  slug?: string;
  systemPrompt?: string;
  unknownReply?: string;
  createdBy: string;
  createdAt?: string;
};

export type OrganizationWithRole = Organization & {
  role: OrgRole;
};

export type Member = {
  userId: string;
  email?: string;
  role: OrgRole;
  joinedAt?: string;
};

export type Invite = {
  id: string;
  inviteToken: string;
  inviteUrl: string;
  expiresAt: string;
  maxUses?: number;
  useCount?: number;
  expired?: boolean;
  createdAt?: string;
};

export type InvitePublic = {
  orgName: string;
  expired: boolean;
  revoked: boolean;
  maxUsesReached: boolean;
  useCount?: number;
  maxUses?: number | null;
};

export type Connection = {
  id: string;
  xUserId: string;
  xUsername: string;
  scopes: string[];
  connectedAt: string;
  tokenExpiresAt?: string;
  webhookUrl?: string;
  subscribed?: boolean;
  hasAuthToken: boolean;
  hasXchatPin: boolean;
};

export type CreateInviteInput = {
  expiresInHours?: number;
  maxUses?: number;
};

export type UpdatePromptInput = {
  systemPrompt?: string;
  unknownReply?: string;
};

export type CreateOrgInput = {
  name: string;
  slug?: string;
};

export type CampaignStatus = "pending" | "running" | "completed" | "failed";

export type CreateCampaignInput = {
  targetUsernames: string[];
  messageText: string;
};

export type CreateCampaignResponse = {
  id: string;
  status: CampaignStatus;
  totalTargets: number;
  messageText: string;
  targetUsernames: string[];
  createdAt: string;
};

export type CampaignStatusResponse = {
  id: string;
  orgId: string;
  status: CampaignStatus;
  messageText: string;
  targetUsernames: string[];
  totalTargets: number;
  messagesScheduled: number;
  messagesSent: number;
  repliesReceived: number;
  failedCount: number;
  remaining: number;
  progressPercent: number;
  startedAt?: string;
  expectedEndAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};
