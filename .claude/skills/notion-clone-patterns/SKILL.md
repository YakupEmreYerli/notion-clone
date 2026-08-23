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

## Workflows

- **No automated test suite.** There is no `test` script and no
  jest/vitest/playwright config. Verification before calling work done is:
  `npx tsc --noEmit` → `npm run lint` → `npm run build`, plus manual/browser
  checks when a UI change is involved. Don't propose adding a generic test
  suite as a fix for an unrelated task — it's a deliberate project choice
  documented in `CLAUDE.md`.
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

No test files or test framework exist in this repo. Treat `npx tsc --noEmit`,
`npm run lint`, and `npm run build` as the closest equivalent to a test gate,
and run all three before considering a change complete — this is what recent
commit history and `CLAUDE.md` both confirm as the actual verification loop
used here.
