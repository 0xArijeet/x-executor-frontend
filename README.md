# X Executor Frontend

Admin dashboard for [omnibot-backend](../omnibot-backend/apps/botmanager) X platform APIs (OAuth 1.0a, Account Activity, DM automation). Built with Bun, React 19, and Tailwind.

Hub is **botmanager** at `/api/hub`. X features use JWT-scoped **`/api/hub/x/*`** routes (org from token, not URL). Responses use `{ success, data, error }`.

## Prerequisites

1. **Hub** + MongoDB + Redis (see [railway.md](../x-executor/docs/railway.md)).
2. **X Developer App** with **OAuth 1.0a** (Consumer Keys), **Read, Write, and Direct Messages**, and **Account Activity API** access.
3. Hub callback URL (exact match in X Developer Portal):
   - Local: `http://localhost:3000/api/hub/oauth/x/callback`
   - Production: `https://<hub-domain>/api/hub/oauth/x/callback`

Hub JSON APIs live at **`/api/hub/*`** (e.g. `POST /api/hub/auth/login`, `POST /api/hub/auth/register`). Locally the Bun dev server proxies same-origin `/api/hub/*` to Hub on port 3000.

## Environment

Copy `.env.example` to `.env`:

| Variable | Example | Purpose |
|----------|---------|---------|
| `PORT` | `5173` | Dev server (Hub uses 3000) |
| `HUB_API_URL` | `http://localhost:3000` | Dev proxy: `/api/hub/*` → Hub `/api/hub/*` |
| `PUBLIC_HUB_API_URL` | *(empty locally)* | Hub origin for CORS API calls, e.g. `https://gcp-stage.plena.finance`. Alias: `PUBLIC_API_BASE` |
| `PUBLIC_HUB_PUBLIC_BASE_URL` | `http://localhost:3000` | OAuth start links (Hub origin) |

**Hub** (`.env` in `x-executor`):

```bash
OAUTH_SUCCESS_REDIRECT_URL=http://localhost:5173/oauth/success
HUB_PUBLIC_BASE_URL=http://localhost:3000
WEBHOOK_PUBLIC_BASE_URL=http://localhost:3001
X_API_KEY=...
X_API_KEY_SECRET=...
X_REDIRECT_URI=http://localhost:3000/api/hub/oauth/x/callback
X_REGISTER_WEBHOOKS_WITH_X=true
```

## Development

```bash
# Terminal 1 — x-executor
yarn install && yarn start:hub:dev

# Terminal 2 — this repo
bun install && cp .env.example .env && bun dev
```

Open http://localhost:5173

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/login`, `/register` | Public | Hub JWT auth |
| `/orgs` | JWT | Redirects to your org dashboard (`user.orgId` from JWT) |
| `/orgs/:orgId` | JWT | Connections, prompts, auth token + XChat PIN |
| `/orgs/:orgId/campaigns/*` | JWT | Campaign CRUD + progress (`GET /api/hub/x/campaigns/:id/status`) |
| `/orgs/:orgId/invites` | JWT | Invite CRUD (`/api/hub/x/invites`) |
| `/orgs/:orgId/settings` | JWT | Prompts + handoff (`/api/hub/x/settings`) |
| `/connect/:token` | Public | Invite → OAuth 1.0a |
| `/oauth/success` | Public | Hub redirect after connect |

## Connection readiness (admin dashboard)

After OAuth connect, configure each connection:

| Flag | UI | Purpose |
|------|-----|---------|
| `subscribed` | Subscribed badge | Account Activity subscription |
| `hasAuthToken` | Auth token field | Outbound DMs + legacy DM fetch |
| `hasXchatPin` | XChat PIN field (4–8 digits) | Decrypt encrypted XChat inbound |
| Org `systemPrompt` | Prompt form | LLM inbound replies (required for auto-reply) |
| `hasAuthToken` on ≥1 connection | Auth token on connection cards | **Campaign DMs** (bulk outbound) |

PIN and auth token are password fields — submit once to Hub, never stored in frontend state after save.

## Campaign DMs (admin)

1. Ensure at least one connection has **auth token** saved (`/orgs/:orgId`).
2. **Campaigns** nav → enter target usernames (one per line) and message → **Launch campaign**.
3. Progress page polls `GET /api/hub/x/campaigns/:id/status` every 15s until complete.

Requires Hub `NATS_URL` plus background **Scheduler**, **Sender**, and **Analytics** services (see monorepo [railway.md](../x-executor/docs/railway.md)).

## Production / Vercel

```bash
bun run build   # output: dist/
```

Set at **build time** (either mode):

**Option A — CORS (direct Hub):**

```bash
PUBLIC_HUB_API_URL=https://your-hub.up.railway.app
PUBLIC_HUB_PUBLIC_BASE_URL=https://your-hub.up.railway.app
```

**Option B — Same-origin `/api/hub` (Vercel rewrite before SPA fallback):**

```json
{ "source": "/api/hub/:path*", "destination": "https://your-hub.up.railway.app/api/hub/:path*" }
```

Leave `PUBLIC_HUB_API_URL` empty at build time.

Hub production:

```bash
OAUTH_SUCCESS_REDIRECT_URL=https://your-app.vercel.app/oauth/success
HUB_PUBLIC_BASE_URL=https://your-hub.up.railway.app
WEBHOOK_PUBLIC_BASE_URL=https://your-webhook.up.railway.app
```

[`vercel.json`](vercel.json): `bun install --frozen-lockfile`, SPA rewrite to `index.html`.

## Local end-to-end checklist

1. Hub, Webhook, Processor (+ NATS) if testing DM pipeline.
2. Register → create org → **save system prompt**.
3. Create invite → `/connect/<token>` → Authorize on X → `/oauth/success`.
4. Admin: connection shows `@username`, `subscribed: true`.
5. Set **auth token** and **XChat PIN** on the connection.
6. Optional: send XChat DM or favorite a tweet to verify pipeline.

## Troubleshooting

**X OAuth / connect**

| Issue | Fix |
|-------|-----|
| `redirect_uri` mismatch | Hub `X_REDIRECT_URI` must match X Developer Portal callback exactly |
| JSON `"Redirect is requested"` | Redeploy Hub with browser login-flow redirect |
| Back to `/connect` after X | `OAUTH_SUCCESS_REDIRECT_URL` must be `https://<vercel>/oauth/success` |
| Login fails on staging / Plena Hub | Staging returns `{ success, data, error }` envelopes — frontend unwraps these. Set `PUBLIC_HUB_API_URL=https://gcp-stage.plena.finance` and redeploy |
| Login loop on Vercel | Set `PUBLIC_HUB_API_URL` (or `PUBLIC_API_BASE`) and redeploy frontend |

**DM automation**

| Symptom | UI action |
|---------|-----------|
| No replies | Save org system prompt |
| XChat silent | Set XChat PIN on connection |
| Send fails | Set auth token |
| `subscribed: false` | Check Hub `X_REGISTER_WEBHOOKS_WITH_X` and webhook deploy |

## Tests

```bash
bun test
```

## Key source files

| Path | Role |
|------|------|
| `src/lib/hub/api.ts` | Hub API client |
| `src/components/OrgPromptForm.tsx` | System prompt editor |
| `src/components/ConnectionAdminPanel.tsx` | Auth token + XChat PIN |
| `src/pages/ConnectPage.tsx` | Public OAuth start |
| `src/lib/hub/constants.ts` | `API_PREFIX` (`/api/hub`) |
