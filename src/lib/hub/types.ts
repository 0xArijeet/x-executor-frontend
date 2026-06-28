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

export type OutreachStyle = "subtle" | "assertive";

export type TeamMember = {
  username: string;
  role?: string;
  topics?: string;
};

export type Organization = {
  id: string;
  orgId?: string;
  name: string;
  slug?: string;
  systemPrompt?: string;
  draftSystemPrompt?: string;
  conversationGoals?: ConversationGoalsConfig;
  draftConversationGoals?: ConversationGoalsConfig;
  /** @deprecated Legacy single goal from older API responses */
  conversationGoal?: ConversationGoal;
  /** @deprecated Legacy single goal draft from older API responses */
  draftConversationGoal?: ConversationGoal;
  botName?: string;
  draftBotName?: string;
  outreachStyle?: OutreachStyle;
  draftOutreachStyle?: OutreachStyle;
  teamMembers?: TeamMember[];
  draftTeamMembers?: TeamMember[];
  escalationContact?: string;
  draftEscalationContact?: string;
  hasUnpublishedDraft?: boolean;
  promptPublishedAt?: string;
  llmModel?: string;
  draftLlmModel?: string;
  handoffEnabled?: boolean;
  handoffConfig?: string;
  handoffMessage?: string;
  createdBy: string;
  createdAt?: string;
};

export type ConversationGoalType =
  | "product_signups"
  | "grow_discord"
  | "grow_telegram"
  | "book_a_call"
  | "collect_leads"
  | "drive_traffic"
  | "custom";

export type ConversationGoalsConfig = {
  types: ConversationGoalType[];
  details: string;
};

/** @deprecated Legacy single goal shape */
export type ConversationGoal = {
  type: ConversationGoalType;
  details: string;
  /** @deprecated Migrated to org-level outreachStyle */
  directness?: number;
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
  displayName?: string;
  profilePictureUrl?: string;
  scopes: string[];
  connectedAt: string;
  tokenExpiresAt?: string;
  webhookUrl?: string;
  subscribed?: boolean;
  hasAuthToken: boolean;
  authTokenInvalid?: boolean;
  authTokenRequired?: boolean;
  hasXchatPin: boolean;
};

export type ValidateConnectionResponse = {
  valid: boolean;
  error?: string;
};

export type CreateInviteInput = {
  expiresInHours?: number;
  maxUses?: number;
};

export type UpdatePromptInput = {
  systemPrompt?: string;
  llmModel?: string;
};

export type UpdateConversationGoalInput = {
  goalTypes: ConversationGoalType[];
  goalDetails: string;
  outreachStyle?: OutreachStyle;
  botName?: string;
  teamMembers?: TeamMember[];
  escalationContact?: string;
  systemPrompt?: string;
  llmModel?: string;
};

export type UpdateHandoffInput = {
  handoffEnabled: boolean;
  handoffConfig?: string;
  handoffMessage?: string;
};

export type LlmModelOption = {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
};

export type ChatTestInput = {
  userMessage: string;
  systemPrompt?: string;
  llmModel?: string;
};

export type ChatTestResponse = {
  action: "reply" | "skip";
  message: string;
  handoffSummary?: string;
  handoffTo?: string;
  notifyTeam: boolean;
};

export type CreateOrgInput = {
  name: string;
  slug?: string;
};

export type CampaignStatus =
  | "syncing"
  | "draft"
  | "pending"
  | "running"
  | "paused"
  | "stopped"
  | "completed"
  | "failed";

export type CampaignAudienceType = "manual" | "followers" | "lead_list";

export type CampaignSyncStatus = "pending" | "syncing" | "completed" | "failed";

export type CampaignScheduleDay = {
  dayOfWeek: number;
  enabled: boolean;
  startMinute: number;
  endMinute: number;
};

export type CreateCampaignInput = {
  name: string;
  audienceType?: CampaignAudienceType;
  targetUsername?: string;
  targetUsernames?: string[];
  targetDisplayName?: string;
  targetProfilePictureUrl?: string;
  targetIsVerified?: boolean;
  targetIsBlueVerified?: boolean;
  targetIsIdentityVerified?: boolean;
  targetFollowersCount?: number;
  messageText: string;
  dmsPerHour?: number;
  dailyLimitPerAccount?: number;
  timezone?: string;
  schedule?: CampaignScheduleDay[];
  accountsToUse?: number;
  connectionIds?: string[];
};

export type CreateCampaignResponse = {
  id: string;
  name: string;
  status: CampaignStatus;
  audienceType?: CampaignAudienceType;
  targetUsername?: string;
  targetDisplayName?: string;
  targetProfilePictureUrl?: string;
  targetIsVerified?: boolean;
  targetIsBlueVerified?: boolean;
  targetIsIdentityVerified?: boolean;
  targetFollowersCount?: number;
  syncStatus?: CampaignSyncStatus;
  syncedFollowerCount?: number;
  canDmFollowerCount?: number;
  syncError?: string;
  totalTargets: number;
  dmsPerHour: number;
  dailyLimitPerAccount?: number;
  timezone?: string;
  schedule?: CampaignScheduleDay[];
  accountsToUse?: number;
  connectionIds?: string[];
  messageText: string;
  targetUsernames: string[];
  createdAt: string;
};

export type CampaignSummary = {
  id: string;
  name: string;
  status: CampaignStatus;
  audienceType?: CampaignAudienceType;
  targetUsername?: string;
  targetDisplayName?: string;
  targetProfilePictureUrl?: string;
  targetIsVerified?: boolean;
  targetIsBlueVerified?: boolean;
  targetIsIdentityVerified?: boolean;
  targetFollowersCount?: number;
  syncStatus?: CampaignSyncStatus;
  syncedFollowerCount?: number;
  canDmFollowerCount?: number;
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
  audienceType?: CampaignAudienceType;
  targetUsername?: string;
  targetDisplayName?: string;
  targetProfilePictureUrl?: string;
  targetIsVerified?: boolean;
  targetIsBlueVerified?: boolean;
  targetIsIdentityVerified?: boolean;
  targetFollowersCount?: number;
  syncStatus?: CampaignSyncStatus;
  syncedFollowerCount?: number;
  canDmFollowerCount?: number;
  syncError?: string;
  pauseReason?: string;
  messageText: string;
  targetUsernames: string[];
  totalTargets: number;
  dmsPerHour: number;
  dailyLimitPerAccount?: number;
  timezone?: string;
  schedule?: CampaignScheduleDay[];
  accountsToUse?: number;
  connectionIds?: string[];
  messagesScheduled: number;
  messagesSent: number;
  repliesReceived: number;
  failedCount: number;
  cancelledCount: number;
  remaining: number;
  progressPercent: number;
  startedAt?: string;
  expectedEndAt?: string;
  completedAt?: string;
  stoppedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignControlResponse = {
  id: string;
  status: CampaignStatus;
  cancelledCount: number;
  completedAt?: string;
  stoppedAt?: string;
  updatedAt: string;
};

export type TargetProfileResponse = {
  userName: string;
  displayName?: string;
  profilePictureUrl?: string;
  isVerified?: boolean;
  isBlueVerified?: boolean;
  isIdentityVerified?: boolean;
  followersCount?: number;
};

export type CampaignFollower = {
  id: string;
  xUserId: string;
  userName: string;
  name: string;
  canDm: boolean;
  selected: boolean;
  profilePictureUrl?: string;
  description?: string;
  followers?: number;
  following?: number;
};

export type CampaignFollowersListResponse = {
  data: CampaignFollower[];
  total: number;
  page: number;
  limit: number;
};

export type UpdateFollowerSelectionInput = {
  followerIds: string[];
  selected: boolean;
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
  recipientName?: string | null;
  recipientProfilePictureUrl?: string | null;
  connectionId: string;
  xUsername: string;
  lastMessage: ChatLastMessage;
  messageCount: number;
  isClosed: boolean;
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
  isClosed: boolean;
  recipientName?: string | null;
  recipientProfilePictureUrl?: string | null;
};

export type HandoffSummary = {
  _id: string;
  orgId: string;
  connectionId: string;
  conversationId: string;
  recipientId: string;
  recipientUsername?: string | null;
  recipientName?: string | null;
  recipientProfilePictureUrl?: string | null;
  category: string;
  triggerReason: string;
  contextSummary: string;
  userMessage: string;
  recentHistory?: Array<{ role: string; content: string }>;
  status: 'open' | 'resolved';
  createdAt: string;
  updatedAt: string;
};

export type PaginatedHandoffsResponse = {
  data: HandoffSummary[];
  total: number;
  page: number;
  limit: number;
};

export type ConversationReplyResponse = {
  success: boolean;
  conversationId: string;
};

export type CampaignDailyStat = {
  date: string;
  sent: number;
  failed: number;
};

export type CampaignListStats = {
  total: number;
  active: number;
  totalProspects: number;
  totalSent: number;
  totalReplies: number;
};

export type CampaignListResponse = {
  data: CampaignSummary[];
  stats: CampaignListStats;
};

export type ContactedUser = {
  recipientUsername: string;
  recipientId: string;
  status: "sent" | "failed";
  sentAt: string | null;
  replyReceived: boolean;
};

export type ContactedUsersResponse = {
  data: ContactedUser[];
  total: number;
  page: number;
  limit: number;
};

export type UpdateCampaignSettingsInput = {
  dmsPerHour?: number;
  dailyLimitPerAccount?: number;
  schedule?: CampaignScheduleDay[];
};

export type UpdateCampaignSettingsResponse = {
  id: string;
  dmsPerHour: number;
  dailyLimitPerAccount?: number;
  schedule?: CampaignScheduleDay[];
  updatedAt: string;
};

export type LeadListSourceType = "followers" | "following" | "retweeters";

export type LeadListStatus = "syncing" | "paused" | "stopped" | "completed" | "failed";

export type LeadList = {
  id: string;
  name: string;
  sourceType: LeadListSourceType;
  targetUsername?: string;
  targetDisplayName?: string;
  targetProfilePictureUrl?: string;
  targetTweetId?: string;
  targetTweetPreview?: string;
  status: LeadListStatus;
  syncedCount: number;
  reachableCount: number;
  totalCount?: number;
  syncError?: string;
  createdAt: string;
};

export type TweetPreviewResponse = {
  id: string;
  text: string;
  authorUsername?: string;
  authorName?: string;
  authorProfilePicture?: string;
  retweetCount?: number;
  likeCount?: number;
};

export type Lead = {
  id: string;
  xUserId: string;
  userName: string;
  name: string;
  profilePicture?: string;
  description?: string;
  location?: string;
  followers?: number;
  following?: number;
  canDm: boolean;
};

export type LeadListLeadsResponse = {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
};

export type CreateLeadListInput = {
  name: string;
  sourceType: LeadListSourceType;
  targetUsername?: string;
  targetDisplayName?: string;
  targetProfilePictureUrl?: string;
  targetTweetId?: string;
  targetTweetPreview?: string;
};

export type ImportLeadsInput = {
  sourceType: LeadListSourceType;
  targetUsername?: string;
  targetDisplayName?: string;
  targetProfilePictureUrl?: string;
  targetTweetId?: string;
  targetTweetPreview?: string;
};
