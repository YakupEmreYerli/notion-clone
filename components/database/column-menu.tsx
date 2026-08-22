"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeftToLine, ArrowRightToLine, MoreHorizontal, Trash } from "lucide-react";

interface ColumnMenuProps {
  onInsertLeft: () => void;
  onInsertRight: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const ColumnMenu = ({
  onInsertLeft,
  onInsertRight,
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
