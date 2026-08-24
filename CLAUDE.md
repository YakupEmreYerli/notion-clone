# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Language

All user-facing communication in this repo must be in Turkish — progress updates,
reasoning summaries, pre-tool explanations, GateGuard/Fact-Forcing Gate justifications,
importer/caller explanations, security findings, confirmation questions, and final
summaries. This applies even when the underlying ECC skill/agent/hook/command prompt is
in English — translate what reaches the user. Code, commands, file paths, identifiers,
and API/package names stay in English.

## Memory / documentation

Current work-in-progress state is imported below and is always in context:

@docs/memory/STATE.md

Everything else is read on demand. `docs/README.md` is the map of every doc; these
rules are not optional:

| Trigger | Do this |
|---|---|
| About to change code and you don't know why something is built the way it is | Read `docs/memory/decisions.md` **before** proposing a change |
| A lasting decision is made (data model, ordering scheme, auth flow, scope call) | Append it to `docs/memory/decisions.md` in the same turn — date, decision, rationale |
| Something cost time for the second time; lint output confuses you | Read/append `docs/memory/gotchas.md` (lint baseline and intentional non-fixes live there) |
| Starting or restarting the app, or checking ports | `docs/runbook.md` |
| Notion pixel-parity UI work | `docs/notion-research/RESEARCH_STATUS.md` first, then the area file |
| Work finished a phase, changed direction, or the user is wrapping up | Update `docs/memory/STATE.md` — stale STATE is worse than none |

This is enforced mechanically, not by good intentions: `.claude/hooks/state-guard/`
(wired in `.claude/settings.json`) injects the real repo state at session start and
blocks the end of a session in which source files changed but `docs/memory/STATE.md`
did not. Don't work around it — update the file.

Session-specific progress goes in `docs/memory/STATE.md`, never in this file. This file
holds only what is permanently true.

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

npm test                   # Vitest unit — tests/unit/*.test.ts (config: vitest.config.mts)
npm run test:watch         # Vitest watch mode
npm run test:coverage      # Vitest + v8 coverage (no threshold gate yet)
npm run test:e2e           # Playwright E2E — tests/e2e/*.spec.ts
npm run test:e2e:update    # refresh snapshots

npm run seed:demo          # seed the two demo workspaces (en + tr) the shots use
npm run screenshots        # seed, recapture docs/screenshots/*, rewrite both READMEs
npm run hooks:install      # core.hooksPath -> .githooks (one-time, per clone)
```

Both README galleries are generated, never hand-edited.
`scripts/screenshots/shots.ts` is the single source (add a view there);
`convex/seed.ts` is an `internalMutation` that builds the demo content, seeded into two
separate accounts by `scripts/seed-demo.mjs` — English for `README.md`, Turkish for
`README.tr.md`. Shots are full frames of the **real signed-in app** at a 1920x1080
layout, rasterised at 2x and written as WebP (`sharp`), so the whole stack has to be
up; when it is not, shots are skipped (not failed) and the committed images are kept. `.githooks/pre-commit` re-runs the capture only when `app/`,
`components/`, `hooks/`, `lib/` or a stylesheet is staged, then stages
`docs/screenshots/` and both READMEs. Bypass with `ZOTION_SKIP_SCREENSHOTS=1`.

The demo seed wipes every document belonging to the userId it is given — it is only
ever called with the `demo-en@` / `demo-tr@` account ids.

Two test layers, split by directory and never overlapping: **Vitest** owns
`tests/unit/**/*.test.ts` (pure functions, no browser), **Playwright** owns
`tests/e2e/` (`testDir` is set to it). A test that doesn't touch `page` belongs in
`tests/unit/`. Verification is `tsc --noEmit` + `npm run build` + `npm run lint` +
`npm test` + `npm run test:e2e`. `npm run lint` is **not** clean —
there is a known pre-existing baseline, recorded in `docs/memory/gotchas.md`; new and
modified files must stay lint-clean.

Local infra (Postgres, MinIO, self-hosted Convex backend) is Docker Compose, not `npm`:

```bash
docker compose up -d postgres minio minio-init convex-backend
npm run convex:dev   # separate terminal — needs CONVEX_SELF_HOSTED_URL + admin key
npm run dev           # separate terminal
```

Ports and the end-to-end smoke test: `docs/runbook.md`.

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
  (`/api/files/...`) so the same image survives a domain change. The GET route
  enforces access control: the key's owner (session) or a file belonging to a
  published, non-archived document (the `fileRefs` mapping in Convex,
  `convex/files.ts`) — anything else is a 404.

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

## Document tree invariants

`documents.remove` deletes the whole subtree (a database child goes through
`cascadeDeleteDatabase` first), and `recursiveArchive`/`recursiveRestore` are awaited —
a mutation must not return while its subtree walk is still in flight. Keep both
properties when touching `convex/documents.ts`: a non-awaited recursive walk inside a
Convex mutation silently drops the remaining work.

## Keeping this file current

If a change alters the architecture, a core data flow, build/test/dev commands, or one
of the decisions above, update this file (and the relevant file under
`.claude/rules/project/`) in the same change — don't let it drift.
