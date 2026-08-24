"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import {
  CellValue,
  DatabaseProperty,
  DatabaseRow,
  DatabaseView,
  PropertyType,
} from "./types";
import { DatabaseCell } from "./grid-cell";
import { ColumnHeader } from "./column-header";
import { AddPropertyMenu } from "./add-property-menu";
import { useColumnResize } from "./use-column-resize";
import { RowMenu } from "./row-menu";
import { useGridSelection } from "./use-grid-selection";
import type {
  DatabaseFilter,
  DatabaseSort,
  SortDirection,
} from "./view-operations";

function nextCriterionId(prefix: "filter" | "sort") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface SortableDatabaseRowProps {
  row: DatabaseRow;
  previousRowId?: Id<"databaseRows">;
  databaseId: Id<"documents">;
  properties: DatabaseProperty[];
  template: string;
  editable: boolean;
  reorderable: boolean;
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
  reorderable,
  activeCell,
  mode,
  editSeed,
  onActivate,
  onEditingDone,
  onCommit,
}: SortableDatabaseRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row._id, disabled: !editable || !reorderable });

  const rowTransition = transition
    ? `${transition}, background-color 200ms ease-out`
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        gridTemplateColumns: template,
        transform: CSS.Transform.toString(transform),
        transition: rowTransition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="border-border hover:bg-primary/5 group/row grid h-9 grid-rows-[36px] border-b transition-colors duration-200 ease-out"
    >
      {properties.map((property) => {
        const isActive =
          activeCell?.rowId === row._id &&
          activeCell.propertyId === property._id;
        return (
          <div
            key={property._id}
            role="gridcell"
            onClick={() =>
              onActivate({ rowId: row._id, propertyId: property._id })
            }
            className={`border-border h-9 min-h-0 overflow-hidden border-r ${isActive ? "ring-primary relative z-1 ring-1 ring-inset" : ""}`}
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
  view: DatabaseView;
  allProperties: DatabaseProperty[];
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  filters: DatabaseFilter[];
  sorts: DatabaseSort[];
  lastRowId?: Id<"databaseRows">;
  rowReorderingEnabled: boolean;
  editable: boolean;
}

// <table> yerine CSS grid: kolon genişlikleri tek bir gridTemplateColumns
// string'i olarak başlık ve her satır arasında paylaşılıyor.
export const DatabaseGrid = ({
  databaseId,
  view,
  allProperties,
  properties,
  rows,
  filters,
  sorts,
  lastRowId,
  rowReorderingEnabled,
  editable,
}: DatabaseGridProps) => {
  const createProperty = useMutation(api.databases.createProperty);
  const createRow = useMutation(api.databases.createRow);
  const updateCell = useMutation(api.databases.updateCell);
  const deleteProperty = useMutation(api.databases.deleteProperty);
  const duplicateProperty = useMutation(api.databases.duplicateProperty);
  const reorderRow = useMutation(api.databases.reorderRow);
  const changePropertyType = useMutation(api.databases.changePropertyType);
  const updateViewSettings = useMutation(api.databaseViews.updateViewSettings);

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

  const rowSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onAddProperty = (type: PropertyType) => {
    createProperty({
      databaseId,
      type,
      afterPropertyId: properties[properties.length - 1]?._id,
    });
  };

  const onAddRow = () => {
    createRow({ databaseId, afterRowId: lastRowId });
  };

  const saveViewSettings = (patch: Parameters<typeof updateViewSettings>[0]) =>
    updateViewSettings(patch).catch(() =>
      toast.error("View settings could not be saved"),
    );

  const onHideProperty = (property: DatabaseProperty) => {
    const visiblePropertyIds =
      view.visiblePropertyIds ?? allProperties.map((item) => item._id);
    saveViewSettings({
      viewId: view._id,
      visiblePropertyIds: visiblePropertyIds.filter(
        (propertyId) => propertyId !== property._id,
      ),
    });
  };

  const onFilterProperty = (property: DatabaseProperty) => {
    if (filters.some((filter) => filter.propertyId === property._id)) return;
    saveViewSettings({
      viewId: view._id,
      filters: [
        ...filters,
        {
          id: nextCriterionId("filter"),
          propertyId: property._id,
          operator: "isNotEmpty",
        },
      ],
    });
  };

  const onSortProperty = (
    property: DatabaseProperty,
    direction: SortDirection,
  ) => {
    const nextSort: DatabaseSort = {
      id:
        sorts.find((sort) => sort.propertyId === property._id)?.id ??
        nextCriterionId("sort"),
      propertyId: property._id,
      direction,
    };
    saveViewSettings({
      viewId: view._id,
      sorts: [
        ...sorts.filter((sort) => sort.propertyId !== property._id),
        nextSort,
      ],
    });
  };

  const onRowDragEnd = (event: DragEndEvent) => {
    if (!rowReorderingEnabled) return;
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
      className="overflow-x-auto outline-none"
    >
      <div className="w-max min-w-full">
        <div
          data-testid="database-header"
          className="border-border bg-secondary/50 sticky top-0 z-10 grid h-9 grid-rows-[36px] border-b"
          style={{ gridTemplateColumns: template }}
        >
          {properties.map((property, index) => (
            <ColumnHeader
              key={property._id}
              property={property}
              editable={editable}
              width={getWidth(property)}
              canDelete={allProperties.length > 1}
              onResizeStart={(e) => startResize(property, e)}
              onDelete={() => deleteProperty({ propertyId: property._id })}
              onChangeType={(type) =>
                changePropertyType({ propertyId: property._id, type })
              }
              onFilter={() => onFilterProperty(property)}
              onSort={(direction) => onSortProperty(property, direction)}
              onHide={() => onHideProperty(property)}
              onDuplicate={() =>
                duplicateProperty({ propertyId: property._id }).catch(() =>
                  toast.error("Property could not be duplicated"),
                )
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
                reorderable={rowReorderingEnabled}
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

        <div className="h-7">
          {editable && (
            <button
              onClick={onAddRow}
              className="text-muted-foreground hover:bg-primary/5 inline-flex h-7 items-center gap-2 rounded-md px-2 text-sm"
            >
              <Plus className="size-4" />
              New page
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
