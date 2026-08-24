import { expect, test } from "@playwright/test";

import {
  applyDatabaseView,
  isFilterEffective,
  parseViewFilters,
  parseViewSorts,
  type DatabaseFilter,
  type DatabaseSort,
} from "@/components/database/view-operations";
import { buildGroups } from "@/components/database/board/grouping";
import { orderBoardProperties } from "@/components/database/board/board-properties";
import { groupColorVars } from "@/components/database/board/board-colors";
import type {
  DatabaseProperty,
  DatabaseRow,
} from "@/components/database/types";
import type { Id } from "@/convex/_generated/dataModel";
import { isPropertyIconId, PROPERTY_ICONS } from "@/lib/property-icons";

const databaseId = "database" as Id<"documents">;
const titleId = "title" as Id<"databaseProperties">;
const authorId = "author" as Id<"databaseProperties">;
const statusId = "status" as Id<"databaseProperties">;
const scoreId = "score" as Id<"databaseProperties">;

const properties = [
  {
    _id: titleId,
    _creationTime: 1,
    databaseId,
    userId: "user",
    name: "Title",
    type: "text",
    order: 0,
    isTitle: true,
  },
  {
    _id: authorId,
    _creationTime: 2,
    databaseId,
    userId: "user",
    name: "Author",
    type: "text",
    order: 1,
  },
  {
    _id: statusId,
    _creationTime: 3,
    databaseId,
    userId: "user",
    name: "Status",
    type: "select",
    order: 2,
    options: [
      { id: "next", label: "Sıradaki", color: "yellow" },
      { id: "reading", label: "Okunuyor", color: "blue" },
    ],
  },
  {
    _id: scoreId,
    _creationTime: 4,
    databaseId,
    userId: "user",
    name: "Score",
    type: "number",
    order: 3,
  },
] satisfies DatabaseProperty[];

function row(
  id: string,
  order: number,
  cells: DatabaseRow["cells"],
): DatabaseRow {
  return {
    _id: id as Id<"databaseRows">,
    _creationTime: order,
    databaseId,
    userId: "user",
    order,
    cells,
  };
}

const rows = [
  row("row-1", 1, {
    [titleId]: "Atomik Alışkanlıklar",
    [authorId]: "James Clear",
    [statusId]: "next",
    [scoreId]: 9,
  }),
  row("row-2", 2, {
    [titleId]: "Zengin Baba Yoksul Baba",
    [authorId]: "Robert Kiyosaki",
    [statusId]: "reading",
    [scoreId]: 7,
  }),
  row("row-3", 3, {
    [titleId]: "Dost Kazanma Sanatı",
    [authorId]: "Dale Carnegie",
    [statusId]: "next",
  }),
];

test.describe("database view operations", () => {
  test("searches human-readable property values, including select labels", () => {
    expect(applyDatabaseView(rows, properties, [], [], "okunuyor")).toEqual([
      rows[1],
    ]);
    expect(applyDatabaseView(rows, properties, [], [], "james clear")).toEqual([
      rows[0],
    ]);
  });

  test("combines property-aware filters with AND semantics", () => {
    const filters: DatabaseFilter[] = [
      {
        id: "author-filter",
        propertyId: authorId,
        operator: "contains",
        value: "clear",
      },
      {
        id: "status-filter",
        propertyId: statusId,
        operator: "equals",
        value: "next",
      },
    ];

    expect(applyDatabaseView(rows, properties, filters, [], "")).toEqual([
      rows[0],
    ]);
  });

  test("only treats filters with a usable condition as effective", () => {
    expect(
      isFilterEffective({
        id: "empty-value",
        propertyId: titleId,
        operator: "contains",
      }),
    ).toBe(false);
    expect(
      isFilterEffective({
        id: "with-value",
        propertyId: titleId,
        operator: "contains",
        value: "Dost",
      }),
    ).toBe(true);
    expect(
      isFilterEffective({
        id: "empty-operator",
        propertyId: titleId,
        operator: "isEmpty",
      }),
    ).toBe(true);
  });

  test("sorts by multiple properties and always places empty values last", () => {
    const sorts: DatabaseSort[] = [
      { id: "status-sort", propertyId: statusId, direction: "asc" },
      { id: "score-sort", propertyId: scoreId, direction: "desc" },
    ];

    expect(applyDatabaseView(rows, properties, [], sorts, "")).toEqual([
      rows[0],
      rows[2],
      rows[1],
    ]);
  });

  test("treats false and zero as values, not empty cells", () => {
    const checkboxId = "done" as Id<"databaseProperties">;
    const checkbox = {
      _id: checkboxId,
      _creationTime: 5,
      databaseId,
      userId: "user",
      name: "Done",
      type: "checkbox",
      order: 4,
    } satisfies DatabaseProperty;
    const filter: DatabaseFilter = {
      id: "empty-filter",
      propertyId: checkboxId,
      operator: "isEmpty",
    };

    expect(
      applyDatabaseView(
        [row("false-row", 1, { [checkboxId]: false }), row("empty-row", 2, {})],
        [...properties, checkbox],
        [filter],
        [],
        "",
      ).map((item) => item._id),
    ).toEqual(["empty-row"]);
  });

  test("preserves property-sort order inside board groups", () => {
    const sortedRows = [rows[2], rows[0], rows[1]];
    const groups = buildGroups({
      rows: sortedRows,
      property: properties[2],
      orders: [],
      preserveRowOrder: true,
    });

    expect(groups.find((group) => group.key === "next")?.rows).toEqual([
      rows[2],
      rows[0],
    ]);
  });

  test("uses Notion card property priority when a view has no saved order", () => {
    expect(
      orderBoardProperties(properties, undefined, statusId).map(
        (property) => property._id,
      ),
    ).toEqual([statusId, authorId, scoreId]);
    expect(
      orderBoardProperties(properties, [authorId, statusId], statusId).map(
        (property) => property._id,
      ),
    ).toEqual([authorId, statusId]);
    expect(
      orderBoardProperties(properties, [], statusId).map(
        (property) => property._id,
      ),
    ).toEqual([statusId, authorId, scoreId]);
  });

  test("maps yellow groups to a dedicated tinted card surface", () => {
    expect(groupColorVars("yellow").actionFg).toBe(
      "var(--kanban-yellow-action-fg)",
    );
    expect(groupColorVars("yellow").cardBg).toBe(
      "var(--kanban-yellow-card-bg)",
    );
    expect(groupColorVars("yellow").cardBgHover).toBe(
      "var(--kanban-yellow-card-bg-hover)",
    );
  });

  test("keeps the persisted property icon catalog unique and validated", () => {
    const ids = PROPERTY_ICONS.map((icon) => icon.id);
    expect(ids.length).toBeGreaterThanOrEqual(815);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isPropertyIconId("camera")).toBe(true);
    expect(isPropertyIconId("notion:vitruvian-man-circle")).toBe(true);
    expect(isPropertyIconId("notion-private-asset")).toBe(false);
  });

  test("drops malformed and stale persisted criteria defensively", () => {
    expect(
      parseViewFilters([
        null,
        { id: "bad", propertyId: 42, operator: "contains" },
        {
          id: "valid",
          propertyId: authorId,
          operator: "contains",
          value: "Ada",
        },
      ]),
    ).toEqual([
      {
        id: "valid",
        propertyId: authorId,
        operator: "contains",
        value: "Ada",
      },
    ]);
    expect(
      parseViewSorts([
        { propertyId: statusId, direction: "sideways" },
        { id: "valid", propertyId: scoreId, direction: "desc" },
      ]),
    ).toEqual([{ id: "valid", propertyId: scoreId, direction: "desc" }]);
  });
});
