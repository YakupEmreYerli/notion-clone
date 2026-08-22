"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { CellValue, DatabaseProperty, DatabaseRow, PropertyType } from "./types";
import { DatabaseCell } from "./grid-cell";
import { ColumnHeader } from "./column-header";
import { AddPropertyMenu } from "./add-property-menu";
import { useColumnResize } from "./use-column-resize";
import { RowMenu } from "./row-menu";
import { useGridSelection } from "./use-grid-selection";

interface SortableDatabaseRowProps {
  row: DatabaseRow;
  previousRowId?: Id<"databaseRows">;
  databaseId: Id<"documents">;
  properties: DatabaseProperty[];
  template: string;
  editable: boolean;
  activeCell: ReturnType<typeof useGridSelection>["activeCell"];
  mode: ReturnType<typeof useGridSelection>["mode"];
  editSeed: ReturnType<typeof useGridSelection>["editSeed"];
  onActivate: ReturnType<typeof useGridSelection>["activateCell"];
  onEditingDone: ReturnType<typeof useGridSelection>["exitEditing"];
  onCommit: (propertyId: Id<"databaseProperties">, value: CellValue) => void;
}

const SortableDatabaseRow = ({
  row,
  previousRowId,
  databaseId,
  properties,
  template,
  editable,
  activeCell,
  mode,
  editSeed,
  onActivate,
  onEditingDone,
  onCommit,
}: SortableDatabaseRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row._id, disabled: !editable });

  return (
    <div
      ref={setNodeRef}
      style={{
        gridTemplateColumns: template,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="border-border group/row grid border-b"
    >
      {properties.map((property) => {
        const isActive =
          activeCell?.rowId === row._id && activeCell.propertyId === property._id;
        return (
          <div
            key={property._id}
            role="gridcell"
            onClick={() => onActivate({ rowId: row._id, propertyId: property._id })}
            className={`border-border border-r ${isActive ? "ring-primary relative z-1 ring-1 ring-inset" : ""}`}
          >
            <DatabaseCell
              property={property}
              editable={editable}
              value={row.cells[property._id]}
              isActive={isActive}
              isEditing={isActive && mode === "editing"}
              editSeed={isActive ? editSeed : null}
              onCommit={(value) => onCommit(property._id, value)}
              onEditingDone={onEditingDone}
            />
          </div>
        );
      })}
      <RowMenu
        databaseId={databaseId}
        row={row}
        previousRowId={previousRowId}
        editable={editable}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
};

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
  const reorderRow = useMutation(api.databases.reorderRow);
  const changePropertyType = useMutation(api.databases.changePropertyType);

  const { getWidth, startResize } = useColumnResize();

  const { activeCell, activateCell, exitEditing, editSeed, mode, onKeyDown } =
    useGridSelection({
      properties,
      rows,
      editable,
      onClearCell: ({ rowId, propertyId }, value) =>
        updateCell({ rowId, propertyId, value }),
    });

  const template = [
    ...properties.map((property) => `${getWidth(property)}px`),
    "40px",
  ].join(" ");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const rowSensors = useSensors(
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
    createRow({ databaseId, afterRowId: rows[rows.length - 1]?._id });
  };

  const onRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((row) => row._id === active.id);
    const newIndex = rows.findIndex((row) => row._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(rows, oldIndex, newIndex);
    const targetIndex = reordered.findIndex((row) => row._id === active.id);

    reorderRow({
      rowId: active.id as Id<"databaseRows">,
      beforeRowId: reordered[targetIndex - 1]?._id,
      afterRowId: reordered[targetIndex + 1]?._id,
    });
  };

  return (
    <div
      role="grid"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="border-border overflow-x-auto rounded-md border outline-none"
    >
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

        <DndContext
          sensors={rowSensors}
          collisionDetection={closestCorners}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onRowDragEnd}
        >
          <SortableContext
            items={rows.map((row) => row._id)}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((row, index) => (
              <SortableDatabaseRow
                key={row._id}
                row={row}
                previousRowId={rows[index - 1]?._id}
                databaseId={databaseId}
                properties={properties}
                template={template}
                editable={editable}
                activeCell={activeCell}
                mode={mode}
                editSeed={editSeed}
                onActivate={activateCell}
                onEditingDone={exitEditing}
                onCommit={(propertyId, value) =>
                  updateCell({ rowId: row._id, propertyId, value })
                }
              />
            ))}
          </SortableContext>
        </DndContext>

        <div className="flex items-center justify-between">
          {editable ? (
            <button
              onClick={onAddRow}
              className="text-muted-foreground hover:bg-primary/5 flex flex-1 items-center gap-2 px-3 py-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              New row
            </button>
          ) : (
            <div />
          )}
          <span className="text-muted-foreground px-3 text-xs">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
          </span>
        </div>
      </div>
    </div>
  );
};
