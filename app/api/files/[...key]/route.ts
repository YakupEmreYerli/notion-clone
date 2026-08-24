import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";
import { getConvexServerClient } from "@/lib/convexServer";
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

/** Hızlı yol: anahtardaki `<userId>` oturum sahibiyse ek okuma gerekmez. */
const isOwner = async (request: NextRequest, key: string) => {
  const session = await auth.api.getSession({ headers: request.headers });

  return !!session?.user && key.startsWith(`uploads/${session.user.id}/`);
};

/** Eşleme yolu: dosya yayınlanmış bir dokümana aitse herkese açık. */
const isPubliclyReadable = async (key: string) => {
  try {
    return await getConvexServerClient().query(api.files.isPubliclyReadable, {
      key,
    });
  } catch (error) {
    console.warn("File access check failed", key, error);
    return false;
  }
};

/**
 * Erişim kontrolü iki yollu:
 *
 *  1. Sahibi — anahtarın içinde yükleyenin id'si var
 *     (`uploads/<userId>/<uuid>-<ad>`), oturum sahibiyle eşleşiyorsa dosya
 *     doğrudan servis edilir. Ek kayıt okumaya gerek yok.
 *  2. Herkes — dosya `isPublished && !isArchived` bir dokümana aitse
 *     (`convex/files.ts: isPubliclyReadable`, `fileRefs` eşlemesi) anonim
 *     olarak servis edilir. `/preview/<id>` sayfasının görselleri bu yoldan
 *     açılır.
 *
 * Sıra load-bearing DEĞİL ama başarısızlığı öyle: 1. yol tutmazsa istek
 * her zaman 2. yola düşer, yani oturumsuz ziyaretçi hiçbir zaman 401
 * görmez — yayın durumu kimlikten bağımsız değerlendirilir.
 *
 * Yetkisiz istek 403 değil **404** alır: yanıt, var olmayan bir anahtarla
 * ayırt edilemez olmalı ki hangi anahtarların gerçekten var olduğu
 * sızmasın. Convex'e ulaşılamazsa da 404 (fail-closed).
 *
 * Başlıklar bu modelin sızıntı yüzeyini ayrıca daraltır: içerik tipi
 * allowlist dışıysa çalıştırılamaz biçimde iner, tarayıcı tip tahmini
 * kapalıdır, URL referrer ile üçüncü taraflara sızmaz ve yanıt paylaşımlı
 * önbelleklerde tutulmaz.
 */
export const GET = async (request: NextRequest, { params }: Params) => {
  const key = resolveKey((await params).key);

  if (!key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await isOwner(request, key)) && !(await isPubliclyReadable(key))) {
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
