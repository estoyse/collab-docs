# Collab Docs

A real-time collaborative document editor that keeps working offline and merges edits automatically when the connection returns.

**Live demo: https://docs.azeemov.uz**

> [!IMPORTANT]
> **The live demo is slower than the app itself.** It runs on free hosting, and the delays come from the hosting, not from the editor:
>
> - **Cold start.** The free server sleeps after an hour without visitors. The first page load after that waits a few seconds while it wakes up.
> - **Distance between servers.** The server and the database are hosted physically far apart. Every request pays roughly **80ms to reach the server** and another **80ms from the server to the database**, so opening the documents list or a document takes slightly longer than running locally.
>
> Once a document is open, typing is not affected: edits apply locally first and sync in the background.

The demo runs the `deploy/koyeb-cloudflare` branch, which changes three things for hosting:

- **Local SQLite file → Turso (hosted libSQL).** The free server host has no persistent disk, so documents live in a hosted database. The libSQL client still uses a local file in development.
- **Relative `/api` → API URL set at build time.** The frontend and the server run on different domains.
- **No origin checks → an allowlist for REST and WebSocket.** Once the server is public, only the demo's own site may call it.

Anyone with the link can see and edit the demo documents.

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

## Design

The goal was an interface that stays quiet around the text and is recognisably its own, not a Google Docs clone or a stock component theme.

**Why it looks like this**

- **Everyone writes in their own ink.** Each person's presence colour, the one others see on their cursor, is also the accent of their own interface (`--self`): caret, selection, focus outlines, pressed toolbar buttons and the "You" marker. Collaboration is the product, so its colour carries the meaning instead of a generic brand blue. Document content never uses it, so a page reads the same for everyone.
- **Paper on a desk.** A white page with a hairline border sits on a cool grey desk. Only floating things (menus, popovers, toasts) cast a shadow, and cool graphite was chosen over warm cream to keep attention on the text.
- **Two typefaces with one job each.** Literata, designed for long reading on screens, sets documents and page headings. Hanken Grotesk sets every control.
- **The document owns the page.** The title is set on the page itself, and formatting lives in a slim tool rail beside it rather than a ribbon across the top. On narrow screens the rail becomes one row that only appears while you edit.
- **Documents look like documents.** The documents page shows each one as a small page with its title and opening lines, not a list of titles that reads like a chat history.
- **Small, fixed scales.** One type scale from 12 to 40px, radii of 3, 4 and 6px, two shadows, Lucide icons at 16px. All of it lives as tokens in `apps/web/src/index.css`.

**How the Base UI primitives were styled**

The components in `apps/web/src/components/ui` wrap Base UI, which ships behaviour and accessibility (focus management, keyboard navigation, ARIA) with no styling. They started from shadcn's file layout and its default classes, and every class was rewritten against the app's tokens:

- The default neutral palette and `dark:` variants were removed. shadcn's variable names (`--popover`, `--muted`, …) remain only as aliases for the app's tokens.
- One focus style everywhere: a 2px outline in your own colour instead of per-component rings.
- Pressed toggles use a light tint of your colour. The alignment control stays neutral, because one option is always selected.
- Menus and popovers share the page surface, a hairline border and one overlay shadow. Tooltips are small dark labels without arrows.
- Unused variants and components were deleted, so each primitive only contains what the app uses.

## Known limitations

- A structural change (for example paragraph to heading) racing an offline text edit in the same block can lose that text on merge. Plain text edits in the same paragraph merge correctly.
- No authentication or permissions; anyone with a document link can edit it.
- Creating a document needs the server, since ids are issued server-side. Editing an open document offline works.
- Single server instance; scaling out would need a shared backend for sync and awareness.
- The service worker only runs in production builds.
- The pending-changes count is per tab and resets on reload (IndexedDB still keeps the edits).
- No dedicated phone layout pass, and no comments, version history, tables or image upload.
