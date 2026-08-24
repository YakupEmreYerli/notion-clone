import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { normalizeStoredType } from "@/lib/fileTypes";
import { rateLimit } from "@/lib/rateLimit";
import { putObject } from "@/lib/s3";
import { FILE_ROUTE_PREFIX } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_SIZE || 50 * 1024 * 1024);

// Kullanıcı başına yükleme sayısı. Normal kullanımda (cover + editör görselleri)
// erişilmesi zor, otomatik bir döngüde hemen dolan bir eşik.
const UPLOAD_LIMIT = Number(process.env.UPLOAD_RATE_LIMIT || 40);
const UPLOAD_WINDOW_MS = Number(process.env.UPLOAD_RATE_WINDOW_MS || 5 * 60_000);

const sanitizeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-80) || "file";

export const POST = async (request: NextRequest) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(
    `upload:${session.user.id}`,
    UPLOAD_LIMIT,
    UPLOAD_WINDOW_MS,
  );

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads, try again shortly" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File is too large" }, { status: 413 });
  }

  const key = `uploads/${session.user.id}/${randomUUID()}-${sanitizeName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // İstemcinin bildirdiği tip olduğu gibi saklanmaz — bkz. lib/fileTypes.ts.
  await putObject(key, buffer, normalizeStoredType(file.type));

  return NextResponse.json({ url: `${FILE_ROUTE_PREFIX}${key}` });
};
