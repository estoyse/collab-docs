# Collab Docs

A real-time collaborative document editor that keeps working offline and merges edits automatically when the connection returns.

**Live demo: https://docs.azeemov.uz**

The demo runs the `deploy/koyeb-cloudflare` branch: a Cloudflare static frontend, a Koyeb server and a Turso (libSQL) database. That branch swaps local SQLite for libSQL and adds CORS. The free server instance sleeps after an hour idle, so the first load can take a few seconds. The demo is shared with anyone who has the link.

## Features

- Real-time collaboration: edits from every open tab appear instantly (Yjs CRDT over Hocuspocus).
- Offline editing with automatic merge: edits are stored in IndexedDB, survive a reload, and sync on reconnect.
- Live cursors and selections with name flags, plus an editors list showing who is in the document.
- Rich text: bold, italic, underline, strikethrough, inline code, headings, bullet and numbered lists, blockquote, code block, links and text alignment.
- Documents page with page-style previews (title, opening lines, last edited time).
- Export to HTML, PDF (browser print) and Markdown, entirely client-side.
- Installable PWA that loads the app shell offline.

## Run locally

Prerequisites: Node 22.12 or newer and pnpm 11 (`packageManager` is `pnpm@11.9.0`).

```bash
pnpm install
pnpm dev          # web on http://localhost:5173, server on http://localhost:3001
pnpm test         # all workspace tests
pnpm typecheck    # tsc across all workspaces
```

`pnpm dev` starts both apps. The server serves REST (`/api`) and the Yjs WebSocket on the same port, and Vite proxies `/api` to it.

| Variable | Used in | Default |
| --- | --- | --- |
| `VITE_COLLAB_URL` | `apps/web/src/collab/useDocSession.ts` | `ws://localhost:3001` |
| `PORT` | `apps/server/src/index.ts` | `3001` |
| `DATABASE_PATH` | `apps/server/src/index.ts` | `data/documents.db` (relative to the server's working directory) |

The service worker is disabled in dev, so reloading while offline needs a production build: `pnpm -F @collab-docs/web build && pnpm -F @collab-docs/web preview` (serves http://localhost:4173, with the server still running).

## Try it: two users and offline

1. Open the app in two different browsers (or two browser profiles; private windows may block IndexedDB).
2. Enter a different name in each at "What should we call you?".
3. In browser A click **New document**, then open the same `/d/<id>` URL in browser B.
4. Type in either one. Text and a named cursor appear in the other; click the avatars to see the editors list, with "You" on your own entry.
5. In browser A, set DevTools Network to Offline. The status pill goes from **Saved** to **Offline** and a "You are offline" toast appears. Keep typing: the pill shows "Offline, changes waiting to sync".
6. Meanwhile, type in the same document in browser B.
7. Turn the network back on. The pill passes through **Connecting** and **Syncing** to **Saved**, a "Back online" toast appears, and both browsers show both sets of edits.
8. With a production build, reload browser A while offline: the page and your unsynced edits come back from the service worker cache and IndexedDB.

## Architecture

```
Tiptap editor
     │ ProseMirror transactions (y-prosemirror binding)
     ▼
   Y.Doc ─────────────────────────────┐
     │                                │
IndexeddbPersistence            HocuspocusProvider
(local update log per doc)      (WebSocket, retries with backoff)
     │                                │
browser IndexedDB               Hocuspocus server (relays updates + awareness)
                                      │ debounced store (1s, max 5s)
                                      ▼
                                SQLite: Yjs state blob + derived title/excerpt
```

Both persistence layers observe the same `Y.Doc`, so there is no hand-written local/remote sync code. Yjs exchanges state vectors and each side sends only what the other is missing.

| Area | Responsibility |
| --- | --- |
| `apps/web/src/collab/` | Yjs session, IndexedDB + provider wiring, connection state, network binding, pending-change count, title diffing |
| `apps/web/src/editor/` | Tiptap setup, toolbar and menus, document page, exporters |
| `apps/web/src/features/` | Documents list and title field, name screen, presence (avatars, editors list) |
| `apps/web/src/components/` | Status pill, error boundary, offline storage warning, update prompt, `ui/` primitives |
| `apps/web/src/lib/` | Name to colour hashing, identity and list caching, download/print helpers, shortcuts |
| `apps/server/src/app.ts` | Express app: health check, documents routes, JSON 400/404/500 |
| `apps/server/src/collab/` | Hocuspocus server, connect checks, persistence hooks, title/excerpt extraction |
| `apps/server/src/documents/`, `db.ts` | REST router, SQLite document store, schema and migration |
| `packages/shared` | Client/server contract: types, schema version, document id pattern, title rules |

### Offline and sync flow

- Each document gets a `Y.Doc` with `IndexeddbPersistence` (`collab-docs:<docId>`) and a `HocuspocusProvider`. The editor renders once the local copy has loaded (3s timeout), so an offline cold start shows the last local state.
- The provider syncs whenever it can reach the server; offline edits accumulate in the `Y.Doc` and IndexedDB.
- Browser `offline`/`online` events disconnect and reconnect the provider immediately instead of waiting for a socket timeout.
- Clients send a schema version on connect. The server rejects mismatches and the client shows a persistent "Reload" toast instead of syncing content it may not understand.
- The server stores documents on a 1s debounce (5s max) and flushes pending stores on `SIGINT`/`SIGTERM`, with a 5s timeout.

### Error handling

- A dropped WebSocket never blocks editing; the status pill and toasts are the only signal.
- IndexedDB availability is probed at startup and a persistent warning is shown if offline editing is unavailable.
- React error boundaries wrap the app and each document page, with a reload action.
- Server fetch/store failures are logged and rethrown, so a failed load refuses the document instead of serving it empty.
- Malformed document ids are rejected on both REST (400) and WebSocket connect; unknown API routes return JSON 404, bad JSON 400, other errors 500.
- Listen errors (`EADDRINUSE`, `EACCES`) exit with a clear message; the documents list falls back to a cached copy when the server is unreachable.

## Why these tools

- **Yjs.** A proven CRDT, so concurrent edits and long offline sessions resolve through the same merge with no central transform step. OT systems like ShareDB need a server to order operations, which makes real offline editing awkward, and Automerge's ProseMirror binding was less mature than Yjs's.
- **Tiptap with `Collaboration`/`CollaborationCaret`** (built on `y-prosemirror`). Tiptap supplies the editor command model, and the maintained binding maps ProseMirror state onto a `Y.XmlFragment` so marks, lists and attributes merge correctly without custom mapping code.
- **y-indexeddb.** It persists the same Yjs update log the network uses, so offline edits survive reloads and merge through the identical CRDT path. No separate pending-operation queue to get wrong, and no `localStorage` size limits.
- **Hocuspocus.** From the Tiptap team, it provides awareness, debounced persistence and lifecycle hooks (`onConnect`, database `fetch`/`store`), and hands HTTP requests to Express so REST and sync share one port.
- **SQLite via better-sqlite3.** A Yjs document is an opaque binary blob, so one row per document in a single file is enough. `better-sqlite3` ships prebuilt binaries and works on Node 22 without the experimental flag `node:sqlite` needs.

## Testing

```bash
pnpm test
```

150 tests in 22 files, all passing: 99 in `apps/web` (14 files) and 51 in `apps/server` (8 files). `packages/shared` has no tests.

- `merge.test.ts`: headless `Y.Doc` peers diverge offline and merge via state vectors (concurrent typing, duplicate and out-of-order updates, a peer offline for two rounds, delete vs add, concurrent title renames).
- Server integration tests start a real Hocuspocus server with real `HocuspocusProvider` clients (`apps/server/src/test/collabHarness.ts`): concurrent typing, disconnected client merge, reload from a local snapshot, concurrent title inserts.
- Persistence and schema integration tests: restore after server restart, flush on graceful shutdown, schema version accept/reject.
- Client units: connection state and toasts, network event binding, pending changes, local readiness, title diffing, presence, colours and identity, documents cache, exporters.
- Server units: title/excerpt extraction, id and schema checks, REST routes and error responses, SQLite store and migration.
- No browser end-to-end tests; the live and offline flows are covered by the integration tests and the walkthrough above.

## Design

- Everyone writes in their own ink: your presence colour is set as `--self` and drives your caret, selection, focus rings, pressed toolbar toggles and the "You" marker. Document content never uses it, so it looks the same to every reader.
- A quiet palette (grey desk, white page, dark ink) with Literata for documents and headings and Hanken Grotesk for controls.
- All colours, fonts, radii and shadows are tokens in `apps/web/src/index.css`, exposed to Tailwind; Base UI primitives are restyled against them.
- Lucide icons at a single 16px size.
- Departures from a Docs layout: a vertical tool rail on wider screens (a single scrolling row on narrow ones), the title set on the page itself, and a documents page of page previews instead of a file list.

## Known limitations

- A structural change (for example paragraph to heading) racing an offline text edit in the same block can lose that text on merge. Plain text edits in the same paragraph merge correctly.
- No authentication or permissions; anyone with a document link can edit it.
- Creating a document needs the server, since ids are issued server-side. Editing an open document offline works.
- Single server instance; scaling out would need a shared backend for sync and awareness.
- The service worker only runs in production builds.
- The pending-changes count is per tab and resets on reload (IndexedDB still keeps the edits).
- No dedicated phone layout pass, and no comments, version history, tables or image upload.
