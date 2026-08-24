import { Doc } from "@/convex/_generated/dataModel";

export type PropertyType =
  | "text"
  | "select"
  | "multiSelect"
  | "checkbox"
  | "number"
  | "date"
  | "url"
  | "email"
  | "phone"
  | "person"
  | "relation"
  | "formula"
  | "files";
export type CellValue = string | number | boolean | string[] | null;

export type DatabaseProperty = Doc<"databaseProperties">;
export type DatabaseRow = Doc<"databaseRows">;
export type DatabaseView = Doc<"databaseViews">;
export type ViewCardOrder = Doc<"viewCardOrder">;

export interface PropertyOption {
  id: string;
  label: string;
  color: string;
}

export type ViewType = "table" | "board";

export type CardPreview = "none" | "cover" | "content";
export type CardSize = "small" | "medium" | "large";