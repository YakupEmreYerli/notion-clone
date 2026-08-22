// Satır/sütun sıralaması için fractional index. İki komşu arasına eleman
// eklemek tek yazma gerektirir; O(n) yeniden numaralandırma yapılmaz.

export const ORDER_GAP = 1024;
const MIN_GAP = 1e-4;

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
