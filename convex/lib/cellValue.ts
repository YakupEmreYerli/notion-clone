import { v } from "convex/values";

// Şema ve mutation argümanlarının paylaştığı validator'lar — ikisinin
// birbirinden sapması derleme zamanında hiç mümkün olmasın diye tek yerde.

export const propertyTypeValidator = v.union(
  v.literal("text"),
  v.literal("select"),
  v.literal("multiSelect"),
  v.literal("checkbox"),
  v.literal("number"),
  v.literal("date"),
  v.literal("url"),
  v.literal("email"),
  v.literal("phone"),
  v.literal("person"),
  v.literal("relation"),
  v.literal("formula"),
  v.literal("files"),
);
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

export const propertyOptionValidator = v.object({
  id: v.string(),
  label: v.string(),
  color: v.string(),
});

// Hücre değer şemaları (tip → saklanan değer):
// text/url/email/phone/formula: string
// select: option id (string)
// multiSelect/person/relation/files: string[] (id'ler / user id'ler / storage key'ler)
// checkbox: boolean
// number/date: number (date = epoch ms)
// Boş = anahtarı cells'de olmamak (hiçbir zaman null yazılmaz, updateCell siler).
// Mevcut union bu tiplerin tamamını karşılıyor — schema değişikliği gerektirmez.
export const cellValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.array(v.string()),
  v.null(),
);
