"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Id } from "@/convex/_generated/dataModel";
import { DatabaseProperty, DatabaseRow } from "@/components/database/types";
import { BoardCard } from "./board-card";
import { BoardColumnHeader } from "./board-column-header";
import { CreateCardInput } from "./board-create-card";
import { groupColorVars } from "./board-colors";

// Board kolonu — dış surface overflow'u açık tutar; rounded header ve kart
// gölgeleri kendi component sınırlarında görünür kalır.
interface BoardColumnProps {
  groupKey: string;
  label: string;
  color?: string;
  rows: DatabaseRow[];
  titleProperty?: DatabaseProperty;
  visibleProperties: DatabaseProperty[];
  cardPreview?: "none" | "cover" | "content";
  editable?: boolean;
  onOpenRow?: (row: DatabaseRow) => void;
  onAddCard?: () => void;
  onOpenMenu?: (e: React.MouseEvent) => void;
  onDragPointerDown?: (
    e: React.PointerEvent,
    rowId: Id<"databaseRows">,
    groupKey: string,
    cardRect: { top: number; left: number; width: number },
  ) => void;
  suppressClickRef?: React.RefObject<boolean | null>;
  /** Kolon bu grup için inline kart oluşturma modunda mı? */
  creating?: boolean;
  createSequence?: number;
  onCreateCommit?: (title: string) => void;
  onCreateClose?: () => void;
}

export const BoardColumn = ({
  groupKey,
  label,
  color,
  rows,
  titleProperty,
  visibleProperties,
  cardPreview,
  editable = true,
  onOpenRow,
  onAddCard,
  onOpenMenu,
  onDragPointerDown,
  suppressClickRef,
  creating = false,
  createSequence = 0,
  onCreateCommit,
  onCreateClose,
}: BoardColumnProps) => {
  const [hovered, setHovered] = useState(false);
  const colors = groupColorVars(color);

  return (
    <div
      data-group-key={groupKey}
      data-testid="board-column"
      className="flex shrink-0 flex-col"
      style={{
        width: "var(--kanban-col-width)",
        marginRight: "var(--kanban-col-gap)",
        marginBottom: 16,
        padding: "0 var(--kanban-col-pad-x) var(--kanban-col-pad-bottom)",
        backgroundColor: colors.tint,
        borderRadius: "var(--kanban-col-radius)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <BoardColumnHeader
        label={label}
        color={color}
        count={rows.length}
        hovered={hovered && editable}
        onAddCard={editable ? onAddCard : undefined}
        onOpenMenu={editable ? onOpenMenu : undefined}
      />
      <div className="flex-1" data-testid="board-card-list">
        {rows.map((row) => (
          <BoardCard
            key={row._id}
            row={row}
            groupKey={groupKey}
            titleProperty={titleProperty}
            visibleProperties={visibleProperties}
            groupColor={color}
            cardPreview={cardPreview}
            onOpen={onOpenRow}
            onDragPointerDown={onDragPointerDown}
            suppressClickRef={suppressClickRef}
          />
        ))}
      </div>
      {creating && editable && onCreateCommit && (
        <CreateCardInput
          sequence={createSequence}
          onCommit={onCreateCommit}
          onClose={onCreateClose ?? (() => {})}
        />
      )}
      {editable && (
        <button
          type="button"
          data-testid="board-add-card"
          onClick={onAddCard}
          className="text-muted-foreground hover:bg-accent flex h-10 items-center gap-1.5 px-2.5 text-sm transition-colors"
          style={{
            borderRadius: 10,
            boxShadow: `0 0 0 1px ${colors.ring}`,
            color: colors.actionFg,
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New page
        </button>
      )}
    </div>
  );
};
