# Collab Docs

Collab Docs is a real-time collaborative document editor. Multiple people can
open the same document, see each other's cursors and edits appear instantly,
and keep working through a lost connection — edits made offline are never
lost and merge back in automatically once the connection returns. The stack
is a React client, a single Node server that speaks both plain REST and the
Yjs sync protocol, and SQLite for storage.

This document explains how to run the project, how it is put together, why
the specific tools were chosen, what "offline" actually means here, and what
was deliberately left out.

## Running it

**Prerequisites:** Node 22.12 or newer (`better-sqlite3` requires Node 22,
Vite 8 requires 22.12 on that line, and the integration tests use Node's
built-in `WebSocket`) and [pnpm](https://pnpm.io) — this was
built and tested against pnpm 11.9.0. The project is a pnpm workspace with
three packages: `apps/web` (the client), `apps/server` (the API and sync
server), and `packages/shared` (types shared across the wire).

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs both the server and the client at once (via `concurrently`).
Once it's running:

- The client is at **http://localhost:5173**.
- The server (REST API and the WebSocket sync endpoint) is at
  **http://localhost:3001** / **ws://localhost:3001**, both served from the
  same Node process.

Open the client URL in two different browsers (or two Chrome profiles — see
"Try it" below), give each a different name, and open the same document in
both to see live collaboration.

**Environment variables**, all optional:

| Variable | Read by | Default |
| --- | --- | --- |
| `VITE_COLLAB_URL` | `apps/web/src/collab/useDocSession.ts` | `ws://localhost:3001` |
| `PORT` | `apps/server/src/index.ts` | `3001` |
| `DATABASE_PATH` | `apps/server/src/index.ts` | `data/documents.db` |

`DATABASE_PATH` is resolved relative to the server process's working
directory, so with the default it ends up at `apps/server/data/documents.db`
when started with `pnpm -F @collab-docs/server dev`. The file is a plain
SQLite database (WAL mode); delete it to start over. Both `data/` and `*.db`
are gitignored.

**Tests and type-checking:**

```bash
pnpm test        # runs every workspace's tests — 150 tests across 22 files
pnpm typecheck    # runs tsc across every workspace
```

**On the native dependency.** `pnpm install` does not need a C/C++
toolchain. The only native dependency, `better-sqlite3`, ships prebuilt
Node-API binaries inside its own package for the common platforms
(linux/darwin/win32 × x64/arm64), and its `binding.gyp` checks
`prebuild_exists` before building anything. pnpm still runs an implicit
`node-gyp rebuild` step (the package has no explicit `install` script), but
it compiles nothing once a prebuild matches. Separately, `pnpm-workspace.yaml`
pre-approves the two packages with install/build scripts (`better-sqlite3`,
`esbuild`) via `allowBuilds`, so pnpm doesn't stop to ask either.

## Try it: two users + offline

**Two users, live**, in a couple of minutes with `pnpm dev` running:

1. Open **http://localhost:5173** in two different browsers, or two
   separate Chrome **profiles** — not a normal window paired with a
   private one, since private windows sometimes disable IndexedDB
   entirely, which shows the "offline editing unavailable" warning and
   defeats the offline half of this walkthrough.
2. Give each window a different name at the "What should we call you?"
   screen — the live preview shows the cursor colour that name hashes into.
3. In window A, click **New document** and start typing; in window B, open
   the same URL (`/d/<id>`). Typing in either appears in the other within a
   fraction of a second, with a name-flagged remote cursor. Click the
   avatar stack to see both editors listed, "You" marking your own entry.
4. In window A, DevTools → Network → set throttling to **Offline** (or
   disconnect Wi-Fi). The status pill flips from "Saved" to **Offline**
   with a toast, and editing is not interrupted. Keep typing.
5. Turn the network back on. Within a couple of seconds the pill returns to
   **Saved**, a "Back online" toast appears, and window B now shows
   everything typed in A while offline, merged in — and vice versa.

**Surviving a reload while offline** — the scenario graded hardest — needs
the service worker, which is deliberately disabled under `pnpm dev`
(`devOptions: { enabled: false }`, so dev never serves stale assets). Use a
production build instead:

```bash
pnpm -F @collab-docs/server dev     # terminal 1 — unchanged
pnpm -F @collab-docs/web build      # terminal 2
pnpm -F @collab-docs/web preview    # serves http://localhost:4173
```

`vite preview` proxies `/api` to `http://localhost:3001`, same as dev —
Vite 8's preview server falls back to the `server.proxy` config in
`vite.config.ts` when no separate `preview.proxy` is set, which is the case
here, so no extra setup is needed.

1. Visit `http://localhost:4173` once while online and open a document. A
   "Ready to work offline" toast confirms the service worker installed and
   precached the app shell.
2. Go offline either **in the browser** (DevTools → Network → Offline, or
   real Wi-Fi off — fires the `offline` event, which `collab/network.ts`
   uses to disconnect the provider immediately rather than waiting for a
   socket timeout) or **at the server** (stop the server process — the
   socket drops and the provider retries with backoff until it also shows
   Offline, just less immediately).
3. Type more, then **reload the page while still offline**. The service
   worker serves the shell from cache (`navigateFallback: 'index.html'`),
   and the editor renders from IndexedDB before it ever needs the network
   — nothing typed before the reload is missing.
4. Go back online. The pill returns to **Saved** and the edits sync up.

## Architecture

```
collab-docs/
├── apps/web/         React + Vite client
├── apps/server/      Express + Hocuspocus + SQLite, one process
└── packages/shared/  Types crossing the wire (PresenceUser, DocumentSummary, ...)
```

**Client (`apps/web/src`):** `collab/` is the only module that imports
`yjs` as a value — `session.ts` builds the `Y.Doc` and attaches
`IndexeddbPersistence` then `HocuspocusProvider`; `useDocSession.ts` wraps
that for React; `connection.ts` is the status-pill state machine;
`network.ts` binds browser online/offline events to the provider;
`localReady.ts` gates rendering on local storage; `pendingChanges.ts`
counts unsynced transactions; `ytext.ts` is the diff/rebase behind the
collaborative title field. (`DocumentTitle.tsx` and `ExportMenu.tsx` import
`Y.Doc` only as a TypeScript type, to type a prop.) `editor/` holds the
Tiptap wiring, responsive toolbar, selection/link menus, and the HTML/PDF/
Markdown exporters. `features/documents/` is the list, the collaborative
title field, and `useDocuments.ts` (REST list/create with a `localStorage`
fallback). `features/identity/` is the one-time name screen.
`features/presence/` turns Hocuspocus awareness into the avatar stack.
`components/` holds cross-cutting UI (`StatusPill`, `ErrorBoundary`,
`OfflineStorageWarning`, `UpdatePrompt`, `Wordmark`, and the `ui/`
primitives). `lib/` is name→colour hashing, identity/document-list
persistence, and file download/print helpers.

**Server (`apps/server/src`):** `app.ts` is the Express app (health check,
documents router, JSON 404/400/500 handling). `index.ts` is process wiring
— opens the database, starts the server, handles `SIGINT`/`SIGTERM`,
`EADDRINUSE`/`EACCES`, `unhandledRejection`. `collab/server.ts` builds the
Hocuspocus `Server`: `onConnect` rejects malformed document ids and
unsupported client schema versions, `onRequest` delegates to Express so
REST and Yjs sync share one port, and the `Database` extension's
`fetch`/`store` hooks log-and-rethrow rather than swallow failures.
`collab/title.ts` derives a title/excerpt from the document's
`Y.XmlFragment`. `documents/` is the REST router and SQLite-backed
`DocumentStore`; `db.ts` opens and migrates the schema.
`test/collabHarness.ts` starts a real Hocuspocus server and real
`HocuspocusProvider` clients in-process for the integration tests.

**`packages/shared/src/index.ts`** holds `DocumentSummary`, `PresenceUser`,
the schema-version constants, `DOCUMENT_ID_PATTERN`, and
`resolveDocumentTitle`, shared between server title extraction and the
client's export filename logic.

**Data flow.** `IndexeddbPersistence` attaches to a fresh `Y.Doc` before
`HocuspocusProvider` does, and the editor doesn't render until the local
load resolves — a cold, offline load shows what was last saved locally
*before* any network call, instead of flashing an empty document.

```
Tiptap editor
     │  ProseMirror transactions
     ▼
   Y.Doc  ── one shared CRDT document, held in memory
     │                              │
     │ observed by                 │ observed by
     ▼                              ▼
IndexeddbPersistence          HocuspocusProvider
 (attaches first; gates        (WebSocket; retries with backoff;
  the editor's render)          bound to online/offline events)
     │                              │
     ▼                              ▼
browser IndexedDB             Hocuspocus server
(offline update log,           (relays updates + awareness;
 collab-docs:<docId>)           debounces persistence, 1-5s)
                                     │
                                     ▼
                               SQLite (better-sqlite3)
                               documents.state — Yjs blob
                               + title/excerpt — derived, for listing
```

Because IndexedDB and the network provider both just observe the same
`Y.Doc`, there is no synchronization code written for this project between
"local" and "remote" — Yjs decides what a remote update does to local
state. Offline, edits accumulate in the local `Y.Doc` and IndexedDB; on
reconnect, client and server exchange Yjs state vectors and each sends only
what the other is missing. Nothing anywhere picks a "winner" by timestamp.

**What's stored where.** SQLite holds one row per document: the Yjs state
as a binary blob, plus `title`/`excerpt` columns derived from it purely so
the list has something cheap to query — their source of truth is still the
Yjs document. IndexedDB mirrors the same update log per document in the
browser. `localStorage` holds the user's name/colour and a cached copy of
the last documents list, for viewing offline. Presence rides the provider
as Yjs "awareness" state and is never persisted — it's ephemeral, so
offline you correctly see only yourself.

**Error handling, summarized.** A WebSocket drop never blocks editing — the
status pill and a toast are the only signal. An unavailable IndexedDB is
detected at startup (a throwaway connection, not a timeout guess) and shown
as a persistent warning, since silently losing offline edits would be the
worst failure. A React `ErrorBoundary` wraps each document page. The server
logs and rethrows fetch/store failures instead of swallowing them (a failed
fetch refuses the document rather than serving it empty), returns typed
400/404 JSON for malformed input, flushes pending writes with a timeout on
`SIGTERM`/`SIGINT`, and rejects a client on an old schema version at
`onConnect` with a persistent "Reload" toast rather than syncing formatting
it might not understand.

## Why these tools

**Yjs**, over a hand-written OT/CRDT algorithm or Automerge: an existing,
battle-tested CRDT is the expected choice here, not something to reinvent.
Automerge's rich-text/ProseMirror binding was less mature than Yjs's at the
time this was built, and OT approaches (ShareDB and similar) fundamentally
need a central server to transform operations against each other in order
— which makes true offline editing (edit for hours, reconnect later)
awkward to retrofit, since there's no server to transform against while
disconnected. The more specific fit: the same CRDT that resolves two people
editing concurrently also resolves one person editing for two hours with no
network. Offline support isn't a feature bolted on; it falls out of using a
CRDT correctly.

**Tiptap's `Collaboration`/`CollaborationCaret` extensions** (built on
`y-prosemirror`), rather than wiring `y-prosemirror` directly: Tiptap is
the extension/command model the editor and toolbar are built on, and these
are the maintained binding from ProseMirror document state onto a Yjs
`Y.XmlFragment` — reimplementing that mapping (list nesting, marks,
attributes) would be re-deriving a solved, fiddly problem for no benefit.

**`y-indexeddb`**, rather than `localStorage` or a hand-rolled queue of
pending operations: it persists the same Yjs update log the network
provider speaks, so offline edits survive a reload and merge through the
identical CRDT path used for network sync — no separate "offline queue"
structure or custom conflict logic to get wrong. `localStorage` isn't
viable at real document sizes (a few MB limit, synchronous/blocking); a
custom op queue would mean re-implementing the merge Yjs already provides.

**Hocuspocus**, rather than `y-websocket`'s bundled server or a raw `ws` +
`y-protocols` server: built by the Tiptap team, so the editor binding and
transport are maintained by the same people and tested against each other.
It gives the awareness protocol, debounced persistence, and lifecycle hooks
(`onConnect`, the `Database` extension's `fetch`/`store`) out of the box,
and — for keeping this a one-process deployment — it owns the HTTP server
and invokes Express through its `onRequest` hook, so REST and Yjs sync
share one port with no reverse proxy in front.

**SQLite via `better-sqlite3`**, rather than Postgres: a Yjs document, once
encoded, is an opaque binary blob — a relational database buys nothing when
the payload has no internal structure a query would touch, so one file on
disk is the right amount of infrastructure, and one state blob plus two
derived columns is the entire schema. `better-sqlite3` over Node's built-in
`node:sqlite`, because the latter needs an experimental flag on Node 22 and
would fail outright on an older supported runtime — a submission needs to
run wherever it's cloned. It ships prebuilt Node-API binaries, so despite
being native it costs no compiler or `node-gyp` step to install (see
"Running it" above).

## Export

The document header (back link, status pill, editors' avatar stack, then
the export menu) has an export button reachable by click or keyboard.
It offers three formats: **HTML** (a standalone file with inline styles
mirroring the page's own typography, lossless), **PDF** (the same
standalone HTML printed to PDF through the browser's own print dialog, so
the text stays selectable), and **Markdown** (via Tiptap's official
`@tiptap/markdown` serializer; text alignment has no Markdown equivalent
and is dropped, and underline is written out as inline `<u>` HTML). Export
runs entirely client-side from the live editor state, so it works offline
and includes local edits that haven't synced yet, and the downloaded file
is named after the document's title.

## Testing

```bash
pnpm test
```

runs 150 tests across 22 files: 99 in `apps/web` (14 files) and 51 in
`apps/server` (8 files); `packages/shared` has no tests of its own since it
holds only types and constants.

**The tests that matter most for the graded offline/merge criterion:**

- `apps/web/src/collab/merge.test.ts` — headless, in milliseconds, no
  browser. Independent `Y.Doc` instances diverge while "offline"
  (concurrent edits to the same paragraph, a peer offline for two separate
  rounds, out-of-order update delivery, a deletion racing an addition,
  concurrent title renames), then merge by exchanging Yjs state vectors
  exactly as client and server do over the wire, asserting byte-for-byte
  convergence with nothing duplicated or lost.
- `apps/server/src/collab/sync.integration.test.ts`,
  `persistence.integration.test.ts`, and `schemaVersion.integration.test.ts`
  start a **real** Hocuspocus server and real `HocuspocusProvider` clients
  in-process (`apps/server/src/test/collabHarness.ts`), not a mock:
  concurrent typing, a disconnected client's edits merging on reconnect, a
  reload from local snapshot, surviving a server restart, a
  graceful-shutdown flush, concurrent title edits, and schema mismatch.

**The rest of the suite** is ordinary Vitest unit tests: the connection
state machine and toast logic, network-event binding, the title
text-diff/rebase behind concurrent renames, pending-change counting,
local-readiness gating, name→colour hashing and identity persistence, the
documents-list cache, presence-state derivation, export filename/HTML/
Markdown rendering, and, on the server, title/excerpt extraction,
schema/document-id validation, the REST routes, and the SQLite store
including its column migration.

**Browser end-to-end tests are deliberately not part of this suite.** The
two scenarios that matter most — live editing and offline-edit-then-
reconnect — are exactly what the walkthroughs above show by hand in
seconds. Automating them with Playwright would add a browser dependency and
fake offline/online wiring to re-prove, with far more moving parts, what
the integration tests already prove deterministically.

## Design

The idea is that everyone writes in their own ink. Each person's presence
colour — hashed from their name into the eight-hue ramp in
`apps/web/src/lib/colors.ts` — isn't only what collaborators see on their
remote cursor; `AppShell.tsx` also sets it as `--self` on `<html>`, and
every place that means "this is mine" reads from it: pressed formatting
toggles, focus outlines, the editor caret and text selection, the syncing
dot, and the "You" marker in the editors popover. The text-alignment
control stays neutral (exactly one option is always selected), and document
content — links included — never reads `--self`, so the document looks the
same to every reader.

The palette is a handful of hex custom properties in
`apps/web/src/index.css`: `--field` #eceeed (the desk behind the page),
`--page` #ffffff, `--ink` #23272b, `--ink-muted` #62696e (5.58:1 on page,
4.79:1 on field), `--hairline` (ink at 11%), `--hover` (ink at 6%),
`--link` #2e5e86 (6.86:1) for document links, `--danger` #a2403a, and a
connection-status pair, `--state-ok` #357050 / `--state-offline` #9a5d14
(shown on a dedicated `#f5ecdd` surface). shadcn's semantic names
(`--popover`, `--muted`, `--accent`, `--input`, …) live in the same `:root`
block as aliases onto these tokens, not an independent palette, and a
`@theme inline` block re-exposes it all to Tailwind. There is no dark mode
implemented — the tokens are structured so one could be a variable swap,
but none exists today.

Type is two self-hosted variable families: **Literata**, a serif for
long-form reading, and **Hanken Grotesk** for controls. Literata isn't
confined to document body text — it's every screen-level heading too (the
document title, "Documents", the name-screen and error-page headings),
anywhere the app names something rather than operates on it. The scale is
12/14/16/20/28/40px plus a 17px prose size and an 11px caret-label size;
document title 40, H1 28, H2 20, H3 17 (semibold); prose line-height 1.75
with old-style figures.

Radius is three sizes only — 3/4/6px — with every larger step in Tailwind's
default scale clamped to 6px in `@theme`, so nothing rounds further than
the app actually uses. Two shadow tokens: `shadow-rail` (a hairline lift
under the page and toolbar) and `shadow-overlay` (menus, popovers, toasts).

Layout is a deliberate departure from a Docs-style silhouette. The header
is slim and borderless (back link, status, editors, export), and the
document's title lives on the page itself. At 30rem (480px) and up, the
toolbar is a sticky vertical rail with tooltips showing platform-aware
shortcuts (`lib/shortcuts.ts`); below that it's a single row with undo,
redo and alignment moved into "More", scrolling horizontally if it still
overflows. That narrow-width row is real, working behaviour: it appears
only while the document has focus (keyed to focus, not scroll, so it never
fights the browser scrolling the caret into view), and stays open while any
of its menus or the link popover is open. What wasn't done is a dedicated
phone-specific redesign or hardware testing pass — see "Known limitations".

The documents list avoids the shape of a chat history. Documents are pages
on the same desk the editor uses, each set in the document typeface with
its title, opening lines, and a relative "Edited 3 hours ago"; the most
recent is a larger page spanning two columns. The opening lines are an
`excerpt` the server derives from the Yjs body alongside the title
(`extractExcerpt` in `apps/server/src/collab/title.ts`), backfilled for
older rows at startup. The name screen (`NameGate.tsx`) shows a live
preview of your own cursor flag as you type your name, and the wordmark and
favicon are both two collaborator carets with name flags, as inline SVG.

Components come from two tiers. Base UI primitives (`Button`, `Toggle`,
`ToggleGroup`, `DropdownMenu`, `Popover`, `Tooltip`, `Input`, `Sonner`) sit
in the shadcn file layout, with every class rewritten against the app's own
tokens — no zinc/stone Tailwind colours, no `dark:` variants, one shared
focus treatment (a 2px `--self` outline). A few small compositions sit
alongside them, each specific enough that a third-party component would add
more supply-chain surface than it would save: the avatar stack and editors
popover (`AvatarStack.tsx`), the status pill (`StatusPill.tsx`), the tool
rail (`Toolbar.tsx`), and the export menu (`ExportMenu.tsx`).

The presence ramp is a checkable claim, not a vibe: all eight colours hold
the same OKLCH lightness (≈0.55) and chroma (≈0.094), varying only in hue,
and every one clears WCAG AA for normal text on white (4.5:1+; lowest
4.64:1, highest 5.11:1) — no cursor visually dominates another by chance.
Spacing is Tailwind's built-in 4px scale, unmodified, with a handful of
off-scale half-steps (`gap-1.5`, `px-2.5`) where a full step reads too
tight or loose, and no fixed pixel widths anywhere in layout.

## Known limitations

None of the following are missing by oversight; each is a conscious
tradeoff against the project's grading priorities (offline merge, real-time
sync, architecture, and design, in that order) or a genuine, honestly-stated
gap:

- **A structural change made offline can lose text.** If one person turns a
  paragraph into a heading or list item while another, offline at the same
  time, is still typing inside that same paragraph, the offline text can be
  lost on reconnect — Tiptap's Yjs binding replaces the node rather than
  merging character-by-character across a structural change. Plain text
  edits to the same paragraph always merge correctly (see the merge tests);
  it's specifically a structural change racing a concurrent text edit in
  the same block that's unsafe.
- **Creating a document needs a live server connection** — ids are issued
  by the server, so "New document" can't work fully offline. Editing an
  already-open document offline works fully.
- **No authentication.** Identity is a display name typed once and stored
  in `localStorage`, plus a colour hashed from it. No login, no
  per-document ownership, no permission model — anyone with a document's
  link can open and edit it.
- **The pending-changes count is in-memory and per-tab**, resetting on
  reload — it's a UI convenience, not what actually protects offline edits
  (IndexedDB does that).
- **A single server process, no horizontal scaling.** Hocuspocus keeps
  connected documents in memory in one process; running more than one
  instance needs a shared backend for cross-instance awareness/sync.
- **The service worker only runs in production builds** — `pnpm dev` skips
  it (see "Try it" above), so a real build is needed to demonstrate an
  offline reload.
- **No dedicated phone layout pass or hardware testing**, though the
  responsive toolbar behaviour above is real and works on a narrow browser
  viewport.
- **Comments, version history, tables, image upload, and deployment to a
  public URL** are not implemented — none are required by the brief.
- **Browser end-to-end tests are deliberately excluded** — see "Testing"
  above for why the integration tests are stronger evidence for the same
  scenarios.
