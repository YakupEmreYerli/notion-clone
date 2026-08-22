"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { DatabaseProperty, DatabaseRow } from "./types";
import { GridTextCell } from "./grid-cell";

interface DatabaseGridProps {
  databaseId: Id<"documents">;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  editable: boolean;
}

// <table> yerine CSS grid: kolon genişlikleri tek bir gridTemplateColumns
// string'i olarak başlık ve her satır arasında paylaşılıyor.
export const DatabaseGrid = ({
  databaseId,
  properties,
  rows,
  editable,
}: DatabaseGridProps) => {
  const createProperty = useMutation(api.databases.createProperty);
  const createRow = useMutation(api.databases.createRow);
  const updateCell = useMutation(api.databases.updateCell);

  const template = [
    ...properties.map((property) => `${property.width ?? 180}px`),
    "40px",
  ].join(" ");

  const onAddProperty = () => {
    createProperty({ databaseId, type: "text" });
  };

  const onAddRow = () => {
    createRow({ databaseId });
  };

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <div className="min-w-max">
        <div
          className="border-border bg-secondary/50 sticky top-0 z-10 grid border-b"
          style={{ gridTemplateColumns: template }}
        >
          {properties.map((property) => (
            <div
              key={property._id}
              className="border-border text-muted-foreground truncate border-r px-3 py-2 text-sm font-medium"
            >
              {property.name}
            </div>
          ))}
          {editable ? (
            <button
              onClick={onAddProperty}
              aria-label="Add property"
              className="text-muted-foreground hover:bg-primary/5 flex items-center justify-center"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <div />
          )}
        </div>

        {rows.map((row) => (
          <div
            key={row._id}
            className="border-border grid border-b"
            style={{ gridTemplateColumns: template }}
          >
            {properties.map((property) => (
              <div key={property._id} className="border-border border-r">
                <GridTextCell
                  editable={editable}
                  value={
                    typeof row.cells[property._id] === "string"
                      ? (row.cells[property._id] as string)
                      : ""
                  }
                  onCommit={(value) =>
                    updateCell({ rowId: row._id, propertyId: property._id, value })
                  }
                />
              </div>
            ))}
            <div />
          </div>
        ))}

        {editable && (
          <button
            onClick={onAddRow}
            className="text-muted-foreground hover:bg-primary/5 flex w-full items-center gap-2 px-3 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            New row
          </button>
        )}
      </div>
    </div>
  );
};
