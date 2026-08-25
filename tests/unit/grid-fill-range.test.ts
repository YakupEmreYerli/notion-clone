import { describe, expect, it } from "vitest";

import { getFillRange, type FillSelection } from "@/components/database/use-grid-selection";
import type { DatabaseProperty, DatabaseRow } from "@/components/database/types";

const rows = (["r1", "r2", "r3", "r4"] as const).map<DatabaseRow>((id, index) => ({
  _id: id as DatabaseRow["_id"],
  _creationTime: index + 1,
  databaseId: "db" as DatabaseRow["databaseId"],
  userId: "u",
  order: index,
  cells: {},
}));

const fill = (rowId: string, targetRowId: string): FillSelection => ({
  rowId: rowId as DatabaseRow["_id"],
  propertyId: "p" as DatabaseProperty["_id"],
  targetRowId: targetRowId as DatabaseRow["_id"],
});

describe("getFillRange", () => {
  it("returns rows from source to target going down", () => {
    const result = getFillRange(rows, fill("r1", "r3"));
    expect(result?.map((r) => r._id)).toEqual(["r1", "r2", "r3"]);
  });

  it("normalizes order when dragging upward", () => {
    const result = getFillRange(rows, fill("r3", "r1"));
    expect(result?.map((r) => r._id)).toEqual(["r1", "r2", "r3"]);
  });

  it("returns a single row for a self-target", () => {
    const result = getFillRange(rows, fill("r2", "r2"));
    expect(result?.map((r) => r._id)).toEqual(["r2"]);
  });

  it("returns null when rows are not found", () => {
    expect(getFillRange(rows, fill("r1", "ghost"))).toBeNull();
    expect(getFillRange(rows, fill("ghost", "r2"))).toBeNull();
  });
});
