import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
import {
  HISTORY_LIMIT,
  patchInverse,
  recordHistory,
} from "@/convex/lib/history";

import { OWNER, setup } from "@/tests/support/convex/harness";

/**
 * Journal çekirdeğinin testleri. Mutation'lar henüz journal'a bağlı
 * olmadığı için kayıtlar `t.run` ile doğrudan `recordHistory`'den
 * düşülüyor — bu, undo/redo semantiğini bağlama işinden bağımsız
 * doğrulamayı sağlıyor.
 */

/** Bir database dokümanı + seed'lenmiş satır/kolonlarını verir. */
async function fixture() {
  const harness = setup();
  const databaseId = await harness.owner.mutation(
    api.databases.createDatabase,
    { title: "Kitaplar" },
  );
  const properties = await harness.owner.query(api.databases.getSchema, {
    databaseId,
  });
  const rows = await harness.owner.query(api.databases.getRows, { databaseId });
  return { ...harness, databaseId, properties, rows };
}

describe("undo/redo journal", () => {
  it("kayıt düşülünce canUndo true olur ve etiket taşınır", async () => {
    const { t, owner, databaseId, rows, properties } = await fixture();

    await t.run(async (ctx) => {
      await recordHistory(ctx, {
        scopeId: databaseId,
        userId: OWNER,
        kind: "cell.update",
        label: "Hücre güncellendi",
        undo: [
          {
            t: "patch",
            table: "databaseRows",
            id: rows[0]._id,
            fields: { cells: {} },
          },
        ],
        redo: [
          {
            t: "patch",
            table: "databaseRows",
            id: rows[0]._id,
            fields: { cells: { [properties[0]._id]: "yeni" } },
          },
        ],
      });
    });

    const state = await owner.query(api.history.getUndoState, {
      scopeId: databaseId,
    });
    expect(state.canUndo).toBe(true);
    expect(state.canRedo).toBe(false);
    expect(state.undoLabel).toBe("Hücre güncellendi");
  });

  it("undo patch op'unu uygular, redo ileri oynatır", async () => {
    const { t, owner, databaseId, rows, properties } = await fixture();
    const rowId = rows[0]._id;
    const propertyId = properties[0]._id;

    await owner.mutation(api.databases.updateCell, {
      rowId,
      propertyId,
      value: "yeni",
    });
    await t.run(async (ctx) => {
      await recordHistory(ctx, {
        scopeId: databaseId,
        userId: OWNER,
        kind: "cell.update",
        label: "Hücre güncellendi",
        undo: [
          {
            t: "patch",
            table: "databaseRows",
            id: rowId,
            fields: { cells: {} },
          },
        ],
        redo: [
          {
            t: "patch",
            table: "databaseRows",
            id: rowId,
            fields: { cells: { [propertyId]: "yeni" } },
          },
        ],
      });
    });

    const undone = await owner.mutation(api.history.undo, {
      scopeId: databaseId,
    });
    expect(undone?.label).toBe("Hücre güncellendi");
    let row = await t.run(async (ctx) => ctx.db.get(rowId));
    expect(row?.cells[propertyId]).toBeUndefined();

    const redone = await owner.mutation(api.history.redo, {
      scopeId: databaseId,
    });
    expect(redone?.kind).toBe("cell.update");
    row = await t.run(async (ctx) => ctx.db.get(rowId));
    expect(row?.cells[propertyId]).toBe("yeni");
  });

  it("undo sonrası yeni bir işlem redo dalını keser", async () => {
    const { t, owner, databaseId, rows } = await fixture();
    const push = (label: string) =>
      t.run(async (ctx) => {
        await recordHistory(ctx, {
          scopeId: databaseId,
          userId: OWNER,
          kind: "row.icon",
          label,
          undo: [
            {
              t: "patch",
              table: "databaseRows",
              id: rows[0]._id,
              fields: {},
              remove: ["icon"],
            },
          ],
          redo: [
            {
              t: "patch",
              table: "databaseRows",
              id: rows[0]._id,
              fields: { icon: "📕" },
            },
          ],
        });
      });

    await push("Birinci");
    await owner.mutation(api.history.undo, { scopeId: databaseId });
    expect(
      (await owner.query(api.history.getUndoState, { scopeId: databaseId }))
        .canRedo,
    ).toBe(true);

    await push("İkinci");

    const state = await owner.query(api.history.getUndoState, {
      scopeId: databaseId,
    });
    expect(state.canRedo).toBe(false);
    expect(state.undoLabel).toBe("İkinci");
  });

  it("iki kez undo sonrası redo en eski geri alınanı ileri oynatır", async () => {
    const { t, owner, databaseId, rows } = await fixture();
    const rowId = rows[0]._id;

    for (const icon of ["📕", "📗"]) {
      await t.run(async (ctx) => {
        const before = await ctx.db.get(rowId);
        await ctx.db.patch(rowId, { icon });
        await recordHistory(ctx, {
          scopeId: databaseId,
          userId: OWNER,
          kind: "row.icon",
          label: `İkon ${icon}`,
          undo: [patchInverse("databaseRows", before!, ["icon"])],
          redo: [
            { t: "patch", table: "databaseRows", id: rowId, fields: { icon } },
          ],
        });
      });
    }

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    await owner.mutation(api.history.undo, { scopeId: databaseId });
    expect((await t.run((ctx) => ctx.db.get(rowId)))?.icon).toBeUndefined();

    const redone = await owner.mutation(api.history.redo, {
      scopeId: databaseId,
    });
    expect(redone?.label).toBe("İkon 📕");
    expect((await t.run((ctx) => ctx.db.get(rowId)))?.icon).toBe("📕");
  });

  it("boş yığında undo/redo hata atmaz, null döner", async () => {
    const { owner, databaseId } = await fixture();
    expect(
      await owner.mutation(api.history.undo, { scopeId: databaseId }),
    ).toBeNull();
    expect(
      await owner.mutation(api.history.redo, { scopeId: databaseId }),
    ).toBeNull();
  });

  it("soft-delete op'ları satırı silip geri getirir", async () => {
    const { t, owner, databaseId, rows } = await fixture();
    const rowId = rows[0]._id;

    await t.run(async (ctx) => {
      await ctx.db.patch(rowId, { deletedAt: Date.now() });
      await recordHistory(ctx, {
        scopeId: databaseId,
        userId: OWNER,
        kind: "row.delete",
        label: "Satır silindi",
        undo: [{ t: "restore", table: "databaseRows", id: rowId }],
        redo: [{ t: "softDelete", table: "databaseRows", id: rowId }],
      });
    });

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    expect((await t.run((ctx) => ctx.db.get(rowId)))?.deletedAt).toBeUndefined();

    await owner.mutation(api.history.redo, { scopeId: databaseId });
    expect((await t.run((ctx) => ctx.db.get(rowId)))?.deletedAt).toBeTypeOf(
      "number",
    );
  });

  it("silinmiş kayda ait op sessizce atlanır, undo patlamaz", async () => {
    const { t, owner, databaseId, rows } = await fixture();
    const rowId = rows[0]._id;

    await t.run(async (ctx) => {
      await recordHistory(ctx, {
        scopeId: databaseId,
        userId: OWNER,
        kind: "row.icon",
        label: "İkon",
        undo: [
          {
            t: "patch",
            table: "databaseRows",
            id: rowId,
            fields: {},
            remove: ["icon"],
          },
        ],
        redo: [],
      });
      // Araya giren kalıcı silme (ör. trash purge).
      await ctx.db.delete(rowId);
    });

    await expect(
      owner.mutation(api.history.undo, { scopeId: databaseId }),
    ).resolves.toMatchObject({ kind: "row.icon" });
  });

  it("yığın HISTORY_LIMIT'i aşınca en eski kayıt budanır", async () => {
    const { t, databaseId, rows } = await fixture();

    await t.run(async (ctx) => {
      for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
        await recordHistory(ctx, {
          scopeId: databaseId,
          userId: OWNER,
          kind: "row.icon",
          label: `Adım ${i}`,
          undo: [
            {
              t: "patch",
              table: "databaseRows",
              id: rows[0]._id,
              fields: {},
              remove: ["icon"],
            },
          ],
          redo: [],
        });
      }
    });

    const entries = await t.run(async (ctx) =>
      ctx.db
        .query("history")
        .withIndex("by_scope_seq", (q) => q.eq("scopeId", databaseId))
        .collect(),
    );
    expect(entries).toHaveLength(HISTORY_LIMIT);
    expect(entries.some((e) => e.label === "Adım 0")).toBe(false);
    expect(entries.some((e) => e.label === `Adım ${HISTORY_LIMIT + 4}`)).toBe(
      true,
    );
  });

  it("yığın doküman başına izole — A'daki undo B'yi etkilemez", async () => {
    const { t, owner, databaseId, rows } = await fixture();
    const otherId = await owner.mutation(api.databases.createDatabase, {
      title: "Diğer",
    });

    await t.run(async (ctx) => {
      await recordHistory(ctx, {
        scopeId: databaseId,
        userId: OWNER,
        kind: "row.icon",
        label: "A kaydı",
        undo: [
          {
            t: "patch",
            table: "databaseRows",
            id: rows[0]._id,
            fields: {},
            remove: ["icon"],
          },
        ],
        redo: [],
      });
    });

    const otherState = await owner.query(api.history.getUndoState, {
      scopeId: otherId,
    });
    expect(otherState.canUndo).toBe(false);
    expect(
      await owner.mutation(api.history.undo, { scopeId: otherId }),
    ).toBeNull();
  });
});

describe("undo/redo yetkilendirmesi", () => {
  it("başkasının dokümanında undo reddedilir", async () => {
    const { stranger, databaseId } = await fixture();
    await expect(
      stranger.mutation(api.history.undo, { scopeId: databaseId }),
    ).rejects.toThrow(/Not authorized/);
  });

  it("anonim ziyaretçi undo çağıramaz", async () => {
    const { anonymous, databaseId } = await fixture();
    await expect(
      anonymous.mutation(api.history.undo, { scopeId: databaseId }),
    ).rejects.toThrow(/Not authenticated/);
  });

  it("yayınlanmış doküman bile olsa geçmiş anonim okunamaz", async () => {
    const { owner, anonymous, databaseId } = await fixture();
    await owner.mutation(api.documents.update, {
      id: databaseId,
      isPublished: true,
    });

    const state = await anonymous.query(api.history.getUndoState, {
      scopeId: databaseId,
    });
    expect(state).toEqual({
      canUndo: false,
      canRedo: false,
      undoLabel: null,
      redoLabel: null,
    });
  });
});

describe("mutation'ların journal'a bağlanması", () => {
  it("updateCell geri alınınca hücre eski değerine döner", async () => {
    const { owner, databaseId, rows, properties } = await fixture();
    const rowId = rows[0]._id;
    const propertyId = properties[0]._id;

    await owner.mutation(api.databases.updateCell, {
      rowId,
      propertyId,
      value: "İlk",
    });
    await owner.mutation(api.databases.updateCell, {
      rowId,
      propertyId,
      value: "İkinci",
    });

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    let live = await owner.query(api.databases.getRows, { databaseId });
    expect(live[0].cells[propertyId]).toBe("İlk");

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    live = await owner.query(api.databases.getRows, { databaseId });
    expect(live[0].cells[propertyId]).toBeUndefined();

    await owner.mutation(api.history.redo, { scopeId: databaseId });
    live = await owner.query(api.databases.getRows, { databaseId });
    expect(live[0].cells[propertyId]).toBe("İlk");
  });

  it("değişmeyen hücre yazımı yığına kayıt düşmez", async () => {
    const { owner, databaseId, rows, properties } = await fixture();

    await owner.mutation(api.databases.updateCell, {
      rowId: rows[0]._id,
      propertyId: properties[0]._id,
      value: "",
    });

    const state = await owner.query(api.history.getUndoState, {
      scopeId: databaseId,
    });
    expect(state.canUndo).toBe(false);
  });

  it("createRow geri alınınca satır kaybolur, yinelenince döner", async () => {
    const { owner, databaseId, rows } = await fixture();

    const newRowId = await owner.mutation(api.databases.createRow, {
      databaseId,
    });
    expect(
      (await owner.query(api.databases.getRows, { databaseId })).length,
    ).toBe(rows.length + 1);

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    const afterUndo = await owner.query(api.databases.getRows, { databaseId });
    expect(afterUndo.map((r) => r._id)).not.toContain(newRowId);

    await owner.mutation(api.history.redo, { scopeId: databaseId });
    const afterRedo = await owner.query(api.databases.getRows, { databaseId });
    expect(afterRedo.map((r) => r._id)).toContain(newRowId);
  });

  it("deleteProperty geri alınınca kolon AYNI id ile ve hücreleriyle döner", async () => {
    const { owner, databaseId, rows, properties } = await fixture();
    const propertyId = properties[0]._id;

    await owner.mutation(api.databases.updateCell, {
      rowId: rows[0]._id,
      propertyId,
      value: "Korunmalı",
    });
    await owner.mutation(api.databases.createProperty, {
      databaseId,
      type: "text",
      name: "İkinci",
    });

    await owner.mutation(api.databases.deleteProperty, { propertyId });
    expect(
      (await owner.query(api.databases.getSchema, { databaseId })).map(
        (p) => p._id,
      ),
    ).not.toContain(propertyId);

    await owner.mutation(api.history.undo, { scopeId: databaseId });

    const schema = await owner.query(api.databases.getSchema, { databaseId });
    expect(schema.map((p) => p._id)).toContain(propertyId);

    // Asıl mesele: hücre verisi propertyId ile anahtarlı olduğu için
    // kolonun ESKİ id ile dönmesi şart.
    const live = await owner.query(api.databases.getRows, { databaseId });
    expect(live[0].cells[propertyId]).toBe("Korunmalı");
  });

  it("renameProperty geri alınınca eski ad döner", async () => {
    const { owner, databaseId, properties } = await fixture();
    const propertyId = properties[0]._id;
    const oldName = properties[0].name;

    await owner.mutation(api.databases.renameProperty, {
      propertyId,
      name: "Başlık",
    });
    await owner.mutation(api.history.undo, { scopeId: databaseId });

    const schema = await owner.query(api.databases.getSchema, { databaseId });
    expect(schema.find((p) => p._id === propertyId)?.name).toBe(oldName);
  });

  it("silinmiş satıra yazma denemesi reddedilir", async () => {
    const { owner, rows, properties } = await fixture();
    await owner.mutation(api.databases.deleteRow, { rowId: rows[0]._id });

    await expect(
      owner.mutation(api.databases.updateCell, {
        rowId: rows[0]._id,
        propertyId: properties[0]._id,
        value: "hayalet",
      }),
    ).rejects.toThrow(/Row not found/);
  });
});

describe("sıralama ve tip değişimi geri alınabiliyor", () => {
  it("reorderRow geri alınınca eski sıra döner", async () => {
    const { owner, databaseId, rows } = await fixture();
    const original = rows.map((r) => r._id);

    await owner.mutation(api.databases.reorderRow, {
      rowId: rows[0]._id,
      beforeRowId: rows[2]._id,
    });
    const moved = await owner.query(api.databases.getRows, { databaseId });
    expect(moved.map((r) => r._id)).not.toEqual(original);

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    const restored = await owner.query(api.databases.getRows, { databaseId });
    expect(restored.map((r) => r._id)).toEqual(original);
  });

  it("changePropertyType geri alınınca hücre değerleri de eski hâline döner", async () => {
    const { owner, databaseId, rows, properties } = await fixture();
    const propertyId = properties[0]._id;

    await owner.mutation(api.databases.updateCell, {
      rowId: rows[0]._id,
      propertyId,
      value: "42",
    });

    await owner.mutation(api.databases.changePropertyType, {
      propertyId,
      type: "number",
    });
    let live = await owner.query(api.databases.getRows, { databaseId });
    expect(live[0].cells[propertyId]).toBe(42);

    await owner.mutation(api.history.undo, { scopeId: databaseId });

    const schema = await owner.query(api.databases.getSchema, { databaseId });
    expect(schema.find((p) => p._id === propertyId)?.type).toBe("text");
    live = await owner.query(api.databases.getRows, { databaseId });
    expect(live[0].cells[propertyId]).toBe("42");
  });

  it("duplicateRow geri alınınca kopya kaybolur, asıl kalır", async () => {
    const { owner, databaseId, rows } = await fixture();

    const copyId = await owner.mutation(api.databases.duplicateRow, {
      rowId: rows[0]._id,
    });
    await owner.mutation(api.history.undo, { scopeId: databaseId });

    const live = await owner.query(api.databases.getRows, { databaseId });
    expect(live.map((r) => r._id)).not.toContain(copyId);
    expect(live.map((r) => r._id)).toContain(rows[0]._id);
  });
});

describe("doküman yüzeyi", () => {
  it("başlık değişikliği geri alınır, içerik journal'a girmez", async () => {
    const { owner, databaseId } = await fixture();

    await owner.mutation(api.documents.update, {
      id: databaseId,
      title: "Yeni Başlık",
    });
    await owner.mutation(api.history.undo, { scopeId: databaseId });

    const doc = await owner.query(api.documents.getById, {
      documentId: databaseId,
    });
    expect(doc?.title).toBe("Kitaplar");

    // Yalnızca içerik değişince kayıt düşmemeli — editör kendi
    // history'sini yönetiyor.
    await owner.mutation(api.documents.update, {
      id: databaseId,
      content: "[]",
    });
    const state = await owner.query(api.history.getUndoState, {
      scopeId: databaseId,
    });
    expect(state.canUndo).toBe(false);
  });

  it("toggleFavorite geri alınabilir", async () => {
    const { owner, databaseId } = await fixture();

    await owner.mutation(api.documents.toggleFavorite, { id: databaseId });
    expect(
      (await owner.query(api.documents.getById, { documentId: databaseId }))
        ?.isFavorite,
    ).toBe(true);

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    // Alan başlangıçta HİÇ YOKTU; sadık geri alma onu `false` yapmak değil,
    // kaldırmaktır (patchInverse'in `remove` listesi). İkisi de "favori
    // değil" demek.
    expect(
      (await owner.query(api.documents.getById, { documentId: databaseId }))
        ?.isFavorite,
    ).toBeUndefined();
  });
});
