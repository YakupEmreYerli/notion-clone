"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { DatabaseProperty, PropertyType } from "./types";
import { ColumnMenu } from "./column-menu";

interface ColumnHeaderProps {
  property: DatabaseProperty;
  editable: boolean;
  width: number;
  canDelete: boolean;
  onResizeStart: (event: React.PointerEvent) => void;
  onInsertLeft: () => void;
  onInsertRight: () => void;
  onChangeType: (type: PropertyType) => void;
  onDelete: () => void;
}

export const ColumnHeader = ({
  property,
  editable,
  width,
  canDelete,
  onResizeStart,
  onInsertLeft,
  onInsertRight,
  onChangeType,
  onDelete,
}: ColumnHeaderProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: property._id, disabled: !editable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, scaleY: 1 } : null,
    ),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    width,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-border group/col hover:bg-primary/5 text-foreground/80 relative flex h-9 min-h-0 shrink-0 items-center gap-0.5 border-r px-1.5 py-0 text-xs font-semibold"
    >
      {editable && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Reorder column"
          className="text-muted-foreground/50 shrink-0 cursor-grab touch-none opacity-0 group-hover/col:opacity-100"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      {editable ? (
        <ColumnMenu
          property={property}
          canDelete={canDelete}
          onInsertLeft={onInsertLeft}
          onInsertRight={onInsertRight}
          onChangeType={onChangeType}
          onDelete={onDelete}
        />
      ) : (
        <span className="truncate px-1">{property.name}</span>
      )}
      {editable && (
        <div
          onPointerDown={onResizeStart}
          role="separator"
          aria-orientation="vertical"
          className="hover:bg-primary/30 absolute top-0 right-0 h-full w-1 cursor-ew-resize opacity-0 hover:opacity-100"
        />
      )}
    </div>
  );
};
