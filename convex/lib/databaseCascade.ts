import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

// Bir database dokümanı kalıcı olarak silinmeden önce çağrılmalı.
// Satırlar/sütunlar/view'lar `documents` ağacının parçası değil — bu
// çağrılmazsa onlara ulaşan başka hiçbir yol kalmaz, veritabanında sonsuza
// dek yetim kayıt olarak kalırlar.
export async function deleteDatabaseChildren(
  ctx: MutationCtx,
  databaseId: Id<"documents">,
) {
  const [properties, rows, views] = await Promise.all([
    ctx.db
      .query("databaseProperties")
      .withIndex("by_database_order", (q) => q.eq("databaseId", databaseId))
      .collect(),
    ctx.db
      .query("databaseRows")
      .withIndex("by_database_order", (q) => q.eq("databaseId", databaseId))
      .collect(),
    ctx.db
      .query("databaseViews")
      .withIndex("by_database_position", (q) => q.eq("databaseId", databaseId))
      .collect(),
  ]);

  // View'ların sıra kayıtları: viewId veya databaseId üzerinden ulaşılabilir —
  // databaseId tutarlı eşleşme için en güvenlisi.
  const orders = await Promise.all(
    views.map((view) =>
      ctx.db
        .query("viewCardOrder")
        .withIndex("by_view_group_order", (q) => q.eq("viewId", view._id))
        .collect(),
    ),
  );

  await Promise.all([
    ...properties.map((property) => ctx.db.delete(property._id)),
    ...rows.map((row) => ctx.db.delete(row._id)),
    ...views.map((view) => ctx.db.delete(view._id)),
    ...orders.flat().map((order) => ctx.db.delete(order._id)),
  ]);
}