"use client";

import { useMutation, useQuery } from "convex/react";
import { X } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useRowPeek } from "@/hooks/useRowPeek";
import { DatabaseProperty, DatabaseRow } from "@/components/database/types";
import { OptionBadge } from "@/components/database/option-badge";
import { PropertyValue } from "@/components/database/board/property-value";
import { cn } from "@/lib/utils";

// Row peek — board kartına tıklayınca satırın property'lerini düzenleyen
// side panel (Notion'daki side peek'in satır karşılığı). Satırlar doküman
// olmadığından (önceki karar) panel hücreleri inline düzenler.
export const RowPeekModal = () => {
  const peek = useRowPeek();
  const updateCell = useMutation(api.databases.updateCell);
  const renameProperty = useMutation(api.databases.renameProperty);

  const properties = useQuery(
    api.databases.getSchema,
    peek.databaseId ? { databaseId: peek.databaseId } : "skip",
  );
  const rows = useQuery(
    api.databases.getRows,
    peek.databaseId ? { databaseId: peek.databaseId } : "skip",
  );

  const row: DatabaseRow | undefined = rows?.find(
    (r) => r._id === peek.rowId,
  );
  const titleProperty = properties?.find((p) => p.isTitle);
  const title = row && titleProperty ? row.cells[titleProperty._id] : undefined;
  const titleText = typeof title === "string" ? title : "";

  const commit = (propertyId: string, value: unknown) => {
    if (!row) return;
    updateCell({
      rowId: row._id,
      propertyId: propertyId as never,
      value: value as never,
    });
  };

  return (
    <Dialog open={!!peek.rowId} onOpenChange={(open) => !open && peek.onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-transparent"
        className="bg-background dark:bg-dark top-0 right-0 left-auto flex h-full max-h-screen w-full max-w-sm translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 border-l p-0 shadow-none"
      >
        <DialogTitle className="sr-only">Row properties</DialogTitle>
        <div className="bg-background dark:bg-dark flex h-11 shrink-0 items-center justify-end border-b px-3">
          <button
            type="button"
            aria-label="Close"
            onClick={peek.onClose}
            className="text-muted-foreground hover:bg-secondary flex h-8 w-8 items-center justify-center rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!row || !properties ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              {/* Başlık — title property'sini inline düzenler. */}
              <input
                value={titleText}
                placeholder="Untitled"
                onChange={(e) => titleProperty && commit(titleProperty._id, e.target.value)}
                className="mb-4 w-full bg-transparent text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <div className="space-y-1">
                {properties
                  .filter((p) => !p.isTitle)
                  .map((property) => (
                    <RowPropertyEditor
                      key={property._id}
                      property={property}
                      row={row}
                      onCommit={(value) => commit(property._id, value)}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function RowPropertyEditor({
  property,
  row,
  onCommit,
}: {
  property: DatabaseProperty;
  row: DatabaseRow;
  onCommit: (value: unknown) => void;
}) {
  const value = row.cells[property._id];

  if (property.type === "text") {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-muted-foreground w-24 shrink-0 truncate text-sm">
          {property.name}
        </span>
        <input
          value={typeof value === "string" ? value : ""}
          placeholder="Empty"
          onChange={(e) => onCommit(e.target.value)}
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm text-foreground outline-none hover:bg-secondary focus:bg-secondary"
        />
      </div>
    );
  }

  if (property.type === "select") {
    const options = property.options ?? [];
    const current = options.find((o) => o.id === value);
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-muted-foreground w-24 shrink-0 truncate text-sm">
          {property.name}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {current ? (
            <OptionBadge label={current.label} color={current.color} />
          ) : (
            <span className="text-sm text-muted-foreground/60">Empty</span>
          )}
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) =>
              onCommit(e.target.value === "" ? null : e.target.value)
            }
            className="bg-secondary text-muted-foreground h-7 max-w-full cursor-pointer rounded-md px-1 text-xs outline-none"
          >
            <option value="">Empty</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Diğer tipler: salt görünüm (değer editörleri Faz 6'da genişler).
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-muted-foreground w-24 shrink-0 truncate text-sm">
        {property.name}
      </span>
      <div className="min-w-0 flex-1">
        <PropertyValue property={property} row={row} />
      </div>
    </div>
  );
}
