# Deploying collab-docs

This is the hosting runbook for the `deploy/koyeb-cloudflare` branch: a
static single-page app on Cloudflare, talking REST and WebSocket to a
Docker container on Koyeb, backed by a Turso (libSQL) database. It assumes
you've read the "Deployment" section of the root [README](../README.md).

```
Browser
   │  HTTPS (REST)  +  WSS (Yjs sync)
   ▼
Cloudflare              static SPA (apps/web), Workers static assets
   │
   ▼
Koyeb                   Docker container, Node 22, port 8000
   │  libSQL over the network
   ▼
Turso                   hosted libSQL database
```

The client is fully static — Cloudflare serves prebuilt files and never
runs server code. All REST and WebSocket traffic goes straight from the
browser to Koyeb. Deploy Koyeb before Cloudflare: the client's build needs
the Koyeb URL baked in as `VITE_API_URL`.

## Step 1 — Turso

1. Create a database in the [Turso](https://turso.tech) dashboard or CLI,
   in the region closest to your users (Frankfurt, to match the Koyeb
   region used below).
2. Copy its connection URL — it looks like
   `libsql://collab-docs-<your-org>.turso.io`. This is `DATABASE_URL`.
3. Create an auth token for the database. This is `DATABASE_AUTH_TOKEN`.
   Never commit it — it goes into Koyeb as a secret in Step 2.

`apps/server/src/db.ts` calls `applySchema()` on every startup (it creates
the `documents` table and adds the `excerpt` column if missing), so the
schema is created automatically the first time the server connects — no
separate migration step.

## Step 2 — Koyeb (deploy this first)

Deploy the server first so its URL exists when you configure the Cloudflare
build in Step 3.

The branch must be pushed to GitHub for a Git-connected Koyeb deployment
(see the alternative at the end of this doc if you'd rather not connect
GitHub).

In the Koyeb dashboard, create a new service:

- **Source:** your GitHub repo, branch `deploy/koyeb-cloudflare`.
- **Builder:** Dockerfile.
  - **Dockerfile path:** `Dockerfile` (the one at the repo root).
  - **Work directory:** the repo root — do **not** use Koyeb's
    monorepo/"work directory" mode pointed at `apps/server`. The Dockerfile
    (`FROM node:22-slim AS build`) copies `pnpm-workspace.yaml` and
    `packages/shared` from the repo root and needs the whole workspace in
    its build context; scoping the build directory to `apps/server` drops
    the workspace and the build fails.
- **Instance:** Free.
- **Region:** Frankfurt.
- **Ports:** expose port `8000`, protocol HTTP, path `/` (this is also
  where WebSocket upgrade requests land — `collab/server.ts` has Hocuspocus
  own the HTTP server and hand REST requests to Express via `onRequest`, so
  REST and WebSocket share this one port and route).
- **Health check:** HTTP, port `8000`, path `/api/health`.
- **Environment variables:**
  - `DATABASE_URL` — plain env var, the `libsql://…` URL from Step 1.
  - `DATABASE_AUTH_TOKEN` — mark as a **secret**.
  - `CORS_ORIGIN` — leave unset for now; you'll set it in Step 4 once the
    Cloudflare URL exists, then redeploy.
  - Leave `PORT` unset — the Docker image's final stage already sets
    `ENV PORT=8000`.

Deploy, then verify:

```bash
curl https://<app>.koyeb.app/api/health
# {"ok":true}
```

If it fails, see Troubleshooting below — in particular, Turso auth errors
exit the process before the health check can ever pass.

## Step 3 — Cloudflare Workers Builds

`apps/web/wrangler.jsonc` configures a Workers **static assets** site (no
server-side Worker code): `assets.directory` is `./dist`,
`not_found_handling: "single-page-application"` gives client-side routing
an automatic SPA fallback.

In the Cloudflare dashboard, **Workers & Pages → Import repository**
(Git-connected, "Workers Builds"):

- **Repository:** the same GitHub repo.
- **Project/worker name:** `collab-docs` — this must match the `name` in
  `apps/web/wrangler.jsonc`.
- **Production branch:** `deploy/koyeb-cloudflare`.
- **Root directory:** `apps/web`.
- **Build command:** `pnpm build`.
- **Deploy command:** `npx wrangler@4.133.0 deploy`.
- **Non-production (preview) deploy command:**
  `npx wrangler@4.133.0 versions upload`.
- **Build variables** (these are used at *build* time by Vite, not runtime
  — Cloudflare Workers static assets serve prebuilt files, there's no
  server to read env vars from later):
  - `VITE_API_URL` = `https://<app>.koyeb.app`
  - `VITE_COLLAB_URL` = `wss://<app>.koyeb.app` (optional —
    `apps/web/src/lib/api.ts` derives this from `VITE_API_URL` by swapping
    `https:`→`wss:` if it's not set, so you only need this when the
    WebSocket endpoint differs from the REST one)
  - `PNPM_VERSION` = `11.9.0` — the Cloudflare build image defaults to
    pnpm 10, which doesn't match `packageManager: "pnpm@11.9.0"` in the
    root `package.json`.
  - `NODE_VERSION` = `24` (optional; the repo's own floor is Node ≥22.12,
    set in the root `package.json`'s `engines`).

The resulting URL is `https://collab-docs.<your-account-subdomain>.workers.dev`.
That's the origin you'll allowlist in Step 4.

**Fallback: Cloudflare Pages**, if Workers Builds isn't available on your
account — same repo, but:

- Framework preset: none.
- Root directory: blank (repo root).
- Build command: `pnpm -F @collab-docs/web build`.
- Build output directory: `apps/web/dist`.
- Same `VITE_API_URL`/`VITE_COLLAB_URL`/`PNPM_VERSION` build variables.

Pages also serves a SPA fallback automatically and honours
`apps/web/public/_headers` (the security headers and the immutable-caching
rule for `/assets/*`), same as Workers static assets does.

## Step 4 — Wire up CORS

Now that the Cloudflare origin exists, go back to the Koyeb service and set:

- `CORS_ORIGIN` = the exact Cloudflare origin — scheme and host only, no
  trailing slash, e.g. `https://collab-docs.<account>.workers.dev`. Add
  more origins comma-separated if you also want e.g. a Pages preview URL
  to work (`apps/server/src/origins.ts` splits on `,` and trims each one;
  a trailing slash on an entry is stripped automatically, but the browser
  never sends one, so keep it out for clarity).

Redeploy the Koyeb service so the new `CORS_ORIGIN` takes effect (`index.ts`
reads it once at process start).

Verify the CORS preflight:

```bash
curl -i -X OPTIONS https://<app>.koyeb.app/api/documents \
  -H 'Origin: https://collab-docs.<account>.workers.dev' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Expect `204 No Content` with `Access-Control-Allow-Origin` echoing the
`Origin` header (`apps/server/src/app.ts`'s `allowCrossOrigin` middleware).
If `CORS_ORIGIN` is unset or doesn't contain that exact origin, the
response comes back with no `Access-Control-Allow-Origin` header and the
browser blocks the real request.

The same allowlist gates the WebSocket: `collab/server.ts`'s `onConnect`
calls `assertAllowedOrigin` from `origins.ts` with the connecting client's
`Origin` header, so setting `CORS_ORIGIN` also restricts who can open a
sync connection, not just who can call the REST API.

## Alternative: deploying without GitHub

**Web, from your machine:**

```bash
npx wrangler@4.133.0 login
VITE_API_URL=https://<app>.koyeb.app \
VITE_COLLAB_URL=wss://<app>.koyeb.app \
pnpm -F @collab-docs/web deploy
```

(`apps/web/package.json`'s `deploy` script is `pnpm build && npx wrangler@4.133.0 deploy`.)

**Server, without a Git-connected Koyeb service:** use the Koyeb CLI or
dashboard to deploy from a local archive, or build and push
`collab-docs-server` (see the local build command below) to a container
registry (Docker Hub, GHCR, etc.) and point a Koyeb Docker-image service at
that image instead of a GitHub repo. The port, health check, and env vars
are the same as Step 2 either way.

## Local production check

**Server**, in a container exactly like the one Koyeb runs:

```bash
docker build -t collab-docs-server .
docker run --rm -p 8000:8000 -e DATABASE_URL=file:/tmp/docs.db collab-docs-server
```

Then `curl http://localhost:8000/api/health` should return `{"ok":true}`.

**Web**, against that local server:

```bash
VITE_API_URL=http://localhost:8000 pnpm -F @collab-docs/web build
pnpm -F @collab-docs/web preview
```

`vite preview` serves on `http://localhost:4173`. Because that's a
cross-origin request from the server's point of view, the server's
`CORS_ORIGIN` needs to include `http://localhost:4173` for this to work —
re-run the container with
`-e CORS_ORIGIN=http://localhost:4173` added.

## Operational notes

- **Scale-to-zero wake.** Koyeb's free instance type sleeps after about an
  hour idle. Opening a document first fetches it over REST
  (`DocumentPage.tsx`'s `GET /api/documents/<id>` call, made before the
  WebSocket connects), and that plain HTTP request is what wakes a
  sleeping instance; expect the first request after a while idle to take
  1–5 seconds before the app responds, including before the WebSocket sync
  connection completes.
- **`SIGTERM` flush.** `index.ts` handles `SIGTERM`/`SIGINT` by calling
  `hocuspocus.flushPendingStores()` and `collab.destroy()`, with a 20-second
  forced-exit timer (`SHUTDOWN_TIMEOUT_MS`) as a backstop. That's
  comfortably inside Koyeb's own termination grace period (30 seconds by
  default), so a redeploy or scale-to-zero shouldn't lose an in-flight save
  under normal load.
- **WebSocket keep-alive.** Hocuspocus's server-side WebSocket handling
  uses a built-in ping/pong with a 60-second default timeout, and
  `collab/server.ts` doesn't override it. Ordinary editing and awareness
  (presence) traffic keeps a connection well inside that window, so there's
  no separate heartbeat to configure and no proxy-level idle timeout to
  worry about once the socket is open.
- **Mixed content.** The client must be loaded over `https://` and talk to
  `https://`/`wss://` endpoints only — a browser on an `https://` page
  silently blocks `ws://`/`http://` requests. `apps/web/src/lib/api.ts`'s
  `resolveCollabUrl` derives `wss:` from an `https:` `VITE_API_URL`
  automatically; just make sure `VITE_API_URL` itself is `https://…` in
  the Cloudflare build variables.
- **Schema version handshake.** `packages/shared`'s `DOC_SCHEMA_VERSION` is
  sent by the client as a query parameter and checked by the server's
  `onConnect` (`assertSupportedClient` in `collab/server.ts`); a mismatch
  rejects the connection with `schema-mismatch` and the client shows a
  persistent "Reload" toast. If you ever bump `DOC_SCHEMA_VERSION`, deploy
  the server and redeploy the client together — an old client talking to a
  new server (or vice versa) is rejected by design, not silently
  incompatible.
- **Secrets.** `DATABASE_AUTH_TOKEN` is the only real secret in this setup;
  mark it as a Koyeb secret, not a plain env var, and never put it in
  `VITE_*` build variables (those end up in the client bundle, which is
  public).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Browser console shows a CORS error on REST calls | `CORS_ORIGIN` on Koyeb doesn't include the exact Cloudflare origin | Set `CORS_ORIGIN` to the exact scheme+host (no trailing slash, no path) and redeploy Koyeb; re-run the preflight `curl` from Step 4 |
| WebSocket fails to connect; client stays on "Offline" with no error toast | Hocuspocus rejected the connection's `Origin` (`origin-not-allowed`, from `assertAllowedOrigin` in `origins.ts`) | Same fix as above — `CORS_ORIGIN` covers both REST and the WebSocket origin check. Check the browser's Network tab / Koyeb logs for the rejected origin |
| Persistent "This tab is running an older version" toast, "Reload" button | Client and server disagree on `DOC_SCHEMA_VERSION` (`schema-mismatch`) | Deploy the server and client from the same commit; if you changed `DOC_SCHEMA_VERSION`, redeploy both together |
| First request after a while takes several seconds | Koyeb free-tier scale-to-zero waking the instance | Expected — see "Scale-to-zero wake" above. Not a bug |
| WebSocket connection drops after roughly 30 seconds | Not a Cloudflare proxy timeout — in this setup Cloudflare only serves static files, and the WebSocket connects directly from the browser to Koyeb, never passing through Cloudflare's network | Look at Koyeb/Hocuspocus timeouts instead — see "WebSocket keep-alive" above; check Koyeb's own logs for the connection close reason |
| Turso auth/connection errors in Koyeb logs, container exits immediately | Wrong or expired `DATABASE_AUTH_TOKEN`, or a `DATABASE_URL` that doesn't match the token's database | `index.ts` logs `Failed to open the database at <DATABASE_URL>` (the URL only, never the token) and exits 1 before the health check can pass. Re-check both env vars against the Turso dashboard |
| Cloudflare build fails resolving the pnpm workspace | Build variable `PNPM_VERSION` missing, so Cloudflare's default (pnpm 10) is used against a `pnpm@11.9.0`-pinned lockfile | Set `PNPM_VERSION=11.9.0` in the Cloudflare project's build variables |
| Koyeb Docker build fails on `pnpm install --frozen-lockfile` or can't find `packages/shared` | Koyeb's work directory was scoped to `apps/server` (monorepo mode) instead of the repo root | Set the work directory to the repo root, Dockerfile path `Dockerfile` |
