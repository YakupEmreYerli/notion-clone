import { v } from "convex/values";

// Şema ve mutation argümanlarının paylaştığı validator'lar — ikisinin
// birbirinden sapması derleme zamanında hiç mümkün olmasın diye tek yerde.

export const propertyTypeValidator = v.union(
  v.literal("text"),
  v.literal("select"),
  v.literal("multiSelect"),
);
export type PropertyType =
  | "text"
  | "select"
  | "multiSelect";

export const propertyOptionValidator = v.object({
  id: v.string(),
  label: v.string(),
  color: v.string(),
});

// text/url: string · select: option id · multiSelect: option id[]
export const cellValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.array(v.string()),
  v.null(),
);
