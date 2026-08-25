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
  const [row, setRow] = useState<DatabaseRow>({
    ...db.rows[0],
    // Kapak render'ını doğrulayabilmek için: veri katmanı olmadan da
    // panelin kapağı gösterdiğini görebilelim.
    coverImage:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="%232f2f2f"/></svg>',
      ),
  });
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
