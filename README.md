# X Executor Frontend

Admin dashboard and public connect flow for the [X Executor Hub](../x-executor/apps/hub) API. Built with Bun, React 19, and Tailwind.

## Prerequisites

1. **Hub** running locally from the `x-executor` monorepo (MongoDB, Redis, X OAuth app configured).
2. **X Developer App** with OAuth 2.0 user context; callback URL on Hub:
   - Local: `http://localhost:3000/api/v1/oauth/x/callback`

## Environment

Copy `.env.example` to `.env`:

| Variable | Example | Purpose |
|----------|---------|---------|
| `PORT` | `5173` | Frontend server (Hub uses 3000) |
| `HUB_API_URL` | `http://localhost:3000` | Server proxy target for `/api/*` |
| `PUBLIC_HUB_API_URL` | *(empty)* | Client API base; empty = same-origin proxy |
| `PUBLIC_HUB_PUBLIC_BASE_URL` | `http://localhost:3000` | OAuth start URLs (must hit Hub) |

In **`x-executor/.env`** (Hub), set:

```bash
OAUTH_SUCCESS_REDIRECT_URL=http://localhost:5173/oauth/success
HUB_PUBLIC_BASE_URL=http://localhost:3000
```

## Development

```bash
# Terminal 1 — from x-executor repo
yarn install
yarn start:hub:dev

# Terminal 2 — this repo
bun install
cp .env.example .env   # if needed
bun dev
```

Open http://localhost:5173

## Routes

| Route | Description |
|-------|-------------|
| `/login`, `/register` | Hub JWT auth |
| `/orgs` | List and create organizations |
| `/orgs/:orgId` | X connections (list, revoke, auth token) |
| `/orgs/:orgId/invites` | Create/list/revoke invites (admin) |
| `/orgs/:orgId/settings` | Prompts and members (admin) |
| `/connect/:token` | Public invite → Connect with X |
| `/oauth/success` | Post-OAuth confirmation (Hub redirect target) |

## Production build

```bash
bun run build
```

Set `PUBLIC_HUB_API_URL` and `PUBLIC_HUB_PUBLIC_BASE_URL` at build time for static deploys, or serve behind a reverse proxy that forwards `/api` to Hub.

## Local end-to-end checklist

1. Start Hub on port **3000** with `OAUTH_SUCCESS_REDIRECT_URL=http://localhost:5173/oauth/success`.
2. Start frontend on **5173** (`bun dev`).
3. Register → create org → create invite.
4. Open `/connect/<inviteToken>` → Connect with X → land on `/oauth/success`.
5. In admin UI, verify the new `@username` under Connections; test prompts, members, invite revoke.

## Tests

```bash
bun test
```
