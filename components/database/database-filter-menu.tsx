"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CellValue, DatabaseProperty } from "./types";
import { PropertyIcon } from "./property-icon";
import { type DatabaseFilter, type FilterOperator } from "./view-operations";
import { FilterIcon } from "./database-toolbar-icons";

interface DatabaseFilterMenuProps {
  properties: DatabaseProperty[];
  filters: DatabaseFilter[];
  editable: boolean;
  onChange: (filters: DatabaseFilter[]) => void;
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains",
  doesNotContain: "does not contain",
  equals: "is",
  notEquals: "is not",
  greaterThan: "is greater than",
  lessThan: "is less than",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
};

function operatorsFor(property: DatabaseProperty): FilterOperator[] {
  if (property.type === "number" || property.type === "date") {
    return [
      "equals",
      "notEquals",
      "greaterThan",
      "lessThan",
      "isEmpty",
      "isNotEmpty",
    ];
  }
  if (property.type === "select" || property.type === "checkbox") {
    return ["equals", "notEquals", "isEmpty", "isNotEmpty"];
  }
  return [
    "contains",
    "doesNotContain",
    "equals",
    "notEquals",
    "isEmpty",
    "isNotEmpty",
  ];
}

function defaultOperator(property: DatabaseProperty): FilterOperator {
  return ["select", "checkbox", "number", "date"].includes(property.type)
    ? "equals"
    : "contains";
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function FilterValueEditor({
  filter,
  property,
  disabled,
  onChange,
}: {
  filter: DatabaseFilter;
  property: DatabaseProperty;
  disabled: boolean;
  onChange: (value: CellValue | undefined) => void;
}) {
  if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") {
    return null;
  }

  if (property.type === "select" || property.type === "multiSelect") {
    return (
      <select
        aria-label={`${property.name} filter value`}
        value={typeof filter.value === "string" ? filter.value : ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="bg-secondary/60 h-7 min-w-0 flex-1 rounded-md border-0 px-2 text-xs outline-none"
      >
        <option value="">Select an option</option>
        {(property.options ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (property.type === "checkbox") {
    return (
      <select
        aria-label={`${property.name} filter value`}
        value={typeof filter.value === "boolean" ? String(filter.value) : ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value === ""
              ? undefined
              : event.target.value === "true",
          )
        }
        className="bg-secondary/60 h-7 min-w-0 flex-1 rounded-md border-0 px-2 text-xs outline-none"
      >
        <option value="">Select a value</option>
        <option value="true">Checked</option>
        <option value="false">Unchecked</option>
      </select>
    );
  }

  if (property.type === "number") {
    return (
      <input
        aria-label={`${property.name} filter value`}
        type="number"
        value={typeof filter.value === "number" ? filter.value : ""}
        disabled={disabled}
        placeholder="Enter a number"
        onChange={(event) =>
          onChange(
            event.target.value === "" ? undefined : Number(event.target.value),
          )
        }
        className="bg-secondary/60 h-7 min-w-0 flex-1 rounded-md border-0 px-2 text-xs outline-none"
      />
    );
  }

  if (property.type === "date") {
    const dateValue =
      typeof filter.value === "number"
        ? new Date(filter.value).toISOString().slice(0, 10)
        : "";
    return (
      <input
        aria-label={`${property.name} filter value`}
        type="date"
        value={dateValue}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value
              ? new Date(`${event.target.value}T00:00:00`).getTime()
              : undefined,
          )
        }
        className="bg-secondary/60 h-7 min-w-0 flex-1 rounded-md border-0 px-2 text-xs outline-none"
      />
    );
  }

  return (
    <input
      aria-label={`${property.name} filter value`}
      value={typeof filter.value === "string" ? filter.value : ""}
      disabled={disabled}
      placeholder="Enter a value"
      onChange={(event) => onChange(event.target.value || undefined)}
      className="bg-secondary/60 h-7 min-w-0 flex-1 rounded-md border-0 px-2 text-xs outline-none"
    />
  );
}

export function DatabaseFilterMenu({
  properties,
  filters,
  editable,
  onChange,
}: DatabaseFilterMenuProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(filters.length === 0);
  const matchingProperties = properties.filter((property) =>
    property.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  const updateFilter = (id: string, patch: Partial<DatabaseFilter>) => {
    onChange(
      filters.map((filter) => {
        if (filter.id !== id) return filter;
        const next = { ...filter, ...patch };
        if ("value" in patch && patch.value === undefined) delete next.value;
        return next;
      }),
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter"
          className={`hover:bg-secondary relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${filters.length > 0 ? "text-[#2383e2]" : "text-muted-foreground"}`}
        >
          <FilterIcon />
          {filters.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#2383e2] px-0.5 text-[9px] leading-none text-white">
              {filters.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[290px] p-1.5">
        {filters.length > 0 && (
          <div className="space-y-1">
            <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
              Filters
            </div>
            {filters.map((filter) => {
              const property = properties.find(
                (candidate) => candidate._id === filter.propertyId,
              );
              if (!property) return null;
              return (
                <div
                  key={filter.id}
                  className="border-border bg-secondary/20 rounded-md border p-1.5"
                >
                  <div className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate px-1 text-xs font-medium">
                      {property.name}
                    </span>
                    {editable && (
                      <button
                        type="button"
                        aria-label={`Remove ${property.name} filter`}
                        onClick={() =>
                          onChange(
                            filters.filter((item) => item.id !== filter.id),
                          )
                        }
                        className="text-muted-foreground hover:bg-secondary flex h-6 w-6 items-center justify-center rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <select
                      aria-label={`${property.name} filter operator`}
                      value={filter.operator}
                      disabled={!editable}
                      onChange={(event) =>
                        updateFilter(filter.id, {
                          operator: event.target.value as FilterOperator,
                          value: undefined,
                        })
                      }
                      className="bg-secondary/60 h-7 max-w-[126px] rounded-md border-0 px-2 text-xs outline-none"
                    >
                      {operatorsFor(property).map((operator) => (
                        <option key={operator} value={operator}>
                          {OPERATOR_LABELS[operator]}
                        </option>
                      ))}
                    </select>
                    <FilterValueEditor
                      filter={filter}
                      property={property}
                      disabled={!editable}
                      onChange={(value) => updateFilter(filter.id, { value })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editable && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-muted-foreground hover:bg-secondary mt-1 flex h-7 w-full items-center gap-2 rounded-md px-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add filter
          </button>
        )}

        {editable && adding && (
          <div
            className={
              filters.length > 0 ? "border-border mt-1 border-t pt-1" : ""
            }
          >
            <input
              autoFocus
              aria-label="Filter by"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by..."
              className="h-8 w-full bg-transparent px-2 text-sm outline-none"
            />
            <div className="max-h-52 overflow-y-auto">
              {matchingProperties.map((property) => {
                return (
                  <button
                    key={property._id}
                    type="button"
                    onClick={() => {
                      onChange([
                        ...filters,
                        {
                          id: nextId("filter"),
                          propertyId: property._id,
                          operator: defaultOperator(property),
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
