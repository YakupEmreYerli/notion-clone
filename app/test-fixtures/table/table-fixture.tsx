"use client";

import { DatabaseGrid } from "@/components/database/database-grid";
import type {
  DatabaseProperty,
  DatabaseRow,
  DatabaseView,
} from "@/components/database/types";
import type { Id } from "@/convex/_generated/dataModel";

const databaseId = "table-fixture-database" as Id<"documents">;
const titleId = "table-fixture-title" as Id<"databaseProperties">;
const authorId = "table-fixture-author" as Id<"databaseProperties">;

const properties = [
  {
    _id: titleId,
    _creationTime: 1,
    databaseId,
    userId: "fixture",
    name: "Name",
    type: "text",
    order: 0,
    width: 320,
    isTitle: true,
  },
  {
    _id: authorId,
    _creationTime: 2,
    databaseId,
    userId: "fixture",
    name: "Author",
    type: "text",
    order: 1,
    width: 200,
    icon: "user",
  },
] satisfies DatabaseProperty[];

const rows = [
  {
    _id: "table-fixture-row" as Id<"databaseRows">,
    _creationTime: 3,
    databaseId,
    userId: "fixture",
    order: 0,
    cells: {
      [titleId]: "A table page",
      [authorId]: "Ada Lovelace",
    },
  },
] satisfies DatabaseRow[];

const view = {
  _id: "table-fixture-view" as Id<"databaseViews">,
  _creationTime: 4,
  databaseId,
  userId: "fixture",
  name: "Table",
  type: "table",
  position: 0,
} satisfies DatabaseView;

export function TableFixture() {
  return (
    <main className="bg-background text-foreground min-h-screen p-12">
      <section data-table-fixture className="mx-auto w-full max-w-[1100px]">
        <DatabaseGrid
          databaseId={databaseId}
          view={view}
          allProperties={properties}
          properties={properties}
          rows={rows}
          filters={[]}
          sorts={[]}
          lastRowId={rows[0]._id}
          rowReorderingEnabled
          editable
        />
      </section>
    </main>
  );
}
