# Convex conventions (Zotion-specific)

> Project-specific rules — not part of the ECC-managed `rules/ecc/` tree. Keep this
> file in sync when Convex data model or backend conventions change; the same change
> should also be reflected in `CLAUDE.md`'s architecture summary if it's significant.

## Data model (`convex/schema.ts`)

- `documents` is one table for both pages and databases, discriminated by
  `type: "page" | "database"`. `type` is optional — `undefined` means `"page"` — this
  is what let the field be added without a migration. Don't add new required fields to
  `documents` without the same optional-with-implied-default trick, or plan a real
  migration.
- `databaseProperties` (columns) and `databaseRows` (rows) belong to a `documents` row
  of `type: "database"`, referenced by `databaseId: v.id("documents")`.
- Row cells: `cells: v.record(v.id("databaseProperties"), cellValue)` — keyed by the
  property's `_id`, never by name or label. Renaming a column must never touch row
  data. Select/multi-select cell values store the option's `id`, not its label —
  renaming/recoloring an option is O(1) and never rewrites rows.
- Ordering (`documents.order`, `databaseProperties.order`, `databaseRows.order`) is a
  fractional `v.number()` — insert between two siblings by averaging their `order`
  values, don't renumber the whole list. This is deliberately different from
  `documents.reorder`, which does rewrite every sibling (kept for the sidebar tree,
  which is small; not used for potentially-large database tables).
- `searchText` on `documents` is derived (title + BlockNote content flattened to plain
  text) and feeds the `search_text` search index. Any code path that changes `title` or
  `content` must recompute and persist `searchText` the same way `documents.update`
  does, or search results go stale for that document.
- `fileRefs` is derived the same way and carries the same obligation: it maps an
  uploaded storage key to the document that references it (cover image + BlockNote
  media blocks, `convex/lib/fileRefs.ts`) and is what `/api/files/<key>` reads to
  decide whether a file may be served anonymously. Any code path that changes
  `coverImage` or `content` must call `syncFileRefs`, and any path that permanently
  deletes a document must call `deleteFileRefs` — otherwise a removed image stays
  publicly readable, or a new one 404s. Archiving needs no sync: `isArchived` is
  checked at read time.

## Auth and access control

- Every query/mutation that requires a signed-in user calls `requireUser(ctx)`
  (`convex/lib/auth.ts`) first — it throws `"Not authenticated"` if there's no
  identity. Don't read `ctx.auth.getUserIdentity()` directly in handlers; use the
  helper so the error message and behavior stay consistent.
- **Public-before-auth ordering is load-bearing.** `documents.getById` and
  `requireReadableDatabase` fetch the document, and if it's `isPublished &&
  !isArchived`, return it *before* checking `identity`. This is what makes the
  anonymous `/preview/<id>` route work. Any new read path that should behave the same
  way (published content readable by anyone) must check "is it published" before "is
  there a user" — checking auth first breaks anonymous preview for that data.
- Ownership checks (`requireOwnedDatabase`, `requireOwnedProperty`, `requireOwnedRow`)
  compare `doc.userId !== userId` — there is no roles/sharing model beyond "owner" and
  "published read-only". Don't assume any other permission tier exists.

## Writing mutations

- `ctx.db.patch()` is a **shallow merge**. Patching an object/record field (e.g.
  `databaseRows.cells`) replaces that field wholesale — it does not merge into it. To
  change one cell, read the full `cells` object, shallow-copy it (`{ ...row.cells }`),
  mutate the copy, then patch the whole field back (see `databases.ts: updateCell`).
  The same applies to any other record/object-valued field you add later.
- `convex/_generated/` is committed to git. After adding or changing an exported
  Convex function (new file under `convex/`, new `export const` in an existing one,
  changed args/return shape), run `npm run convex:dev` or `npx convex deploy` to
  regenerate `_generated/api.d.ts` etc. *before* committing — otherwise `api.<module>`
  references elsewhere in the app won't typecheck.
- Deleting a database document must go through `cascadeDeleteDatabase`
  (`convex/databases.ts`, called from `convex/documents.ts` on `remove`/`removeAll`) so
  its `databaseProperties`/`databaseRows` don't become orphaned records.
- `documents.remove` **is recursive** — it walks and deletes the whole subtree, sending
  any `type: "database"` descendant through `cascadeDeleteDatabase` before deleting it.
  `recursiveArchive`/`recursiveRestore` are `await`ed. Preserve both: an un-awaited
  recursive walk inside a Convex mutation lets the handler return (and the transaction
  close) while the rest of the subtree is still unprocessed, so part of the work is
  silently dropped.

## Property/cell types

- Property types and per-type cell value shapes are defined once in
  `convex/lib/cellValue.ts` (`propertyTypeValidator`, `cellValueValidator`,
  `propertyOptionValidator`) and imported by both `schema.ts` and `databases.ts`. Add
  new property types there, not by hand-rolling a new validator inline in a mutation.
- Select/multi-select option colors are stored as a **token name** (e.g. `"blue"`), not
  a Tailwind class string — Tailwind v4 can't detect dynamically-constructed class
  names, so the token gets mapped to a class in a lookup table on the frontend side.
