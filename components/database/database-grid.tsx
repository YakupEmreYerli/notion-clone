"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { DatabaseProperty, DatabaseRow, PropertyType } from "./types";
import { DatabaseCell } from "./grid-cell";
import { ColumnHeader } from "./column-header";
import { AddPropertyMenu } from "./add-property-menu";
import { useColumnResize } from "./use-column-resize";

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
  const deleteProperty = useMutation(api.databases.deleteProperty);
  const reorderProperty = useMutation(api.databases.reorderProperty);
  const changePropertyType = useMutation(api.databases.changePropertyType);

  const { getWidth, startResize } = useColumnResize();

  const template = [
    ...properties.map((property) => `${getWidth(property)}px`),
    "40px",
  ].join(" ");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = properties.findIndex((p) => p._id === active.id);
    const newIndex = properties.findIndex((p) => p._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(properties, oldIndex, newIndex);
    const targetIndex = reordered.findIndex((p) => p._id === active.id);

    reorderProperty({
      propertyId: active.id as Id<"databaseProperties">,
      beforePropertyId: reordered[targetIndex - 1]?._id,
      afterPropertyId: reordered[targetIndex + 1]?._id,
    });
  };

  const onAddProperty = (type: PropertyType) => {
    createProperty({
      databaseId,
      type,
      afterPropertyId: properties[properties.length - 1]?._id,
    });
  };

  const onAddRow = () => {
    createRow({ databaseId });
  };

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <div className="min-w-max">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={properties.map((p) => p._id)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              className="border-border bg-secondary/50 sticky top-0 z-10 grid border-b"
              style={{ gridTemplateColumns: template }}
            >
              {properties.map((property, index) => (
                <ColumnHeader
                  key={property._id}
                  property={property}
                  editable={editable}
                  width={getWidth(property)}
                  canDelete={properties.length > 1}
                  onResizeStart={(e) => startResize(property, e)}
                  onDelete={() => deleteProperty({ propertyId: property._id })}
                  onChangeType={(type) =>
                    changePropertyType({ propertyId: property._id, type })
                  }
                  onInsertLeft={() =>
                    createProperty({
                      databaseId,
                      type: "text",
                      afterPropertyId: properties[index - 1]?._id,
                    })
                  }
                  onInsertRight={() =>
                    createProperty({
                      databaseId,
                      type: "text",
                      afterPropertyId: property._id,
                    })
                  }
                />
              ))}
              {editable ? (
                <AddPropertyMenu onCreate={onAddProperty} />
              ) : (
                <div />
              )}
            </div>
          </SortableContext>
        </DndContext>

        {rows.map((row) => (
          <div
            key={row._id}
            className="border-border grid border-b"
            style={{ gridTemplateColumns: template }}
          >
            {properties.map((property) => (
              <div key={property._id} className="border-border border-r">
                <DatabaseCell
                  property={property}
                  editable={editable}
                  value={row.cells[property._id]}
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
