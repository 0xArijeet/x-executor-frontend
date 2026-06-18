import { API_PREFIX } from "./lib/hub/constants";

const HUB_API_URL = (process.env.HUB_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const HUB_MOUNT = "/api/v1";

function toHubPath(pathname: string): string {
  if (pathname === API_PREFIX || pathname === `${API_PREFIX}/`) {
    return HUB_MOUNT;
  }
  if (pathname.startsWith(`${API_PREFIX}/`)) {
    return `${HUB_MOUNT}${pathname.slice(API_PREFIX.length)}`;
  }
  return pathname;
}

export async function proxyToHub(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = `${HUB_API_URL}${toHubPath(url.pathname)}${url.search}`;
  const headers = new Headers(req.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
  }

  return fetch(target, init);
}
