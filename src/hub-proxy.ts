const HUB_API_URL = (process.env.HUB_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function proxyToHub(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = `${HUB_API_URL}${url.pathname}${url.search}`;
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
