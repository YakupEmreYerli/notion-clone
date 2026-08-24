import { Id } from "@/convex/_generated/dataModel";

// Drop hedefi hesabı — saf fonksiyon, DOM ölçümleriyle beslenir.
// Notion davranışı (ölçülen): drag sırasında placeholder YOK, hedef kolon
// kartları KAYMAZ; hedef yalnızca drop anında pointer pozisyonundan
// hesaplanır. Kart sırası kartların dikey orta çizgisine göre bulunur:
// pointer kartın üst yarısındaysa "before", alt yarısındaysa "after".

export interface DropTarget {
  toGroupKey: string;
  beforeRowId?: Id<"databaseRows">;
  afterRowId?: Id<"databaseRows">;
}

export interface CardRect {
  rowId: Id<"databaseRows">;
  top: number;
  bottom: number;
}

export interface ColumnRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface DropColumn {
  groupKey: string;
  rect: ColumnRect;
  cards: CardRect[];
}

export function findDropTarget(
  x: number,
  y: number,
  columns: DropColumn[],
  sourceRowId: Id<"databaseRows">,
): DropTarget | null {
  // Pointer hangi kolonun yatay aralığında?
  const column = columns.find(
    (c) => x >= c.rect.left && x <= c.rect.right,
  );
  if (!column) return null;

  // Aynı kolon içinde sürüklerken kaynak kart kendi sırasında durmaya devam
  // eder (kartlar kaymaz) — hedef hesabında kaynak hariç tutulur, aksi
  // halde "before kendim" dönerdi.
  const cards = column.cards.filter((c) => c.rowId !== sourceRowId);

  // Kartlar arası konum: orta çizgiler kırılım noktası.
  // Komşu semantiği (moveRow API'si): beforeRowId = ÜST komşu (order'ı düşük),
  // afterRowId = ALT komşu (order'ı yüksek) → orderBetween(before, after).
  // Pointer'ın üstünde kalan kartların sonuncusu üst komşu; altında kalanların
  // ilki alt komşu.
  const above = cards.filter((c) => (c.top + c.bottom) / 2 <= y);
  const below = cards.filter((c) => (c.top + c.bottom) / 2 > y);

  return {
    toGroupKey: column.groupKey,
    beforeRowId: above.length > 0 ? above[above.length - 1].rowId : undefined,
    afterRowId: below.length > 0 ? below[0].rowId : undefined,
  };
}