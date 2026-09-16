# Collab Docs — Design

**Date:** 2026-09-16
**Status:** Approved for planning

A collaborative document editor: real-time multi-user editing, genuine
offline support with conflict-free merge, and an authored visual design.

## 1. Goals

The build is graded on four things, in this order of scrutiny:

1. **Offline editing and merge.** Edits made with no network must survive,
   and must merge on reconnect without losing or duplicating anyone's work.
   The brief singles this out as the part most often done superficially.
2. **Real-time sync.** Two or more users in separate browsers see each
   other's changes near-instantly, with no reload.
3. **Architecture and code quality.** Clear boundaries, sensible decisions,
   real error handling.
4. **Design.** An authored visual system — consistent palette, one icon
   set, a real type and spacing scale — not a framework default theme and
   not a Google Docs copy.

Functional minimum: basic formatting (bold, italic, headings, lists),
a participant list with live cursors, and document persistence.

## 2. Stack

All versions verified against the npm registry on 2026-09-16.

### Client

| Package | Version | Role |
| --- | --- | --- |
| React + Vite + TypeScript | — | Application shell |
| `@tiptap/react`, `@tiptap/starter-kit` | 3.31.3 | Editor |
| `@tiptap/extension-collaboration` | 3.31.3 | ProseMirror ↔ Yjs binding |
| `@tiptap/extension-collaboration-caret` | 3.31.3 | Remote cursors |
| `yjs` | 13.6.32 | CRDT |
| `y-indexeddb` | 9.0.12 | Offline persistence |
| `@hocuspocus/provider` | 4.7.0 | Sync transport |
| `tailwindcss` | 4.3.3 | Styling / token layer |
| `vite-plugin-pwa` | 1.3.0 | Service worker |
| `lucide-react` | 1.46.0 | Icons |

Two traps worth recording, because both are actively taught wrong by
older tutorials:

- `@tiptap/extension-collaboration-cursor` is frozen at 2.26.2 and is
  v2-only. The v3 package is `collaboration-caret`.
- StarterKit v3 renamed the `history` option to `undoRedo`. It must be
  set to `false`, or Tiptap's history fights Yjs's `UndoManager` and
  Ctrl+Z starts undoing other people's edits.

### Server

| Package | Version | Role |
| --- | --- | --- |
| `@hocuspocus/server` | 4.7.0 | Yjs sync server |
| `@hocuspocus/extension-sqlite` | 4.7.0 | Document persistence |
| Express | — | Document list/create REST |

### Decisions and rationale

**Yjs (CRDT) over OT.** The brief explicitly says using an existing
CRDT/OT library is expected and that hand-writing the algorithm is not a
plus. Yjs additionally gives offline merge for free: the same data
structure that handles concurrent edits handles a two-hour disconnect.

**Hocuspocus over `y-websocket` or raw `ws`.** Built by the Tiptap team,
so editor and transport share maintainers. Provides debounced
persistence, lifecycle hooks, and SQLite storage as a drop-in, and
attaches to an existing Express HTTP server via the upgrade event so the
whole backend stays one process. `y-websocket`'s bundled server is a
reference implementation; raw `ws` + `y-protocols` concentrates risk in
exactly the behaviour graded hardest.

**SQLite.** One file on disk. Yjs documents are opaque binary blobs, so a
relational database buys nothing; Postgres would be infrastructure
theatre.

**A backend is required, and it is small.** It never touches document
content — merging happens entirely in Yjs on the clients. The server
relays binary updates and writes them to disk. Peer-to-peer (`y-webrtc`)
was rejected: it still needs a signalling server and loses the document
when the last peer closes its tab, which fails the persistence
requirement outright.

**BlockNote was evaluated and rejected.** It is the strongest Notion-style
block editor available and its Yjs support is real, but it performs the
ProseMirror↔Yjs binding internally. Adopting it would mean the graded
integration is the library's work rather than ours. It is also already a
Notion clone visually, which works against the originality criterion.

## 3. Architecture

```
collab-docs/
├── apps/web/         React + Vite client
├── apps/server/      Express + Hocuspocus + SQLite
└── packages/shared/  Types crossing the wire
```

pnpm workspaces; a single `pnpm dev` at the root runs both.

### Client modules

One rule governs the layout: **exactly one module knows how the sync
stack is assembled.**

- `collab/` — owns Yjs. `createDocSession(docId)` builds the `Y.Doc`,
  attaches `IndexeddbPersistence`, attaches `HocuspocusProvider`, and
  returns them with an awareness handle. `useDocSession` wraps lifecycle
  for React. Nothing else in the app imports Yjs.
- `editor/` — Tiptap extensions, toolbar and bubble-menu commands.
  Receives the Ydoc as an opaque input.
- `features/documents/` — list, create, collaborative rename.
- `features/presence/` — awareness → avatar stack and remote carets.
- `design/` — tokens, primitives, icons. No feature code.
- `lib/` — id generation, name→colour hashing.

### Server modules

- `index.ts` — Express app and HTTP server; Hocuspocus attached to the
  upgrade event.
- `routes/documents.ts` — `GET /api/documents`, `POST /api/documents`.
- `hocuspocus.ts` — server config, debounce, connection logging.
- `persistence/` — SQLite extension plus a `documents` metadata table.

Document **titles live inside the Ydoc** as a collaborative field, so
concurrent renames merge like any other edit. An `onStoreDocument` hook
mirrors the title into the metadata table purely so the list screen has
something cheap to read.

## 4. Data flow

The ordering below is the core of the offline behaviour and is not
incidental.

1. `IndexeddbPersistence` attaches to the Ydoc **first**. The editor does
   not render until `whenSynced` resolves. Local content is therefore on
   screen before any network call — which is what makes a cold offline
   load work rather than flashing an empty document that the user then
   types into.
2. `HocuspocusProvider` attaches to **the same** Ydoc. Because both
   observe one document, remote updates land in IndexedDB automatically
   and local edits queue for the server. There is no synchronisation code
   of our own between the two layers.
3. Offline, the provider retries with backoff while edits accumulate
   locally. On reconnect it exchanges state vectors and merges in both
   directions. **Nothing anywhere performs last-write-wins.** That
   property comes from using the CRDT correctly, not from code we write.
4. Awareness (presence, cursors) rides the provider and is deliberately
   never persisted. Offline, the user correctly sees only themselves;
   reconnect repopulates the room.

**Connection state** is a derived machine — `connecting | synced |
offline | syncing` — from provider events plus `navigator.onLine`,
surfaced as a status pill.

**Identity**: no authentication. On first load the user enters a display
name, stored in localStorage, and receives a colour derived by hashing
the name into a curated ramp. Documents are reachable by id.

## 5. Design system

### Component sourcing

Three tiers, and the policy is itself the README answer:

- **Official shadcn** — `Button`, `Toggle`, `Separator`, `DropdownMenu`,
  `Tooltip`, `Dialog`, `Avatar`, `Command`, `Sonner`, `Badge`, `Input`.
  Vite is a first-class documented install path (`shadcn init -t vite`).
- **Kibo UI, two items only** — `avatar-stack` for the presence row and
  `status` for the sync pill, via
  `npx shadcn add https://www.kibo-ui.com/r/{name}.json`. Both verified
  as dependency-free Tailwind components.
- **Nothing else.** The Framer-Motion marketing registries (Magic UI,
  Aceternity, Cult, Motion Primitives, Kokonut, Animate UI, Skiper) fight
  a quiet editing surface. Neobrutalism is maintained and stylistically
  opposite. Origin UI has been absorbed into COSS UI with an unverified
  install path. Shadcnblocks is paid and generically SaaS-looking.

shadcn is used as structure and behaviour, not as a theme. Its defaults —
zinc ramp, 10px radius, default border weight and shadows — are all
overridden. The editor chrome (toolbar, bubble menu) is built from these
primitives and wired to Tiptap commands directly, keeping one styling
system rather than importing a kit that ships its own CSS.

### Visual direction

A Google-Docs *wireframe* with a Notion *surface*:

- **From Docs**, the page-on-a-field metaphor: a warm grey field, a white
  page floating on it with a hairline border and effectively no shadow.
  Notion has no such structure and it is the one idea worth borrowing.
- **From Notion**, the surface treatment: warm near-black text rather than
  pure black, borders at roughly 9% opacity, hover states as barely-there
  grey fills, radii of 4–6px, chrome that recedes until approached.
- **Serif document canvas.** Inside Notion's vocabulary (it ships a serif
  page mode), and it separates the page from Docs' default sans.
- **Presence colours** hashed into a curated ramp at fixed saturation and
  lightness, tuned against warm paper rather than white, so no cursor
  reads louder than another.

Tokens: spacing on a 4px base (4/8/12/16/24/32/48); type scale
12/14/16/20/28/40; two families, geometric sans for chrome and serif for
canvas; one icon set (Lucide) at one stroke weight and two sizes (16,
20). All of it lives in a single Tailwind v4 `@theme` block as oklch
custom properties, generated and contrast-checked with `tweakcn`.

Light theme only, structured so dark mode is a variable swap. Responsive
to tablet width; the brief treats this as welcome, not required.

## 6. Error handling

Governing rule: **a network error must never interrupt editing.** No
modals, no blocking states.

- **WebSocket drop** — status pill flips to offline, one non-blocking
  toast, provider retries with backoff. Typing is unaffected.
- **IndexedDB unavailable** (private windows, quota exhaustion) — detect
  at startup, degrade to memory-only, and say plainly that offline
  editing is off for this session. Silent failure here is the worst
  possible bug, because everything looks fine until data is gone.
- **Editor crash** — React error boundary offering reload without
  discarding the Ydoc.
- **Server** — reject malformed document names on connect; 404 unknown
  documents in REST; **flush open documents on SIGTERM**, or Ctrl+C
  discards the last seconds of every open edit.

## 7. Testing

Focused on the graded criterion. Yjs itself is not re-tested.

- **Merge integration test (headless, milliseconds).** Two `Y.Doc`s,
  simulated disconnect, divergent edits on both sides, reconnect; assert
  convergence and absence of duplication. This is the direct evidence for
  the most scrutinised requirement.
- **Playwright E2E.** Two browser contexts editing one document
  simultaneously; then `context.setOffline(true)`, edit, reload while
  offline to exercise the service worker, return online, assert both
  contexts converge. This is the demo video, automated — which means the
  demo is debugged before recording starts.
- **Vitest unit.** Connection state machine, name→colour assignment,
  title extraction.

## 8. Milestones

1. Scaffold — workspaces, Vite, Express, shared types, one `pnpm dev`
2. Server — Hocuspocus + SQLite + REST + graceful shutdown
3. Token layer and primitives, before any screen exists
4. Collab core — `createDocSession`, IndexedDB-first ordering, status
   machine; proven with two tabs
5. Editor — Tiptap, formatting, `undoRedo: false`, Collaboration + Caret
6. Presence — awareness, colours, avatar stack, remote carets
7. Documents — list, create, collaborative rename
8. PWA — precache shell, offline routing, update prompt
9. Tests — merge integration, Playwright two-context + offline
10. Design polish, README, video script

Milestone 4 concentrates the risk; everything after it is additive. If
the schedule slips, the honest cuts are the PWA and dark mode — never the
tests, which are the submission's strongest evidence.

## 9. Out of scope

Authentication and user accounts; document sharing permissions; comments;
version history; image upload; tables; export to other formats; mobile
phone layouts; deployment to a public URL. None are required by the
brief, and each would draw time from the criteria that are.

## 10. Risks

- **Vite path aliases** must be declared in three places (`tsconfig.json`,
  `tsconfig.app.json`, `vite.config.ts`), and the shadcn CLI needs
  `-c apps/web` to target the workspace package. Known friction, handled
  in milestone 1.
- **Primitive library.** shadcn's default moved from Radix to Base UI in
  July 2026. Take the current default, pin it explicitly in
  `components.json`, and document the choice. Neither Kibo component
  depends on a primitive library, so there is no mixing risk.
- **Service worker caching during development** can serve stale assets and
  waste debugging time. Register it in production builds only.
