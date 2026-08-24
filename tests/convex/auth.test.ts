import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";

import { OWNER, setup } from "./support/harness";

// CLAUDE.md'deki yükü taşıyan değişmez: "yayınlanmış mı?" sorusu "kullanıcı
// var mı?" sorusundan ÖNCE sorulur. Sıra ters çevrilirse anonim /preview
// sessizce kırılır — build ve tsc bunu yakalamaz.
describe("public-before-auth okuma sırası", () => {
  it("yayınlanmış dokümanı anonim ziyaretçiye verir", async () => {
    const { t, owner, anonymous } = setup();

    const documentId = await owner.mutation(api.documents.create, {
      title: "Yayında",
    });
    await owner.mutation(api.documents.update, {
      id: documentId,
      isPublished: true,
    });

    const document = await anonymous.query(api.documents.getById, {
      documentId,
    });
    expect(document.title).toBe("Yayında");
    expect(document.userId).toBe(OWNER);

    // Kontrol grubu: aynı doküman yayından kaldırılınca anonim erişim kapanır.
    await owner.mutation(api.documents.update, {
      id: documentId,
      isPublished: false,
    });
    await expect(
      anonymous.query(api.documents.getById, { documentId }),
    ).rejects.toThrow("Not authenticated");

    expect(t).toBeDefined();
  });

  it("arşivlenmiş bir doküman yayınlanmış olsa bile anonim okunamaz", async () => {
    const { owner, anonymous } = setup();

    const documentId = await owner.mutation(api.documents.create, {
      title: "Arşivde ama yayında",
    });
    await owner.mutation(api.documents.update, {
      id: documentId,
      isPublished: true,
    });
    await owner.mutation(api.documents.archive, { id: documentId });

    await expect(
      anonymous.query(api.documents.getById, { documentId }),
    ).rejects.toThrow("Not authenticated");
  });

  it("yayınlanmamış dokümanı başka bir kullanıcıya vermez", async () => {
    const { owner, stranger } = setup();

    const documentId = await owner.mutation(api.documents.create, {
      title: "Özel",
    });

    await expect(
      stranger.query(api.documents.getById, { documentId }),
    ).rejects.toThrow("Not authorized");
  });
});

describe("sahiplik kontrolleri", () => {
  it("başka kullanıcının database'ine yazmayı reddeder", async () => {
    const { owner, stranger } = setup();

    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });

    await expect(
      stranger.mutation(api.databases.createRow, { databaseId }),
    ).rejects.toThrow("Not authorized");
  });

  it("kimliksiz çağrıyı Not authenticated ile reddeder", async () => {
    const { owner, anonymous } = setup();

    const databaseId = await owner.mutation(api.databases.createDatabase, {
      title: "Kitaplar",
    });

    await expect(
      anonymous.mutation(api.databases.createRow, { databaseId }),
    ).rejects.toThrow("Not authenticated");
  });
});
