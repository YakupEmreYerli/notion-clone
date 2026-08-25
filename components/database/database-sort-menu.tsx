"use client";

import { useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import { TrashIcon } from "@/app/(main)/_components/icons/TrashIcon";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DatabaseProperty } from "./types";
import { PropertyIcon } from "./property-icon";
import type { DatabaseSort, SortDirection } from "./view-operations";
import { SortIcon } from "./database-toolbar-icons";

interface DatabaseSortMenuProps {
  properties: DatabaseProperty[];
  sorts: DatabaseSort[];
  editable: boolean;
  onChange: (sorts: DatabaseSort[]) => void;
}

function nextId(): string {
  return `sort-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function directionLabel(
  property: DatabaseProperty,
  direction: SortDirection,
): string {
  if (property.type === "number" || property.type === "date") {
    return direction === "asc" ? "Ascending" : "Descending";
  }
  return direction === "asc" ? "A → Z" : "Z → A";
}

export function DatabaseSortMenu({
  properties,
  sorts,
  editable,
  onChange,
}: DatabaseSortMenuProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(sorts.length === 0);
  const availableProperties = properties.filter(
    (property) =>
      !sorts.some((sort) => sort.propertyId === property._id) &&
      property.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Sort"
          className={`hover:bg-secondary relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${sorts.length > 0 ? "text-[#2383e2]" : "text-muted-foreground"}`}
        >
          <SortIcon />
          {sorts.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#2383e2] px-0.5 text-[9px] leading-none text-white">
              {sorts.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[290px] p-1.5">
        {sorts.length > 0 && (
          <div className="space-y-1">
            <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
              Sorts
            </div>
            {sorts.map((sort) => {
              const property = properties.find(
                (candidate) => candidate._id === sort.propertyId,
              );
              if (!property) return null;
              return (
                <div
                  key={sort.id}
                  className="hover:bg-secondary/50 flex h-8 items-center gap-1 rounded-md px-1"
                >
                  <GripVertical className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {property.name}
                  </span>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() =>
                      onChange(
                        sorts.map((item) =>
                          item.id === sort.id
                            ? {
                                ...item,
                                direction:
                                  item.direction === "asc" ? "desc" : "asc",
                              }
                            : item,
                        ),
                      )
                    }
                    className="hover:bg-secondary h-6 rounded px-1.5 text-xs disabled:pointer-events-none"
                  >
                    {directionLabel(property, sort.direction)}
                  </button>
                  {editable && (
                    <button
                      type="button"
                      aria-label={`Remove ${property.name} sort`}
                      onClick={() =>
                        onChange(sorts.filter((item) => item.id !== sort.id))
                      }
                      className="text-muted-foreground hover:bg-secondary flex h-6 w-6 items-center justify-center rounded"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {editable && !adding && availableProperties.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-muted-foreground hover:bg-secondary mt-1 flex h-7 w-full items-center gap-2 rounded-md px-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add sort
          </button>
        )}

        {editable && adding && (
          <div
            className={
              sorts.length > 0 ? "border-border mt-1 border-t pt-1" : ""
            }
          >
            <input
              autoFocus
              aria-label="Sort by"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sort by..."
              className="h-8 w-full bg-transparent px-2 text-sm outline-none"
            />
            <div className="max-h-52 overflow-y-auto">
              {availableProperties.map((property) => {
                return (
                  <button
                    key={property._id}
                    type="button"
                    onClick={() => {
                      onChange([
                        ...sorts,
                        {
                          id: nextId(),
                          propertyId: property._id,
                          direction: "asc",
                        },
                      ]);
                      setQuery("");
                      setAdding(false);
                    }}
                    className="hover:bg-secondary flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-sm"
                  >
                    <PropertyIcon
                      property={property}
                      className="text-muted-foreground size-4"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {property.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
