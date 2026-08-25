"use client";

import { useState } from "react";

import { RowPeekPanel } from "@/components/database/row-peek-panel";
import type { DatabaseRow } from "@/components/database/types";
import { databaseBuilder } from "@/tests/support/data/database-builder";

const db = databaseBuilder("row-peek-fixture")
  .withTitle("Title")
  .withText("Author")
  .withSelect("Status", [
    { id: "next", label: "Next", color: "gray" },
    { id: "reading", label: "Reading", color: "blue" },
  ])
  .withMultiSelect("Tags", [
    { id: "growth", label: "Growth", color: "blue" },
    { id: "habits", label: "Habits", color: "orange" },
  ])
  .withRow({
    Title: "Atomic Habits",
    Author: "James Clear",
    Status: "next",
    Tags: ["growth"],
  })
  .build();

/**
 * Side peek'i Convex olmadan render eder — panel prop alacak şekilde
 * ayrıldığı için (RowPeekPanel) gerçek uygulamadakiyle aynı bileşen.
 */
export function RowPeekFixture() {
  const [row, setRow] = useState(db.rows[0]);
  const [open, setOpen] = useState(true);

  return (
    <main className="bg-background text-foreground min-h-screen p-12">
      <section data-row-peek-fixture>
        <button type="button" onClick={() => setOpen(true)}>
          Open peek
        </button>
        <RowPeekPanel
          open={open}
          row={row}
          properties={db.properties}
          onClose={() => setOpen(false)}
          onIconChange={(icon) => setRow((prev: DatabaseRow) => ({ ...prev, icon }))}
          onAddCover={() => undefined}
          onAddProperty={() => undefined}
          propertyActions={{
            rename: () => undefined,
            changeType: () => undefined,
            duplicate: () => undefined,
            remove: () => undefined,
          }}
          onCommit={(propertyId, value) =>
            setRow((prev: DatabaseRow) => ({
              ...prev,
              cells: { ...prev.cells, [propertyId]: value as never },
            }))
          }
        />
      </section>
    </main>
  );
}
