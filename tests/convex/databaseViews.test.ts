import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
import { GROUP_KEY_NONE, ORDER_GAP } from "@/convex/lib/ordering";

import { setup } from "@/tests/support/convex/harness";

type Owner = ReturnType<typeof setup>["owner"];

/** Board view + "Durum" select sütunu + üç satırlık hazır kurulum. */
async function boardFixture(owner: Owner) {
  const databaseId = await owner.mutation(api.databases.createDatabase, {
    title: "Kitaplar",
  });
  const statusId = await owner.mutation(api.databases.createProperty, {
    databaseId,
    type: "select",
    name: "Durum",
  });
  const next = await owner.mutation(api.databases.addSelectOption, {
    propertyId: statusId,
    label: "Sıradaki",
    color: "yellow",
  });
  const reading = await owner.mutation(api.databases.addSelectOption, {
    propertyId: statusId,
    label: "Okunuyor",
    color: "blue",
  });
  const viewId = await owner.mutation(api.databaseViews.createView, {
    databaseId,
    type: "board",
    name: "Board",
  });
  await owner.mutation(api.databaseViews.setGroupByProperty, {
    viewId,
    propertyId: statusId,
  });
  const rows = await owner.query(api.databases.getRows, { databaseId });

  return { databaseId, statusId, viewId, rows, next, reading };
}

describe("moveRow — sunucu otoriter kart taşıma", () => {
  it("kartı hedef gruba taşırken group-by hücresini de yazar", async () => {
    const { owner } = setup();
    const { databaseId, statusId, viewId, rows, reading } =
      await boardFixture(owner);

    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(reading),
    });

    const [moved] = await owner.query(api.databases.getRows, { databaseId });
    expect(moved.cells[statusId]).toBe(String(reading));
  });

  it("GROUP_KEY_NONE'a taşımak group-by hücresini temizler", async () => {
    const { owner } = setup();
    const { databaseId, statusId, viewId, rows, next } =
      await boardFixture(owner);

    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(next),
    });
    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: GROUP_KEY_NONE,
    });

    const [row] = await owner.query(api.databases.getRows, { databaseId });
    expect(row.cells).not.toHaveProperty(statusId);
  });

  it("aynı kartı iki kez taşımak çift sıra kaydı bırakmaz", async () => {
    const { owner } = setup();
    const { viewId, rows, next, reading } = await boardFixture(owner);

    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(next),
    });
    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(reading),
    });

    const orders = await owner.query(api.databaseViews.getViewOrders, {
      viewId,
    });
    const forRow = orders.filter((entry) => entry.rowId === rows[0]._id);
    expect(forRow).toHaveLength(1);
    expect(forRow[0].groupKey).toBe(String(reading));
  });

  it("beforeRowId / afterRowId ile grup içi sırayı korur", async () => {
    const { owner } = setup();
    const { viewId, rows, next } = await boardFixture(owner);

    // Üç kartı sırayla aynı gruba yığ: her biri bir öncekinin arkasına.
    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(next),
    });
    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[1]._id,
      toGroupKey: String(next),
      beforeRowId: rows[0]._id,
    });
    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[2]._id,
      toGroupKey: String(next),
      beforeRowId: rows[1]._id,
    });

    const orders = await owner.query(api.databaseViews.getViewOrders, {
      viewId,
    });
    expect(orders.map((entry) => entry.rowId)).toEqual([
      rows[0]._id,
      rows[1]._id,
      rows[2]._id,
    ]);
  });

  it("başka kullanıcının view'ında kart taşımayı reddeder", async () => {
    const { owner, stranger } = setup();
    const { viewId, rows, next } = await boardFixture(owner);

    await expect(
      stranger.mutation(api.databaseViews.moveRow, {
        viewId,
        rowId: rows[0]._id,
        toGroupKey: String(next),
      }),
    ).rejects.toThrow("Not authorized");
  });
});

describe("view yaşam döngüsü", () => {
  it("createDatabase varsayılan bir Table view'ı ile gelir", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });

    const views = await owner.query(api.databaseViews.getViews, { databaseId });
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ name: "Table", type: "table", position: 0 });
  });

  it("yeni view'lar position ile sıralanır", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const [table] = await owner.query(api.databaseViews.getViews, {
      databaseId,
    });

    const boardId = await owner.mutation(api.databaseViews.createView, {
      databaseId,
      type: "board",
      name: "Board",
      afterViewId: table._id,
    });

    const views = await owner.query(api.databaseViews.getViews, { databaseId });
    expect(views.map((view) => view._id)).toEqual([table._id, boardId]);
    expect(views[1].position).toBeGreaterThan(views[0].position);
    expect(ORDER_GAP).toBeGreaterThan(0);
  });

  it("deleteView view'ı ve sıra kayıtlarını canlı okumalardan düşürür", async () => {
    const { t, owner } = setup();
    const { databaseId, viewId, rows, next } = await boardFixture(owner);
    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(next),
    });

    await owner.mutation(api.databaseViews.deleteView, { viewId });

    expect(
      (await owner.query(api.databaseViews.getViews, { databaseId })).map(
        (v) => v._id,
      ),
    ).not.toContain(viewId);
    expect(
      await owner.query(api.databaseViews.getViewOrders, { viewId }),
    ).toEqual([]);

    // Kayıtlar SOFT-delete: `_id`'ler yaşıyor ki geri alma aynı kimlikler
    // üzerinde çalışsın (bkz. docs/undo-redo.md).
    const stored = await t.run(async (ctx) =>
      ctx.db.query("viewCardOrder").collect(),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].deletedAt).toBeTypeOf("number");
  });

  it("deleteView geri alınınca view ve kart sıraları AYNI id ile döner", async () => {
    const { owner } = setup();
    const { databaseId, viewId, rows, next } = await boardFixture(owner);
    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(next),
    });
    const ordersBefore = await owner.query(api.databaseViews.getViewOrders, {
      viewId,
    });

    await owner.mutation(api.databaseViews.deleteView, { viewId });
    await owner.mutation(api.history.undo, { scopeId: databaseId });

    expect(
      (await owner.query(api.databaseViews.getViews, { databaseId })).map(
        (v) => v._id,
      ),
    ).toContain(viewId);

    const ordersAfter = await owner.query(api.databaseViews.getViewOrders, {
      viewId,
    });
    expect(ordersAfter.map((o) => o._id)).toEqual(
      ordersBefore.map((o) => o._id),
    );
    expect(ordersAfter.map((o) => o.groupKey)).toEqual(
      ordersBefore.map((o) => o.groupKey),
    );
  });

  it("moveRow → undo → redo → undo döngüsü çift kart üretmez", async () => {
    const { owner } = setup();
    const { databaseId, viewId, rows, next, reading } =
      await boardFixture(owner);

    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(next),
    });
    const afterFirst = await owner.query(api.databaseViews.getViewOrders, {
      viewId,
    });
    expect(afterFirst).toHaveLength(1);

    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(reading),
    });
    expect(
      await owner.query(api.databaseViews.getViewOrders, { viewId }),
    ).toHaveLength(1);

    // Asıl sınav: undo → redo → undo. `insert`/`delete` op çifti kullanılsaydı
    // redo yeni bir _id üretir ve burada İKİ kayıt görürdük.
    for (const _ of [0, 1]) {
      await owner.mutation(api.history.undo, { scopeId: databaseId });
      await owner.mutation(api.history.redo, { scopeId: databaseId });
      await owner.mutation(api.history.undo, { scopeId: databaseId });

      const orders = await owner.query(api.databaseViews.getViewOrders, {
        viewId,
      });
      expect(orders).toHaveLength(1);
      expect(orders[0]._id).toBe(afterFirst[0]._id);
      expect(orders[0].groupKey).toBe(String(next));

      await owner.mutation(api.history.redo, { scopeId: databaseId });
    }
  });

  it("createView geri alınınca görünüm listeden düşer, yinelenince döner", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });

    const boardId = await owner.mutation(api.databaseViews.createView, {
      databaseId,
      type: "board",
      name: "Board",
    });

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    expect(
      (await owner.query(api.databaseViews.getViews, { databaseId })).map(
        (v) => v._id,
      ),
    ).not.toContain(boardId);

    await owner.mutation(api.history.redo, { scopeId: databaseId });
    expect(
      (await owner.query(api.databaseViews.getViews, { databaseId })).map(
        (v) => v._id,
      ),
    ).toContain(boardId);
  });
});

describe("setViewType (Display as)", () => {
  it("view türünü değiştirir ve ayarları korur", async () => {
    const { owner } = setup();
    const { databaseId, viewId, statusId } = await boardFixture(owner);

    await owner.mutation(api.databaseViews.setViewType, {
      viewId,
      type: "table",
    });

    const views = await owner.query(api.databaseViews.getViews, { databaseId });
    const view = views.find((v) => v._id === viewId);
    expect(view?.type).toBe("table");
    // Board'a özgü ayar silinmiyor — geri dönünce yerinde duruyor.
    expect(view?.groupByPropertyId).toBe(statusId);
  });

  it("değişiklik geri alınabilir", async () => {
    const { owner } = setup();
    const { databaseId, viewId } = await boardFixture(owner);

    await owner.mutation(api.databaseViews.setViewType, {
      viewId,
      type: "table",
    });
    await owner.mutation(api.history.undo, { scopeId: databaseId });

    const views = await owner.query(api.databaseViews.getViews, { databaseId });
    expect(views.find((v) => v._id === viewId)?.type).toBe("board");
  });

  it("aynı tür verilirse yığına kayıt düşmez", async () => {
    const { owner } = setup();
    const { databaseId, viewId } = await boardFixture(owner);
    const before = await owner.query(api.history.getUndoState, {
      scopeId: databaseId,
    });

    await owner.mutation(api.databaseViews.setViewType, {
      viewId,
      type: "board",
    });

    const after = await owner.query(api.history.getUndoState, {
      scopeId: databaseId,
    });
    expect(after.undoLabel).toBe(before.undoLabel);
  });
});

describe("tabDisplay (Display as)", () => {
  it("varsayılan tanımsız — istemci textAndIcon'a düşer", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const [view] = await owner.query(api.databaseViews.getViews, {
      databaseId,
    });
    expect(view.tabDisplay).toBeUndefined();
  });

  it("updateViewSettings ile ayarlanır ve geri alınabilir", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const [view] = await owner.query(api.databaseViews.getViews, {
      databaseId,
    });

    await owner.mutation(api.databaseViews.updateViewSettings, {
      viewId: view._id,
      tabDisplay: "iconOnly",
    });
    expect(
      (await owner.query(api.databaseViews.getViews, { databaseId }))[0]
        .tabDisplay,
    ).toBe("iconOnly");

    await owner.mutation(api.history.undo, { scopeId: databaseId });
    expect(
      (await owner.query(api.databaseViews.getViews, { databaseId }))[0]
        .tabDisplay,
    ).toBeUndefined();
  });
});
