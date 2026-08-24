// Dosya → doküman eşlemesi (`fileRefs`) için türetme ve senkronizasyon.
//
// `/api/files/<key>` GET'i "bu dosya yayınlanmış bir dokümana mı ait?"
// sorusunu bu tablodan cevaplıyor. Tablo türetilmiş veridir: kaynağı
// dokümanın `coverImage` alanı ve BlockNote içeriğidir — `searchText` gibi,
// içerik/kapak değiştiren her yazma yolunda yeniden hesaplanmak zorundadır.
//
// `lib/storage.ts:getDocumentUrls` istemci tarafında aynı çıkarımı yapıyor;
// bu dosya onun sunucu tarafındaki karşılığıdır (Convex fonksiyonları
// `lib/`'ten import edemez). Blok tipi listesi ikisinde de aynı tutulmalı —
// `convex/lib/searchText.ts` ile aynı saf-JSON gezme yaklaşımı.

import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

export const FILE_ROUTE_PREFIX = "/api/files/";

const MEDIA_BLOCK_TYPES = new Set(["image", "video", "audio", "file", "pdf"]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Yönetilen bir dosya URL'ini (`/api/files/uploads/...`) depolama anahtarına
 * çevirir. Bizim yüklemediğimiz (mutlak/harici) URL'ler ve prefix dışındaki
 * her şey `null` döner — `app/api/files/[...key]` ile aynı kabul kuralları:
 * anahtar `uploads/` ile başlamalı ve `..` içermemeli.
 */
export const toStorageKey = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.startsWith(FILE_ROUTE_PREFIX)) {
    return null;
  }

  const raw = value.slice(FILE_ROUTE_PREFIX.length).split(/[?#]/)[0];

  let key: string;
  try {
    key = raw
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }

  if (!key.startsWith("uploads/") || key.includes("..")) return null;

  return key;
};

const collectBlockKeys = (blocks: unknown, out: Set<string>) => {
  if (!Array.isArray(blocks)) return;

  for (const block of blocks) {
    if (!isObject(block)) continue;

    if (typeof block.type === "string" && MEDIA_BLOCK_TYPES.has(block.type)) {
      const props = block.props;
      if (isObject(props)) {
        const key = toStorageKey(props.url);
        if (key) out.add(key);
      }
    }

    if (block.children !== undefined) {
      collectBlockKeys(block.children, out);
    }
  }
};

/** Bir dokümanın referans verdiği tüm yönetilen dosya anahtarları. */
export const extractFileKeys = (
  coverImage: string | undefined,
  content: string | undefined,
): string[] => {
  const keys = new Set<string>();

  const coverKey = toStorageKey(coverImage);
  if (coverKey) keys.add(coverKey);

  if (content) {
    let blocks: unknown;
    try {
      blocks = JSON.parse(content);
    } catch {
      blocks = undefined;
    }
    collectBlockKeys(blocks, keys);
  }

  return [...keys];
};

/**
 * Dokümanın eşleme kayıtlarını istenen anahtar kümesine getirir (fark
 * uygulanır, tablo baştan yazılmaz). Aynı dosya birden çok dokümanda
 * geçebilir (ör. `duplicate`) — bu yüzden kayıt (key, documentId) çiftidir,
 * anahtar başına tek satır değil.
 */
export async function syncFileRefs(
  ctx: MutationCtx,
  documentId: Id<"documents">,
  userId: string,
  coverImage: string | undefined,
  content: string | undefined,
) {
  const desired = new Set(extractFileKeys(coverImage, content));

  const existing = await ctx.db
    .query("fileRefs")
    .withIndex("by_document", (q) => q.eq("documentId", documentId))
    .collect();

  const seen = new Set<string>();
  const writes: Promise<unknown>[] = [];

  for (const ref of existing) {
    // Aynı anahtarın mükerrer kaydı varsa fazlası da temizlenir.
    if (desired.has(ref.key) && !seen.has(ref.key)) {
      seen.add(ref.key);
      continue;
    }
    writes.push(ctx.db.delete(ref._id));
  }

  for (const key of desired) {
    if (seen.has(key)) continue;
    writes.push(ctx.db.insert("fileRefs", { key, documentId, userId }));
  }

  await Promise.all(writes);
}

/**
 * Doküman kalıcı olarak silinirken çağrılır. Çağrılmazsa kayıt yetim kalır
 * ve — dokümanı silinmiş olsa da — `isPubliclyReadable` için ölü bir satır
 * olarak birikir.
 */
export async function deleteFileRefs(
  ctx: MutationCtx,
  documentId: Id<"documents">,
) {
  const refs = await ctx.db
    .query("fileRefs")
    .withIndex("by_document", (q) => q.eq("documentId", documentId))
    .collect();

  await Promise.all(refs.map((ref) => ctx.db.delete(ref._id)));
}
