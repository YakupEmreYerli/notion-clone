import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";

import { setup } from "./support/harness";

const COVER = "/api/files/uploads/user-owner/kapak.png";
const COVER_KEY = "uploads/user-owner/kapak.png";

/** Kapağı olan bir doküman; `published` ise yayına da alınır. */
async function documentWithCover(
  owner: ReturnType<typeof setup>["owner"],
  { published }: { published: boolean },
) {
  const documentId = await owner.mutation(api.documents.create, {
    title: "Kapaklı",
  });
  await owner.mutation(api.documents.update, {
    id: documentId,
    coverImage: COVER,
    ...(published ? { isPublished: true } : {}),
  });
  return documentId;
}

// `/api/files/<key>` GET'i anonim ziyaretçi için tek soruyu bu sorguya sorar.
// Sorgu kasıtlı olarak kimlik istemez (public-before-auth) ve kasıtlı olarak
// yalnızca boolean döner — dosyanın varlığı veya sahibi sızmamalı.
describe("files.isPubliclyReadable", () => {
  it("yayınlanmış dokümanın dosyasına true döner", async () => {
    const { owner, anonymous } = setup();
    await documentWithCover(owner, { published: true });

    await expect(
      anonymous.query(api.files.isPubliclyReadable, { key: COVER_KEY }),
    ).resolves.toBe(true);
  });

  it("yayınlanmamış dokümanın dosyasına false döner", async () => {
    const { owner, anonymous } = setup();
    await documentWithCover(owner, { published: false });

    await expect(
      anonymous.query(api.files.isPubliclyReadable, { key: COVER_KEY }),
    ).resolves.toBe(false);
  });

  it("doküman arşivlenince erişim kapanır", async () => {
    const { owner, anonymous } = setup();
    const documentId = await documentWithCover(owner, { published: true });

    await owner.mutation(api.documents.archive, { id: documentId });

    await expect(
      anonymous.query(api.files.isPubliclyReadable, { key: COVER_KEY }),
    ).resolves.toBe(false);
  });

  it("yayından kaldırılınca erişim kapanır", async () => {
    const { owner, anonymous } = setup();
    const documentId = await documentWithCover(owner, { published: true });

    await owner.mutation(api.documents.update, {
      id: documentId,
      isPublished: false,
    });

    await expect(
      anonymous.query(api.files.isPubliclyReadable, { key: COVER_KEY }),
    ).resolves.toBe(false);
  });

  it("bilinmeyen anahtar için false döner (varlık bilgisi sızdırmaz)", async () => {
    const { anonymous } = setup();

    await expect(
      anonymous.query(api.files.isPubliclyReadable, {
        key: "uploads/user-owner/yok.png",
      }),
    ).resolves.toBe(false);
  });

  it("kapak değiştirilince eski dosya erişilemez olur", async () => {
    const { owner, anonymous } = setup();
    const documentId = await documentWithCover(owner, { published: true });

    await owner.mutation(api.documents.update, {
      id: documentId,
      coverImage: "/api/files/uploads/user-owner/yeni.png",
    });

    await expect(
      anonymous.query(api.files.isPubliclyReadable, { key: COVER_KEY }),
    ).resolves.toBe(false);
    await expect(
      anonymous.query(api.files.isPubliclyReadable, {
        key: "uploads/user-owner/yeni.png",
      }),
    ).resolves.toBe(true);
  });
});
