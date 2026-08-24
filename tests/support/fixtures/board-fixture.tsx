"use client";

import { useState } from "react";

import { BoardColumn } from "@/components/database/board/board-column";
import { ContextMenu, ContextMenuItem } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { databaseBuilder } from "@/tests/support/data/database-builder";

const board = databaseBuilder("board-fixture")
  .withTitle("Title")
  .withText("Author")
  .withSelect("Status", [{ id: "next", label: "Next", color: "gray" }])
  .withRows(
    {
      Title:
        "A deliberately long title that wraps without cutting the card radius",
      Author: "Fixture Author",
      Status: "next",
    },
    { Title: "First card", Author: "Ada Lovelace", Status: "next" },
    { Title: "Second card", Author: "Grace Hopper", Status: "next" },
    { Title: "Last card", Author: "Margaret Hamilton", Status: "next" },
  )
  .withView("Board", "board")
  .build();

const oneCard = board.rows.slice(0, 1);
const threeCards = board.rows.slice(1);

export function BoardFixture() {
  const [contextMenu, setContextMenu] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);

  const columnProps = {
    titleProperty: board.titleProperty,
    visibleProperties: board.visibleProperties,
    onOpenRow: () => {},
    onAddCard: () => {},
    onDragPointerDown: dragEnabled ? () => {} : undefined,
  };

  return (
    <main className="bg-background text-foreground min-h-screen p-12">
      <section className="mx-auto max-w-[1100px]" data-board-fixture>
        <button
          type="button"
          className="sr-only"
          onClick={() => setDragEnabled(false)}
        >
          Disable board drag
        </button>
        <div className="mb-4 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md border px-3 py-2">Property</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Fixture property</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            className="rounded-md border px-3 py-2"
            onClick={() => setContextMenu(true)}
          >
            Open context menu
          </button>
        </div>

        <div data-board-viewport className="overflow-x-auto pb-8">
          <div className="flex min-w-max items-start">
            <BoardColumn
              groupKey="empty"
              label="Empty"
              rows={[]}
              {...columnProps}
            />
            <BoardColumn
              groupKey="one"
              label="One card"
              rows={oneCard}
              {...columnProps}
            />
            <BoardColumn
              groupKey="three"
              label="Three cards"
              rows={threeCards}
              {...columnProps}
            />
          </div>
        </div>
      </section>

      <ContextMenu
        open={contextMenu}
        x={260}
        y={120}
        onClose={() => setContextMenu(false)}
      >
        <ContextMenuItem label="Fixture action" />
      </ContextMenu>
    </main>
  );
}
