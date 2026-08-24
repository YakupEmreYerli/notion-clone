"use client";

import { useMutation } from "convex/react";
import { ChevronDown, ListFilter } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DatabaseProperty, DatabaseView } from "@/components/database/types";
import {
  GROUPABLE_TYPES,
  PROPERTY_TYPE_OPTIONS,
} from "@/components/database/property-types";
import { PropertyIcon } from "@/components/database/property-icon";

// Board için "Group by" seçici — Notion'da board'un grup kimliği buradan
// belirlenir. Sadece gruplanabilir tipler listelenir (text/url/number vb.
// Notion'da board gruplamasına kapalıdır).
interface GroupByPickerProps {
  view: DatabaseView;
  properties: DatabaseProperty[];
}

export const GroupByPicker = ({ view, properties }: GroupByPickerProps) => {
  const setGroupBy = useMutation(api.databaseViews.setGroupByProperty);

  const groupable = properties.filter((p) => GROUPABLE_TYPES.includes(p.type));
  const current = view.groupByPropertyId
    ? properties.find((p) => p._id === view.groupByPropertyId)
    : undefined;
  const currentType = current
    ? PROPERTY_TYPE_OPTIONS.find((option) => option.type === current.type)
    : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="text-foreground/80 hover:bg-secondary flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors"
        >
          <ListFilter className="h-3.5 w-3.5" />
          <span>
            {current
              ? `Group by: ${current.name}${currentType ? ` (${currentType.label})` : ""}`
              : "Group by"}
          </span>
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
          Group by
        </DropdownMenuLabel>
        {groupable.map((property) => {
          const type = PROPERTY_TYPE_OPTIONS.find(
            (option) => option.type === property.type,
          );
          return (
            <DropdownMenuItem
              key={property._id}
              onClick={() =>
                setGroupBy({ viewId: view._id, propertyId: property._id })
              }
            >
              <PropertyIcon property={property} className="mr-2 size-4" />
              <span className="min-w-0 flex-1 truncate">{property.name}</span>
              {type && (
                <span className="text-muted-foreground ml-3 text-xs">
                  {type.label}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
        {groupable.length === 0 && (
          <DropdownMenuItem disabled>No groupable properties</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
