import { API_PREFIX } from "./constants";

export { API_PREFIX };

export class HubApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "HubApiError";
  }
}

type HubEnvelope<T = unknown> = {
  success: boolean;
  data: T;
  error?: string;
};

function isHubEnvelope(value: unknown): value is HubEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "data" in value &&
    typeof (value as HubEnvelope).success === "boolean"
  );
}

function hubErrorMessage(body: Record<string, unknown>, fallback: string): string {
  if (typeof body.error === "string" && body.error) return body.error;
  const message = body.message;
  if (typeof message === "string" && message) return message;
  if (Array.isArray(message)) return message.filter(Boolean).join(", ");
  return fallback;
}

function readConfiguredUrl(
  builtIn: string | undefined,
  processKey: "PUBLIC_HUB_API_URL" | "PUBLIC_API_BASE" | "PUBLIC_HUB_PUBLIC_BASE_URL",
): string {
  const fromBuild = builtIn?.trim();
  if (fromBuild) return fromBuild.replace(/\/$/, "");

  // Bun dev inlines literal process.env.PUBLIC_* references (see bunfig.toml).
  if (processKey === "PUBLIC_HUB_API_URL") {
    return (process.env.PUBLIC_HUB_API_URL ?? "").replace(/\/$/, "");
  }
  if (processKey === "PUBLIC_API_BASE") {
    return (process.env.PUBLIC_API_BASE ?? "").replace(/\/$/, "");
  }
  return (process.env.PUBLIC_HUB_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
}

export function apiBase(): string {
  return (
    readConfiguredUrl(import.meta.env.PUBLIC_HUB_API_URL, "PUBLIC_HUB_API_URL") ||
    readConfiguredUrl(import.meta.env.PUBLIC_API_BASE, "PUBLIC_API_BASE")
  );
}

export function hubPublicBaseUrl(): string {
  return (
    readConfiguredUrl(import.meta.env.PUBLIC_HUB_PUBLIC_BASE_URL, "PUBLIC_HUB_PUBLIC_BASE_URL") ||
    apiBase() ||
    "http://localhost:3000"
  );
}

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

/** Empty api base is OK on localhost (Bun dev proxy). On Vercel use `/api/hub` rewrite or set PUBLIC_HUB_API_URL. */
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
  return "Set PUBLIC_HUB_API_URL (or PUBLIC_API_BASE) at build time, or configure a Vercel rewrite for /api/hub → Hub.";
}

export function oauthStartUrl(inviteToken: string): string {
  const query = `?invite=${encodeURIComponent(inviteToken)}`;
  const origin = apiBase() || hubPublicBaseUrl();
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (!apiBase() && (hostname === "localhost" || hostname === "127.0.0.1")) {
      return `${API_PREFIX}/oauth/x/start${query}`;
    }
  }
  return `${origin}${API_PREFIX}/oauth/x/start${query}`;
}

export function parseHubJsonBody<T>(body: unknown, status: number, statusText: string): T {
  if (isHubEnvelope(body)) {
    if (!body.success) {
      throw new HubApiError(
        hubErrorMessage(body as Record<string, unknown>, statusText || "Request failed"),
        status,
      );
    }
    if (status === 204) {
      return undefined as T;
    }
    return body.data as T;
  }

  if (status >= 400) {
    const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    throw new HubApiError(hubErrorMessage(record, statusText || "Request failed"), status);
  }

  if (status === 204) {
    return undefined as T;
  }

  return body as T;
}

export async function hubFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${apiBase()}${API_PREFIX}${path}`, {
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

  const body = await res.json().catch(() => ({}));
  return parseHubJsonBody<T>(body, res.status, res.statusText);
}
