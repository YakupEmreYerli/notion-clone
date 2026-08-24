---
name: notion-clone-patterns
description: "Use when working in notion-clone (Zotion), especially before writing a commit message, touching convex/documents.ts or any Convex function, regenerating convex/_generated, editing the sidebar (Item.tsx/Navigation.tsx/DocumentList.tsx), or verifying a change without a test suite — conventions measured from git history"
metadata:
  version: "1.0.0"
  source: local-git-analysis
  analyzed_commits: "200"
---

# notion-clone (Zotion) Patterns

## Commit Conventions

Conventional Commits type prefixes, measured over the last 200 commits:

| Prefix | Share |
|---|---|
| `feat:` | 40 |
| `fix:` | 25 |
| `chore(deps):` / `chore(deps-dev):` | 34 |
| `chore:` | 12 |
| `refactor:` | 8 |
| `style:` | 4 |
| `docs:` | 3 |
| `wip:` | 1 |

- Format: `<type>: <description>`, optionally `<type>(<scope>): <description>` for
  dependency bumps (`chore(deps):`, `chore(deps-dev):`) or a narrow area
  (`refactor(auth):`).
- The `<description>` is overwhelmingly written in **Turkish**, even though the
  type prefix itself stays in English (`fix: içerik arama — tablo bloğu
  çökmesi ve eksik searchText senkronizasyonu`, `feat: sidebar sayfa ağacı
  parity — breadcrumb, sürükle-bırak, trash retention, Move to`). A handful of
  short, purely technical fixes use English instead
  (`feat: add searchDocuments query using the search index`). Match whichever
  language the surrounding recent commits use — don't force English.
- An em dash (`—`) commonly separates the headline from a clause listing the
  specific sub-changes bundled into the commit
  (`style: sidebar ve database başlığını Notion'a yaklaştır`,
  `fix: sidebar genişliği artık tek kaynaktan (Codex ile teşhis edildi)`).
- `style:` is used for visual-only tweaks (spacing, width, alignment), not
  logic changes — e.g. `style: sidebar varsayılan genişliği 270px → 280px`.
- `wip:` appears rarely, for an explicit mid-feature checkpoint commit
  (`wip: checkpoint — peek modal, database grid polish, cover gallery,
  type-aware labels`) — not a normal commit style, only for deliberate
  save-points.

## Code Architecture

Top-level layout: `app/` (Next.js App Router route groups), `components/`,
`convex/` (backend), `docker/`, `docs/`, `hooks/`, `lib/`.

Most-frequently-changed source files over the last 200 commits (excluding
`package.json`/`package-lock.json`, which just track dependency churn):

1. `app/(main)/_components/Item.tsx` (23) — the sidebar row component; a
   frequent hotspot for sidebar/interaction work.
2. `app/(main)/_components/Navigation.tsx` (21) — sidebar shell/layout.
3. `app/(main)/(routes)/documents/[documentId]/page.tsx` (16) — main document
   route.
4. `convex/documents.ts` (14) — the central Convex backend module (documents
   CRUD, sidebar tree, trash, search).
5. `app/globals.css` (13), `app/(main)/_components/Menu.tsx` (12),
   `convex/schema.ts` (11), `components/editor.tsx` (11),
   `components/cover.tsx` (11), `components/toolbar.tsx` (10),
   `app/(main)/_components/TrashBox.tsx` (10).

`convex/documents.ts` and `convex/_generated/api.d.ts` co-change in the same
commits whenever a Convex function's exported shape changes — confirms the
already-documented rule (CLAUDE.md, `.claude/rules/project/convex.md`): after
adding/changing an exported Convex function, regenerate `convex/_generated/`
(`npm run convex:dev` or `npx convex deploy`) and commit the regenerated
output in the same commit, not a follow-up one.

## Project memory

Before starting work, read `docs/memory/STATE.md` (it is also auto-imported via
`CLAUDE.md`). `docs/README.md` maps the rest: `docs/memory/decisions.md` for why
something is built the way it is, `docs/memory/gotchas.md` for the lint baseline
and intentional non-fixes, `docs/runbook.md` for ports and the smoke test. A
`SessionStart`/`Stop` hook pair (`.claude/hooks/state-guard/`) surfaces real repo
state and blocks ending a session that changed source without updating STATE.

## Workflows

- **Two test layers, split by directory.** Vitest owns `tests/unit/**/*.test.ts`
  (pure functions, no browser; `vitest.config.mts`, run with `npm test`).
  Playwright owns `tests/e2e/*.spec.ts` (`testDir` is set to it), driven against
  fixture routes under `app/test-fixtures/`; `npm run test:e2e:update` refreshes
  snapshots. A test that never touches `page` belongs in `tests/unit/`. The gate
  before calling work done: `npx tsc --noEmit` → `npm run lint` →
  `npm run build` → `npm test` → `npm run test:e2e`, plus browser checks for UI
  work. Roadmap for the remaining layers: `docs/testing.md`.
- **`npm run lint` is not clean.** A pre-existing baseline (React-compiler
  rules) is recorded in `docs/memory/gotchas.md` — new and modified files must
  stay lint-clean, but don't treat the baseline as a regression you caused.
- **Multi-round iteration on the same feature is common and expected here.**
  Recent history shows repeated `fix:`/`style:` commits narrowing in on the
  same area across several commits in a row (three separate sidebar-width
  commits: 270px→280px, a "single source of truth" fix, 260px→270px). Small,
  sequential, descriptive commits over that iteration are the norm — don't
  try to compress an iterative debugging session into one commit after the
  fact.
- **Database ("M1"/"M2"/"M3"/"M4" milestone) work ships in small, labeled
  increments** (`feat: database — M2 sütun yönetimi (rename, sil, sırala,
  genişlik)`, `feat: database — M3 Select & Multi-select`, `feat: database —
  M4 Excel hissi (klavye navigasyonu, satır sürükleme)`), each commit scoped
  to one milestone, not the whole feature at once.
- **Self-hosting infra changes land as one dedicated commit**, not mixed into
  feature work (`feat: Zotion'ı self-host edilebilir hale getir (Better Auth,
  self-hosted Convex, MinIO, Docker)`).

## Testing Patterns

Playwright E2E lives in `tests/e2e/*.spec.ts`, driven by `playwright.config.ts`
and backed by dedicated fixture routes in `app/test-fixtures/` (clipping, table)
rather than by seeding the real app. Existing specs: `board-clipping`,
`clipping-helper`, `editor-surface-clipping`, `table-parity`,
`cover-modal-parity` — i.e. the suite targets pixel/geometry parity, not
business logic.

Vitest unit tests live in `tests/unit/*.test.ts` — currently
`database-view-operations` (filter/sort/search semantics, board grouping,
property-icon catalog), moved out of the E2E suite because it never opened a
browser. Convex backend logic is still untested; the approved next step is the
separate `convex-test` package (note: `convexTest` is **not** shipped inside the
`convex` package), which needs `convex` ≥1.43. `npx tsc --noEmit`,
`npm run lint`, and `npm run build` remain part of the gate alongside both test
commands.
