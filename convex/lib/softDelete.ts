import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

// `databaseRows` ve `databaseProperties` soft-delete taşır (`deletedAt`):
// silme geri alınabilir olmalı ve kaydın `_id`'si yaşamalı, çünkü
// `databaseRows.cells` propertyId ile anahtarlı ve `viewCardOrder.rowId`
// satırı id'siyle referans ediyor. Bkz. convex/lib/history.ts.
//
// Aynısı `databaseViews` ve `viewCardOrder` için de geçerli: view'ın
// `_id`'si `viewCardOrder.viewId` tarafından referans ediliyor, sıra
// kaydının `_id`'si ise undo/redo'nun id kararlılığı için sabit kalmalı.
//
// Bu tablolardan okuyan HER yer bu yardımcılardan geçmeli — `.query(...)`
// doğrudan çağrıldığında silinmiş kayıtlar sızar. Tek istisna
// `databaseCascade.ts`: database kalıcı silinirken soft-delete edilmişler
// de gitmeli, orada bilinçli olarak filtresiz okunur.

export async function liveRows(
  ctx: QueryCtx | MutationCtx,
  databaseId: Id<"documents">,
): Promise<Doc<"databaseRows">[]> {
  const rows = await ctx.db
    .query("databaseRows")
    .withIndex("by_database_order", (q) => q.eq("databaseId", databaseId))
    .collect();
  return rows.filter((row) => row.deletedAt === undefined);
}

export async function liveProperties(
  ctx: QueryCtx | MutationCtx,
  databaseId: Id<"documents">,
): Promise<Doc<"databaseProperties">[]> {
  const properties = await ctx.db
    .query("databaseProperties")
    .withIndex("by_database_order", (q) => q.eq("databaseId", databaseId))
    .collect();
  return properties.filter((property) => property.deletedAt === undefined);
}

/** Silinmiş bir kayda yapılan yazma denemesini reddeder. */
export function assertLive<T extends { deletedAt?: number }>(
  doc: T,
  what: string,
): T {
  if (doc.deletedAt !== undefined) {
    throw new Error(`${what} not found`);
  }
  return doc;
}

export async function liveViews(
  ctx: QueryCtx | MutationCtx,
  databaseId: Id<"documents">,
): Promise<Doc<"databaseViews">[]> {
  const views = await ctx.db
    .query("databaseViews")
    .withIndex("by_database_position", (q) => q.eq("databaseId", databaseId))
    .collect();
  return views.filter((view) => view.deletedAt === undefined);
}

/** Bir view'ın (opsiyonel olarak tek grubunun) canlı sıra kayıtları. */
export async function liveViewOrders(
  ctx: QueryCtx | MutationCtx,
  viewId: Id<"databaseViews">,
  groupKey?: string,
): Promise<Doc<"viewCardOrder">[]> {
  const orders = await ctx.db
    .query("viewCardOrder")
    .withIndex("by_view_group_order", (q) =>
      groupKey === undefined
        ? q.eq("viewId", viewId)
        : q.eq("viewId", viewId).eq("groupKey", groupKey),
    )
    .collect();
  return orders.filter((order) => order.deletedAt === undefined);
}

/** Bir satırın tüm view'lardaki canlı sıra kayıtları. */
export async function liveRowOrders(
  ctx: QueryCtx | MutationCtx,
  rowId: Id<"databaseRows">,
): Promise<Doc<"viewCardOrder">[]> {
  const orders = await ctx.db
    .query("viewCardOrder")
    .withIndex("by_row", (q) => q.eq("rowId", rowId))
    .collect();
  return orders.filter((order) => order.deletedAt === undefined);
}
