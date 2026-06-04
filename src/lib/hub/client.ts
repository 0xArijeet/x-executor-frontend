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

export function oauthStartUrl(inviteToken: string): string {
  return `${hubPublicBaseUrl()}/api/v1/oauth/x/start?invite=${encodeURIComponent(inviteToken)}`;
}

export async function hubFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${apiBase()}/api/v1${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

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
