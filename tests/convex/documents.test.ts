import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { setup } from "@/tests/support/convex/harness";

type Owner = ReturnType<typeof setup>["owner"];

/** kök → çocuk → torun zinciri; torun bir database. */
async function buildTree(owner: Owner) {
  const rootId = await owner.mutation(api.documents.create, { title: "Kök" });
  const childId = await owner.mutation(api.documents.create, {
    title: "Çocuk",
    parentDocument: rootId,
  });
  const databaseId = await owner.mutation(api.databases.createDatabase, {
    title: "Torun DB",
    parentDocument: childId,
  });
  return { rootId, childId, databaseId };
}

describe("documents.remove — tüm alt ağacı siler", () => {
  it("kökü silmek çocuğu ve torunu da siler", async () => {
    const { t, owner } = setup();
    const { rootId, childId, databaseId } = await buildTree(owner);

    await owner.mutation(api.documents.remove, { id: rootId });

    const remaining = await t.run(async (ctx) =>
      ctx.db.query("documents").collect(),
    );
    expect(remaining).toEqual([]);
    expect([rootId, childId, databaseId]).toHaveLength(3);
  });

  it("alt ağaçtaki database'in satır/sütun/view kayıtlarını yetim bırakmaz", async () => {
    const { t, owner } = setup();
    const { rootId, databaseId } = await buildTree(owner);

    // Silmeden önce gerçekten çocuk kayıtlar var mı — testin anlamlı olması için.
    const before = await t.run(async (ctx) => ({
      properties: await ctx.db.query("databaseProperties").collect(),
      rows: await ctx.db.query("databaseRows").collect(),
      views: await ctx.db.query("databaseViews").collect(),
    }));
    expect(before.properties.length).toBeGreaterThan(0);
    expect(before.rows.length).toBeGreaterThan(0);
    expect(before.views.length).toBeGreaterThan(0);

    await owner.mutation(api.documents.remove, { id: rootId });

    const after = await t.run(async (ctx) => ({
      properties: await ctx.db.query("databaseProperties").collect(),
      rows: await ctx.db.query("databaseRows").collect(),
      views: await ctx.db.query("databaseViews").collect(),
    }));
    expect(after).toEqual({ properties: [], rows: [], views: [] });
    expect(databaseId).toBeDefined();
  });

  it("kardeş ağaca dokunmaz", async () => {
    const { t, owner } = setup();
    const { rootId } = await buildTree(owner);
    const siblingId = await owner.mutation(api.documents.create, {
      title: "Kardeş",
    });

    await owner.mutation(api.documents.remove, { id: rootId });

    const remaining = await t.run(async (ctx) =>
      ctx.db.query("documents").collect(),
    );
    expect(remaining.map((doc) => doc._id)).toEqual([siblingId]);
  });
});

describe("archive / restore — alt ağaç yürüyüşü await edilir", () => {
  it("arşivleme tüm alt ağacı işaretler", async () => {
    const { t, owner } = setup();
    const { rootId } = await buildTree(owner);

    await owner.mutation(api.documents.archive, { id: rootId });

    const docs = await t.run(async (ctx) =>
      ctx.db.query("documents").collect(),
    );
    expect(docs).toHaveLength(3);
    expect(docs.every((doc) => doc.isArchived)).toBe(true);
  });

  it("geri yükleme tüm alt ağacı geri getirir", async () => {
    const { t, owner } = setup();
    const { rootId } = await buildTree(owner);

    await owner.mutation(api.documents.archive, { id: rootId });
    await owner.mutation(api.documents.restore, { id: rootId });

    const docs = await t.run(async (ctx) =>
      ctx.db.query("documents").collect(),
    );
    expect(docs.every((doc) => doc.isArchived)).toBe(false);
  });
});

describe("türetilmiş alanlar update ile senkron kalır", () => {
  it("başlık değişince searchText yeniden hesaplanır ve arama bulur", async () => {
    const { owner } = setup();
    const documentId = await owner.mutation(api.documents.create, {
      title: "İlk başlık",
    });

    await owner.mutation(api.documents.update, {
      id: documentId,
      title: "Fractional indexing notları",
    });

    const results = await owner.query(api.documents.searchDocuments, {
      query: "fractional",
    });
    expect(results.map((doc) => doc._id)).toContain(documentId);
  });

  it("kapak görseli değişince fileRefs eşlemesi güncellenir", async () => {
    const { t, owner } = setup();
    const documentId = await owner.mutation(api.documents.create, {
      title: "Kapaklı",
    });

    await owner.mutation(api.documents.update, {
      id: documentId,
      coverImage: "/api/files/uploads/user-owner/kapak.png",
    });

    const refs = await t.run(async (ctx) => ctx.db.query("fileRefs").collect());
    expect(refs.map((ref) => ref.documentId)).toEqual([documentId]);

    // Kapak değişince eski anahtar eşlemede kalmamalı — yoksa silinen
    // görsel yayınlanmış dokümanla erişilebilir kalır.
    await owner.mutation(api.documents.update, {
      id: documentId,
      coverImage: "/api/files/uploads/user-owner/yeni.png",
    });
    const after = await t.run(async (ctx) =>
      ctx.db.query("fileRefs").collect(),
    );
    expect(after).toHaveLength(1);
    expect(after[0].key).toContain("yeni.png");
  });

  it("harici (yönetilmeyen) kapak URL'i eşlemeye girmez", async () => {
    const { t, owner } = setup();
    const documentId = await owner.mutation(api.documents.create, {
      title: "Harici kapak",
    });

    await owner.mutation(api.documents.update, {
      id: documentId,
      coverImage: "https://images.example.com/foto.jpg",
    });

    const refs = await t.run(async (ctx) => ctx.db.query("fileRefs").collect());
    expect(refs).toEqual([]);
  });

  it("doküman kalıcı silinince fileRefs kaydı da gider", async () => {
    const { t, owner } = setup();
    const documentId: Id<"documents"> = await owner.mutation(
      api.documents.create,
      { title: "Kapaklı" },
    );
    await owner.mutation(api.documents.update, {
      id: documentId,
      coverImage: "/api/files/uploads/user-owner/kapak.png",
    });

    await owner.mutation(api.documents.remove, { id: documentId });

    const refs = await t.run(async (ctx) => ctx.db.query("fileRefs").collect());
    expect(refs).toEqual([]);
  });
});

describe("restore — sıralama", () => {
  /** Kökte üç sayfa. `create` `order` yazmaz; sidebar en yeniyi üste alır. */
  async function threePages(owner: ReturnType<typeof setup>["owner"]) {
    const ids = [];
    for (const title of ["Bir", "İki", "Üç"]) {
      ids.push(await owner.mutation(api.documents.create, { title }));
    }
    return ids;
  }

  it("trash'ten geri yükleme sayfayı listenin SONUNA taşır", async () => {
    const { owner } = setup();
    const [first] = await threePages(owner);

    // Sidebar başlangıçta [Üç, İki, Bir] — sıralama _creationTime desc.
    const before = (await owner.query(api.documents.getSidebar, {})).map(
      (d) => d._id,
    );
    expect(before[before.length - 1]).toBe(first);

    await owner.mutation(api.documents.archive, { id: first });
    await owner.mutation(api.documents.restore, { id: first });

    // Zaten sondaydı; asıl kanıt EN ÜSTTEKİ sayfanın sona düşmesi.
    const [top] = before;
    await owner.mutation(api.documents.archive, { id: top });
    await owner.mutation(api.documents.restore, { id: top });

    const after = await owner.query(api.documents.getSidebar, {});
    expect(after[after.length - 1]._id).toBe(top);
  });

  it("keepPosition ile geri yükleme sırayı hiç bozmaz", async () => {
    const { owner } = setup();
    await threePages(owner);
    const before = (await owner.query(api.documents.getSidebar, {})).map(
      (d) => d._id,
    );
    const top = before[0];

    await owner.mutation(api.documents.archive, { id: top });
    await owner.mutation(api.documents.restore, {
      id: top,
      keepPosition: true,
    });

    const after = await owner.query(api.documents.getSidebar, {});
    expect(after.map((d) => d._id)).toEqual(before);
  });
});
