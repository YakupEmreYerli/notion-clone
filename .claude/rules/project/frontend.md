# Frontend conventions (Zotion-specific)

> Project-specific rules — not part of the ECC-managed `rules/ecc/` tree. The generic
> `rules/ecc/react/*` and `rules/ecc/web/*` files still apply; this file only covers
> what's specific to this codebase.

## Route groups

- `app/(auth)` — `/login` and `/register`, unauthenticated. Shared split-screen shell
  in `app/(auth)/layout.tsx` (brand panel left, form column right; the panel is hidden
  below `lg`). Both pages are **server components** that redirect before rendering:
  a live session goes to `/documents`, and `/register` goes to `/login` once any
  account exists. There is no landing page and no auth modal — sign-in lives only here.
- `app/(main)` — the authenticated app (sidebar, editor, database view). Gated by
  `proxy.ts` (see below), not by per-page checks.
- `app/(public)` — `/preview/<id>`, the read-only unauthenticated publish view.
- `app/page.tsx` sits outside every group and renders nothing — it resolves a
  destination through `resolveRootDestination` (`lib/auth-routing.ts`, kept pure so
  all three branches are unit-testable) and redirects.
- The groups share no layout. Don't assume a component under one is reachable
  from another without an explicit import.

## Route protection (`proxy.ts`)

- `proxy.ts` is an **optimistic** cookie-presence check only (`getSessionCookie`) — it
  never touches the database, so it stays edge-safe, and it only decides
  redirect-to-`/login` vs. pass-through. It is not the source of truth for authorization.
  Every Convex query/mutation and every `app/api/*` route re-verifies the session (or
  JWT) itself via `requireUser` / Better Auth — never rely on `proxy.ts` alone to
  protect data.
- `PUBLIC_ROUTES` in `proxy.ts` currently allows `/`, `/login`, `/register`,
  `/preview/*`, `/api/auth/*`, `/api/files/*`, `/.well-known/*`. `/` stays public
  because it no longer holds content — it redirects. Adding a new public route means adding it there,
  not just skipping an auth check deeper in the page.

## Document type branching

- `app/(main)/(routes)/documents/[documentId]/page.tsx` branches on `document.type`:
  BlockNote editor for `"page"`, `components/database/database-view.tsx` for
  `"database"`. The database view is `dynamic()`-imported **at module scope**, not
  inside `useMemo`/`useCallback` — importing it inside a hook trips the
  React-compiler/lint rule against creating components during render. If you need to
  branch on `document.type` elsewhere, keep new dynamic imports at module scope too.

## Modal / transient UI state

- Modal and similar transient UI state (cover image picker, search palette, settings,
  auth, account) is a small Zustand store paired with a `use<Thing>Modal` hook under
  `hooks/` (e.g. `hooks/useCoverImage.tsx`, `hooks/useSearch.tsx`) — not local
  `useState` in the component that opens the modal, and not React Context. Follow this
  pattern for new modals/overlays instead of introducing a new state mechanism.

## Editor

- The editor is BlockNote (`@blocknote/core`/`react`/`mantine`). `lib/editorFont.ts` +
  `hooks/useEditorFont.tsx` implement the user-selectable editor font; `userSettings`
  in Convex persists font choice and focus mode per user (`convex/userSettings.ts`).
- Plain-text extraction from BlockNote content (used for `documents.searchText`, see
  `.claude/rules/project/convex.md`) has its own extractor — don't re-derive search
  text ad hoc elsewhere; reuse the existing extractor so search stays consistent with
  what's actually indexed.

## Database (table) view

- `components/database/` renders the table with **CSS grid**, not `<table>` — this was
  a deliberate choice so `npx shadcn add table` wasn't needed. Don't reintroduce a
  native `<table>` for this view without a real reason to change the layout model.
