import type { User } from "@/lib/hub/types";

/** Decode user claims from a Hub JWT when `/auth/me` is unavailable. */
export function userFromAccessToken(token: string): User | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { sub?: string; email?: string; orgId?: string };
    if (!payload.sub) return null;
    return {
      id: String(payload.sub),
      email: String(payload.email ?? ""),
      orgId: String(payload.orgId ?? payload.sub),
    };
  } catch {
    return null;
  }
}
