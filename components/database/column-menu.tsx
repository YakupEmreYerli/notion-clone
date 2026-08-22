"use client";

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
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ListFilter,
  MoreHorizontal,
  Trash,
} from "lucide-react";

import { PROPERTY_TYPE_OPTIONS } from "./property-types";
import { PropertyType } from "./types";

interface ColumnMenuProps {
  currentType: PropertyType;
  onInsertLeft: () => void;
  onInsertRight: () => void;
  onChangeType: (type: PropertyType) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const ColumnMenu = ({
  currentType,
  onInsertLeft,
  onInsertRight,
  onChangeType,
  onDelete,
  canDelete,
}: ColumnMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Column menu"
        className="text-muted-foreground ml-1 shrink-0 rounded-sm p-0.5 opacity-0 hover:bg-neutral-300 group-hover/col:opacity-100 dark:hover:bg-neutral-600"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ListFilter className="mr-2 h-4 w-4" />
            Change type
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.type}
                disabled={option.type === currentType}
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
