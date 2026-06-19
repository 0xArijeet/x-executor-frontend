import { hubFetch, HubApiError } from "./client";
import { userFromAccessToken } from "@/lib/auth/jwt";
import type {
  AuthResponse,
  Connection,
  CreateInviteInput,
  Invite,
  InvitePublic,
  Organization,
  UpdatePromptInput,
  UpdateConversationGoalInput,
  UpdateHandoffInput,
  ChatTestInput,
  ChatTestResponse,
  LlmModelOption,
  User,
  CreateCampaignInput,
  CreateCampaignResponse,
  CampaignStatusResponse,
  CampaignSummary,
  CampaignControlResponse,
  UpdateCampaignNameResponse,
  PaginatedConversationsResponse,
  PaginatedMessagesResponse,
} from "./types";

export const authApi = {
  register(email: string, password: string) {
    return hubFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  login(email: string, password: string) {
    return hubFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async me(token: string) {
    try {
      return await hubFetch<User>("/auth/me", { token });
    } catch (err) {
      if (err instanceof HubApiError && err.status === 404) {
        const user = userFromAccessToken(token);
        if (user) return user;
      }
      throw err;
    }
  },
};

/** X org settings (omnibot: GET/PATCH /x/settings/*; org from JWT). */
export const xSettingsApi = {
  get(token: string) {
    return hubFetch<Organization>("/x/settings", { token });
  },
  updatePrompt(token: string, input: UpdatePromptInput) {
    return hubFetch<Organization>("/x/settings/prompt", {
      method: "PATCH",
      token,
      body: JSON.stringify(input),
    });
  },
  updateGoal(token: string, input: UpdateConversationGoalInput) {
    return hubFetch<Organization>("/x/settings/goal", {
      method: "PATCH",
      token,
      body: JSON.stringify(input),
    });
  },
  publishPrompt(token: string) {
    return hubFetch<Organization>("/x/settings/prompt/publish", {
      method: "POST",
      token,
    });
  },
  discardDraft(token: string) {
    return hubFetch<Organization>("/x/settings/prompt/discard", {
      method: "POST",
      token,
    });
  },
  testChat(token: string, input: ChatTestInput) {
    return hubFetch<ChatTestResponse>("/x/settings/chat/test", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    });
  },
  listLlmModels(token: string) {
    return hubFetch<LlmModelOption[]>("/x/settings/llm/models", { token });
  },
  updateHandoff(token: string, input: UpdateHandoffInput) {
    return hubFetch<Organization>("/x/settings/handoff", {
      method: "PATCH",
      token,
      body: JSON.stringify(input),
    });
  },
};

/** @deprecated Use xSettingsApi — kept for gradual migration. */
export const orgsApi = xSettingsApi;

export const invitesApi = {
  getPublic(token: string) {
    return hubFetch<InvitePublic>(`/x/invites/public/${encodeURIComponent(token)}`);
  },
  list(token: string) {
    return hubFetch<Invite[]>("/x/invites", { token });
  },
  create(token: string, input: CreateInviteInput = {}) {
    return hubFetch<Invite>("/x/invites", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    });
  },
  revoke(token: string, inviteId: string) {
    return hubFetch<{ revoked: boolean }>(`/x/invites/${encodeURIComponent(inviteId)}`, {
      method: "DELETE",
      token,
    });
  },
};

export const connectionsApi = {
  list(token: string) {
    return hubFetch<Connection[]>("/x/connections", { token });
  },
  setAuthToken(token: string, connectionId: string, authToken: string) {
    return hubFetch<{ updated: boolean; hasAuthToken: boolean }>(
      `/x/connections/${encodeURIComponent(connectionId)}/auth-token`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ authToken }),
      },
    );
  },
  setXchatPin(token: string, connectionId: string, xchatPin: string) {
    return hubFetch<{ updated: boolean; hasXchatPin: boolean }>(
      `/x/connections/${encodeURIComponent(connectionId)}/xchat-pin`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ xchatPin }),
      },
    );
  },
  revoke(token: string, connectionId: string) {
    return hubFetch<{ revoked: boolean }>(`/x/connections/${encodeURIComponent(connectionId)}`, {
      method: "DELETE",
      token,
    });
  },
};

export const campaignsApi = {
  list(token: string) {
    return hubFetch<CampaignSummary[]>("/x/campaigns", { token });
  },
  create(token: string, input: CreateCampaignInput) {
    return hubFetch<CreateCampaignResponse>("/x/campaigns", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    });
  },
  updateName(token: string, campaignId: string, name: string) {
    return hubFetch<UpdateCampaignNameResponse>(`/x/campaigns/${encodeURIComponent(campaignId)}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ name }),
    });
  },
  getStatus(token: string, campaignId: string) {
    return hubFetch<CampaignStatusResponse>(
      `/x/campaigns/${encodeURIComponent(campaignId)}/status`,
      { token },
    );
  },
  pause(token: string, campaignId: string) {
    return hubFetch<CampaignControlResponse>(
      `/x/campaigns/${encodeURIComponent(campaignId)}/pause`,
      { method: "POST", token },
    );
  },
  resume(token: string, campaignId: string) {
    return hubFetch<CampaignControlResponse>(
      `/x/campaigns/${encodeURIComponent(campaignId)}/resume`,
      { method: "POST", token },
    );
  },
  stop(token: string, campaignId: string) {
    return hubFetch<CampaignControlResponse>(
      `/x/campaigns/${encodeURIComponent(campaignId)}/stop`,
      { method: "POST", token },
    );
  },
};

function paginationQuery(page?: number, limit?: number): string {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const chatsApi = {
  listConversations(token: string, page = 1, limit = 20) {
    return hubFetch<PaginatedConversationsResponse>(
      `/x/chats${paginationQuery(page, limit)}`,
      { token },
    );
  },
  getMessages(token: string, conversationId: string, page = 1, limit = 50) {
    return hubFetch<PaginatedMessagesResponse>(
      `/x/chats/${encodeURIComponent(conversationId)}${paginationQuery(page, limit)}`,
      { token },
    );
  },
};
