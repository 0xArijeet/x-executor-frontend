import { afterEach, expect, mock, test } from "bun:test";
import { authApi } from "./api";
import { HubApiError, parseHubJsonBody } from "./client";

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

test("parseHubJsonBody unwraps success envelope", () => {
  const result = parseHubJsonBody<{ accessToken: string }>(
    {
      success: true,
      data: { accessToken: "jwt-123" },
      error: "",
    },
    201,
    "Created",
  );
  expect(result).toEqual({ accessToken: "jwt-123" });
});

test("parseHubJsonBody throws on error envelope", () => {
  expect(() =>
    parseHubJsonBody(
      { success: false, data: {}, error: "Invalid email or password" },
      401,
      "Unauthorized",
    ),
  ).toThrow(new HubApiError("Invalid email or password", 401));
});

test("parseHubJsonBody passes through flat NestJS JSON", () => {
  expect(parseHubJsonBody({ id: "org-1", name: "Acme" }, 200, "OK")).toEqual({
    id: "org-1",
    name: "Acme",
  });
});

test("authApi.login unwraps staging envelope", async () => {
  const fetchMock = mock(async () =>
    jsonResponse(
      {
        success: true,
        data: {
          accessToken: "jwt-login",
          user: { id: "u1", email: "a@b.com", orgId: "o1" },
        },
        error: "",
      },
      201,
    ),
  );
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await authApi.login("a@b.com", "password123");
  expect(result).toEqual({
    accessToken: "jwt-login",
    user: { id: "u1", email: "a@b.com", orgId: "o1" },
  });
});

test("authApi.me falls back to JWT when endpoint is missing", async () => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm9yZ0lkIjoib3JnLTQ1NiIsImlhdCI6MSwiZXhwIjo5OTk5fQ.sig";
  const fetchMock = mock(async () =>
    jsonResponse({ success: false, data: {}, error: "Cannot GET /api/hub/auth/me" }, 404),
  );
  globalThis.fetch = fetchMock as typeof fetch;

  const user = await authApi.me(token);
  expect(user).toEqual({
    id: "user-123",
    email: "test@example.com",
    orgId: "org-456",
  });
});
