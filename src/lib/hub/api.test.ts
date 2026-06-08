import { afterEach, expect, mock, test } from "bun:test";
import { campaignsApi, connectionsApi } from "./api";

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
    expect(String(input)).toContain("/api/v1/orgs/org-1/connections/conn-1/xchat-pin");
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
    expect(String(input)).toContain("/api/v1/orgs/org-2/connections/conn-2/auth-token");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ authToken: "secret-token" });
    return jsonResponse({ updated: true, hasAuthToken: true });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await connectionsApi.setAuthToken("jwt-test", "org-2", "conn-2", "secret-token");
  expect(result).toEqual({ updated: true, hasAuthToken: true });
});

test("campaignsApi.create POSTs campaign with bearer token", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/v1/orgs/org-1/campaigns");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      targetUsernames: ["alice", "bob"],
      messageText: "Hello",
    });
    return jsonResponse({
      id: "camp-1",
      status: "pending",
      totalTargets: 2,
      messageText: "Hello",
      targetUsernames: ["alice", "bob"],
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await campaignsApi.create("jwt-test", "org-1", {
    targetUsernames: ["alice", "bob"],
    messageText: "Hello",
  });
  expect(result.id).toBe("camp-1");
});

test("campaignsApi.getStatus GETs campaign status", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toContain("/api/v1/orgs/org-1/campaigns/camp-1/status");
    expect(init?.method).toBeUndefined();
    return jsonResponse({
      id: "camp-1",
      orgId: "org-1",
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
