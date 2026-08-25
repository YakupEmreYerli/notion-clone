"use client";

import { useCallback, useState } from "react";

/**
 * Side peek genişliği — sürüklenerek değiştirilir ve tarayıcıda saklanır.
 *
 * Varsayılan Notion ölçümü: panel viewport'un **%48.5**'i
 * (1568px'de 761px — bkz. docs/notion-research/board-parity.md). Eskiden
 * `max-w-sm` (384px) sabitti, yani Notion'ın yarısından dar açılıyordu.
 *
 * `window`'a render sırasında bakmak burada güvenli: bu hook yalnızca
 * `RowPeekModal` içinden çağrılıyor ve `ModalProvider` mount olmadan hiçbir
 * modal'ı render etmiyor — yani sunucuda hiç çalışmıyor. Böylece effect'te
 * setState yapmaya (ve `set-state-in-effect` ihlaline) gerek kalmıyor.
 */
const STORAGE_KEY = "zotion-row-peek-width";
const DEFAULT_RATIO = 0.485;
export const MIN_WIDTH = 380;
export const MAX_RATIO = 0.9;

/** Sürükleme sırasında DOM'a doğrudan yazarken de aynı sınırlar geçerli. */
export const clampWidth = (width: number, viewport = window.innerWidth) =>
  Math.min(Math.max(width, MIN_WIDTH), Math.max(MIN_WIDTH, viewport * MAX_RATIO));

const initialWidth = () => {
  const viewport = window.innerWidth;
  let stored: number | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    stored = raw ? Number(raw) : null;
  } catch {
    stored = null;
  }
  return clampWidth(
    stored && Number.isFinite(stored) ? stored : viewport * DEFAULT_RATIO,
    viewport,
  );
};

export const useRowPeekWidth = () => {
  const [width, setWidth] = useState<number>(initialWidth);

  const resizeTo = useCallback((next: number) => {
    const clamped = clampWidth(next);
    setWidth(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Math.round(clamped)));
    } catch {
      // Depolama kapalı — genişlik yalnızca bu oturumda yaşar.
    }
  }, []);

  return { width, resizeTo };
};
