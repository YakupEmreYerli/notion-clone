"use client";

import { DatabaseGrid } from "@/components/database/database-grid";
import { databaseBuilder } from "@/tests/support/data/database-builder";

const table = databaseBuilder("table-fixture")
  .withTitle("Name", { width: 320 })
  .withText("Author", { width: 200, icon: "user" })
  .withRow({ Name: "A table page", Author: "Ada Lovelace" })
  .withRow({ Name: "Second page", Author: "Marie Curie" })
  .build();

export function TableFixture() {
  return (
    <main className="bg-background text-foreground min-h-screen p-12">
      <section data-table-fixture className="mx-auto w-full max-w-[1100px]">
        <DatabaseGrid
          databaseId={table.databaseId}
          view={table.view}
          allProperties={table.properties}
          properties={table.properties}
          rows={table.rows}
          filters={[]}
          sorts={[]}
          lastRowId={table.rows[table.rows.length - 1]._id}
          rowReorderingEnabled
          editable
        />
      </section>
    </main>
  );
}
