import type { Id } from "@/convex/_generated/dataModel";

import type {
  CellValue,
  DatabaseProperty,
  DatabaseRow,
} from "./types";

export const FILTER_OPERATORS = [
  "contains",
  "doesNotContain",
  "equals",
  "notEquals",
  "greaterThan",
  "lessThan",
  "isEmpty",
  "isNotEmpty",
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];
export type SortDirection = "asc" | "desc";

export interface DatabaseFilter {
  id: string;
  propertyId: Id<"databaseProperties">;
  operator: FilterOperator;
  value?: CellValue;
}

export interface DatabaseSort {
  id: string;
  propertyId: Id<"databaseProperties">;
  direction: SortDirection;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCellValue(value: unknown): value is CellValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

export function parseViewFilters(value: unknown): DatabaseFilter[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.propertyId !== "string" ||
      typeof entry.operator !== "string" ||
      !FILTER_OPERATORS.includes(entry.operator as FilterOperator) ||
      (entry.value !== undefined && !isCellValue(entry.value))
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        propertyId: entry.propertyId as Id<"databaseProperties">,
        operator: entry.operator as FilterOperator,
        ...(entry.value !== undefined ? { value: entry.value } : {}),
      },
    ];
  });
}

export function parseViewSorts(value: unknown): DatabaseSort[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.propertyId !== "string" ||
      (entry.direction !== "asc" && entry.direction !== "desc")
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        propertyId: entry.propertyId as Id<"databaseProperties">,
        direction: entry.direction,
      },
    ];
  });
}

export function isCellEmpty(value: CellValue | undefined): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function isFilterEffective(filter: DatabaseFilter): boolean {
  if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") {
    return true;
  }
  return !isCellEmpty(filter.value);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function optionIndex(property: DatabaseProperty, optionId: string): number {
  const index = property.options?.findIndex((option) => option.id === optionId);
  return index === undefined || index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function displayValue(
  property: DatabaseProperty,
  value: CellValue | undefined,
): string {
  if (isCellEmpty(value)) return "";

  if (property.type === "select" && typeof value === "string") {
    return (
      property.options?.find((option) => option.id === value)?.label ?? value
    );
  }

  if (property.type === "multiSelect" && Array.isArray(value)) {
    return value
      .map(
        (id) =>
          property.options?.find((option) => option.id === id)?.label ?? id,
      )
      .join(" ");
  }

  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "boolean") return value ? "checked true" : "unchecked false";
  if (property.type === "date" && typeof value === "number") {
    return `${new Date(value).toLocaleDateString()} ${new Date(value).toISOString()}`;
  }
  return String(value);
}

function comparableValue(
  property: DatabaseProperty,
  value: CellValue | undefined,
): string | number | boolean | undefined {
  if (isCellEmpty(value)) return undefined;

  if (property.type === "select" && typeof value === "string") {
    return optionIndex(property, value);
  }
  if (property.type === "multiSelect" && Array.isArray(value)) {
    return value.length > 0 ? optionIndex(property, value[0]) : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  return normalizeText(displayValue(property, value));
}

function equalsValue(
  property: DatabaseProperty,
  actual: CellValue | undefined,
  expected: CellValue | undefined,
): boolean {
  if (
    property.type === "date" &&
    typeof actual === "number" &&
    typeof expected === "number"
  ) {
    return new Date(actual).toDateString() === new Date(expected).toDateString();
  }
  if (Array.isArray(actual)) {
    if (Array.isArray(expected)) {
      return (
        actual.length === expected.length &&
        actual.every((item, index) => item === expected[index])
      );
    }
    return typeof expected === "string" && actual.includes(expected);
  }
  if (typeof actual === "string" && typeof expected === "string") {
    if (property.type === "select") return actual === expected;
    return normalizeText(actual) === normalizeText(expected);
  }
  return actual === expected;
}

function rowMatchesFilter(
  row: DatabaseRow,
  property: DatabaseProperty,
  filter: DatabaseFilter,
): boolean {
  const actual = row.cells[property._id];

  if (filter.operator === "isEmpty") return isCellEmpty(actual);
  if (filter.operator === "isNotEmpty") return !isCellEmpty(actual);
  if (filter.value === undefined || filter.value === "") return true;
  if (filter.operator === "equals") {
    return equalsValue(property, actual, filter.value);
  }
  if (filter.operator === "notEquals") {
    return !equalsValue(property, actual, filter.value);
  }

  if (filter.operator === "contains" || filter.operator === "doesNotContain") {
    const contains = Array.isArray(actual)
      ? typeof filter.value === "string" && actual.includes(filter.value)
      : normalizeText(displayValue(property, actual)).includes(
          normalizeText(String(filter.value ?? "")),
        );
    return filter.operator === "contains" ? contains : !contains;
  }

  const left = comparableValue(property, actual);
  const right =
    typeof filter.value === "number"
      ? filter.value
      : Number(filter.value ?? Number.NaN);
  if (typeof left !== "number" || !Number.isFinite(right)) return false;
  return filter.operator === "greaterThan" ? left > right : left < right;
}

export function compareDatabaseRows(
  left: DatabaseRow,
  right: DatabaseRow,
  properties: DatabaseProperty[],
  sorts: DatabaseSort[],
): number {
  const propertyById = new Map(
    properties.map((property) => [property._id, property]),
  );

  for (const sort of sorts) {
    const property = propertyById.get(sort.propertyId);
    if (!property) continue;
    const leftValue = comparableValue(property, left.cells[property._id]);
    const rightValue = comparableValue(property, right.cells[property._id]);

    if (leftValue === undefined && rightValue === undefined) continue;
    if (leftValue === undefined) return 1;
    if (rightValue === undefined) return -1;

    let comparison = 0;
    if (typeof leftValue === "string" && typeof rightValue === "string") {
      comparison = leftValue.localeCompare(rightValue);
    } else if (leftValue < rightValue) comparison = -1;
    else if (leftValue > rightValue) comparison = 1;

    if (comparison !== 0) return sort.direction === "asc" ? comparison : -comparison;
  }

  if (left.order !== right.order) return left.order - right.order;
  return String(left._id).localeCompare(String(right._id));
}

export function applyDatabaseView(
  rows: DatabaseRow[],
  properties: DatabaseProperty[],
  filters: DatabaseFilter[],
  sorts: DatabaseSort[],
  searchQuery: string,
): DatabaseRow[] {
  const propertyById = new Map(
    properties.map((property) => [property._id, property]),
  );
  const query = normalizeText(searchQuery);

  const matchingRows = rows.filter((row) => {
    const matchesSearch =
      query.length === 0 ||
      properties.some((property) =>
        normalizeText(displayValue(property, row.cells[property._id])).includes(
          query,
        ),
      );
    if (!matchesSearch) return false;

    return filters.every((filter) => {
      const property = propertyById.get(filter.propertyId);
      return property ? rowMatchesFilter(row, property, filter) : true;
    });
  });

  return sorts.length > 0
    ? [...matchingRows].sort((left, right) =>
        compareDatabaseRows(left, right, properties, sorts),
      )
    : matchingRows;
}
