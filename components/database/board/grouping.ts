import {
  DatabaseProperty,
  DatabaseRow,
  ViewCardOrder,
} from "@/components/database/types";
import { GROUP_KEY_NONE } from "@/convex/lib/ordering";
import { sortByOrderThenId } from "@/convex/lib/ordering";

// Board gruplama mantığı — saf fonksiyonlar, React'ten bağımsız.
// Notion davranışı (ölçülen): kolon sırası option sırasını takip eder,
// "No <Property>" kolonu EN SONDA durur, kartlar (view, group) sırasını
// viewCardOrder'dan alır, sıra kaydı olmayan kartlar grubun sonuna (_id ile)
// düşer.

export interface BoardGroup {
  key: string;
  label: string;
  color?: string; // select option renk token'ı (badge/tint için)
  rows: DatabaseRow[];
}

export interface GroupingInput {
  rows: DatabaseRow[];
  property?: DatabaseProperty;
  orders: ViewCardOrder[];
  /** Manuel kolon sırası (group key listesi) — yoksa türetilir. */
  groupOrder?: string[];
  hiddenGroupKeys?: string[];
  hideEmptyGroups?: boolean;
  preserveRowOrder?: boolean;
}

const DATE_MS = { day: 86_400_000, week: 604_800_000 };

export function dateBucket(ts: number, now = Date.now()): string {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const today = startOfDay(now);
  const day = startOfDay(ts);
  if (day === today) return "today";
  if (day > today && day < today + DATE_MS.week) return "thisWeek";
  if (day >= today + DATE_MS.week && day < today + 2 * DATE_MS.week) {
    return "nextWeek";
  }
  if (day > today) return "later";
  return "past";
}

export const DATE_BUCKET_LABELS: Record<string, string> = {
  today: "Today",
  thisWeek: "This week",
  nextWeek: "Next week",
  later: "Later",
  past: "Past",
};

function groupKeyForRow(
  row: DatabaseRow,
  property: DatabaseProperty,
): string[] {
  const value = row.cells[property._id];
  switch (property.type) {
    case "select":
      return typeof value === "string" ? [value] : [];
    case "multiSelect":
      return Array.isArray(value) && value.length > 0 ? [value[0]] : [];
    case "checkbox":
      return typeof value === "boolean" ? [String(value)] : [];
    case "date":
      return typeof value === "number" && Number.isFinite(value)
        ? [dateBucket(value)]
        : [];
    case "person":
    case "relation":
    case "files":
      return Array.isArray(value) && value.length > 0 ? value : [];
    case "formula":
      return value == null || value === "" ? [] : [String(value)];
    default:
      // text/number/url/email/phone: Notion bunlarla gruplamaz — default grup.
      return [];
  }
}

function optionLabel(
  property: DatabaseProperty,
  key: string,
): { label: string; color?: string } {
  const option = property.options?.find((o) => o.id === key);
  if (option) return { label: option.label, color: option.color };
  if (key === "true") return { label: "Checked", color: "gray" };
  if (key === "false") return { label: "Unchecked", color: "gray" };
  if (key in DATE_BUCKET_LABELS) return { label: DATE_BUCKET_LABELS[key] };
  return { label: key };
}

function deriveColumnOrder(
  property: DatabaseProperty,
  rows: DatabaseRow[],
  manual?: string[],
): string[] {
  if (manual && manual.length > 0) return manual;
  switch (property.type) {
    case "select":
    case "multiSelect":
      return (property.options ?? []).map((o) => o.id);
    case "checkbox":
      return ["true", "false"];
    case "date":
      return ["today", "thisWeek", "nextWeek", "later", "past"];
    case "person":
    case "relation":
    case "files": {
      // Görünme sırasına göre (deterministik: (order,_id) ile gruplanmış).
      const seen = new Set<string>();
      for (const row of rows) {
        for (const key of groupKeyForRow(row, property)) seen.add(key);
      }
      return [...seen];
    }
    default:
      return [];
  }
}

function sortRowsByOrders(
  rows: DatabaseRow[],
  orders: ViewCardOrder[],
  groupKey: string,
): DatabaseRow[] {
  const byId = new Map(rows.map((r) => [r._id, r]));
  const orderMap = new Map(
    orders
      .filter((o) => o.groupKey === groupKey)
      .map((o) => [o.rowId, o.order] as const),
  );
  // Sırası olanlar order'a göre, olmayanlar grubun sonuna (_id ile).
  const withOrder: DatabaseRow[] = [];
  const withoutOrder: DatabaseRow[] = [];
  for (const row of rows) {
    if (orderMap.has(row._id)) withOrder.push(row);
    else withoutOrder.push(row);
  }
  const sorted = withOrder.sort(
    (a, b) => (orderMap.get(a._id) ?? 0) - (orderMap.get(b._id) ?? 0),
  );
  const fallback = [...withoutOrder].sort((a, b) => (a._id < b._id ? -1 : 1));
  return [...sorted, ...fallback];
}

export function buildGroups(input: GroupingInput): BoardGroup[] {
  const {
    rows,
    property,
    orders,
    groupOrder,
    hiddenGroupKeys,
    hideEmptyGroups,
    preserveRowOrder,
  } = input;
  const hidden = new Set(hiddenGroupKeys ?? []);
  const rowOrder = preserveRowOrder
    ? rows
    : (sortByOrderThenId(
        rows as { order: number; _id: unknown }[],
      ) as DatabaseRow[]);
  const orderRows = (groupRows: DatabaseRow[], groupKey: string) =>
    preserveRowOrder
      ? groupRows
      : sortRowsByOrders(groupRows, orders, groupKey);

  if (
    !property ||
    ![
      "select",
      "multiSelect",
      "checkbox",
      "date",
      "person",
      "relation",
      "files",
      "formula",
    ].includes(property.type)
  ) {
    // Grup-by yok veya gruplanamaz tip: tek varsayılan grup.
    const defaultRows = orderRows(rowOrder, GROUP_KEY_NONE);
    const noneLabel = property ? "Unassigned" : "All pages";
    const groups: BoardGroup[] = [];
    const hasRows = defaultRows.length > 0;
    if (!hideEmptyGroups || hasRows) {
      groups.push({ key: GROUP_KEY_NONE, label: noneLabel, rows: defaultRows });
    }
    return groups;
  }

  // Satırları anahtarlara dağıt (person/relation/files çoklu gruba girebilir).
  const buckets = new Map<string, DatabaseRow[]>();
  const noneBucket: DatabaseRow[] = [];
  for (const row of rowOrder) {
    const keys = groupKeyForRow(row, property);
    if (keys.length === 0) {
      noneBucket.push(row);
    } else {
      for (const key of keys) {
        const list = buckets.get(key) ?? [];
        list.push(row);
        buckets.set(key, list);
      }
    }
  }

  const columnOrder = deriveColumnOrder(property, rowOrder, groupOrder);
  const groups: BoardGroup[] = [];

  for (const key of columnOrder) {
    if (hidden.has(key)) continue;
    const groupRows = orderRows(buckets.get(key) ?? [], key);
    if (hideEmptyGroups && groupRows.length === 0) continue;
    const { label, color } = optionLabel(property, key);
    groups.push({ key, label, color, rows: groupRows });
  }

  // "No <Property>" en sonda.
  if (!hidden.has(GROUP_KEY_NONE)) {
    const noneRows = orderRows(noneBucket, GROUP_KEY_NONE);
    if (noneRows.length > 0) {
      groups.push({
        key: GROUP_KEY_NONE,
        label: "Unassigned",
        rows: noneRows,
      });
    }
  }

  return groups;
}
