"use client";

import { useState } from "react";
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
import { FillHandle } from "./fill-handle";
import { ColumnHeader } from "./column-header";
import { AddPropertyMenu } from "./add-property-menu";
import { useColumnResize } from "./use-column-resize";
import { RowMenu } from "./row-menu";
import { useGridSelection } from "./use-grid-selection";
import type { FillSelection } from "./use-grid-selection";
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
  fill: ReturnType<typeof useGridSelection>["fill"];
  getFillRange: ReturnType<typeof useGridSelection>["getFillRange"];
  onActivate: ReturnType<typeof useGridSelection>["activateCell"];
  onBeginEdit: ReturnType<typeof useGridSelection>["beginEditCell"];
  onEditingDone: ReturnType<typeof useGridSelection>["exitEditing"];
  onStartFill: ReturnType<typeof useGridSelection>["startFill"];
  onUpdateFillTarget: ReturnType<typeof useGridSelection>["updateFillTarget"];
  onEndFill: ReturnType<typeof useGridSelection>["endFill"];
  /** Fill pointer-up'ında son hedefle commit eder (boş hedef varsa pasif). */
  onCommitFill: (selection: FillSelection) => void;
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
  fill,
  getFillRange,
  onActivate,
  onBeginEdit,
  onEditingDone,
  onStartFill,
  onUpdateFillTarget,
  onEndFill,
  onCommitFill,
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

  // Bir satırın aktif fill aralığında olup olmadığı (kaynak satır da dahil).
  const isRowInFillRange = (rowId: Id<"databaseRows">, sel: FillSelection) => {
    const ids = getFillRange(sel)?.map((r) => r._id) ?? [];
    return ids.includes(rowId);
  };

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
      role="row"
      data-row-id={row._id}
      // Notion table view'da satır hover tint'i YOK (ölçüldü —
      // docs/notion-research/table-parity.md). group/row yalnızca satır
      // menüsünü göstermek için duruyor.
      className="border-table-border group/row grid h-9 grid-rows-[36px] border-b"
    >
      {properties.map((property) => {
        const isActive =
          activeCell?.rowId === row._id &&
          activeCell.propertyId === property._id;
        // Fill sürüklenirken kaynaktan target'a kadar olan hücreler vurgulanır.
        const isInFillRange =
          !!fill &&
          fill.propertyId === property._id &&
          isRowInFillRange(row._id, fill);
        return (
          <div
            key={property._id}
            role="gridcell"
            // Fill sürüklemesinin hedef aralığı. Seçili hücre de aynı mavi
            // dolguyu taşıdığı için renk ayırt edici değil — aralığı testin
            // sayabilmesi (ve DOM'un okunabilirliği) için açık işaret.
            data-fill-range={isInFillRange || undefined}
            onClick={() => {
              const position = {
                rowId: row._id,
                propertyId: property._id,
              };
              // Text hücresine tıklayınca Notion gibi doğrudan düzenleme moduna
              // geç — böylece Ctrl+V / yazı doğrudan çalışır. Diğer tipler
              // (select, multiSelect) kendi popover'ını açar, "idle" kalır.
              if (editable && property.type === "text") onBeginEdit(position);
              else onActivate(position);
            }}
            className={[
              // overflow-hidden BİLEREK burada değil: fill tutamacı hücrenin
              // sağ-alt köşesinin üzerine taşar, dıştaki kap kırpsa görünmez.
              "border-table-border group/cell relative h-9 min-h-0 border-r",
              // Notion'da seçim ayrı bir overlay: hafif mavi dolgu + 2px inset
              // kontur + 2px radius (ölçüldü, table-parity.md).
              isActive
                ? "bg-table-selection-fill shadow-[inset_0_0_0_2px_var(--table-selection)] z-1 rounded-[2px]"
                : "outline-none",
              isInFillRange && !isActive ? "bg-table-selection-fill" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="h-full w-full overflow-hidden">
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
            {isActive && mode === "idle" && property.type === "text" && (
              <FillHandle
                onStart={() =>
                  onStartFill({ rowId: row._id, propertyId: property._id })
                }
                onTarget={onUpdateFillTarget}
                onCommit={() => {
                  if (fill) onCommitFill(fill);
                }}
                onEnd={onEndFill}
              />
            )}
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

  // dnd-kit'ın sürükleme durumunu ilan eden canlı bölgesi (`role="status"`)
  // grid'in çocuğu olarak AX ağacına girerse `aria-required-children` kırılır
  // — grid yalnızca satır tutmalı. Bu yüzden canlı bölgeyi grid'in dışındaki
  // bir taşıyıcıya portal ederiz.
  const [dndLiveRegionTarget, setDndLiveRegionTarget] =
    useState<HTMLDivElement | null>(null);

  const {
    activeCell,
    activateCell,
    beginEditCell,
    exitEditing,
    editSeed,
    mode,
    onKeyDown,
    fill,
    startFill,
    updateFillTarget,
    endFill,
    getFillRange,
  } = useGridSelection({
    properties,
    rows,
    editable,
    onClearCell: ({ rowId, propertyId }, value) =>
      updateCell({ rowId, propertyId, value }),
    // Notion fill: aktif hücrenin değeri bir/pasif olmayan satırlara çoğaltılır.
    onFill: ({ rowId, propertyId }, targetRowIds) => {
      const source = rows.find((row) => row._id === rowId)?.cells[propertyId];
      if (source === undefined || source === null) return;
      void Promise.all(
        targetRowIds.map((targetRowId) =>
          updateCell({ rowId: targetRowId, propertyId, value: source }),
        ),
      );
    },
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

  // Notion fill commit: kaynak hücrenin mevcut değeri, hedef aralıktaki tüm
  // satırlara kopyalanır (kaynak satır hariç). Tek satırlık hedef = no-op.
  const onCommitFill = (selection: FillSelection) => {
    const sourceRow = rows.find((row) => row._id === selection.rowId);
    const sourceValue = sourceRow?.cells[selection.propertyId];
    if (sourceValue === undefined || sourceValue === null) return;
    const targets = getFillRange(selection)
      ?.filter((row) => row._id !== selection.rowId)
      .map((row) => row._id);
    if (!targets || targets.length === 0) return;
    void Promise.all(
      targets.map((targetRowId) =>
        updateCell({
          rowId: targetRowId,
          propertyId: selection.propertyId,
          value: sourceValue,
        }),
      ),
    );
  };

  return (
    <>
      <div
        role="grid"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="overflow-x-auto outline-none"
      >
        <div className="w-max min-w-full">
          <div
            data-testid="database-header"
            role="row"
            className="border-table-border bg-background sticky top-0 z-10 grid h-9 grid-rows-[36px] border-b"
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
            <div role="columnheader" className="min-w-0">
              <AddPropertyMenu onCreate={onAddProperty} />
            </div>
          ) : (
            <div role="columnheader" />
          )}
        </div>

        <DndContext
          sensors={rowSensors}
          collisionDetection={closestCorners}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onRowDragEnd}
          accessibility={{
            container: dndLiveRegionTarget ?? undefined,
          }}
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
                fill={fill}
                getFillRange={getFillRange}
                onActivate={activateCell}
                onBeginEdit={beginEditCell}
                onEditingDone={exitEditing}
                onStartFill={startFill}
                onUpdateFillTarget={updateFillTarget}
                onEndFill={endFill}
                onCommitFill={onCommitFill}
                onCommit={(propertyId, value) =>
                  updateCell({ rowId: row._id, propertyId, value })
                }
              />
            ))}
          </SortableContext>
        </DndContext>
        </div>
      </div>

      <div className="w-max min-w-full">
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

      <div ref={setDndLiveRegionTarget} className="sr-only" />
    </>
  );
};
