import { expect, test } from "bun:test";
import { API_PREFIX, HubApiError } from "./client";

test("HubApiError carries status", () => {
  const err = new HubApiError("Unauthorized", 401);
  expect(err.message).toBe("Unauthorized");
  expect(err.status).toBe(401);
  expect(err.name).toBe("HubApiError");
});

test("API_PREFIX is /api/hub", () => {
  expect(API_PREFIX).toBe("/api/hub");
});
