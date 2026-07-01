import { getToken } from "@/lib/auth/storage";

const CE_PREFIX = "/api/content-engine";

export class ContentEngineApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ContentEngineApiError";
  }
}

// Bun's define in build.ts replaces this exact expression with the env var value at build time.
const _CE_BASE: string = import.meta.env.PUBLIC_CONTENT_ENGINE_URL ?? "";

function apiBase(): string {
  return _CE_BASE.replace(/\/$/, "");
}

export async function ceFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = options;
  const token = getToken();
  const url = `${apiBase()}${CE_PREFIX}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const contentType = res.headers.get("content-type") ?? "";
  const hasJson = contentType.includes("application/json");

  if (!res.ok) {
    if (!hasJson) {
      throw new ContentEngineApiError(
        `Content Engine error ${res.status}. Check that the service is running.`,
        res.status,
      );
    }
    const body = (await res.json()) as unknown;
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new ContentEngineApiError(msg, res.status);
  }

  // 204 or empty body — void response
  if (res.status === 204 || !hasJson) return undefined as T;

  return (await res.json()) as T;
}
