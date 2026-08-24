import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

// `documents.getById` deseniyle birebir aynı sıra: yayınlanmış bir
// database, sahibi olmayan (hatta anonim) bir ziyaretçi için de
// auth kontrolünden ÖNCE döner. Bu sıra bozulursa /preview 401'e düşer.
export async function requireReadableDatabase(
  ctx: QueryCtx | MutationCtx,
  databaseId: Id<"documents">,
): Promise<Doc<"documents">> {
  const identity = await ctx.auth.getUserIdentity();

  const database = await ctx.db.get(databaseId);
  if (!database) {
    throw new Error("Database not found");
  }

  if (database.isPublished && !database.isArchived) {
    return database;
  }

  if (!identity) {
    throw new Error("Not authenticated");
  }

  if (database.userId !== identity.subject) {
    throw new Error("Not authorized");
  }

  return database;
}

export async function requireOwnedDatabase(
  ctx: QueryCtx | MutationCtx,
  databaseId: Id<"documents">,
  userId: string,
): Promise<Doc<"documents">> {
  const database = await ctx.db.get(databaseId);
  if (!database) {
    throw new Error("Database not found");
  }
  if (database.userId !== userId) {
    throw new Error("Not authorized");
  }
  if (database.type !== "database") {
    throw new Error("Not a database");
  }
  return database;
}

export async function requireOwnedProperty(
  ctx: QueryCtx | MutationCtx,
  propertyId: Id<"databaseProperties">,
  userId: string,
): Promise<Doc<"databaseProperties">> {
  const property = await ctx.db.get(propertyId);
  if (!property) {
    throw new Error("Property not found");
  }
  if (property.userId !== userId) {
    throw new Error("Not authorized");
  }
  return property;
}

export async function requireOwnedRow(
  ctx: QueryCtx | MutationCtx,
  rowId: Id<"databaseRows">,
  userId: string,
): Promise<Doc<"databaseRows">> {
  const row = await ctx.db.get(rowId);
  if (!row) {
    throw new Error("Row not found");
  }
  if (row.userId !== userId) {
    throw new Error("Not authorized");
  }
  return row;
}

export async function requireOwnedView(
  ctx: QueryCtx | MutationCtx,
  viewId: Id<"databaseViews">,
  userId: string,
): Promise<Doc<"databaseViews">> {
  const view = await ctx.db.get(viewId);
  if (!view) {
    throw new Error("View not found");
  }
  if (view.userId !== userId) {
    throw new Error("Not authorized");
  }
  return view;
}
