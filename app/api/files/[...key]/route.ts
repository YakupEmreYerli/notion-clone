import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { serveHeadersFor } from "@/lib/fileTypes";
import { deleteObject, getObject } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string[] }> };

const resolveKey = (segments: string[]) => {
  const key = segments.map((segment) => decodeURIComponent(segment)).join("/");

  // Only ever touch keys this app created, and never escape the prefix.
  if (!key.startsWith("uploads/") || key.includes("..")) return null;

  return key;
};

/**
 * GET bilinçli olarak kimlik doğrulaması yapmaz: yayınlanmış bir sayfanın
 * (`/preview/<id>`) görselleri anonim ziyaretçiye açılabilmeli. Erişim modeli
 * bu yüzden "URL'yi bilen erişir" (capability URL) — anahtarlar UUID içerdiği
 * için tahmin edilemez. Buradaki başlıklar bu modelin sızıntı yüzeyini daraltır:
 * içerik tipi allowlist dışıysa çalıştırılamaz biçimde iner, tarayıcı tip
 * tahmini kapalıdır, URL referrer ile üçüncü taraflara sızmaz ve yanıt
 * paylaşımlı önbelleklerde tutulmaz.
 */
export const GET = async (_request: NextRequest, { params }: Params) => {
  const key = resolveKey((await params).key);

  if (!key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const object = await getObject(key);

    if (!object.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filename = key.slice(key.lastIndexOf("/") + 1);

    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        ...serveHeadersFor(object.ContentType, filename),
        ...(object.ContentLength
          ? { "content-length": String(object.ContentLength) }
          : {}),
        // Anahtarlar değişmez (uuid tabanlı), bu yüzden uzun süre önbelleklenir;
        // `private` paylaşımlı önbelleklerin (CDN/proxy) tutmasını engeller.
        "cache-control": "private, max-age=31536000, immutable",
        "referrer-policy": "no-referrer",
        ...(object.ETag ? { etag: object.ETag } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
};

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = resolveKey((await params).key);

  if (!key || !key.startsWith(`uploads/${session.user.id}/`)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    await deleteObject(key);
  } catch (error) {
    console.warn("Failed to delete object", key, error);
  }

  return NextResponse.json({ success: true });
};
