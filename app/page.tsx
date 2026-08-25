import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, hasAnyUser } from "@/lib/auth";
import { resolveRootDestination } from "@/lib/auth-routing";

/**
 * Kökün kendi içeriği yok: landing sayfası kaldırıldı, `/` yalnızca doğru
 * yere yönlendiriyor. Karar mantığı `lib/auth-routing.ts`'te saf tutuluyor.
 */
export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const hasSession = Boolean(session);

  // Oturum varsa kullanıcı sayımına hiç gitme — gereksiz sorgu.
  const destination = resolveRootDestination({
    hasSession,
    hasAnyUser: hasSession ? true : await hasAnyUser(),
  });

  redirect(destination);
}
