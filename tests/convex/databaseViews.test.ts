import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
import { GROUP_KEY_NONE, ORDER_GAP } from "@/convex/lib/ordering";

import { setup } from "./support/harness";

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

  it("deleteView view'ın sıra kayıtlarını da temizler", async () => {
    const { t, owner } = setup();
    const { viewId, rows, next } = await boardFixture(owner);
    await owner.mutation(api.databaseViews.moveRow, {
      viewId,
      rowId: rows[0]._id,
      toGroupKey: String(next),
    });

    await owner.mutation(api.databaseViews.deleteView, { viewId });

    const leftovers = await t.run(async (ctx) =>
      ctx.db.query("viewCardOrder").collect(),
    );
    expect(leftovers).toEqual([]);
  });
});
