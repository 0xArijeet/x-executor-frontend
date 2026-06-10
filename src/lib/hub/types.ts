export type OrgRole = "owner" | "admin" | "member";

export type User = {
  id: string;
  email: string;
  orgId: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
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
  name: string;
  targetUsernames: string[];
  messageText: string;
  dmsPerHour?: number;
};

export type CreateCampaignResponse = {
  id: string;
  name: string;
  status: CampaignStatus;
  totalTargets: number;
  dmsPerHour: number;
  messageText: string;
  targetUsernames: string[];
  createdAt: string;
};

export type CampaignSummary = {
  id: string;
  name: string;
  status: CampaignStatus;
  totalTargets: number;
  messagesSent: number;
  failedCount: number;
  progressPercent: number;
  createdAt: string;
  completedAt?: string;
};

export type UpdateCampaignNameResponse = {
  id: string;
  name: string;
  updatedAt: string;
};

export type CampaignStatusResponse = {
  id: string;
  orgId: string;
  name: string;
  status: CampaignStatus;
  messageText: string;
  targetUsernames: string[];
  totalTargets: number;
  dmsPerHour: number;
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

export type DmMessageDirection = "inbound" | "outbound";

export type ChatLastMessage = {
  direction: DmMessageDirection;
  text: string;
  processedAt: string;
};

export type ChatConversationSummary = {
  conversationId: string;
  recipientId: string;
  recipientUsername?: string;
  connectionId: string;
  xUsername: string;
  lastMessage: ChatLastMessage;
  messageCount: number;
};

export type PaginatedConversationsResponse = {
  data: ChatConversationSummary[];
  total: number;
  page: number;
  limit: number;
};

export type ChatMessage = {
  direction: DmMessageDirection;
  text: string;
  processedAt: string;
  recipientId: string;
  isKnownAnswer: boolean | null;
};

export type PaginatedMessagesResponse = {
  data: ChatMessage[];
  total: number;
  conversationId: string;
  page: number;
  limit: number;
};
