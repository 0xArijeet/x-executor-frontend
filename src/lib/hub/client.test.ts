import { expect, test } from "bun:test";
import { HubApiError } from "./client";

test("HubApiError carries status", () => {
  const err = new HubApiError("Unauthorized", 401);
  expect(err.message).toBe("Unauthorized");
  expect(err.status).toBe(401);
  expect(err.name).toBe("HubApiError");
});
