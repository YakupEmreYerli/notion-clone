"use client";

import { useMutation } from "convex/react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  GripVertical,
  MoreHorizontal,
  Trash,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { DatabaseRow } from "./types";

interface RowMenuProps {
  databaseId: Id<"documents">;
  row: DatabaseRow;
  previousRowId?: Id<"databaseRows">;
  editable: boolean;
  dragAttributes: React.HTMLAttributes<HTMLButtonElement>;
  dragListeners?: React.HTMLAttributes<HTMLButtonElement>;
}

export const RowMenu = ({
  databaseId,
  row,
  previousRowId,
  editable,
  dragAttributes,
  dragListeners,
}: RowMenuProps) => {
  const createRow = useMutation(api.databases.createRow);
  const deleteRow = useMutation(api.databases.deleteRow);
  const duplicateRow = useMutation(api.databases.duplicateRow);

  return (
    <div
      role="gridcell"
      className="flex h-9 min-h-0 items-center justify-end gap-0 px-0"
    >
      {editable && (
        <>
          <button
            {...dragAttributes}
            {...dragListeners}
            aria-label="Reorder row"
            className="text-muted-foreground/50 hover:text-foreground flex size-5 cursor-grab touch-none items-center justify-center rounded-sm p-0 opacity-0 group-hover/row:opacity-100"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="More actions"
                className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded-sm p-0 opacity-0 group-hover/row:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => duplicateRow({ rowId: row._id })}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => createRow({ databaseId, afterRowId: previousRowId })}
              >
                <ArrowUpToLine className="mr-2 h-4 w-4" />
                Insert above
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => createRow({ databaseId, afterRowId: row._id })}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Insert below
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => deleteRow({ rowId: row._id })}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
};
