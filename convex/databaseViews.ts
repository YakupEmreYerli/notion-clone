import { v } from "convex/values";
import { internalMutation, mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  requireOwnedDatabase,
  requireOwnedRow,
  requireOwnedView,
  requireReadableDatabase,
  requireUser,
} from "./lib/auth";
import {
  GROUP_KEY_NONE,
  ORDER_GAP,
  REBALANCE_WRITE_LIMIT,
  orderBetween,
  sortByOrderThenId,
  sortByPositionThenId,
} from "./lib/ordering";

// Board (ve ileride gallery/list) görünümlerinin backend'i. View ayarları
// view kaydında, kart sırası viewCardOrder'da; ikisi de database dokümanından
// bağımsız yaşar. Sıralama tek kurala bağlı: her yerde (order, _id) —
// Convex ikincil sıralama yapmadığı için tiebreak'i kendimiz yapıyoruz.

// --- Queries ---

export const getViews = query({
  args: { databaseId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireReadableDatabase(ctx, args.databaseId);

    return sortByPositionThenId(
      await ctx.db
        .query("databaseViews")
        .withIndex("by_database_position", (q) =>
          q.eq("databaseId", args.databaseId),
        )
        .collect(),
    );
  },
});

export const getViewOrders = query({
  args: { viewId: v.id("databaseViews") },
  handler: async (ctx, args) => {
    const view = await ctx.db.get(args.viewId);
    if (!view) throw new Error("View not found");

    // Published-before-auth: yayınlanmış database'in board'u anonim okunabilir.
    await requireReadableDatabase(ctx, view.databaseId);

    return sortByOrderThenId(
      await ctx.db
        .query("viewCardOrder")
        .withIndex("by_view_group_order", (q) => q.eq("viewId", args.viewId))
        .collect(),
    );
  },
});

// --- Yardımcılar ---

type OrderEntry = {
  _id: Id<"viewCardOrder">;
  viewId: Id<"databaseViews">;
  databaseId: Id<"documents">;
  userId: string;
  groupKey: string;
  rowId: Id<"databaseRows">;
  order: number;
};

async function fetchGroupOrders(
  ctx: MutationCtx,
  viewId: Id<"databaseViews">,
  groupKey: string,
): Promise<OrderEntry[]> {
  return sortByOrderThenId(
    await ctx.db
      .query("viewCardOrder")
      .withIndex("by_view_group_order", (q) =>
        q.eq("viewId", viewId).eq("groupKey", groupKey),
      )
      .collect(),
  );
}

// Komşular birbirine çok yakınsa (orderBetween null) insertion çevresindeki
// PAKETLENMİŞ run'ı bul: ardışık boşluklar PACKED_THRESHOLD altındaki
// kesintisiz sıra. Gerçekte run ~30 satırı geçmez (GAP=1024, MIN_GAP=1e-4 →
// aynı iki kart arasına ~24 ardışık insertte precision tükenir); cap
// yalnızca patolojik durumlar için güvenlik ağıdır.
const PACKED_THRESHOLD = 1e-2;

function findPackedRun(
  orders: OrderEntry[],
  slotBeforeIdx: number,
): { start: number; end: number } | null {
  // slotBeforeIdx: insert'in öncesindeki satırın index'i (-1 => run en başta).
  let start = slotBeforeIdx < 0 ? 0 : slotBeforeIdx;
  let end = slotBeforeIdx + 1;
  while (
    start > 0 &&
    orders[start].order - orders[start - 1].order < PACKED_THRESHOLD
  ) {
    start--;
  }
  while (
    end < orders.length - 1 &&
    orders[end + 1].order - orders[end].order < PACKED_THRESHOLD
  ) {
    end++;
  }
  // Slot'un kendisi de sıkışık olmalı (yoksa buraya düşmezdik) — run en az 2 satır.
  if (end - start < 1) return null;
  return { start, end };
}

// Run'ı dış sınırlar arasında eşit aralıklarla yeniden yazar; yeni kartın
// order'ını da hesaplar. Run REBALANCE_WRITE_LIMIT'i aşarsa chunked döner
// (kullanıcı `rebalanceGroupChunk`'ı sürüp move'u tekrar dener).
function respaceRun(
  orders: OrderEntry[],
  run: { start: number; end: number },
  slotBeforeIdx: number,
): { patches: [Id<"viewCardOrder">, number][]; insertOrder: number } | { chunked: true } {
  const runLen = run.end - run.start + 1;
  if (runLen > REBALANCE_WRITE_LIMIT) return { chunked: true };

  const beforeOrder = run.start > 0 ? orders[run.start - 1].order : undefined;
  const afterOrder = run.end < orders.length - 1 ? orders[run.end + 1].order : undefined;

  let base: number;
  let span: number;
  if (beforeOrder !== undefined && afterOrder !== undefined) {
    base = beforeOrder;
    span = afterOrder - beforeOrder;
  } else if (beforeOrder !== undefined) {
    base = beforeOrder;
    span = (runLen + 1) * ORDER_GAP;
  } else if (afterOrder !== undefined) {
    base = afterOrder - (runLen + 1) * ORDER_GAP;
    span = (runLen + 1) * ORDER_GAP;
  } else {
    // Tüm grup bu run — 0'dan başlayan kanonik dizi.
    base = 0;
    span = (runLen + 1) * ORDER_GAP;
  }

  const patches: [Id<"viewCardOrder">, number][] = [];
  for (let j = run.start; j <= run.end; j++) {
    patches.push([orders[j]._id, base + (span * (j - run.start + 1)) / (runLen + 1)]);
  }
  const slotInRun = slotBeforeIdx < 0 ? 0 : slotBeforeIdx - run.start + 1;
  const insertOrder = base + (span * slotInRun) / (runLen + 1);
  return { patches, insertOrder };
}

async function nextViewPosition(
  ctx: MutationCtx,
  databaseId: Id<"documents">,
  afterViewId: Id<"databaseViews"> | undefined,
): Promise<number> {
  const views = sortByPositionThenId(
    await ctx.db
      .query("databaseViews")
      .withIndex("by_database_position", (q) => q.eq("databaseId", databaseId))
      .collect(),
  );
  const afterIndex = afterViewId
    ? views.findIndex((w) => w._id === afterViewId)
    : views.length - 1;
  const prev = afterIndex >= 0 ? views[afterIndex] : undefined;
  const next = views[afterIndex + 1];
  const order = orderBetween(prev?.position, next?.position);
  if (order !== null) return order;

  // Tüm view'ları yeniden numaralandır (view sayısı küçüktür — O(n) zararsız).
  await Promise.all(
    views.map((w, i) => ctx.db.patch(w._id, { position: i * ORDER_GAP })),
  );
  const rebalancedPrev = afterIndex >= 0 ? afterIndex * ORDER_GAP : undefined;
  const rebalancedNext =
    afterIndex + 1 < views.length ? (afterIndex + 1) * ORDER_GAP : undefined;
  return orderBetween(rebalancedPrev, rebalancedNext) ?? 0;
}

// --- View CRUD ---

export const createView = mutation({
  args: {
    databaseId: v.id("documents"),
    type: v.union(v.literal("table"), v.literal("board")),
    name: v.optional(v.string()),
    afterViewId: v.optional(v.id("databaseViews")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedDatabase(ctx, args.databaseId, userId);

    const position = await nextViewPosition(ctx, args.databaseId, args.afterViewId);

    return await ctx.db.insert("databaseViews", {
      databaseId: args.databaseId,
      userId,
      name: args.name ?? "New view",
      type: args.type,
      position,
    });
  },
});

export const renameView = mutation({
  args: { viewId: v.id("databaseViews"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedView(ctx, args.viewId, userId);
    await ctx.db.patch(args.viewId, { name: args.name });
  },
});

export const deleteView = mutation({
  args: { viewId: v.id("databaseViews") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const view = await requireOwnedView(ctx, args.viewId, userId);

    // Bir database view'sız kalamaz (Notion davranışı: son view silinemez).
    const siblings = await ctx.db
      .query("databaseViews")
      .withIndex("by_database_position", (q) => q.eq("databaseId", view.databaseId))
      .collect();
    if (siblings.length <= 1) {
      throw new Error("Database must have at least one view");
    }

    // Sıra kayıtlarını da temizle — view'a ait (viewId, groupKey, rowId)
    // üçlüsü başka hiçbir yerden ulaşılamaz.
    const orders = await ctx.db
      .query("viewCardOrder")
      .withIndex("by_view_group_order", (q) => q.eq("viewId", args.viewId))
      .collect();
    await Promise.all([
      ...orders.map((o) => ctx.db.delete(o._id)),
      ctx.db.delete(args.viewId),
    ]);
  },
});

export const duplicateView = mutation({
  args: { viewId: v.id("databaseViews") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const view = await requireOwnedView(ctx, args.viewId, userId);

    const position = await nextViewPosition(ctx, view.databaseId, args.viewId);

    const copyId = await ctx.db.insert("databaseViews", {
      databaseId: view.databaseId,
      userId,
      name: `${view.name} copy`,
      type: view.type,
      position,
      filters: view.filters,
      sorts: view.sorts,
      groupByPropertyId: view.groupByPropertyId,
      subGroupByPropertyId: view.subGroupByPropertyId,
      visiblePropertyIds: view.visiblePropertyIds,
      hiddenGroupKeys: view.hiddenGroupKeys,
      groupOrder: view.groupOrder,
      hideEmptyGroups: view.hideEmptyGroups,
      cardPreview: view.cardPreview,
      cardSize: view.cardSize,
    });

    // Kart sıralarını da kopyala — view'ın kimliği sırasında da saklıdır.
    const orders = await ctx.db
      .query("viewCardOrder")
      .withIndex("by_view_group_order", (q) => q.eq("viewId", args.viewId))
      .collect();
    await Promise.all(
      orders.map((o) =>
        ctx.db.insert("viewCardOrder", {
          viewId: copyId,
          databaseId: o.databaseId,
          userId,
          groupKey: o.groupKey,
          rowId: o.rowId,
          order: o.order,
        }),
      ),
    );

    return copyId;
  },
});

export const reorderView = mutation({
  args: {
    viewId: v.id("databaseViews"),
    beforeViewId: v.optional(v.id("databaseViews")),
    afterViewId: v.optional(v.id("databaseViews")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const view = await requireOwnedView(ctx, args.viewId, userId);

    const [before, after] = await Promise.all([
      args.beforeViewId ? ctx.db.get(args.beforeViewId) : null,
      args.afterViewId ? ctx.db.get(args.afterViewId) : null,
    ]);

    let position = orderBetween(before?.position, after?.position);
    if (position === null) {
      const siblings = sortByPositionThenId(
        await ctx.db
          .query("databaseViews")
          .withIndex("by_database_position", (q) =>
            q.eq("databaseId", view.databaseId),
          )
          .collect(),
      );
      await Promise.all(
        siblings.map((w, i) => ctx.db.patch(w._id, { position: i * ORDER_GAP })),
      );
      const beforeIndex = args.beforeViewId
        ? siblings.findIndex((w) => w._id === args.beforeViewId)
        : -1;
      const afterIndex = args.afterViewId
        ? siblings.findIndex((w) => w._id === args.afterViewId)
        : siblings.length;
      position =
        orderBetween(
          beforeIndex >= 0 ? beforeIndex * ORDER_GAP : undefined,
          afterIndex < siblings.length ? afterIndex * ORDER_GAP : undefined,
        ) ?? 0;
    }

    await ctx.db.patch(args.viewId, { position });
  },
});

const SETTING_FIELDS = {
  filters: v.optional(v.array(v.any())),
  sorts: v.optional(v.array(v.any())),
  visiblePropertyIds: v.optional(v.array(v.id("databaseProperties"))),
  hiddenGroupKeys: v.optional(v.array(v.string())),
  groupOrder: v.optional(v.array(v.string())),
  hideEmptyGroups: v.optional(v.boolean()),
  cardPreview: v.optional(
    v.union(v.literal("none"), v.literal("cover"), v.literal("content")),
  ),
  cardSize: v.optional(
    v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
  ),
} as const;

export const updateViewSettings = mutation({
  args: {
    viewId: v.id("databaseViews"),
    ...SETTING_FIELDS,
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedView(ctx, args.viewId, userId);

    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(SETTING_FIELDS)) {
      const value = (args as Record<string, unknown>)[key];
      if (value !== undefined) patch[key] = value;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.viewId, patch);
    }
  },
});

export const setGroupByProperty = mutation({
  args: {
    viewId: v.id("databaseViews"),
    propertyId: v.optional(v.id("databaseProperties")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const view = await requireOwnedView(ctx, args.viewId, userId);

    // Grup-by değişince eski sıralar SİLİNMEZ (view+grup bazlı saklanır);
    // sadece hangi property'nin grupladığı değişir. propertyId undefined ise
    // board tek "default" grupta toplanır.
    await ctx.db.patch(args.viewId, {
      groupByPropertyId: args.propertyId,
      // Eski property'nin option key'leri yeni property için anlamsız —
      // manuel sıra/gizleme listeleri boşa düşer, property seçilince yeniden
      // doldurulur.
      groupOrder: undefined,
      hiddenGroupKeys: undefined,
    });
  },
});

export const setSubGroupByProperty = mutation({
  args: {
    viewId: v.id("databaseViews"),
    propertyId: v.optional(v.id("databaseProperties")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedView(ctx, args.viewId, userId);
    await ctx.db.patch(args.viewId, { subGroupByPropertyId: args.propertyId });
  },
});

// --- Kart sırası ---

// Kart taşıma TEK ATOMİK İŞLEM: group-by hücresi + sıra kaydı aynı
// transaction'da. İstemci sadece { toGroupKey, beforeRowId, afterRowId }
// gönderir; order'ı sunucu hesaplar (istemci asla sayı göndermez).
// Dönüş: { moved: true } | { chunked: true } — chunked ise istemci
// rebalanceGroupChunk'ı tamamlayıp move'u tekrar dener.
export const moveRow = mutation({
  args: {
    viewId: v.id("databaseViews"),
    rowId: v.id("databaseRows"),
    toGroupKey: v.string(),
    beforeRowId: v.optional(v.id("databaseRows")),
    afterRowId: v.optional(v.id("databaseRows")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const view = await requireOwnedView(ctx, args.viewId, userId);
    const row = await requireOwnedRow(ctx, args.rowId, userId);

    // 1) Group-by property hücresini güncelle (varsa).
    if (view.groupByPropertyId) {
      const cells = { ...row.cells };
      if (args.toGroupKey === GROUP_KEY_NONE) {
        delete cells[view.groupByPropertyId];
      } else {
        cells[view.groupByPropertyId] = args.toGroupKey;
      }
      await ctx.db.patch(row._id, { cells });
    }

    // 2) Eski gruptaki sıra kaydını kaldır.
    const existing = await ctx.db
      .query("viewCardOrder")
      .withIndex("by_view_row", (q) => q.eq("viewId", args.viewId).eq("rowId", args.rowId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // 3) Hedef grupta yeni order'ı hesapla (sunucu otoriter).
    const orders = await fetchGroupOrders(ctx, args.viewId, args.toGroupKey);
    const beforeIdx = args.beforeRowId
      ? orders.findIndex((o) => o.rowId === args.beforeRowId)
      : -1;
    const afterIdx = args.afterRowId
      ? orders.findIndex((o) => o.rowId === args.afterRowId)
      : -1;

    const beforeOrder =
      beforeIdx >= 0 ? orders[beforeIdx].order : undefined;
    const afterOrder = afterIdx >= 0 ? orders[afterIdx].order : undefined;

    let order = orderBetween(beforeOrder, afterOrder);

    if (order === null) {
      // Komşular sıkışık — run'ı yeniden aralıklandır.
      const run = findPackedRun(orders, beforeIdx);
      if (!run) {
        // Beklenmedik durum: run bulunamadı ama komşular sıkışık. Güvenli
        // geri çekilme: tüm grubu yeniden numaralandır.
        if (orders.length > REBALANCE_WRITE_LIMIT) return { chunked: true };
        await Promise.all(
          orders.map((o, i) => ctx.db.patch(o._id, { order: i * ORDER_GAP })),
        );
        order =
          orderBetween(
            beforeIdx >= 0 ? beforeIdx * ORDER_GAP : undefined,
            afterIdx >= 0 ? afterIdx * ORDER_GAP : undefined,
          ) ?? 0;
      } else {
        const result = respaceRun(orders, run, beforeIdx);
        if ("chunked" in result) return { chunked: true };
        await Promise.all(
          result.patches.map(([id, value]) => ctx.db.patch(id, { order: value })),
        );
        order = result.insertOrder;
      }
    }

    await ctx.db.insert("viewCardOrder", {
      viewId: args.viewId,
      databaseId: view.databaseId,
      userId,
      groupKey: args.toGroupKey,
      rowId: args.rowId,
      order,
    });

    return { moved: true };
  },
});

const REBALANCE_CHUNK = 1000;

// Patolojik durumlar için parçalı rebalance (yukarıdaki respaceRun cap'e
// takıldığında). Run'ın TAIL'inden başlayarak sondan başa işlenir: işlenen
// dilimler her zaman run'ın üst aralığına yerleştiği için ara durumlarda
// sıralama bozulmaz (işlenmemiş satırlar hâlâ alt, işlenmişler üstte).
// Her çağrı bir dilim işler; bitince { done: true } döner.
export const rebalanceGroupChunk = mutation({
  args: {
    viewId: v.id("databaseViews"),
    groupKey: v.string(),
    cursor: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedView(ctx, args.viewId, userId);

    const orders = await fetchGroupOrders(ctx, args.viewId, args.groupKey);

    // En uzun paketlenmiş run'ı bul.
    let best: { start: number; end: number } | null = null;
    let i = 0;
    while (i < orders.length - 1) {
      if (orders[i + 1].order - orders[i].order < PACKED_THRESHOLD) {
        let start = i;
        while (
          start > 0 &&
          orders[start].order - orders[start - 1].order < PACKED_THRESHOLD
        ) {
          start--;
        }
        let end = i + 1;
        while (
          end < orders.length - 1 &&
          orders[end + 1].order - orders[end].order < PACKED_THRESHOLD
        ) {
          end++;
        }
        if (!best || end - start > best.end - best.start) {
          best = { start, end };
        }
        i = end + 1;
      } else {
        i++;
      }
    }

    if (!best) return { done: true };
    const runLen = best.end - best.start + 1;

    const beforeOrder =
      best.start > 0 ? orders[best.start - 1].order : undefined;
    const afterOrder =
      best.end < orders.length - 1 ? orders[best.end + 1].order : undefined;
    const base =
      beforeOrder !== undefined
        ? beforeOrder
        : afterOrder !== undefined
          ? afterOrder - (runLen + 1) * ORDER_GAP
          : 0;
    const span =
      beforeOrder !== undefined && afterOrder !== undefined
        ? afterOrder - beforeOrder
        : (runLen + 1) * ORDER_GAP;

    // Kalan run: [best.start .. best.end - cursor] (sondan işleniyor).
    const remaining = runLen - args.cursor;
    if (remaining <= 0) return { done: true };
    const chunk = Math.min(REBALANCE_CHUNK, remaining);

    const patches: [Id<"viewCardOrder">, number][] = [];
    for (let k = 0; k < chunk; k++) {
      // Dilim dizini: run içindeki mutlak pozisyon.
      const pos = best.end - args.cursor - chunk + 1 + k;
      const order =
        base + (span * (pos - best.start + 1)) / (runLen + 1);
      patches.push([orders[pos]._id, order]);
    }
    await Promise.all(
      patches.map(([id, value]) => ctx.db.patch(id, { order: value })),
    );

    const nextCursor = args.cursor + chunk;
    if (nextCursor >= runLen) return { done: true };
    return { cursor: nextCursor };
  },
});

// Yeni kart: satırı (database tablosu sırasıyla) + view içindeki grup
// sırası kaydını birlikte oluşturur. Böylece kart board'da da deterministik
// bir konumda doğar (belirtilen afterRowId'in hemen altında). `title`
// verilirse title property hücresine yazılır (inline "+ New" akışı).
export const createRowInView = mutation({
  args: {
    viewId: v.id("databaseViews"),
    groupKey: v.string(),
    afterRowId: v.optional(v.id("databaseRows")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const view = await requireOwnedView(ctx, args.viewId, userId);

    const rows = sortByOrderThenId(
      await ctx.db
        .query("databaseRows")
        .withIndex("by_database_order", (q) =>
          q.eq("databaseId", view.databaseId),
        )
        .collect(),
    );
    const afterIndex = args.afterRowId
      ? rows.findIndex((r) => r._id === args.afterRowId)
      : -1;
    const prev = afterIndex >= 0 ? rows[afterIndex] : undefined;
    const next = rows[afterIndex + 1];
    let rowOrder = orderBetween(prev?.order, next?.order);
    if (rowOrder === null) {
      await Promise.all(
        rows.map((r, i) => ctx.db.patch(r._id, { order: i * ORDER_GAP })),
      );
      rowOrder =
        orderBetween(
          afterIndex >= 0 ? afterIndex * ORDER_GAP : undefined,
          afterIndex + 1 < rows.length ? (afterIndex + 1) * ORDER_GAP : undefined,
        ) ?? 0;
    }

    // Group-by + title hücrelerini tek cells nesnesinde kur.
    const cells: Record<
      Id<"databaseProperties">,
      string | number | boolean | string[] | null
    > = {};
    if (view.groupByPropertyId && args.groupKey !== GROUP_KEY_NONE) {
      cells[view.groupByPropertyId] = args.groupKey;
    }
    if (args.title?.trim()) {
      const titleProperty = await ctx.db
        .query("databaseProperties")
        .withIndex("by_database_order", (q) =>
          q.eq("databaseId", view.databaseId),
        )
        .filter((q) => q.eq(q.field("isTitle"), true))
        .first();
      if (titleProperty) cells[titleProperty._id] = args.title.trim();
    }

    const rowId = await ctx.db.insert("databaseRows", {
      databaseId: view.databaseId,
      userId,
      order: rowOrder,
      cells,
    });

    // View içindeki sıra: afterRowId'in altına (afterRowId bu gruptaysa).
    const orders = await fetchGroupOrders(ctx, args.viewId, args.groupKey);
    const afterIdx = args.afterRowId
      ? orders.findIndex((o) => o.rowId === args.afterRowId)
      : -1;
    const order =
      orderBetween(
        afterIdx >= 0 ? orders[afterIdx].order : undefined,
        afterIdx >= 0 ? orders[afterIdx + 1]?.order : undefined,
      ) ?? 0;

    await ctx.db.insert("viewCardOrder", {
      viewId: args.viewId,
      databaseId: view.databaseId,
      userId,
      groupKey: args.groupKey,
      rowId,
      order,
    });

    return rowId;
  },
});

// --- Migration (idempotent) ---

// View sistemi bu şemayla başladığından önceki tüm database'ler view'sız.
// Bu mutation her çalıştığında view'sız database'lere "Table" view ekler —
// var olanlara dokunmaz, iki kez çalışınca ikinci view oluşmaz. Cron'dan
// günlük çağrılır ve elle `npx convex run databaseViews:ensureDefaultViews`
// ile de çalıştırılabilir (CLI çağrıları için auth kimliği yoktur, bu yüzden
// internalMutation — documents.backfillSearchText deseniyle aynı).
export const ensureDefaultViews = internalMutation({
  args: {},
  handler: async (ctx) => {
    const databases = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("type"), "database"))
      .collect();

    for (const db of databases) {
      const views = await ctx.db
        .query("databaseViews")
        .withIndex("by_database_position", (q) => q.eq("databaseId", db._id))
        .collect();
      if (views.length === 0) {
        await ctx.db.insert("databaseViews", {
          databaseId: db._id,
          userId: db.userId,
          name: "Table",
          type: "table",
          position: 0,
        });
      }
    }
  },
});

// Bir database kalıcı silinmeden önce cascadeDeleteDatabase (databases.ts)
// view'ları ve sıra kayıtlarını da temizler — bkz. databaseCascade.ts.