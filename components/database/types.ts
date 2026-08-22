import { Doc } from "@/convex/_generated/dataModel";

export type PropertyType = "text" | "select" | "multiSelect";
export type CellValue = string | number | boolean | string[] | null;

export type DatabaseProperty = Doc<"databaseProperties">;
export type DatabaseRow = Doc<"databaseRows">;

export interface PropertyOption {
  id: string;
  label: string;
  color: string;
}
