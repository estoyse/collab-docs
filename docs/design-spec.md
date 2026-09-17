# Collab Docs — Design

**Date:** 2026-09-16
**Status:** Original design plan (2026-09-16). The implementation diverged
in places — see the corrections inline below. `README.md` describes the
system as actually built and is the authoritative reference; this document
is kept for the reasoning behind the original decisions.

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
| `@hocuspocus/extension-database` | 4.7.0 | Persistence hooks |
| `better-sqlite3` | 13.0.3 | SQLite driver |
| Express | 5.2.1 | Document list/create REST |

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

**SQLite via `better-sqlite3`.** One file on disk. Yjs documents are
opaque binary blobs, so a relational database buys nothing; Postgres would
be infrastructure theatre.

The driver choice is a portability decision, not a performance one. Node's
built-in `node:sqlite` was rejected because it requires a flag on Node 22
and would crash outright for a reviewer on an older runtime — the project
must run wherever it is cloned, and that outranks avoiding a dependency.
`better-sqlite3` 13 ships Node-API prebuilt binaries for darwin, linux,
linuxmusl and win32 on x64 and arm64, so installing needs no compiler, no
Python and no `node-gyp`, and one binary is ABI-stable across Node
versions. Version 13 rather than 12 because 12.x enumerates
`20.x || 22.x || 23.x || 24.x || 25.x` and therefore excludes Node 26,
while 13.x declares an open-ended `>=22`.

The `documents` table holds the Yjs state blob and the listing metadata
together, driven through `@hocuspocus/extension-database` rather than
`extension-sqlite`, so there is a single writer, a single schema, and the
driver version is pinned here rather than inherited from the extension's
dependency range.

**Supported runtime: Node 22 or newer**, declared in `engines` and stated
in the README.

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
  Receives the Ydoc as an opaque input. Remote carets render here too
  (`CollaborationCaret`), not in `features/presence/`.
- `features/documents/` — list, create, collaborative rename.
- `features/presence/` — awareness → avatar stack.
- `lib/` — id generation, name→colour hashing.

> As built, design tokens and primitives live in `components/ui/` and
> `index.css`, not a separate `design/` module — there was never enough
> token-layer code to justify its own folder.

### Server modules

- `index.ts` — process wiring: opens the database, starts the server,
  handles shutdown signals.
- `app.ts` — the Express app: REST routes and JSON error handling.
- `collab/server.ts` — the Hocuspocus server config, `onConnect`
  validation, and the `Database` extension's persistence hooks.
- `documents/routes.ts`, `documents/store.ts` — the REST router and the
  SQLite-backed document store.

Document **titles live inside the Ydoc** as a collaborative field, so
concurrent renames merge like any other edit. The `Database` extension's
`store` hook mirrors the title (and a derived excerpt) into the metadata
table purely so the list screen has something cheap to read.

> As built, Hocuspocus does not attach to an existing Express server's
> `upgrade` event — it owns the HTTP server itself, and Express is invoked
> as a delegate through Hocuspocus's `onRequest` hook. The effect is the
> same (one port, one process) but the wiring direction is the opposite of
> what's described here. There is no separate `hocuspocus.ts` or
> `persistence/` folder; that logic lives in `collab/server.ts`.

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

## 5. Export

An export menu sits in the document header, next to the status pill,
reachable by click or keyboard — never only by hover, consistent with the
rule in §6 that every action has a route besides hovering.

Three formats in v1:

- **HTML** — a standalone `.html` file with inline styles mirroring the
  page's own typography. Lossless.
- **PDF** — the same standalone HTML, printed from a hidden iframe through
  the browser's native print dialog; the user picks "Save as PDF". Text
  stays selectable.
- **Markdown** — a `.md` file via Tiptap's official `@tiptap/markdown`
  serializer. Text alignment has no Markdown equivalent and is dropped;
  underline is written out as inline `<u>` HTML, since Markdown has no
  native syntax for it.

Export runs entirely client-side, from the live editor state. There is no
server round-trip, so it works offline and captures local edits that
haven't synced yet — the same offline-first property §4 describes for
editing itself.

The filename is the document title, falling back to the first non-empty
line and then to "Untitled", with characters invalid in filenames
stripped.

**Out of scope for now**: DOCX (planned next, via the `docx` library),
ODT, and import.

## 6. Design system

### Component sourcing

Two tiers, and the policy is itself the README answer:

- **Base UI primitives** — `Button`, `Toggle`, `ToggleGroup`,
  `DropdownMenu`, `Popover`, `Tooltip`, `Input`, `Separator`, `Sonner`.
  Used for behaviour and accessibility, in the shadcn file layout, with
  every default class rewritten against the app's own tokens.
- **Composed in-house** — the presence avatar stack and its editors-list
  popover (`AvatarStack.tsx`, over `Popover` and `Tooltip`), the sync
  status pill (`StatusPill.tsx`, a plain `span` and a state dot with no
  primitive underneath), the tool rail (`Toolbar.tsx`), and the wordmark
  (`Wordmark.tsx`). Third-party registries were evaluated for these;
  pulling one in to save a small amount of Tailwind adds an author's
  conventions and a supply-chain surface for no benefit.
- **Nothing else.** The Framer-Motion marketing registries (Magic UI,
  Aceternity, Cult, Motion Primitives, Kokonut, Animate UI, Skiper) fight
  a quiet editing surface. Neobrutalism is maintained and stylistically
  opposite. Origin UI has been absorbed into COSS UI with an unverified
  install path. Shadcnblocks is paid and generically SaaS-looking.

Base UI is used as structure and behaviour, not as a theme. Every
primitive's classes were rewritten against the app's tokens — no zinc or
stone Tailwind colours, no `dark:` variants, radius clamped to 6px, one
shared focus treatment (a 2px `--self` outline, offset from the control).
shadcn's semantic variable names (`--popover`, `--muted`, `--accent`, and
so on) are kept only as aliases pointing at the app tokens, not as an
independent palette. The editor chrome (toolbar, bubble menu) is built
from these primitives and wired to Tiptap commands directly, keeping one
styling system rather than importing a kit that ships its own CSS.

### Visual direction

The concept is that everyone writes in their own ink:

- **Presence as personal accent.** Each person's presence colour —
  hashed from their name into the ramp in `lib/colors.ts` — is set at
  runtime as the CSS custom property `--self` on `<html>` (`AppShell.tsx`)
  and doubles as that person's own interface accent: pressed formatting
  toggles, focus outlines, text selection, the text caret, the syncing
  dot, and the "You" marker in the editors list all read `--self`. The
  alignment segmented control deliberately stays neutral, since exactly
  one option is always selected. Document content — links included —
  never reads `--self`, so the document looks the same to everyone.
- **Palette.** `--field` #eceeed (a cool graphite, not warm paper),
  `--page` #ffffff, `--ink` #23272b, `--ink-muted` #62696e (5.58:1 on
  page, 4.79:1 on field), `--hairline` (ink at 11%), `--hover` (ink at
  6%), `--link` #2e5e86 (6.86:1), `--danger` #a2403a, `--state-ok`
  #357050, `--state-offline` #9a5d14 on a dedicated `#f5ecdd` offline
  surface.
- **Type.** Literata (variable) for the document title and body — a
  serif built for long-form screen reading — and Hanken Grotesk
  (variable) for all interface chrome. Scale 12/14/16/20/28/40, plus a
  17px prose size and an 11px caret-label size; document title 40,
  H1 28, H2 20, H3 17 (heavier semibold); prose line-height 1.75 with
  old-style figures.
- **Radius and shadow.** 3/4/6px only — every larger step in Tailwind's
  default radius scale is clamped to 6px in `@theme`. Two shadow tokens:
  `shadow-rail` (hairline lift, page and toolbar) and `shadow-overlay`
  (menus, popovers, bubble menu, toasts).
- **Presence colours** hashed into a ramp at fixed lightness (≈0.55) and
  chroma (≈0.094), varying only in hue, so no cursor reads louder than
  another.

Tokens: spacing on Tailwind's 4px base, unmodified, plus a handful of
off-scale half-steps where a full step reads too tight or too loose; type
scale as above; two families — Hanken Grotesk for chrome, Literata for
canvas; one icon set (Lucide), one stroke weight, one size (16px). All of
it lives in a single Tailwind v4 `@theme` block as hex custom properties
in `apps/web/src/index.css`.

Light theme only, structured so dark mode is a variable swap.

### Responsive readiness

Phone layouts were planned as **out of scope for the MVP but the first
thing built after it**, so the MVP was meant to avoid choices that are
expensive to reverse. As built, the narrow-width toolbar behaviour below
ended up implemented as real, working behaviour rather than deferred — see
`README.md`'s Design section for the current, accurate description.
Constraints observed from the start:

- **Hover-reveal is never the only path to an action.** Every
  hover-revealed control also has a persistent route — a toolbar button,
  a menu entry, or a tooltip supplementing an already-reachable control.
  The editors-list popover (`AvatarStack.tsx`) opens on click, not hover.
  This is the one constraint that turns into a rewrite if ignored.
- **The toolbar never wraps.** On screens at least 30rem (480px) wide it
  is a vertical, sticky tool rail beside the page — the width at which
  the rail still leaves roughly 45 characters per line. Below that it is
  a single row: undo, redo and alignment move into its "More" menu, and
  any remaining overflow scrolls horizontally behind a hidden scrollbar
  with an edge fade. The row appears only while the document has focus
  (or one of its menus is open), so reading on a phone gets the full
  screen. The rail is the default layout, not a fallback.
- **No fixed pixel widths in layout.** The presence stack truncates to
  `+N`; flex and grid rows are used throughout rather than pixel-pinned
  containers.

## 7. Error handling

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

## 8. Testing

Focused on the graded criterion. Yjs itself is not re-tested.

- **Merge integration test (headless, milliseconds).** Two `Y.Doc`s,
  simulated disconnect, divergent edits on both sides, reconnect; assert
  convergence and absence of duplication. No browser, no Playwright —
  plain Vitest. This is the direct evidence for the most scrutinised
  requirement, and a reviewer can run it themselves rather than taking
  the demo video on trust.
- **Vitest unit.** Connection state machine, name→colour assignment,
  title extraction.

**Browser E2E is deliberately excluded.** Two contexts editing live, and
the offline-edit-reconnect scenario, are verified by hand in seconds —
which is exactly what the demo video records. Automating them would cost
a browser dependency, offline-mode wiring and flake management to
re-prove what the merge test already proves headlessly.

## 9. Milestones

1. Scaffold — workspaces, Vite, Express, shared types, one `pnpm dev`
2. Server — Hocuspocus + SQLite + REST + graceful shutdown
3. Token layer and primitives, before any screen exists
4. Collab core — `createDocSession`, IndexedDB-first ordering, status
   machine; proven with two tabs
5. Editor — Tiptap, formatting, `undoRedo: false`, Collaboration + Caret
6. Presence — awareness, colours, avatar stack, remote carets
7. Documents — list, create, collaborative rename
8. PWA — precache shell, offline routing, update prompt
9. Tests — headless merge integration, unit tests
10. Design polish, README, video script

Milestone 4 concentrates the risk; everything after it is additive. If
the schedule slips, the honest cuts are the PWA and dark mode — never the
tests, which are the submission's strongest evidence.

## 10. Out of scope

Authentication and user accounts; document sharing permissions; comments;
version history; image upload; tables; browser E2E tests; deployment to a
public URL. None are required by the brief, and each would draw time from
the criteria that are.

**Phone layouts were planned as deferred, not dismissed** — the intent was
for them to be the first work after the MVP. As built, the responsive
toolbar behaviour described in §6 shipped as part of the MVP itself, ahead
of this plan's schedule; a dedicated phone hardware-testing pass is the
part that remains undone (see `README.md`'s "Known limitations").

## 11. Risks

- **Vite path aliases** must be declared in three places (`tsconfig.json`,
  `tsconfig.app.json`, `vite.config.ts`), and the shadcn CLI needs
  `-c apps/web` to target the workspace package. Known friction, handled
  in milestone 1.
- **Primitive library.** shadcn's default moved from Radix to Base UI in
  July 2026. Take whatever the CLI defaults to at init, pin it explicitly
  in `components.json`, and document the choice. Since every component
  comes from the official registry, there is no risk of mixing primitive
  libraries.
- **Service worker caching during development** can serve stale assets and
  waste debugging time. Register it in production builds only.
