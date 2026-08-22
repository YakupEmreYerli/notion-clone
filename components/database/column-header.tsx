"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { api } from "@/convex/_generated/api";

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
  const renameProperty = useMutation(api.databases.renameProperty);
  const [name, setName] = useState(property.name);

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

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== property.name) {
      renameProperty({ propertyId: property._id, name: trimmed });
    } else {
      setName(property.name);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-border group/col text-muted-foreground relative flex shrink-0 items-center border-r px-1 py-2 text-sm font-medium"
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
      <input
        key={property.name}
        defaultValue={property.name}
        readOnly={!editable}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = property.name;
            setName(property.name);
            e.currentTarget.blur();
          }
        }}
        className="w-full truncate bg-transparent px-2 outline-none"
      />
      {editable && (
        <>
          <ColumnMenu
            currentType={property.type as PropertyType}
            onInsertLeft={onInsertLeft}
            onInsertRight={onInsertRight}
            onChangeType={onChangeType}
            onDelete={onDelete}
            canDelete={canDelete}
          />
          <div
            onPointerDown={onResizeStart}
            role="separator"
            aria-orientation="vertical"
            className="hover:bg-primary/30 absolute top-0 right-0 h-full w-1 cursor-ew-resize opacity-0 hover:opacity-100"
          />
        </>
      )}
    </div>
  );
};
