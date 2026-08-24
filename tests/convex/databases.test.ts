import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
import { MIN_GAP, ORDER_GAP } from "@/convex/lib/ordering";

import { setup } from "./support/harness";

describe("satır sıralaması (fractional index)", () => {
  it("createDatabase üç satırı ORDER_GAP aralıklarıyla seed'ler", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });

    const rows = await owner.query(api.databases.getRows, { databaseId });
    expect(rows.map((row) => row.order)).toEqual([
      0,
      ORDER_GAP,
      2 * ORDER_GAP,
    ]);
  });

  it("afterRowId verilmezse yeni satır en başa eklenir", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const before = await owner.query(api.databases.getRows, { databaseId });

    const newRowId = await owner.mutation(api.databases.createRow, {
      databaseId,
    });

    const after = await owner.query(api.databases.getRows, { databaseId });
    expect(after[0]._id).toBe(newRowId);
    expect(after).toHaveLength(before.length + 1);
  });

  it("afterRowId verilince satır tam o komşunun arkasına girer", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const rows = await owner.query(api.databases.getRows, { databaseId });

    const newRowId = await owner.mutation(api.databases.createRow, {
      databaseId,
      afterRowId: rows[0]._id,
    });

    const after = await owner.query(api.databases.getRows, { databaseId });
    expect(after.map((row) => row._id)).toEqual([
      rows[0]._id,
      newRowId,
      rows[1]._id,
      rows[2]._id,
    ]);
  });

  it("reorderRow iki komşunun arasına taşır ve kardeşleri yeniden yazmaz", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const [first, second, third] = await owner.query(api.databases.getRows, {
      databaseId,
    });

    // İlk satırı ikinci ile üçüncünün arasına taşı.
    await owner.mutation(api.databases.reorderRow, {
      rowId: first._id,
      beforeRowId: second._id,
      afterRowId: third._id,
    });

    const after = await owner.query(api.databases.getRows, { databaseId });
    expect(after.map((row) => row._id)).toEqual([
      second._id,
      first._id,
      third._id,
    ]);
    // Fractional index'in bütün noktası: komşular yerinde kaldı.
    expect(after[0].order).toBe(second.order);
    expect(after[2].order).toBe(third.order);
  });

  it("komşular MIN_GAP'ten yakınsa tüm kardeşleri yeniden aralıklandırır", async () => {
    const { t, owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const rows = await owner.query(api.databases.getRows, { databaseId });

    // İki satırı yapay olarak sıkıştır: aralarına artık sayı sığmıyor.
    await t.run(async (ctx) => {
      await ctx.db.patch(rows[0]._id, { order: 0 });
      await ctx.db.patch(rows[1]._id, { order: MIN_GAP / 2 });
    });

    await owner.mutation(api.databases.reorderRow, {
      rowId: rows[2]._id,
      beforeRowId: rows[0]._id,
      afterRowId: rows[1]._id,
    });

    const after = await owner.query(api.databases.getRows, { databaseId });
    expect(after.map((row) => row._id)).toEqual([
      rows[0]._id,
      rows[2]._id,
      rows[1]._id,
    ]);
    // Rebalance sonrası her komşu çifti yeniden ayrılmış olmalı.
    for (let i = 1; i < after.length; i++) {
      expect(after[i].order - after[i - 1].order).toBeGreaterThanOrEqual(
        MIN_GAP,
      );
    }
  });
});

describe("updateCell — patch sığ merge eder", () => {
  it("bir hücreyi yazarken diğer hücreleri düşürmez", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const properties = await owner.query(api.databases.getSchema, {
      databaseId,
    });
    const titleId = properties[0]._id;
    const scoreId = await owner.mutation(api.databases.createProperty, {
      databaseId,
      type: "number",
      name: "Puan",
    });
    const [row] = await owner.query(api.databases.getRows, { databaseId });

    await owner.mutation(api.databases.updateCell, {
      rowId: row._id,
      propertyId: titleId,
      value: "Atomik Alışkanlıklar",
    });
    await owner.mutation(api.databases.updateCell, {
      rowId: row._id,
      propertyId: scoreId,
      value: 9,
    });

    const [updated] = await owner.query(api.databases.getRows, { databaseId });
    expect(updated.cells[titleId]).toBe("Atomik Alışkanlıklar");
    expect(updated.cells[scoreId]).toBe(9);
  });

  it("false ve 0'ı değer sayar, boş string ve null'ı hücreden siler", async () => {
    const { owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const doneId = await owner.mutation(api.databases.createProperty, {
      databaseId,
      type: "checkbox",
      name: "Bitti",
    });
    const scoreId = await owner.mutation(api.databases.createProperty, {
      databaseId,
      type: "number",
      name: "Puan",
    });
    const [row] = await owner.query(api.databases.getRows, { databaseId });

    await owner.mutation(api.databases.updateCell, {
      rowId: row._id,
      propertyId: doneId,
      value: false,
    });
    await owner.mutation(api.databases.updateCell, {
      rowId: row._id,
      propertyId: scoreId,
      value: 0,
    });

    let [updated] = await owner.query(api.databases.getRows, { databaseId });
    expect(updated.cells).toHaveProperty(doneId, false);
    expect(updated.cells).toHaveProperty(scoreId, 0);

    // Boş string gerçekten "hücreyi temizle" demektir.
    await owner.mutation(api.databases.updateCell, {
      rowId: row._id,
      propertyId: scoreId,
      value: "",
    });
    [updated] = await owner.query(api.databases.getRows, { databaseId });
    expect(updated.cells).not.toHaveProperty(scoreId);
    expect(updated.cells).toHaveProperty(doneId, false);
  });
});

describe("silme temizliği", () => {
  it("deleteRow satırın view sıra kayıtlarını da siler", async () => {
    const { t, owner } = setup();
    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });
    const views = await owner.query(api.databaseViews.getViews, { databaseId });
    const [row] = await owner.query(api.databases.getRows, { databaseId });

    await t.run(async (ctx) => {
      await ctx.db.insert("viewCardOrder", {
        viewId: views[0]._id,
        databaseId,
        userId: row.userId,
        groupKey: "__none__",
        rowId: row._id,
        order: 0,
      });
    });

    await owner.mutation(api.databases.deleteRow, { rowId: row._id });

    const leftovers = await t.run(async (ctx) =>
      ctx.db.query("viewCardOrder").collect(),
    );
    expect(leftovers).toEqual([]);
  });
});
