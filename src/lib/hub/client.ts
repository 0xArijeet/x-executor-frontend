import { HUB_API_PREFIX } from "./constants";

export { HUB_API_PREFIX };

export class HubApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "HubApiError";
  }
}

function apiBase(): string {
  return (import.meta.env.PUBLIC_HUB_API_URL ?? "").replace(/\/$/, "");
}

export function hubPublicBaseUrl(): string {
  return (import.meta.env.PUBLIC_HUB_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Returns null if the configured Hub URL is missing a hostname (common misconfig on Vercel/Hub). */
function validateAbsoluteHubUrl(url: string, envName: string): string | null {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") {
      return `${envName} must use http or https.`;
    }
    if (!hostname) {
      return `${envName} is missing a hostname (e.g. https://your-hub.up.railway.app).`;
    }
    return null;
  } catch {
    return `${envName} is not a valid URL.`;
  }
}

export function validateHubPublicBaseUrl(): string | null {
  return validateAbsoluteHubUrl(hubPublicBaseUrl(), "PUBLIC_HUB_PUBLIC_BASE_URL");
}

/** Empty api base is OK on localhost (Bun dev proxy). On Vercel it causes login/API to hit HTML instead of Hub. */
export function validateHubApiUrl(): string | null {
  const base = apiBase();
  if (base) {
    return validateAbsoluteHubUrl(base, "PUBLIC_HUB_API_URL");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return null;
    }
  }
  return "PUBLIC_HUB_API_URL was not set at build time. Add it in Vercel (same as your Hub URL), then redeploy.";
}

export function oauthStartUrl(inviteToken: string): string {
  return `${hubPublicBaseUrl()}/${HUB_API_PREFIX}/oauth/x/start?invite=${encodeURIComponent(inviteToken)}`;
}

export async function hubFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${apiBase()}/${HUB_API_PREFIX}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const hint = apiBase()
      ? "Hub returned a non-JSON response. Check that the Hub service is running."
      : validateHubApiUrl() ?? "API requests are misconfigured for this deployment.";
    throw new HubApiError(hint, res.status);
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(err.message) ? err.message.join(", ") : (err.message ?? res.statusText);
    throw new HubApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
