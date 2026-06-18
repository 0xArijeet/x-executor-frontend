import { serve } from "bun";
import index from "./index.html";
import { proxyToHub } from "./hub-proxy";

const port = Number(process.env.PORT ?? 5173);

const server = serve({
  port,
  routes: {
    "/api/hub/*": {
      async GET(req) {
        return proxyToHub(req);
      },
      async POST(req) {
        return proxyToHub(req);
      },
      async PUT(req) {
        return proxyToHub(req);
      },
      async PATCH(req) {
        return proxyToHub(req);
      },
      async DELETE(req) {
        return proxyToHub(req);
      },
      async OPTIONS(req) {
        return proxyToHub(req);
      },
    },
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
