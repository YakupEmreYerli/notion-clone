import { v } from "convex/values";

import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

// Undo/redo journal'ının çekirdeği.
//
// Neden sunucu tarafı: bir satırı/kolonu silmenin tersi "yeniden yarat"
// DEĞİLDİR — Convex `db.insert` id seçtirmez, yeni id ile gelen kayıt
// `databaseRows.cells` (propertyId ile anahtarlı) ve `viewCardOrder.rowId`
// referanslarını kopardığı için veri sessizce ölür. Bu yüzden silme
// soft-delete'e (`deletedAt`) çevrildi ve geri alma bir patch oldu.
//
// Neden jenerik op-log: her mutation için ayrı bir tipli inverse yazmak
// yerine ÜÇ op yetiyor — `patch`, `restore`, `softDelete`. Her mutation
// "önceki hâli" fotoğraflayıp bir op listesi bırakır; undo listeyi sırayla
// oynatır. Yeni bir mutation'ı bağlamak yeni bir op tipi gerektirmez.
//
// `insert`/`delete` op'ları BİLEREK YOK. Undo bir insert'i delete ile geri
// alsaydı, redo kaydı yeniden eklerken Convex YENİ bir `_id` verirdi;
// journal'daki undo op'u eski id'yi gösterip hiçbir şey bulamaz, sessizce
// atlanır ve çift kayıt kalırdı. Yaratmanın tersi bu yüzden aynı `_id`
// üzerinde `softDelete`, redo da aynı `_id` üzerinde `restore` — id hiç
// değişmediği için undo→redo→undo döngüsü sonsuza kadar tutarlı.

/** Journal'ın dokunabildiği tablolar. */
const historyTableValidator = v.union(
  v.literal("documents"),
  v.literal("databaseProperties"),
  v.literal("databaseRows"),
  v.literal("databaseViews"),
  v.literal("viewCardOrder"),
);
export type HistoryTable =
  | "documents"
  | "databaseProperties"
  | "databaseRows"
  | "databaseViews"
  | "viewCardOrder";

/** `deletedAt` taşıyan, yani soft-delete edilebilen tablolar. */
const softDeletableValidator = v.union(
  v.literal("databaseProperties"),
  v.literal("databaseRows"),
  v.literal("databaseViews"),
  v.literal("viewCardOrder"),
);
export type SoftDeletableTable =
  | "databaseProperties"
  | "databaseRows"
  | "databaseViews"
  | "viewCardOrder";

export const historyOpValidator = v.union(
  // Alanları verilen değerlere geri yazar.
  //
  // `remove` neden ayrı: Convex bir objeyi saklarken `undefined` değerli
  // anahtarları DÜŞÜRÜR. `fields: { icon: undefined }` diskte `fields: {}`
  // olarak durur ve patch no-op'a döner — yani "bu alan eskiden yoktu"
  // durumu `fields` ile temsil edilemez. Kaldırılacak alanların adı bu
  // yüzden ayrı bir listede taşınır; `undefined` uygulama anında üretilir.
  v.object({
    t: v.literal("patch"),
    table: historyTableValidator,
    id: v.string(),
    fields: v.any(),
    remove: v.optional(v.array(v.string())),
  }),
  // Soft-delete'i kaldırır (silmenin tersi).
  v.object({
    t: v.literal("restore"),
    table: softDeletableValidator,
    id: v.string(),
  }),
  // Soft-delete uygular (yaratmanın tersi).
  v.object({
    t: v.literal("softDelete"),
    table: softDeletableValidator,
    id: v.string(),
  }),
);

export type HistoryOp =
  | {
      t: "patch";
      table: HistoryTable;
      id: string;
      fields: Record<string, unknown>;
      /** Kaldırılacak alan adları — bkz. historyOpValidator'daki not. */
      remove?: string[];
    }
  | { t: "restore"; table: SoftDeletableTable; id: string }
  | { t: "softDelete"; table: SoftDeletableTable; id: string };

/**
 * Bir doküman kapsamında saklanan en fazla journal kaydı. Aşıldığında en
 * eski kayıtlar budanır — yığın kalıcı, ama sınırsız değil.
 */
export const HISTORY_LIMIT = 50;

/**
 * Op listesini sırayla uygular. Kayıt bulunamazsa o op sessizce atlanır:
 * araya giren kalıcı bir silme (trash purge) tüm undo'yu patlatmamalı.
 */
export async function applyHistoryOps(ctx: MutationCtx, ops: HistoryOp[]) {
  for (const op of ops) {
    switch (op.t) {
      case "patch": {
        const id = op.id as Id<HistoryTable>;
        if (!(await ctx.db.get(id))) break;
        const fields: Record<string, unknown> = { ...op.fields };
        for (const field of op.remove ?? []) {
          fields[field] = undefined;
        }
        await ctx.db.patch(id, fields as never);
        break;
      }
      case "restore": {
        const id = op.id as Id<SoftDeletableTable>;
        if (!(await ctx.db.get(id))) break;
        await ctx.db.patch(id, { deletedAt: undefined } as never);
        break;
      }
      case "softDelete": {
        const id = op.id as Id<SoftDeletableTable>;
        if (!(await ctx.db.get(id))) break;
        await ctx.db.patch(id, { deletedAt: Date.now() } as never);
        break;
      }
    }
  }
}

/**
 * Bir dokümanın mevcut hâlinden, verilen alanları eski değerlerine
 * döndürecek `patch` op'u üretir. Çağıran "hangi alanlara dokunuyorum"u
 * söyler; burada o alanların ÖNCEKİ değerleri fotoğraflanır.
 */
export function patchInverse<T extends HistoryTable>(
  table: T,
  doc: { _id: Id<T> } & Record<string, unknown>,
  fields: readonly string[],
): HistoryOp {
  const before: Record<string, unknown> = {};
  const remove: string[] = [];
  for (const field of fields) {
    // Alan dokümanda yoksa geri alma "eski değeri yaz" değil "alanı
    // kaldır" olmalı — ve bu, `undefined` saklanamadığı için `remove`
    // listesine düşer.
    if (doc[field] === undefined) remove.push(field);
    else before[field] = doc[field];
  }
  return {
    t: "patch",
    table,
    id: doc._id as string,
    fields: before,
    ...(remove.length > 0 ? { remove } : {}),
  };
}

/**
 * İki fotoğraf arasında `order` değeri değişen kayıtlar için patch op
 * çiftleri üretir.
 *
 * Sıralama mutation'ları normalde tek satır yazar, ama fractional index
 * sıkışınca TÜM kardeşleri yeniden numaralandırır (rebalance). Elle "şu
 * satırın order'ını geri yaz" demek o durumu kaçırırdı; fotoğraf farkı
 * hem tek yazmayı hem rebalance'ı aynı kodla doğru geri alır.
 */
export function orderDiffOps(
  table: HistoryTable,
  before: readonly Record<string, unknown>[],
  after: readonly Record<string, unknown>[],
  field: "order" | "position" = "order",
): { undo: HistoryOp[]; redo: HistoryOp[] } {
  const previous = new Map(
    before.map((doc) => [doc._id as string, doc[field] as number]),
  );
  const undo: HistoryOp[] = [];
  const redo: HistoryOp[] = [];

  for (const doc of after) {
    const id = doc._id as string;
    const now = doc[field] as number;
    const was = previous.get(id);
    if (was === undefined || was === now) continue;
    undo.push({ t: "patch", table, id, fields: { [field]: was } });
    redo.push({ t: "patch", table, id, fields: { [field]: now } });
  }

  return { undo, redo };
}

type RecordArgs = {
  scopeId: Id<"documents">;
  userId: string;
  /** Makine tarafı ayrım (`"cell.update"`) — test ve telemetri için. */
  kind: string;
  /** Kullanıcıya gösterilen etiket ("Hücre güncellendi"). */
  label: string;
  /** Geri alma op'ları — kayıt sırasında yakalanan ÖNCEKİ hâl. */
  undo: HistoryOp[];
  /** Yineleme op'ları — mutation'ın kendi etkisini tekrar uygular. */
  redo: HistoryOp[];
};

/**
 * Journal'a bir kayıt düşer.
 *
 * Undo yapılmış kayıtların üstüne yeni bir işlem gelirse redo dalı kesilir
 * (klasik undo-stack semantiği): kullanıcı geri alıp sonra başka bir şey
 * yaparsa, geri aldığı şeye artık ileri gidilemez.
 */
export async function recordHistory(ctx: MutationCtx, args: RecordArgs) {
  if (args.undo.length === 0) return;

  const entries = await ctx.db
    .query("history")
    .withIndex("by_scope_seq", (q) => q.eq("scopeId", args.scopeId))
    .collect();

  // Redo dalını kes.
  await Promise.all(
    entries.filter((e) => e.undone).map((e) => ctx.db.delete(e._id)),
  );

  const live = entries.filter((e) => !e.undone);
  const seq = live.reduce((max, e) => Math.max(max, e.seq), 0) + 1;

  await ctx.db.insert("history", {
    scopeId: args.scopeId,
    userId: args.userId,
    seq,
    kind: args.kind,
    label: args.label,
    undo: args.undo,
    redo: args.redo,
    undone: false,
    createdAt: Date.now(),
  });

  // En eskiyi buda — yığın kalıcı, ama sınırlı.
  const overflow = live.length + 1 - HISTORY_LIMIT;
  if (overflow > 0) {
    const oldest = [...live].sort((a, b) => a.seq - b.seq).slice(0, overflow);
    await Promise.all(oldest.map((e) => ctx.db.delete(e._id)));
  }
}

/** Kapsamdaki kayıtları seq'e göre artan sırada verir. */
export async function scopeEntries(
  ctx: QueryCtx | MutationCtx,
  scopeId: Id<"documents">,
): Promise<Doc<"history">[]> {
  const entries = await ctx.db
    .query("history")
    .withIndex("by_scope_seq", (q) => q.eq("scopeId", scopeId))
    .collect();
  return entries.sort((a, b) => a.seq - b.seq);
}
