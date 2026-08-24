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
import { DatabaseProperty, DatabaseRow } from "@/components/database/types";
import { Id } from "@/convex/_generated/dataModel";

const databaseId = "fixture-database" as Id<"documents">;
const titleId = "fixture-title" as Id<"databaseProperties">;
const authorId = "fixture-author" as Id<"databaseProperties">;
const statusId = "fixture-status" as Id<"databaseProperties">;

const titleProperty = {
  _id: titleId,
  _creationTime: 1,
  databaseId,
  userId: "fixture",
  name: "Title",
  type: "text",
  order: 0,
  isTitle: true,
} satisfies DatabaseProperty;

const visibleProperties = [
  {
    _id: authorId,
    _creationTime: 2,
    databaseId,
    userId: "fixture",
    name: "Author",
    type: "text",
    order: 1,
  },
  {
    _id: statusId,
    _creationTime: 3,
    databaseId,
    userId: "fixture",
    name: "Status",
    type: "select",
    order: 2,
    options: [{ id: "next", label: "Next", color: "gray" }],
  },
] satisfies DatabaseProperty[];

function row(index: number, title: string, author: string): DatabaseRow {
  return {
    _id: `fixture-row-${index}` as Id<"databaseRows">,
    _creationTime: index,
    databaseId,
    userId: "fixture",
    order: index,
    cells: {
      [titleId]: title,
      [authorId]: author,
      [statusId]: "next",
    },
  };
}

const oneCard = [
  row(
    1,
    "A deliberately long title that wraps without cutting the card radius",
    "Fixture Author",
  ),
];
const threeCards = [
  row(2, "First card", "Ada Lovelace"),
  row(3, "Second card", "Grace Hopper"),
  row(4, "Last card", "Margaret Hamilton"),
];

export function ClippingFixture() {
  const [contextMenu, setContextMenu] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);

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
              titleProperty={titleProperty}
              visibleProperties={visibleProperties}
              onOpenRow={() => {}}
              onAddCard={() => {}}
              onDragPointerDown={dragEnabled ? () => {} : undefined}
            />
            <BoardColumn
              groupKey="one"
              label="One card"
              rows={oneCard}
              titleProperty={titleProperty}
              visibleProperties={visibleProperties}
              onOpenRow={() => {}}
              onAddCard={() => {}}
              onDragPointerDown={dragEnabled ? () => {} : undefined}
            />
            <BoardColumn
              groupKey="three"
              label="Three cards"
              rows={threeCards}
              titleProperty={titleProperty}
              visibleProperties={visibleProperties}
              onOpenRow={() => {}}
              onAddCard={() => {}}
              onDragPointerDown={dragEnabled ? () => {} : undefined}
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
