/**
 * Yüklenen dosyaların içerik tipi politikası.
 *
 * İki taraflı uygulanır: yüklerken ne sakladığımız (`normalizeStoredType`) ve
 * servis ederken ne döndürdüğümüz (`serveHeadersFor`). İstemciden gelen
 * `File.type` hiçbir zaman olduğu gibi saklanmaz veya geri gönderilmez —
 * aksi halde uygulamanın kendi origin'inde çalıştırılabilir içerik servis
 * edilebilir.
 */

/** Tarayıcıda satır içi gösterilmesi güvenli olan tipler. SVG bilinçli olarak
 *  dışarıda: script taşıyabilir ve `image/*` sanılıp inline gösterilir. */
const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

/** Satır içi gösterilmeyen ama saklanan tipler için tek tip fallback. */
export const FALLBACK_TYPE = "application/octet-stream";

export const isInlineType = (type: string | undefined | null): boolean =>
  !!type && INLINE_TYPES.has(type.split(";")[0].trim().toLowerCase());

/** Yüklemede: bilinen-güvenli tipse koru, değilse nötrle. */
export const normalizeStoredType = (type: string | undefined | null): string =>
  isInlineType(type) ? type!.split(";")[0].trim().toLowerCase() : FALLBACK_TYPE;

/** Servis ederken: inline sadece allowlist için; gerisi indirme olarak iner. */
export const serveHeadersFor = (
  storedType: string | undefined,
  filename: string,
): Record<string, string> => {
  const inline = isInlineType(storedType);
  const safeName = filename.replace(/["\\]/g, "") || "file";

  return {
    "content-type": inline ? storedType! : FALLBACK_TYPE,
    "content-disposition": inline
      ? `inline; filename="${safeName}"`
      : `attachment; filename="${safeName}"`,
    // Tarayıcı içerik tipini tahmin edip allowlist'i atlatmasın.
    "x-content-type-options": "nosniff",
  };
};
