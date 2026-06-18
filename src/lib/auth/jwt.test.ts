import { expect, test } from "bun:test";
import { userFromAccessToken } from "./jwt";

const sampleToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm9yZ0lkIjoib3JnLTQ1NiIsImlhdCI6MSwiZXhwIjo5OTk5fQ.sig";

test("userFromAccessToken decodes Hub JWT claims", () => {
  expect(userFromAccessToken(sampleToken)).toEqual({
    id: "user-123",
    email: "test@example.com",
    orgId: "org-456",
  });
});

test("userFromAccessToken returns null for invalid token", () => {
  expect(userFromAccessToken("not-a-jwt")).toBeNull();
});
