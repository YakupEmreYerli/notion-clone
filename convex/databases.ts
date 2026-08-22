import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  requireOwnedDatabase,
  requireOwnedProperty,
  requireOwnedRow,
  requireReadableDatabase,
  requireUser,
} from "./lib/auth";
import { ORDER_GAP, orderBetween } from "./lib/ordering";
import { cellValueValidator, propertyTypeValidator } from "./lib/cellValue";
import { deleteDatabaseChildren } from "./lib/databaseCascade";

// getSchema ve getRows bilerek ayrı sorgular: birleşik olsaydı her hücre
// düzenlemesi sütun tanımlarını da geçersiz kılar, tüm başlıkları yeniden
// render eder ve açık bir select popover'ını etkileşim ortasında kapatırdı.

export const getSchema = query({
  args: { databaseId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireReadableDatabase(ctx, args.databaseId);

    return await ctx.db
      .query("databaseProperties")
      .withIndex("by_database_order", (q) =>
        q.eq("databaseId", args.databaseId),
      )
      .collect();
  },
});

export const getRows = query({
  args: { databaseId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireReadableDatabase(ctx, args.databaseId);

    return await ctx.db
      .query("databaseRows")
      .withIndex("by_database_order", (q) =>
        q.eq("databaseId", args.databaseId),
      )
      .collect();
  },
});

export const createDatabase = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const databaseId = await ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      userId,
      type: "database",
      fullWidth: true,
      showToc: false,
      isArchived: false,
      isPublished: false,
    });

    // Boş ekran karşılamasın: bir başlık sütunu + birkaç boş satırla seed'le.
    await ctx.db.insert("databaseProperties", {
      databaseId,
      userId,
      name: "Name",
      type: "text",
      order: 0,
      width: 240,
      isTitle: true,
    });

    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("databaseRows", {
        databaseId,
        userId,
        order: i * ORDER_GAP,
        cells: {},
      });
    }

    return databaseId;
  },
});

async function nextPropertyOrder(
  ctx: MutationCtx,
  databaseId: Id<"documents">,
  afterPropertyId: Id<"databaseProperties"> | undefined,
) {
  const properties = await ctx.db
    .query("databaseProperties")
    .withIndex("by_database_order", (q) => q.eq("databaseId", databaseId))
    .collect();

  // afterPropertyId verilmemişse en başa eklenir — çağıran taraf sona
  // eklemek istiyorsa son sütunun id'sini açıkça geçmeli.
  const afterIndex = afterPropertyId
    ? properties.findIndex((p) => p._id === afterPropertyId)
    : -1;

  const prev = afterIndex >= 0 ? properties[afterIndex] : undefined;
  const next = properties[afterIndex + 1];

  const order = orderBetween(prev?.order, next?.order);
  if (order !== null) return order;

  // Komşular birbirine çok yakın: tüm sütunları yeniden numaralandır.
  properties.sort((a, b) => a.order - b.order);
  await Promise.all(
    properties.map((p, i) => ctx.db.patch(p._id, { order: i * ORDER_GAP })),
  );
  const rebalancedPrev =
    afterIndex >= 0 ? afterIndex * ORDER_GAP : undefined;
  const rebalancedNext =
    afterIndex + 1 < properties.length
      ? (afterIndex + 1) * ORDER_GAP
      : undefined;
  return orderBetween(rebalancedPrev, rebalancedNext) ?? 0;
}

export const createProperty = mutation({
  args: {
    databaseId: v.id("documents"),
    type: propertyTypeValidator,
    name: v.optional(v.string()),
    afterPropertyId: v.optional(v.id("databaseProperties")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedDatabase(ctx, args.databaseId, userId);

    const order = await nextPropertyOrder(
      ctx,
      args.databaseId,
      args.afterPropertyId,
    );

    return await ctx.db.insert("databaseProperties", {
      databaseId: args.databaseId,
      userId,
      name: args.name ?? "Property",
      type: args.type,
      order,
      width: 180,
      options: args.type === "text" ? undefined : [],
    });
  },
});

export const renameProperty = mutation({
  args: { propertyId: v.id("databaseProperties"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedProperty(ctx, args.propertyId, userId);
    await ctx.db.patch(args.propertyId, { name: args.name });
  },
});

export const setPropertyWidth = mutation({
  args: { propertyId: v.id("databaseProperties"), width: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedProperty(ctx, args.propertyId, userId);
    await ctx.db.patch(args.propertyId, { width: args.width });
  },
});

export const reorderProperty = mutation({
  args: {
    propertyId: v.id("databaseProperties"),
    beforePropertyId: v.optional(v.id("databaseProperties")),
    afterPropertyId: v.optional(v.id("databaseProperties")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = await requireOwnedProperty(ctx, args.propertyId, userId);

    const [before, after] = await Promise.all([
      args.beforePropertyId ? ctx.db.get(args.beforePropertyId) : null,
      args.afterPropertyId ? ctx.db.get(args.afterPropertyId) : null,
    ]);

    let order = orderBetween(before?.order, after?.order);
    if (order === null) {
      const siblings = await ctx.db
        .query("databaseProperties")
        .withIndex("by_database_order", (q) =>
          q.eq("databaseId", property.databaseId),
        )
        .collect();
      siblings.sort((a, b) => a.order - b.order);
      await Promise.all(
        siblings.map((p, i) => ctx.db.patch(p._id, { order: i * ORDER_GAP })),
      );
      const beforeIndex = args.beforePropertyId
        ? siblings.findIndex((p) => p._id === args.beforePropertyId)
        : -1;
      const afterIndex = args.afterPropertyId
        ? siblings.findIndex((p) => p._id === args.afterPropertyId)
        : siblings.length;
      order =
        orderBetween(
          beforeIndex >= 0 ? beforeIndex * ORDER_GAP : undefined,
          afterIndex < siblings.length ? afterIndex * ORDER_GAP : undefined,
        ) ?? 0;
    }

    await ctx.db.patch(args.propertyId, { order });
  },
});

export const deleteProperty = mutation({
  args: { propertyId: v.id("databaseProperties") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = await requireOwnedProperty(ctx, args.propertyId, userId);

    if (property.isTitle) {
      const siblingCount = await ctx.db
        .query("databaseProperties")
        .withIndex("by_database_order", (q) =>
          q.eq("databaseId", property.databaseId),
        )
        .collect();
      if (siblingCount.length <= 1) {
        throw new Error("Database must have at least one property");
      }
    }

    await ctx.db.delete(args.propertyId);

    // Kemer + askı: süpürme birincil, ama renderer da orphan-toleranslı.
    const rows = await ctx.db
      .query("databaseRows")
      .withIndex("by_database_order", (q) =>
        q.eq("databaseId", property.databaseId),
      )
      .collect();

    if (rows.length > 2000) {
      // Çok büyük tablolarda mutation başına yazma limitini aşmamak için
      // süpürme atlanır; orphan-toleranslı render devreye girer.
      return;
    }

    await Promise.all(
      rows
        .filter((row) => args.propertyId in row.cells)
        .map((row) => {
          const cells = { ...row.cells };
          delete cells[args.propertyId];
          return ctx.db.patch(row._id, { cells });
        }),
    );
  },
});

async function nextRowOrder(
  ctx: MutationCtx,
  databaseId: Id<"documents">,
  afterRowId: Id<"databaseRows"> | undefined,
) {
  const rows = await ctx.db
    .query("databaseRows")
    .withIndex("by_database_order", (q) => q.eq("databaseId", databaseId))
    .collect();

  const afterIndex = afterRowId
    ? rows.findIndex((r) => r._id === afterRowId)
    : rows.length - 1;

  const prev = afterIndex >= 0 ? rows[afterIndex] : undefined;
  const next = rows[afterIndex + 1];

  const order = orderBetween(prev?.order, next?.order);
  if (order !== null) return order;

  rows.sort((a, b) => a.order - b.order);
  await Promise.all(
    rows.map((r, i) => ctx.db.patch(r._id, { order: i * ORDER_GAP })),
  );
  const rebalancedPrev = afterIndex >= 0 ? afterIndex * ORDER_GAP : undefined;
  const rebalancedNext =
    afterIndex + 1 < rows.length ? (afterIndex + 1) * ORDER_GAP : undefined;
  return orderBetween(rebalancedPrev, rebalancedNext) ?? 0;
}

export const createRow = mutation({
  args: {
    databaseId: v.id("documents"),
    afterRowId: v.optional(v.id("databaseRows")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedDatabase(ctx, args.databaseId, userId);

    const order = await nextRowOrder(ctx, args.databaseId, args.afterRowId);

    return await ctx.db.insert("databaseRows", {
      databaseId: args.databaseId,
      userId,
      order,
      cells: {},
    });
  },
});

export const deleteRow = mutation({
  args: { rowId: v.id("databaseRows") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedRow(ctx, args.rowId, userId);
    await ctx.db.delete(args.rowId);
  },
});

export const updateCell = mutation({
  args: {
    rowId: v.id("databaseRows"),
    propertyId: v.id("databaseProperties"),
    value: cellValueValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const row = await requireOwnedRow(ctx, args.rowId, userId);

    // `ctx.db.patch` sığ merge yapar: `cells` her patch'te komple
    // değiştiği için önce mevcut hücreleri okuyup üstüne yazıyoruz.
    const cells = { ...row.cells };
    const isEmpty =
      args.value === "" ||
      args.value === null ||
      (Array.isArray(args.value) && args.value.length === 0);

    if (isEmpty) {
      delete cells[args.propertyId];
    } else {
      cells[args.propertyId] = args.value;
    }

    await ctx.db.patch(args.rowId, { cells });
  },
});

// Bir database dokümanı kalıcı silinmeden hemen önce documents.remove /
// documents.removeAll tarafından çağrılır.
export async function cascadeDeleteDatabase(
  ctx: MutationCtx,
  documentId: Id<"documents">,
) {
  await deleteDatabaseChildren(ctx, documentId);
}
