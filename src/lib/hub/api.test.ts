import { afterEach, expect, mock, test } from "bun:test";
import { campaignsApi, chatsApi, connectionsApi, invitesApi, xSettingsApi } from "./api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("connectionsApi.setXchatPin PATCHes xchat-pin with bearer token", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/hub/x/connections/conn-1/xchat-pin");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ xchatPin: "1234" });
    return jsonResponse({ updated: true, hasXchatPin: true });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await connectionsApi.setXchatPin("jwt-test", "conn-1", "1234");
  expect(result).toEqual({ updated: true, hasXchatPin: true });
});

test("connectionsApi.setAuthToken PATCHes auth-token with bearer token", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/hub/x/connections/conn-2/auth-token");
    expect(init?.method).toBe("PATCH");
    return jsonResponse({ updated: true, hasAuthToken: true });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await connectionsApi.setAuthToken("jwt-test", "conn-2", "secret-token");
  expect(result).toEqual({ updated: true, hasAuthToken: true });
});

test("invitesApi.getPublic GETs public invite metadata", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL) => {
    expect(String(input)).toContain("/api/hub/x/invites/public/invite-token");
    return jsonResponse({
      orgName: "Acme",
      expired: false,
      revoked: false,
      maxUsesReached: false,
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await invitesApi.getPublic("invite-token");
  expect(result.orgName).toBe("Acme");
});

test("campaignsApi.list GETs campaigns", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL) => {
    expect(String(input)).toContain("/api/hub/x/campaigns");
    return jsonResponse([{ id: "camp-1", name: "Q1 outreach", status: "running" }]);
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await campaignsApi.list("jwt-test");
  expect(result[0]?.name).toBe("Q1 outreach");
});

test("campaignsApi.create POSTs campaign with bearer token", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/hub/x/campaigns");
    expect(init?.method).toBe("POST");
    return jsonResponse({ id: "camp-1", name: "Q1 outreach", status: "pending" });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await campaignsApi.create("jwt-test", {
    name: "Q1 outreach",
    targetUsernames: ["alice"],
    messageText: "Hello",
    dmsPerHour: 10,
    connectionIds: ["conn-a"],
  });
  expect(result.id).toBe("camp-1");
});

test("chatsApi.listConversations GETs chats with pagination", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL) => {
    expect(String(input)).toContain("/api/hub/x/chats?page=1&limit=20");
    return jsonResponse({ data: [], total: 0, page: 1, limit: 20 });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  await chatsApi.listConversations("jwt-test");
});

test("xSettingsApi.updateGoal PATCHes conversation goal", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/hub/x/settings/goal");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      goalTypes: ["grow_discord", "book_a_call"],
      goalDetails: "Invite people to our Discord.",
      directness: 50,
      systemPrompt: "We sell blue widgets.",
      llmModel: "google/gemini-3.5-flash",
    });
    return jsonResponse({
      id: "org-1",
      conversationGoals: {
        types: ["grow_discord", "book_a_call"],
        details: "Invite people to our Discord.",
        directness: 50,
      },
      draftSystemPrompt: "We sell blue widgets.",
      hasUnpublishedDraft: true,
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await xSettingsApi.updateGoal("jwt-test", {
    goalTypes: ["grow_discord", "book_a_call"],
    goalDetails: "Invite people to our Discord.",
    directness: 50,
    systemPrompt: "We sell blue widgets.",
    llmModel: "google/gemini-3.5-flash",
  });
  expect(result.hasUnpublishedDraft).toBe(true);
});

test("xSettingsApi.testChat POSTs chat test", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/hub/x/settings/chat/test");
    expect(init?.method).toBe("POST");
    return jsonResponse({ reply: "Hi", isKnownAnswer: true });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await xSettingsApi.testChat("jwt-test", {
    userMessage: "Hello",
    llmModel: "google/gemini-3.5-flash",
  });
  expect(result.reply).toBe("Hi");
});

test("xSettingsApi.publishPrompt POSTs prompt publish", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/hub/x/settings/prompt/publish");
    expect(init?.method).toBe("POST");
    return jsonResponse({ id: "org-1", hasUnpublishedDraft: false });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await xSettingsApi.publishPrompt("jwt-test");
  expect(result.hasUnpublishedDraft).toBe(false);
});

test("xSettingsApi.updateHandoff PATCHes handoff settings", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/hub/x/settings/handoff");
    expect(init?.method).toBe("PATCH");
    return jsonResponse({ id: "org-1", handoffEnabled: true });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await xSettingsApi.updateHandoff("jwt-test", { handoffEnabled: true });
  expect(result.handoffEnabled).toBe(true);
});
