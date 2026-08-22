import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
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

    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        "content-type": object.ContentType || "application/octet-stream",
        ...(object.ContentLength
          ? { "content-length": String(object.ContentLength) }
          : {}),
        // Keys are immutable (uuid based), so this is safe to cache hard.
        "cache-control": "public, max-age=31536000, immutable",
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
