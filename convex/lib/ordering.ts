// Satır/sütun sıralaması için fractional index. İki komşu arasına eleman
// eklemek tek yazma gerektirir; O(n) yeniden numaralandırma yapılmaz.

export const ORDER_GAP = 1024;
export const MIN_GAP = 1e-4;

// Rebalance sırasında tek mutation'da yazılabilecek maksimum doküman.
// Convex mutation'ları transactionaldir — sınırı aşmak tüm mutation'ı
// geri alır, bu yüzden paketlenmiş run'lar bu sayının altında tutulur.
export const REBALANCE_WRITE_LIMIT = 2000;

// Board gruplama anahtarı sabitleri. groupKey bir string'dir:
// select/multiSelect → option id · checkbox → "true"/"false" · date → bucket
// ("today"/"this_week"/...) · person/relation → id · gruplanmamış → GROUP_KEY_NONE.
export const GROUP_KEY_NONE = "__none__";
export const GROUP_KEY_DEFAULT = "__default__";

// Sonuç null ise komşular birbirine çok yakın demektir — çağıran taraf
// tüm kardeşleri ORDER_GAP aralıklarıyla yeniden yazmalı (rebalance).
export function orderBetween(
  prev: number | undefined,
  next: number | undefined,
): number | null {
  if (prev === undefined && next === undefined) return 0;
  if (prev === undefined) return next! - ORDER_GAP;
  if (next === undefined) return prev + ORDER_GAP;
  if (next - prev < MIN_GAP) return null;
  return (prev + next) / 2;
}

// Convex index'leri ikincil sıralama desteklemez (ORDER BY tiebreak yok).
// Kardeşler index sırasıyla gelir; eşit order'lı satırlar (eşzamanlı insert,
// migration artığı) deterministik sıralanmasın diye _id ile bağlanır —
// her sıralama noktasında bu helper kullanılır. `_id: unknown` kısıtı,
// Convex'in markalı Id<> tiplerinin generic üzerinden korunmasını sağlar.
function sortByKeyThenId<T extends { _id: unknown }>(
  items: T[],
  key: "order" | "position",
): T[] {
  return [...items].sort(
    (a, b) =>
      ((a as Record<string, unknown>)[key] as number) -
        ((b as Record<string, unknown>)[key] as number) ||
      (String(a._id) < String(b._id) ? -1 : 1),
  );
}

export function sortByOrderThenId<T extends { order: number; _id: unknown }>(
  items: T[],
): T[] {
  return sortByKeyThenId(items, "order");
}

// databaseViews satırları `order` değil `position` taşır.
export function sortByPositionThenId<
  T extends { position: number; _id: unknown },
>(items: T[]): T[] {
  return sortByKeyThenId(items, "position");
}
