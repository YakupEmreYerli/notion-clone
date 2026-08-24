"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useRowPeek } from "@/hooks/useRowPeek";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import {
  DatabaseProperty,
  DatabaseRow,
  DatabaseView,
  ViewCardOrder,
} from "@/components/database/types";
import { buildGroups, BoardGroup } from "./grouping";
import { BoardColumn } from "./board-column";
import { BoardEmpty } from "./board-empty";
import { BoardCard } from "./board-card";
import { BoardColumnMenu } from "./board-column-menu";
import { BoardGroupsPanel } from "./board-groups-panel";
import { orderBoardProperties } from "./board-properties";
import { findDropTarget, DropTarget } from "./drop-target";
import { useBoardDnd } from "./use-board-dnd";

// Board görünümü. Layout Notion ölçümlerine dayanır; drag motoru
// use-board-dnd (pointer events, 8px eşik, Esc iptal, ~100px auto-scroll).
interface BoardViewProps {
  view: DatabaseView;
  databaseId: Id<"documents">;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  orders: ViewCardOrder[];
  totalRowCount?: number;
  preserveRowOrder?: boolean;
  disableRowReordering?: boolean;
  editable?: boolean;
}

interface PendingMove {
  rowId: Id<"databaseRows">;
  toGroupKey: string;
  beforeRowId?: Id<"databaseRows">;
  afterRowId?: Id<"databaseRows">;
}

// Optimistic taşıma: kartı tüm gruplardan çıkarıp hedef gruba komşuların
// arasına koyar. Mutation onaylanınca gerçek veri gelir (pending temizlenir);
// hata olursa Convex verisi değişmediği için UI doğal olarak geri döner.
function applyPendingMove(
  groups: BoardGroup[],
  pending: PendingMove | null,
  rows: DatabaseRow[],
): BoardGroup[] {
  if (!pending) return groups;
  const row = rows.find((r) => r._id === pending.rowId);
  if (!row) return groups;

  const next = groups.map((g) =>
    g.rows.some((r) => r._id === pending.rowId)
      ? { ...g, rows: g.rows.filter((r) => r._id !== pending.rowId) }
      : g,
  );
  const target = next.find((g) => g.key === pending.toGroupKey);
  if (!target) return next;

  const cards = [...target.rows];
  const beforeIdx = pending.beforeRowId
    ? cards.findIndex((r) => r._id === pending.beforeRowId)
    : -1;
  const afterIdx = pending.afterRowId
    ? cards.findIndex((r) => r._id === pending.afterRowId)
    : -1;
  // Komşu semantiği: beforeRowId = üst komşu (sonrasına), afterRowId = alt
  // komşu (öncesine).
  if (beforeIdx >= 0 && afterIdx >= 0) cards.splice(beforeIdx + 1, 0, row);
  else if (afterIdx >= 0) cards.splice(afterIdx, 0, row);
  else if (beforeIdx >= 0) cards.splice(beforeIdx + 1, 0, row);
  else cards.push(row);
  target.rows = cards;

  return next;
}

export const BoardView = ({
  view,
  databaseId,
  properties,
  rows,
  orders,
  totalRowCount = rows.length,
  preserveRowOrder = false,
  disableRowReordering = false,
  editable = true,
}: BoardViewProps) => {
  const createRow = useMutation(api.databases.createRow);
  const createRowInView = useMutation(api.databaseViews.createRowInView);
  const moveRow = useMutation(api.databaseViews.moveRow);
  const updateSettings = useMutation(api.databaseViews.updateViewSettings);
  const addSelectOption = useMutation(api.databases.addSelectOption);

  const rowPeek = useRowPeek();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [creating, setCreating] = useState<{
    groupKey: string;
    sequence: number;
  } | null>(null);
  const [columnMenu, setColumnMenu] = useState<{
    groupKey: string;
    x: number;
    y: number;
  } | null>(null);
  const [groupsPanel, setGroupsPanel] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const titleProperty = properties.find((p) => p.isTitle);
  const groupProperty = view.groupByPropertyId
    ? properties.find((p) => p._id === view.groupByPropertyId)
    : undefined;

  const visibleProperties = useMemo(() => {
    return orderBoardProperties(
      properties,
      view.visiblePropertyIds,
      view.groupByPropertyId,
    );
  }, [properties, view.visiblePropertyIds, view.groupByPropertyId]);

  const groups = useMemo(() => {
    const base = buildGroups({
      rows,
      property: groupProperty,
      orders,
      groupOrder: view.groupOrder,
      hiddenGroupKeys: view.hiddenGroupKeys,
      hideEmptyGroups: view.hideEmptyGroups,
      preserveRowOrder,
    });
    return applyPendingMove(base, pendingMove, rows);
  }, [
    rows,
    groupProperty,
    orders,
    view.groupOrder,
    view.hiddenGroupKeys,
    view.hideEmptyGroups,
    preserveRowOrder,
    pendingMove,
  ]);

  // Drop hedefi: drop ANINDA DOM'dan taze rect'lerle hesaplanır (Notion'da
  // canlı placeholder yok — kartlar drag sırasında kaymaz).
  const getDropTarget = useCallback(
    (
      x: number,
      y: number,
      sourceRowId: Id<"databaseRows">,
    ): DropTarget | null => {
      const scroller = scrollerRef.current;
      if (!scroller) return null;
      const columns = [
        ...scroller.querySelectorAll<HTMLElement>("[data-group-key]"),
      ];
      const dropColumns = columns.map((el) => {
        const r = el.getBoundingClientRect();
        const cards = [
          ...el.querySelectorAll<HTMLElement>("[data-row-id]"),
        ].map((card) => {
          const cr = card.getBoundingClientRect();
          return {
            rowId: card.dataset.rowId as Id<"databaseRows">,
            top: cr.top,
            bottom: cr.bottom,
          };
        });
        return {
          groupKey: el.dataset.groupKey ?? "",
          rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
          cards,
        };
      });
      return findDropTarget(x, y, dropColumns, sourceRowId);
    },
    [],
  );

  const { drag, onPointerDown, cloneRef, suppressClickRef } = useBoardDnd({
    scrollerRef,
    getDropTarget,
    onDrop: useCallback(
      (target: DropTarget, sourceRowId: Id<"databaseRows">) => {
        // Optimistic: UI'ı anında taşı; mutation onaylanınca gerçek veri
        // gelir. Hata olursa Convex verisi değişmediği için UI doğal olarak
        // eski haline döner (rollback) + toast.
        setPendingMove({
          rowId: sourceRowId,
          toGroupKey: target.toGroupKey,
          beforeRowId: target.beforeRowId,
          afterRowId: target.afterRowId,
        });
        moveRow({
          viewId: view._id,
          rowId: sourceRowId,
          toGroupKey: target.toGroupKey,
          beforeRowId: target.beforeRowId,
          afterRowId: target.afterRowId,
        })
          .then(() => setPendingMove(null))
          .catch((e) => {
            setPendingMove(null);
            toast.error(
              e instanceof Error ? e.message : "Card could not be moved",
            );
          });
      },
      [moveRow, view._id],
    ),
  });

  const hiddenKeys = useMemo(
    () => new Set(view.hiddenGroupKeys ?? []),
    [view.hiddenGroupKeys],
  );

  const hiddenGroups = useMemo(() => {
    if (!groupProperty) return [];
    return [...hiddenKeys].map((key) => {
      const option = groupProperty.options?.find((o) => o.id === key);
      return { key, label: option?.label ?? key, color: option?.color };
    });
  }, [hiddenKeys, groupProperty]);

  const onHideGroup = (groupKey: string) => {
    updateSettings({
      viewId: view._id,
      hiddenGroupKeys: [...hiddenKeys, groupKey],
    });
  };

  const onAddCard = (groupKey: string) => {
    if (!editable) return;
    if (view.type === "board") {
      // Notion davranışı: "+ New" → inline input; kart Enter ile kaydedilir.
      setCreating({ groupKey, sequence: 0 });
    } else {
      createRow({ databaseId, afterRowId: rows[rows.length - 1]?._id });
    }
  };

  const onCreateCommit = (groupKey: string, title: string) => {
    const group = groups.find((g) => g.key === groupKey);
    const afterRowId = group?.rows[group.rows.length - 1]?._id;
    createRowInView({ viewId: view._id, groupKey, title, afterRowId }).then(
      () => {
        // Enter sonrası input altta açık kalır (Notion davranışı) —
        // sequence artar, input taze remount olur.
        setCreating((cur) =>
          cur && cur.groupKey === groupKey
            ? { groupKey, sequence: cur.sequence + 1 }
            : cur,
        );
      },
    );
  };

  if (groups.length === 0) {
    return <BoardEmpty hasRows={totalRowCount > 0} />;
  }

  return (
    <>
      <div
        ref={scrollerRef}
        data-board-viewport
        className="overflow-x-auto"
      >
        <div className="flex min-w-max items-start">
          {groups.map((group) => (
            <BoardColumn
              key={group.key}
              groupKey={group.key}
              label={group.label}
              color={group.color}
              rows={group.rows}
              titleProperty={titleProperty}
              visibleProperties={visibleProperties}
              cardPreview={view.cardPreview}
              editable={editable}
              onOpenRow={
                editable
                  ? (row) => rowPeek.open(row._id, databaseId)
                  : undefined
              }
              onAddCard={editable ? () => onAddCard(group.key) : undefined}
               onDragPointerDown={
                 editable && !disableRowReordering ? onPointerDown : undefined
               }
              suppressClickRef={suppressClickRef}
              onOpenMenu={(e) =>
                setColumnMenu({
                  groupKey: group.key,
                  x: e.clientX,
                  y: e.clientY,
                })
              }
              creating={creating?.groupKey === group.key}
              createSequence={
                creating?.groupKey === group.key ? creating.sequence : 0
              }
              onCreateCommit={(title) => onCreateCommit(group.key, title)}
              onCreateClose={() => setCreating(null)}
            />
          ))}
          {editable &&
            groupProperty &&
            ["select", "multiSelect"].includes(groupProperty.type) &&
            (creatingGroup ? (
              <div className="mt-1 w-[260px] shrink-0">
                <input
                  autoFocus
                  aria-label="New group name"
                  placeholder="New group"
                  className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  onBlur={(event) => {
                    const label = event.currentTarget.value.trim();
                    if (label) {
                      addSelectOption({
                        propertyId: groupProperty._id,
                        label,
                        color: "gray",
                      });
                    }
                    setCreatingGroup(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                      event.currentTarget.value = "";
                      event.currentTarget.blur();
                    }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingGroup(true)}
                className="mt-1 flex h-[30px] shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                <Plus className="h-4 w-4" />
                New group
              </button>
            ))}
        </div>

        {/* Kolon ⋯ menüsü: Edit groups / Hide group / Colors */}
        {columnMenu && (
          <BoardColumnMenu
            open={columnMenu !== null}
            x={columnMenu.x}
            y={columnMenu.y}
            groupKey={columnMenu.groupKey}
            groupByProperty={groupProperty}
            onClose={() => setColumnMenu(null)}
            onEditGroups={() =>
              setGroupsPanel({ x: columnMenu.x, y: columnMenu.y })
            }
            onHideGroup={() => onHideGroup(columnMenu.groupKey)}
          />
        )}

        {/* Edit groups paneli kolon menüsünden açılır. */}
        {groupsPanel && (
          <BoardGroupsPanel
            open={groupsPanel !== null}
            x={groupsPanel.x}
            y={groupsPanel.y}
            view={view}
            properties={properties}
            groups={groups}
            hiddenGroups={hiddenGroups}
            onClose={() => setGroupsPanel(null)}
          />
        )}

        {/* Drag klonu: 0.4 opacity (ölçülen), pointer'ı 1:1 takip eder. */}
        {drag &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={cloneRef}
              className="pointer-events-none fixed top-0 left-0 z-[999] will-change-transform"
              style={{ opacity: 0.4 }}
            >
              <BoardCard
                row={rows.find((r) => r._id === drag.rowId) ?? rows[0]}
                groupKey={drag.groupKey}
                titleProperty={titleProperty}
                visibleProperties={visibleProperties}
                groupColor={groups.find((g) => g.key === drag.groupKey)?.color}
                cardPreview={view.cardPreview}
              />
            </div>,
            document.body,
          )}
      </div>
    </>
  );
};
