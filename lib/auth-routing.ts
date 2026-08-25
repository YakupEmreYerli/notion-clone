/**
 * Kök route'un (`/`) nereye yönlendireceğini belirleyen saf karar fonksiyonu.
 *
 * Ayrı bir dosyada ve saf tutuluyor ki üç dalın hepsi veritabanı ya da
 * tarayıcı olmadan test edilebilsin — `app/page.tsx` yalnızca girdileri
 * toplayıp bunu çağırır.
 */

export type RootDestination = "/documents" | "/register" | "/login";

export interface RootDestinationInput {
  /** Geçerli bir oturum çerezi/oturumu var mı. */
  hasSession: boolean;
  /** Postgres'te en az bir kullanıcı kayıtlı mı. */
  hasAnyUser: boolean;
}

/**
 * Sıra önemli: oturum her şeyden önce gelir. Oturumu olan bir kullanıcı,
 * kurulum henüz "boş" görünse bile (yarış durumu) uygulamaya girmelidir.
 */
export function resolveRootDestination({
  hasSession,
  hasAnyUser,
}: RootDestinationInput): RootDestination {
  if (hasSession) return "/documents";
  if (!hasAnyUser) return "/register";
  return "/login";
}
