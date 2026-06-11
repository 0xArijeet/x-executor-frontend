import { afterEach, expect, mock, test } from "bun:test";
import { campaignsApi, chatsApi, connectionsApi } from "./api";

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
    expect(String(input)).toContain("/xbot/v1/api/hub/orgs/org-1/connections/conn-1/xchat-pin");
    expect(init?.method).toBe("PATCH");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer jwt-test",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({ xchatPin: "1234" });
    return jsonResponse({ updated: true, hasXchatPin: true });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await connectionsApi.setXchatPin("jwt-test", "org-1", "conn-1", "1234");
  expect(result).toEqual({ updated: true, hasXchatPin: true });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("connectionsApi.setAuthToken PATCHes auth-token with bearer token", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/xbot/v1/api/hub/orgs/org-2/connections/conn-2/auth-token");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ authToken: "secret-token" });
    return jsonResponse({ updated: true, hasAuthToken: true });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await connectionsApi.setAuthToken("jwt-test", "org-2", "conn-2", "secret-token");
  expect(result).toEqual({ updated: true, hasAuthToken: true });
});

test("campaignsApi.list GETs org campaigns", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/xbot/v1/api/hub/orgs/org-1/campaigns");
    expect(init?.method).toBeUndefined();
    return jsonResponse([
      {
        id: "camp-1",
        name: "Q1 outreach",
        status: "running",
        totalTargets: 10,
        messagesSent: 3,
        failedCount: 1,
        progressPercent: 40,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await campaignsApi.list("jwt-test", "org-1");
  expect(result).toHaveLength(1);
  expect(result[0]?.name).toBe("Q1 outreach");
});

test("campaignsApi.updateName PATCHes campaign name", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/xbot/v1/api/hub/orgs/org-1/campaigns/camp-1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ name: "Renamed" });
    return jsonResponse({
      id: "camp-1",
      name: "Renamed",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await campaignsApi.updateName("jwt-test", "org-1", "camp-1", "Renamed");
  expect(result.name).toBe("Renamed");
});

test("campaignsApi.create POSTs campaign with bearer token", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/xbot/v1/api/hub/orgs/org-1/campaigns");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Q1 outreach",
      targetUsernames: ["alice", "bob"],
      messageText: "Hello",
      dmsPerHour: 10,
    });
    return jsonResponse({
      id: "camp-1",
      name: "Q1 outreach",
      status: "pending",
      totalTargets: 2,
      dmsPerHour: 10,
      messageText: "Hello",
      targetUsernames: ["alice", "bob"],
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await campaignsApi.create("jwt-test", "org-1", {
    name: "Q1 outreach",
    targetUsernames: ["alice", "bob"],
    messageText: "Hello",
    dmsPerHour: 10,
  });
  expect(result.id).toBe("camp-1");
});

test("campaignsApi.getStatus GETs campaign status", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/xbot/v1/api/hub/orgs/org-1/campaigns/camp-1/status");
    expect(init?.method).toBeUndefined();
    return jsonResponse({
      id: "camp-1",
      orgId: "org-1",
      name: "Q1 outreach",
      status: "running",
      messageText: "Hello",
      targetUsernames: ["alice"],
      totalTargets: 1,
      messagesScheduled: 1,
      messagesSent: 0,
      repliesReceived: 0,
      failedCount: 0,
      remaining: 1,
      progressPercent: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await campaignsApi.getStatus("jwt-test", "org-1", "camp-1");
  expect(result.status).toBe("running");
});

test("chatsApi.listConversations GETs org chats with pagination", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/xbot/v1/api/hub/orgs/org-1/chats?page=1&limit=20");
    expect(init?.method).toBeUndefined();
    return jsonResponse({
      data: [
        {
          conversationId: "3012852462-1345154135381794816",
          recipientId: "1345154135381794816",
          connectionId: "conn-1",
          xUsername: "botuser",
          lastMessage: {
            direction: "outbound",
            text: "Hello there",
            processedAt: "2026-01-01T00:00:00.000Z",
          },
          messageCount: 2,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await chatsApi.listConversations("jwt-test", "org-1");
  expect(result.data).toHaveLength(1);
  expect(result.data[0]?.conversationId).toBe("3012852462-1345154135381794816");
});

test("chatsApi.getMessages GETs conversation messages", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL) => {
    expect(String(input)).toContain(
      "/xbot/v1/api/hub/orgs/org-1/chats/3012852462-1345154135381794816?page=1&limit=50",
    );
    return jsonResponse({
      data: [
        {
          direction: "inbound",
          text: "Hi",
          processedAt: "2026-01-01T00:00:00.000Z",
          recipientId: "1345154135381794816",
          isKnownAnswer: null,
        },
      ],
      total: 1,
      conversationId: "3012852462-1345154135381794816",
      page: 1,
      limit: 50,
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await chatsApi.getMessages(
    "jwt-test",
    "org-1",
    "3012852462-1345154135381794816",
  );
  expect(result.data[0]?.direction).toBe("inbound");
});
