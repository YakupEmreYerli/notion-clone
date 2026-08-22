# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Zotion — a self-hosted Notion clone. No SaaS dependency anywhere in the stack. See
`README.md` for self-hosting/Dokploy deployment steps (not duplicated here).

**Real stack:** Next.js 16 (App Router) · React 19 · TypeScript · Convex (real-time
app database) · Better Auth (email+password, Postgres-backed) · MinIO/S3 (files) ·
BlockNote (editor) · Zustand · Tailwind v4 + shadcn/radix-ui · Docker Compose.

## Commands

```bash
npm run dev              # Next.js dev server
npm run build             # production build (output: "standalone")
npm run lint               # next lint / eslint .
npx tsc --noEmit           # typecheck (no separate typecheck script)

npm run convex:dev         # push Convex functions to the self-hosted backend, watch mode
npm run convex:deploy      # convex deploy -y (used by docker-compose's convex-deploy service)
```

No automated test suite (no jest/vitest/playwright, no `test` script) — verification is
`tsc --noEmit` + `npm run build` + `npm run lint` + manual/browser checks.

Local infra (Postgres, MinIO, self-hosted Convex backend) is Docker Compose, not `npm`:

```bash
docker compose up -d postgres minio minio-init convex-backend
npm run convex:dev   # separate terminal — needs CONVEX_SELF_HOSTED_URL + admin key
npm run dev           # separate terminal
```

## Architecture

Three systems, no other backend/API layer:

- **Convex** — the app's real database (documents, database/table feature, user
  settings, full-text search). All app data reads/writes go through
  `convex/*.ts` queries/mutations, called from client components via `convex/react`.
  Schema and invariants: **`.claude/rules/project/convex.md`** (read before touching
  anything under `convex/`).
- **Better Auth + Postgres** — auth only (users, sessions), separate from Convex's own
  storage. Bridges to Convex via a short-lived RS256 JWT (`GET /api/auth/token`),
  verified by Convex against the JWKS at `<APP_URL>/.well-known/openid-configuration`
  (`app/api/oidc-config/route.ts`, hand-written because Better Auth's `jwt` plugin only
  serves `/jwks`). `proxy.ts` does an edge-safe, cookie-presence-only gate — real
  authorization always happens in Convex (`requireUser`) and in `app/api/*` routes.
- **MinIO/S3** — file storage, private bucket, streamed to the browser through
  `/api/files/[...key]` (never exposed directly). Stored URLs are relative
  (`/api/files/...`) so the same image survives a domain change.

Route groups: `app/(landing)` (marketing), `app/(main)` (authenticated app, gated by
`proxy.ts`), `app/(public)` (`/preview/<id>`, anonymous). Frontend conventions (route
protection, document-type branching, modal state pattern, editor):
**`.claude/rules/project/frontend.md`**.

Key directories:

| Path | What |
|---|---|
| `convex/` | Schema + all backend logic (queries/mutations) |
| `app/(main)/_components/` | Sidebar, navigation, editor chrome |
| `components/database/` | The table ("database" doc type) view, CSS grid |
| `components/modals/`, `hooks/use*.tsx` | Zustand-backed modal/overlay state |
| `lib/` | Auth, env, S3/storage, editor-font helpers |

## Critical design decisions — do not change without a reason

- File URLs stay **relative**; JWT audience/issuer is `APP_URL`, read at **runtime**,
  never inlined at build time (`lib/env.ts`, `export const dynamic = "force-dynamic"`
  in `app/layout.tsx`) — this is what lets one Docker image serve any domain.
- `documents` is a single table for pages and databases (`type` field); database rows
  use fractional `order` and are keyed by property `_id`, not name. See
  `.claude/rules/project/convex.md`.
- `ctx.db.patch()` shallow-merges — never assume it merges nested record fields.
- Published-document reads must check "is it published" **before** "is there a user" —
  this is what makes anonymous `/preview/<id>` work; getting the order backwards
  silently breaks it.
- `convex/_generated/` is committed and must be regenerated (`npm run convex:dev` /
  `npx convex deploy`) whenever a Convex function's shape changes.

For a full Convex-change review pass (these invariants plus a few more), use the
`convex-reviewer` subagent (`.claude/agents/convex-reviewer.md`).

## Known pre-existing issues (don't fix incidentally)

`documents.remove` isn't recursive (children get orphaned); `recursiveArchive`/
`recursiveRestore` in `convex/documents.ts` are called without `await`. Both are
tracked, intentional non-fixes — don't touch either as a side effect of unrelated work.

## Keeping this file current

If a change alters the architecture, a core data flow, build/test/dev commands, or one
of the decisions above, update this file (and the relevant file under
`.claude/rules/project/`) in the same change — don't let it drift.
