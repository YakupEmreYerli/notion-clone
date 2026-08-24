import { ConvexHttpClient } from "convex/browser";

import { getConvexUrl } from "./env";

/**
 * Sunucu tarafından (route handler'lar) Convex sorgusu çalıştırmak için
 * tek seferlik HTTP istemcisi. Uygulamanın geri kalanı Convex'e
 * `convex/react` üzerinden istemci tarafında bağlanıyor; burada gereken tek
 * şey `/api/files/<key>` erişim kontrolünün sorduğu kimliksiz (public)
 * sorgu.
 *
 * URL runtime'da okunur (`lib/env.ts`) — build zamanına gömülmez, böylece
 * aynı Docker image başka bir kurulumda da çalışır.
 */
const globalForConvex = globalThis as unknown as {
  convexHttpClient?: ConvexHttpClient;
};

export const getConvexServerClient = (): ConvexHttpClient => {
  if (globalForConvex.convexHttpClient) return globalForConvex.convexHttpClient;

  const url = getConvexUrl();

  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL) is not set.");
  }

  const client = new ConvexHttpClient(url);
  globalForConvex.convexHttpClient = client;

  return client;
};
