import { hubFetch } from "./client";
import type {
  AuthResponse,
  Connection,
  CreateInviteInput,
  CreateOrgInput,
  Invite,
  InvitePublic,
  Member,
  Organization,
  OrganizationWithRole,
  UpdatePromptInput,
  User,
  CreateCampaignInput,
  CreateCampaignResponse,
  CampaignStatusResponse,
  CampaignSummary,
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
  me(token: string) {
    return hubFetch<User>("/auth/me", { token });
  },
};

export const orgsApi = {
  list(token: string) {
    return hubFetch<OrganizationWithRole[]>("/orgs", { token });
  },
  create(token: string, input: CreateOrgInput) {
    return hubFetch<Organization>("/orgs", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    });
  },
  get(token: string, orgId: string) {
    return hubFetch<Organization>(`/orgs/${orgId}`, { token });
  },
  updatePrompt(token: string, orgId: string, input: UpdatePromptInput) {
    return hubFetch<Organization>(`/orgs/${orgId}/prompt`, {
      method: "PATCH",
      token,
      body: JSON.stringify(input),
    });
  },
  members(token: string, orgId: string) {
    return hubFetch<Member[]>(`/orgs/${orgId}/members`, { token });
  },
};

export const invitesApi = {
  getPublic(token: string) {
    return hubFetch<InvitePublic>(`/invites/${token}`);
  },
  list(token: string, orgId: string) {
    return hubFetch<Invite[]>(`/orgs/${orgId}/invites`, { token });
  },
  create(token: string, orgId: string, input: CreateInviteInput = {}) {
    return hubFetch<Invite>(`/orgs/${orgId}/invites`, {
      method: "POST",
      token,
      body: JSON.stringify(input),
    });
  },
  revoke(token: string, orgId: string, inviteId: string) {
    return hubFetch<{ revoked: boolean }>(`/orgs/${orgId}/invites/${inviteId}`, {
      method: "DELETE",
      token,
    });
  },
};

export const connectionsApi = {
  list(token: string, orgId: string) {
    return hubFetch<Connection[]>(`/orgs/${orgId}/connections`, { token });
  },
  setAuthToken(token: string, orgId: string, connectionId: string, authToken: string) {
    return hubFetch<{ updated: boolean; hasAuthToken: boolean }>(
      `/orgs/${orgId}/connections/${connectionId}/auth-token`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ authToken }),
      },
    );
  },
  setXchatPin(token: string, orgId: string, connectionId: string, xchatPin: string) {
    return hubFetch<{ updated: boolean; hasXchatPin: boolean }>(
      `/orgs/${orgId}/connections/${connectionId}/xchat-pin`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ xchatPin }),
      },
    );
  },
  revoke(token: string, orgId: string, connectionId: string) {
    return hubFetch<{ revoked: boolean }>(`/orgs/${orgId}/connections/${connectionId}`, {
      method: "DELETE",
      token,
    });
  },
};

export const campaignsApi = {
  list(token: string, orgId: string) {
    return hubFetch<CampaignSummary[]>(`/orgs/${orgId}/campaigns`, { token });
  },
  create(token: string, orgId: string, input: CreateCampaignInput) {
    return hubFetch<CreateCampaignResponse>(`/orgs/${orgId}/campaigns`, {
      method: "POST",
      token,
      body: JSON.stringify(input),
    });
  },
  updateName(token: string, orgId: string, campaignId: string, name: string) {
    return hubFetch<UpdateCampaignNameResponse>(`/orgs/${orgId}/campaigns/${campaignId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ name }),
    });
  },
  getStatus(token: string, orgId: string, campaignId: string) {
    return hubFetch<CampaignStatusResponse>(`/orgs/${orgId}/campaigns/${campaignId}/status`, {
      token,
    });
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
  listConversations(token: string, orgId: string, page = 1, limit = 20) {
    return hubFetch<PaginatedConversationsResponse>(
      `/orgs/${orgId}/chats${paginationQuery(page, limit)}`,
      { token },
    );
  },
  getMessages(
    token: string,
    orgId: string,
    conversationId: string,
    page = 1,
    limit = 50,
  ) {
    return hubFetch<PaginatedMessagesResponse>(
      `/orgs/${orgId}/chats/${encodeURIComponent(conversationId)}${paginationQuery(page, limit)}`,
      { token },
    );
  },
};
