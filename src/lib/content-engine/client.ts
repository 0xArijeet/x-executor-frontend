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

// Bun replaces import.meta.env.PUBLIC_* with the literal value at build time.
// The variable must be set in the build environment (Vercel env vars) before the build runs.
const _CE_BASE: string = import.meta.env.PUBLIC_CONTENT_ENGINE_URL ?? "";

function apiBase(): string {
  return _CE_BASE.replace(/\/$/, "");
}

export async function ceFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = options;
  const url = `${apiBase()}${CE_PREFIX}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ContentEngineApiError(
      "Content Engine returned a non-JSON response. Check that the service is running.",
      res.status,
    );
  }

  const body = (await res.json()) as unknown;

  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new ContentEngineApiError(msg, res.status);
  }

  return body as T;
}
