import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  MutationCtx,
} from "./_generated/server";
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
import { coerceValue, generateOptionId } from "./lib/coerce";
import {
  assertLive,
  liveProperties,
  liveRows,
  liveViews,
} from "./lib/softDelete";
import {
  HistoryOp,
  orderDiffOps,
  patchInverse,
  recordHistory,
} from "./lib/history";
import { isPropertyIconId } from "../lib/property-icons";

// getSchema ve getRows bilerek ayrı sorgular: birleşik olsaydı her hücre
// düzenlemesi sütun tanımlarını da geçersiz kılar, tüm başlıkları yeniden
// render eder ve açık bir select popover'ını etkileşim ortasında kapatırdı.

export const getSchema = query({
  args: { databaseId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireReadableDatabase(ctx, args.databaseId);

    return await liveProperties(ctx, args.databaseId);
  },
});

export const getRows = query({
  args: { databaseId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireReadableDatabase(ctx, args.databaseId);

    return await liveRows(ctx, args.databaseId);
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

    // Her database'in en az bir view'ı olur — varsayılan "Table".
    await ctx.db.insert("databaseViews", {
      databaseId,
      userId,
      name: "Table",
      type: "table",
      position: 0,
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
  const properties = await liveProperties(ctx, databaseId);

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
  const rebalancedPrev = afterIndex >= 0 ? afterIndex * ORDER_GAP : undefined;
  const rebalancedNext =
    afterIndex + 1 < properties.length
      ? (afterIndex + 1) * ORDER_GAP
      : undefined;
  return orderBetween(rebalancedPrev, rebalancedNext) ?? 0;
}

/**
 * Yeni property'nin varsayılan adı. Eskiden hepsi "Property" adını alıyordu;
 * birkaç tane ekleyince listede ayırt edilemez hale geliyorlardı (Board'un
 * "Property visibility" menüsünde üst üste "Property" satırları). Notion gibi
 * tipin adını kullanıp, çakışırsa sonuna sayı ekliyoruz.
 */
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  select: "Select",
  multiSelect: "Multi-select",
  checkbox: "Checkbox",
  number: "Number",
  date: "Date",
  url: "URL",
  email: "Email",
  phone: "Phone",
  person: "Person",
  relation: "Relation",
  formula: "Formula",
  files: "Files",
};

function uniquePropertyName(taken: string[], base: string) {
  if (!taken.includes(base)) return base;
  let suffix = 2;
  while (taken.includes(`${base} ${suffix}`)) suffix += 1;
  return `${base} ${suffix}`;
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

    const existing = await liveProperties(ctx, args.databaseId);

    const name =
      args.name ??
      uniquePropertyName(
        existing.map((property) => property.name),
        PROPERTY_TYPE_LABELS[args.type] ?? "Property",
      );

    const propertyId = await ctx.db.insert("databaseProperties", {
      databaseId: args.databaseId,
      userId,
      name,
      type: args.type,
      order,
      width: 200,
      options: args.type === "text" ? undefined : [],
    });

    const views = await liveViews(ctx, args.databaseId);

    const undo: HistoryOp[] = [
      { t: "softDelete", table: "databaseProperties", id: propertyId },
    ];
    const redo: HistoryOp[] = [
      { t: "restore", table: "databaseProperties", id: propertyId },
    ];

    await Promise.all(
      views.flatMap((view) => {
        if (view.visiblePropertyIds === undefined) return [];
        const visiblePropertyIds = [...view.visiblePropertyIds];
        const afterIndex = args.afterPropertyId
          ? visiblePropertyIds.indexOf(args.afterPropertyId)
          : -1;
        visiblePropertyIds.splice(afterIndex + 1, 0, propertyId);
        undo.push(patchInverse("databaseViews", view, ["visiblePropertyIds"]));
        redo.push({
          t: "patch",
          table: "databaseViews",
          id: view._id,
          fields: { visiblePropertyIds },
        });
        return [ctx.db.patch(view._id, { visiblePropertyIds })];
      }),
    );

    await recordHistory(ctx, {
      scopeId: args.databaseId,
      userId,
      kind: "property.create",
      label: `"${name}" kolonu eklendi`,
      undo,
      redo,
    });

    return propertyId;
  },
});

export const renameProperty = mutation({
  args: { propertyId: v.id("databaseProperties"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = assertLive(
      await requireOwnedProperty(ctx, args.propertyId, userId),
      "Property",
    );
    if (property.name === args.name) return;

    await ctx.db.patch(args.propertyId, { name: args.name });

    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "property.rename",
      label: `Kolon adı "${args.name}" oldu`,
      undo: [patchInverse("databaseProperties", property, ["name"])],
      redo: [
        {
          t: "patch",
          table: "databaseProperties",
          id: args.propertyId,
          fields: { name: args.name },
        },
      ],
    });
  },
});

export const setPropertyIcon = mutation({
  args: {
    propertyId: v.id("databaseProperties"),
    icon: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = assertLive(
      await requireOwnedProperty(ctx, args.propertyId, userId),
      "Property",
    );
    if (args.icon !== null && !isPropertyIconId(args.icon)) {
      throw new Error("Unsupported property icon");
    }
    const icon = args.icon ?? undefined;
    if (property.icon === icon) return;

    await ctx.db.patch(args.propertyId, { icon });

    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "property.icon",
      label: icon ? "Kolon ikonu değişti" : "Kolon ikonu kaldırıldı",
      undo: [patchInverse("databaseProperties", property, ["icon"])],
      redo: [
        icon === undefined
          ? {
              t: "patch",
              table: "databaseProperties",
              id: args.propertyId,
              fields: {},
              remove: ["icon"],
            }
          : {
              t: "patch",
              table: "databaseProperties",
              id: args.propertyId,
              fields: { icon },
            },
      ],
    });
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

export const duplicateProperty = mutation({
  args: { propertyId: v.id("databaseProperties") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = assertLive(
      await requireOwnedProperty(ctx, args.propertyId, userId),
      "Property",
    );
    const [order, rows, views] = await Promise.all([
      nextPropertyOrder(ctx, property.databaseId, property._id),
      liveRows(ctx, property.databaseId),
      liveViews(ctx, property.databaseId),
    ]);

    if (rows.length > 2000) {
      throw new Error("Property is too large to duplicate in one operation");
    }

    const duplicateId = await ctx.db.insert("databaseProperties", {
      databaseId: property.databaseId,
      userId,
      name: `${property.name} copy`,
      type: property.type,
      order,
      width: property.width,
      icon: property.icon,
      options: property.options,
    });

    // Kopyanın kendisi soft-delete ile geri alınıyor; satırlara yazılan
    // kopya hücreler ve view görünürlüğü de aynı kayda giriyor.
    const undo: HistoryOp[] = [
      { t: "softDelete", table: "databaseProperties", id: duplicateId },
    ];
    const redo: HistoryOp[] = [
      { t: "restore", table: "databaseProperties", id: duplicateId },
    ];

    await Promise.all([
      ...rows.flatMap((row) => {
        const value = row.cells[property._id];
        if (value === undefined) return [];
        const cells = { ...row.cells, [duplicateId]: value };
        undo.push(patchInverse("databaseRows", row, ["cells"]));
        redo.push({
          t: "patch",
          table: "databaseRows",
          id: row._id,
          fields: { cells },
        });
        return [ctx.db.patch(row._id, { cells })];
      }),
      ...views.flatMap((view) => {
        if (!view.visiblePropertyIds?.includes(property._id)) return [];
        const sourceIndex = view.visiblePropertyIds.indexOf(property._id);
        const visiblePropertyIds = [...view.visiblePropertyIds];
        visiblePropertyIds.splice(sourceIndex + 1, 0, duplicateId);
        undo.push(patchInverse("databaseViews", view, ["visiblePropertyIds"]));
        redo.push({
          t: "patch",
          table: "databaseViews",
          id: view._id,
          fields: { visiblePropertyIds },
        });
        return [ctx.db.patch(view._id, { visiblePropertyIds })];
      }),
    ]);

    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "property.duplicate",
      label: `"${property.name}" kolonu çoğaltıldı`,
      undo,
      redo,
    });

    return duplicateId;
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
    const property = assertLive(
      await requireOwnedProperty(ctx, args.propertyId, userId),
      "Property",
    );

    // Rebalance tüm kardeşleri yeniden numaralandırabilir — bkz. reorderRow.
    const orderSnapshot = await liveProperties(ctx, property.databaseId);

    const [before, after] = await Promise.all([
      args.beforePropertyId ? ctx.db.get(args.beforePropertyId) : null,
      args.afterPropertyId ? ctx.db.get(args.afterPropertyId) : null,
    ]);

    let order = orderBetween(before?.order, after?.order);
    if (order === null) {
      const siblings = await liveProperties(ctx, property.databaseId);
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

    const ops = orderDiffOps(
      "databaseProperties",
      orderSnapshot,
      await liveProperties(ctx, property.databaseId),
    );
    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "property.reorder",
      label: "Kolon taşındı",
      ...ops,
    });
  },
});

export const changePropertyType = mutation({
  args: { propertyId: v.id("databaseProperties"), type: propertyTypeValidator },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = assertLive(
      await requireOwnedProperty(ctx, args.propertyId, userId),
      "Property",
    );

    if (property.type === args.type) return;

    const rows = await liveRows(ctx, property.databaseId);

    let options = property.options ?? [];

    // Tip değişimi hücre değerlerini de dönüştürüyor (coerceValue) —
    // dokunulan HER satırın eski `cells` hâli de journal'a girmeli, yoksa
    // geri alma kolonu eski tipine döndürür ama veriyi dönüştürülmüş
    // bırakır.
    // Notion: adı hâlâ tipten TÜRETİLMİŞ varsayılan olan bir kolonun tipi
    // değişince adı da yeni tipin varsayılanına döner ("Text" → "Select").
    // Kullanıcı kendi adını yazdıysa dokunulmaz.
    const oldLabel = PROPERTY_TYPE_LABELS[property.type] ?? "Property";
    const isAutoNamed =
      property.name === oldLabel ||
      new RegExp(`^${oldLabel} \\d+$`).test(property.name);
    const nextName = isAutoNamed
      ? uniquePropertyName(
          (await liveProperties(ctx, property.databaseId))
            .filter((p) => p._id !== property._id)
            .map((p) => p.name),
          PROPERTY_TYPE_LABELS[args.type] ?? "Property",
        )
      : property.name;

    const undo: HistoryOp[] = [
      patchInverse("databaseProperties", property, [
        "type",
        "options",
        "name",
      ]),
    ];
    const redo: HistoryOp[] = [];

    for (const row of rows) {
      const current = row.cells[args.propertyId];
      if (current === undefined) continue;

      const result = coerceValue(current, property.type, args.type, options);
      options = result.options;

      const cells = { ...row.cells };
      const isEmpty =
        result.value === null ||
        result.value === "" ||
        (Array.isArray(result.value) && result.value.length === 0);

      if (isEmpty) {
        delete cells[args.propertyId];
      } else {
        cells[args.propertyId] = result.value;
      }
      undo.push(patchInverse("databaseRows", row, ["cells"]));
      redo.push({
        t: "patch",
        table: "databaseRows",
        id: row._id,
        fields: { cells },
      });
      await ctx.db.patch(row._id, { cells });
    }

    const nextOptions = args.type === "text" ? undefined : options;
    await ctx.db.patch(args.propertyId, {
      type: args.type,
      options: nextOptions,
      name: nextName,
    });

    redo.push({
      t: "patch",
      table: "databaseProperties",
      id: args.propertyId,
      fields:
        nextOptions === undefined
          ? { type: args.type, name: nextName }
          : { type: args.type, options: nextOptions, name: nextName },
      ...(nextOptions === undefined ? { remove: ["options"] } : {}),
    });

    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "property.type",
      label: `Kolon tipi "${args.type}" oldu`,
      undo,
      redo,
    });
  },
});

export const addSelectOption = mutation({
  args: {
    propertyId: v.id("databaseProperties"),
    label: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = await requireOwnedProperty(ctx, args.propertyId, userId);

    const optionId = generateOptionId();
    const options = [
      ...(property.options ?? []),
      { id: optionId, label: args.label, color: args.color },
    ];
    await ctx.db.patch(args.propertyId, { options });

    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "option.add",
      label: `"${args.label}" seçeneği eklendi`,
      undo: [patchInverse("databaseProperties", property, ["options"])],
      redo: [
        {
          t: "patch",
          table: "databaseProperties",
          id: args.propertyId,
          fields: { options },
        },
      ],
    });

    return optionId;
  },
});

export const updateSelectOption = mutation({
  args: {
    propertyId: v.id("databaseProperties"),
    optionId: v.string(),
    label: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = await requireOwnedProperty(ctx, args.propertyId, userId);

    // Satırlara dokunulmuyor: hücreler option id ile anahtarlandığı için
    // ad/renk değişikliği O(1) — tüm satırlar bu tek patch'i otomatik görür.
    const options = (property.options ?? []).map((o) =>
      o.id === args.optionId
        ? { ...o, label: args.label ?? o.label, color: args.color ?? o.color }
        : o,
    );
    await ctx.db.patch(args.propertyId, { options });

    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "option.update",
      label: "Seçenek güncellendi",
      undo: [patchInverse("databaseProperties", property, ["options"])],
      redo: [
        {
          t: "patch",
          table: "databaseProperties",
          id: args.propertyId,
          fields: { options },
        },
      ],
    });
  },
});

export const deleteSelectOption = mutation({
  args: { propertyId: v.id("databaseProperties"), optionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = await requireOwnedProperty(ctx, args.propertyId, userId);

    const options = (property.options ?? []).filter(
      (o) => o.id !== args.optionId,
    );
    await ctx.db.patch(args.propertyId, { options });

    const undo: HistoryOp[] = [
      patchInverse("databaseProperties", property, ["options"]),
    ];
    const redo: HistoryOp[] = [
      {
        t: "patch",
        table: "databaseProperties",
        id: args.propertyId,
        fields: { options },
      },
    ];

    const rows = await liveRows(ctx, property.databaseId);

    if (rows.length > 2000) {
      // Kemer + askı: süpürme atlanır, orphan-toleranslı render devreye girer.
      // Seçenek listesinin kendisi yine de geri alınabilir.
      await recordHistory(ctx, {
        scopeId: property.databaseId,
        userId,
        kind: "option.delete",
        label: "Seçenek silindi",
        undo,
        redo,
      });
      return;
    }

    await Promise.all(
      rows.flatMap((row) => {
        const current = row.cells[args.propertyId];
        if (current === undefined) return [];

        const cells = { ...row.cells };
        if (Array.isArray(current)) {
          const filtered = current.filter((id) => id !== args.optionId);
          if (filtered.length === 0) {
            delete cells[args.propertyId];
          } else {
            cells[args.propertyId] = filtered;
          }
        } else if (current === args.optionId) {
          delete cells[args.propertyId];
        } else {
          return [];
        }
        undo.push(patchInverse("databaseRows", row, ["cells"]));
        redo.push({
          t: "patch",
          table: "databaseRows",
          id: row._id,
          fields: { cells },
        });
        return [ctx.db.patch(row._id, { cells })];
      }),
    );

    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "option.delete",
      label: "Seçenek silindi",
      undo,
      redo,
    });
  },
});

export const deleteProperty = mutation({
  args: { propertyId: v.id("databaseProperties") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const property = assertLive(
      await requireOwnedProperty(ctx, args.propertyId, userId),
      "Property",
    );

    if (property.isTitle) {
      const siblingCount = await liveProperties(ctx, property.databaseId);
      if (siblingCount.length <= 1) {
        throw new Error("Database must have at least one property");
      }
    }

    // Soft-delete. Hücreler BİLEREK süpürülmüyor: `cells` propertyId ile
    // anahtarlı, süpürülen veri geri alınamaz. Kolon canlı şemadan
    // (`liveProperties`) düştüğü için render etmez — zaten orphan-toleranslı.
    // Bu ayrıca eski 2000 satır süpürme limitini de ortadan kaldırıyor.
    await ctx.db.patch(args.propertyId, { deletedAt: Date.now() });

    // Property'ye bağlı view ayarlarını temizle: group-by/sub-group bu
    // property'yi kullanıyorsa sıfırlanır; visible/groupOrder/hidden listeleri
    // property'nin option key'lerine bağlı olduğu için boşa düşer.
    const views = await liveViews(ctx, property.databaseId);

    const undo: HistoryOp[] = [
      { t: "restore", table: "databaseProperties", id: args.propertyId },
    ];
    const redo: HistoryOp[] = [
      { t: "softDelete", table: "databaseProperties", id: args.propertyId },
    ];

    await Promise.all(
      views.flatMap((view) => {
        const patch: Record<string, unknown> = {};
        if (view.groupByPropertyId === args.propertyId) {
          patch.groupByPropertyId = undefined;
          patch.groupOrder = undefined;
          patch.hiddenGroupKeys = undefined;
        }
        if (view.subGroupByPropertyId === args.propertyId) {
          patch.subGroupByPropertyId = undefined;
        }
        if (view.visiblePropertyIds?.includes(args.propertyId)) {
          patch.visiblePropertyIds = view.visiblePropertyIds.filter(
            (id) => id !== args.propertyId,
          );
        }
        if (Object.keys(patch).length === 0) return [];
        // View ayarları da geri alınmalı — yoksa kolon geri geldiğinde
        // gruplama ve görünürlük sıfırlanmış kalır.
        undo.push(
          patchInverse("databaseViews", view, Object.keys(patch)),
        );
        redo.push({
          t: "patch",
          table: "databaseViews",
          id: view._id,
          fields: Object.fromEntries(
            Object.entries(patch).filter(([, value]) => value !== undefined),
          ),
          remove: Object.entries(patch)
            .filter(([, value]) => value === undefined)
            .map(([key]) => key),
        });
        return [ctx.db.patch(view._id, patch)];
      }),
    );

    await recordHistory(ctx, {
      scopeId: property.databaseId,
      userId,
      kind: "property.delete",
      label: `"${property.name}" kolonu silindi`,
      undo,
      redo,
    });
  },
});

async function nextRowOrder(
  ctx: MutationCtx,
  databaseId: Id<"documents">,
  afterRowId: Id<"databaseRows"> | undefined,
) {
  const rows = await liveRows(ctx, databaseId);

  // afterRowId verilmemişse en başa eklenir — çağıran taraf sona eklemek
  // istiyorsa son satırın id'sini açıkça geçmeli.
  const afterIndex = afterRowId
    ? rows.findIndex((r) => r._id === afterRowId)
    : -1;

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

    const rowId = await ctx.db.insert("databaseRows", {
      databaseId: args.databaseId,
      userId,
      order,
      cells: {},
    });

    await recordHistory(ctx, {
      scopeId: args.databaseId,
      userId,
      kind: "row.create",
      label: "Satır eklendi",
      undo: [{ t: "softDelete", table: "databaseRows", id: rowId }],
      redo: [{ t: "restore", table: "databaseRows", id: rowId }],
    });

    return rowId;
  },
});

export const deleteRow = mutation({
  args: { rowId: v.id("databaseRows") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const row = assertLive(
      await requireOwnedRow(ctx, args.rowId, userId),
      "Row",
    );

    // Soft-delete: satırın `_id`'si yaşamalı. Hard delete + geri alırken
    // yeniden yaratma, `viewCardOrder.rowId` referansını koparır ve satırın
    // board'daki yeri kalıcı olarak kaybolur.
    //
    // `viewCardOrder` kayıtları BİLEREK silinmiyor: satır canlı okumalardan
    // (`liveRows`) düştüğü için board'da hayalet kart oluşmaz — istemci
    // zaten orphan-toleranslı join yapıyor — ve geri alındığında kart eski
    // grubundaki eski sırasına döner.
    await ctx.db.patch(args.rowId, { deletedAt: Date.now() });

    await recordHistory(ctx, {
      scopeId: row.databaseId,
      userId,
      kind: "row.delete",
      label: "Satır silindi",
      undo: [{ t: "restore", table: "databaseRows", id: args.rowId }],
      redo: [{ t: "softDelete", table: "databaseRows", id: args.rowId }],
    });
  },
});

/** Satır ikonunu (emoji) ayarlar; `undefined` ikonu kaldırır. */
export const setRowIcon = mutation({
  args: {
    rowId: v.id("databaseRows"),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const row = assertLive(
      await requireOwnedRow(ctx, args.rowId, userId),
      "Row",
    );
    if (row.icon === args.icon) return;

    await ctx.db.patch(args.rowId, { icon: args.icon });

    await recordHistory(ctx, {
      scopeId: row.databaseId,
      userId,
      kind: "row.icon",
      label: args.icon ? "Satır ikonu değişti" : "Satır ikonu kaldırıldı",
      undo: [patchInverse("databaseRows", row, ["icon"])],
      redo: [
        args.icon === undefined
          ? { t: "patch", table: "databaseRows", id: args.rowId, fields: {}, remove: ["icon"] }
          : { t: "patch", table: "databaseRows", id: args.rowId, fields: { icon: args.icon } },
      ],
    });
  },
});

/** Satır kapağını ayarlar; `undefined` kapağı kaldırır. */
export const setRowCover = mutation({
  args: {
    rowId: v.id("databaseRows"),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const row = assertLive(
      await requireOwnedRow(ctx, args.rowId, userId),
      "Row",
    );
    if (row.coverImage === args.coverImage) return;

    await ctx.db.patch(args.rowId, { coverImage: args.coverImage });

    await recordHistory(ctx, {
      scopeId: row.databaseId,
      userId,
      kind: "row.cover",
      label: args.coverImage ? "Satır kapağı değişti" : "Satır kapağı kaldırıldı",
      undo: [patchInverse("databaseRows", row, ["coverImage"])],
      redo: [
        args.coverImage === undefined
          ? {
              t: "patch",
              table: "databaseRows",
              id: args.rowId,
              fields: {},
              remove: ["coverImage"],
            }
          : {
              t: "patch",
              table: "databaseRows",
              id: args.rowId,
              fields: { coverImage: args.coverImage },
            },
      ],
    });
  },
});

export const duplicateRow = mutation({
  args: { rowId: v.id("databaseRows") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const row = assertLive(
      await requireOwnedRow(ctx, args.rowId, userId),
      "Row",
    );

    const order = await nextRowOrder(ctx, row.databaseId, args.rowId);

    const duplicateId = await ctx.db.insert("databaseRows", {
      databaseId: row.databaseId,
      userId,
      order,
      cells: row.cells,
    });

    await recordHistory(ctx, {
      scopeId: row.databaseId,
      userId,
      kind: "row.duplicate",
      label: "Satır çoğaltıldı",
      undo: [{ t: "softDelete", table: "databaseRows", id: duplicateId }],
      redo: [{ t: "restore", table: "databaseRows", id: duplicateId }],
    });

    return duplicateId;
  },
});

export const reorderRow = mutation({
  args: {
    rowId: v.id("databaseRows"),
    beforeRowId: v.optional(v.id("databaseRows")),
    afterRowId: v.optional(v.id("databaseRows")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const row = assertLive(
      await requireOwnedRow(ctx, args.rowId, userId),
      "Row",
    );

    // Sıralama rebalance'a düşerse TÜM kardeşler yeniden numaralandırılır;
    // bu yüzden tek satırın order'ını elle geri yazmak yerine önce/sonra
    // fotoğrafının farkı alınıyor (bkz. orderDiffOps).
    const orderSnapshot = await liveRows(ctx, row.databaseId);

    const [before, after] = await Promise.all([
      args.beforeRowId ? ctx.db.get(args.beforeRowId) : null,
      args.afterRowId ? ctx.db.get(args.afterRowId) : null,
    ]);

    let order = orderBetween(before?.order, after?.order);
    if (order === null) {
      const siblings = await liveRows(ctx, row.databaseId);
      siblings.sort((a, b) => a.order - b.order);
      await Promise.all(
        siblings.map((r, i) => ctx.db.patch(r._id, { order: i * ORDER_GAP })),
      );
      const beforeIndex = args.beforeRowId
        ? siblings.findIndex((r) => r._id === args.beforeRowId)
        : -1;
      const afterIndex = args.afterRowId
        ? siblings.findIndex((r) => r._id === args.afterRowId)
        : siblings.length;
      order =
        orderBetween(
          beforeIndex >= 0 ? beforeIndex * ORDER_GAP : undefined,
          afterIndex < siblings.length ? afterIndex * ORDER_GAP : undefined,
        ) ?? 0;
    }

    await ctx.db.patch(args.rowId, { order });

    const ops = orderDiffOps(
      "databaseRows",
      orderSnapshot,
      await liveRows(ctx, row.databaseId),
    );
    await recordHistory(ctx, {
      scopeId: row.databaseId,
      userId,
      kind: "row.reorder",
      label: "Satır taşındı",
      ...ops,
    });
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
    const row = assertLive(
      await requireOwnedRow(ctx, args.rowId, userId),
      "Row",
    );

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

    // Değer gerçekten değişmediyse journal'a kayıt düşme — yoksa hücreye
    // girip çıkmak bile yığını doldurur ve Ctrl+Z hiçbir şey yapmıyormuş
    // gibi görünür.
    if (cells[args.propertyId] === row.cells[args.propertyId]) return;

    await ctx.db.patch(args.rowId, { cells });

    await recordHistory(ctx, {
      scopeId: row.databaseId,
      userId,
      kind: "cell.update",
      label: "Hücre güncellendi",
      // `cells` bir record — tek hücreyi değil, alanın tamamını geri
      // yazıyoruz (patch sığ merge yapar, bkz. convex.md).
      undo: [patchInverse("databaseRows", row, ["cells"])],
      redo: [
        { t: "patch", table: "databaseRows", id: args.rowId, fields: { cells } },
      ],
    });
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

// Soft-delete edilen satır/kolonlar sonsuza kadar durmaz. Undo penceresi
// (`HISTORY_LIMIT` kayıt) çoktan geçmiş olan kayıtlar, trash ile aynı 30
// günlük pencereden sonra kalıcı silinir. Bir satır kalıcı silinirken
// `viewCardOrder` kayıtları da gider; bir kolon silinirken hücreleri
// süpürülür — o noktada geri alınacak bir şey kalmadığı için güvenli.
const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Tek çalıştırmada işlenecek kayıt sayısı: Convex mutation'ları
// transactional, yazma limitini aşmak tüm işi geri alır. Kalanlar bir
// sonraki turda temizlenir (cron günlük çalışır).
const PURGE_BATCH = 100;

export const purgeSoftDeleted = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - SOFT_DELETE_RETENTION_MS;

    const rows = (
      await ctx.db
        .query("databaseRows")
        .filter((q) =>
          q.and(
            q.neq(q.field("deletedAt"), undefined),
            q.lt(q.field("deletedAt"), cutoff),
          ),
        )
        .take(PURGE_BATCH)
    );

    for (const row of rows) {
      const orders = await ctx.db
        .query("viewCardOrder")
        .withIndex("by_row", (q) => q.eq("rowId", row._id))
        .collect();
      await Promise.all(orders.map((o) => ctx.db.delete(o._id)));
      await ctx.db.delete(row._id);
    }

    const properties = await ctx.db
      .query("databaseProperties")
      .filter((q) =>
        q.and(
          q.neq(q.field("deletedAt"), undefined),
          q.lt(q.field("deletedAt"), cutoff),
        ),
      )
      .take(PURGE_BATCH);

    for (const property of properties) {
      // Kolonun hücrelerini süpür — silme artık geri alınamaz.
      const siblings = await liveRows(ctx, property.databaseId);
      await Promise.all(
        siblings
          .filter((row) => property._id in row.cells)
          .map((row) => {
            const cells = { ...row.cells };
            delete cells[property._id];
            return ctx.db.patch(row._id, { cells });
          }),
      );
      await ctx.db.delete(property._id);
    }

    // Soft-delete edilmiş sıra kayıtları ve view'lar. View'ı silmek onun
    // sıra kayıtlarını da soft-delete ettiği için ikisi aynı pencerede
    // düşer; sıra kayıtları önce gider ki view ölürken öksüz kalmasın.
    const staleOrders = await ctx.db
      .query("viewCardOrder")
      .filter((q) =>
        q.and(
          q.neq(q.field("deletedAt"), undefined),
          q.lt(q.field("deletedAt"), cutoff),
        ),
      )
      .take(PURGE_BATCH);
    await Promise.all(staleOrders.map((o) => ctx.db.delete(o._id)));

    const staleViews = await ctx.db
      .query("databaseViews")
      .filter((q) =>
        q.and(
          q.neq(q.field("deletedAt"), undefined),
          q.lt(q.field("deletedAt"), cutoff),
        ),
      )
      .take(PURGE_BATCH);
    for (const view of staleViews) {
      const orphans = await ctx.db
        .query("viewCardOrder")
        .withIndex("by_view_group_order", (q) => q.eq("viewId", view._id))
        .collect();
      await Promise.all(orphans.map((o) => ctx.db.delete(o._id)));
      await ctx.db.delete(view._id);
    }

    return {
      rows: rows.length,
      properties: properties.length,
      orders: staleOrders.length,
      views: staleViews.length,
    };
  },
});
