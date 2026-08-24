import { describe, expect, it } from "vitest";

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
import { isPropertyIconId, PROPERTY_ICONS } from "@/lib/property-icons";
import { databaseBuilder } from "@/tests/support/data/database-builder";

const books = databaseBuilder("books")
  .withTitle("Title")
  .withText("Author")
  .withSelect("Status", [
    { id: "next", label: "Sıradaki", color: "yellow" },
    { id: "reading", label: "Okunuyor", color: "blue" },
  ])
  .withNumber("Score")
  .withRows(
    {
      Title: "Atomik Alışkanlıklar",
      Author: "James Clear",
      Status: "next",
      Score: 9,
    },
    {
      Title: "Zengin Baba Yoksul Baba",
      Author: "Robert Kiyosaki",
      Status: "reading",
      Score: 7,
    },
    { Title: "Dost Kazanma Sanatı", Author: "Dale Carnegie", Status: "next" },
  )
  .build();

const { properties, rows } = books;
const titleId = books.propertyId("Title");
const authorId = books.propertyId("Author");
const statusId = books.propertyId("Status");
const scoreId = books.propertyId("Score");

describe("database view operations", () => {
  it("searches human-readable property values, including select labels", () => {
    expect(applyDatabaseView(rows, properties, [], [], "okunuyor")).toEqual([
      rows[1],
    ]);
    expect(applyDatabaseView(rows, properties, [], [], "james clear")).toEqual([
      rows[0],
    ]);
  });

  it("combines property-aware filters with AND semantics", () => {
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

  it("only treats filters with a usable condition as effective", () => {
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

  it("sorts by multiple properties and always places empty values last", () => {
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

  it("treats false and zero as values, not empty cells", () => {
    const tasks = databaseBuilder("tasks")
      .withTitle("Title")
      .withCheckbox("Done")
      .withRows({ Done: false }, {})
      .build();
    const filter: DatabaseFilter = {
      id: "empty-filter",
      propertyId: tasks.propertyId("Done"),
      operator: "isEmpty",
    };

    // `false` bir değerdir, boş hücre değil: yalnızca ikinci satır elenmeli.
    expect(
      applyDatabaseView(
        tasks.rows,
        tasks.properties,
        [filter],
        [],
        "",
      ).map((item) => item._id),
    ).toEqual([tasks.rows[1]._id]);
  });

  it("preserves property-sort order inside board groups", () => {
    const sortedRows = [rows[2], rows[0], rows[1]];
    const groups = buildGroups({
      rows: sortedRows,
      property: books.property("Status"),
      orders: [],
      preserveRowOrder: true,
    });

    expect(groups.find((group) => group.key === "next")?.rows).toEqual([
      rows[2],
      rows[0],
    ]);
  });

  it("uses Notion card property priority when a view has no saved order", () => {
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

  it("maps yellow groups to a dedicated tinted card surface", () => {
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

  it("keeps the persisted property icon catalog unique and validated", () => {
    const ids = PROPERTY_ICONS.map((icon) => icon.id);
    expect(ids.length).toBeGreaterThanOrEqual(815);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isPropertyIconId("camera")).toBe(true);
    expect(isPropertyIconId("notion:vitruvian-man-circle")).toBe(true);
    expect(isPropertyIconId("notion-private-asset")).toBe(false);
  });

  it("drops malformed and stale persisted criteria defensively", () => {
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
