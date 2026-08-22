"use client";

import { useState } from "react";
import { useMutation } from "convex/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ListFilter,
  Trash,
} from "lucide-react";

import { PROPERTY_TYPE_OPTIONS } from "./property-types";
import { DatabaseProperty, PropertyType } from "./types";

interface ColumnMenuProps {
  property: DatabaseProperty;
  onInsertLeft: () => void;
  onInsertRight: () => void;
  onChangeType: (type: PropertyType) => void;
  onDelete: () => void;
  canDelete: boolean;
}

// Notion'daki gibi: kolon başlığının tamamı tetikleyici. Açılır menünün
// en üstünde adı değiştirmek için bir input var, altında sütun eylemleri.
export const ColumnMenu = ({
  property,
  onInsertLeft,
  onInsertRight,
  onChangeType,
  onDelete,
  canDelete,
}: ColumnMenuProps) => {
  const renameProperty = useMutation(api.databases.renameProperty);
  const [name, setName] = useState(property.name);
  const currentTypeOption =
    PROPERTY_TYPE_OPTIONS.find((o) => o.type === property.type) ??
    PROPERTY_TYPE_OPTIONS[0];

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== property.name) {
      renameProperty({ propertyId: property._id, name: trimmed });
    } else {
      setName(property.name);
    }
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) commitName();
      }}
    >
      <DropdownMenuTrigger
        onPointerDown={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:bg-primary/5 flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 py-1 text-left"
      >
        <currentTypeOption.icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{property.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="p-1">
          <input
            key={property.name}
            autoFocus
            defaultValue={property.name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = property.name;
                setName(property.name);
                e.currentTarget.blur();
              }
            }}
            className="bg-secondary w-full rounded-sm px-2 py-1.5 text-sm outline-none"
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ListFilter className="mr-2 h-4 w-4" />
            Change type
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.type}
                disabled={option.type === property.type}
                onClick={() => onChangeType(option.type)}
              >
                <option.icon className="mr-2 h-4 w-4" />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={onInsertLeft}>
          <ArrowLeftToLine className="mr-2 h-4 w-4" />
          Insert left
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInsertRight}>
          <ArrowRightToLine className="mr-2 h-4 w-4" />
          Insert right
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canDelete}
          onClick={onDelete}
          className="text-red-600 focus:text-red-600"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
