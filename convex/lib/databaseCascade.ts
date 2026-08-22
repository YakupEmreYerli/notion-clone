import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

// Bir database dokümanı kalıcı olarak silinmeden önce çağrılmalı.
// Satırlar/sütunlar `documents` ağacının parçası değil — bu çağrılmazsa
// onlara ulaşan başka hiçbir yol kalmaz, veritabanında sonsuza dek yetim
// kayıt olarak kalırlar.
export async function deleteDatabaseChildren(
  ctx: MutationCtx,
  databaseId: Id<"documents">,
) {
  const [properties, rows] = await Promise.all([
    ctx.db
      .query("databaseProperties")
      .withIndex("by_database_order", (q) => q.eq("databaseId", databaseId))
      .collect(),
    ctx.db
      .query("databaseRows")
      .withIndex("by_database_order", (q) => q.eq("databaseId", databaseId))
      .collect(),
  ]);

  await Promise.all([
    ...properties.map((property) => ctx.db.delete(property._id)),
    ...rows.map((row) => ctx.db.delete(row._id)),
  ]);
}
