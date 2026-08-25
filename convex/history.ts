import { v } from "convex/values";

import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { HistoryOp, applyHistoryOps, scopeEntries } from "./lib/history";

// Undo/redo'nun tek giriş noktası. İstemci hiçbir zaman "tersini kendin
// uygula" demez — hangi işlemin geri alınacağına sunucu karar verir, çünkü
// yığın sunucuda. Bu, iki sekmenin aynı yığını görmesini sağlar.

const EMPTY_STATE = {
  canUndo: false,
  canRedo: false,
  undoLabel: null,
  redoLabel: null,
};

/**
 * Kapsam bir dokümandır (sayfa ya da database). `requireOwnedDatabase`
 * kullanılmıyor: kapsam bir sayfa da olabilir, `type` kontrolü yapılmamalı.
 */
async function requireOwnedScope(
  ctx: QueryCtx | MutationCtx,
  scopeId: Id<"documents">,
  userId: string,
) {
  const scope = await ctx.db.get(scopeId);
  if (!scope) {
    throw new Error("Document not found");
  }
  if (scope.userId !== userId) {
    throw new Error("Not authorized");
  }
  return scope;
}

/**
 * Yığının durumu — geri al/yinele düğmelerinin etkinliği ve etiketleri.
 * Yayınlanmış bir dokümanı anonim okuyan ziyaretçi için boş durum döner:
 * geçmiş sahibine özeldir, `documents.getById`'deki public-before-auth
 * sırası buraya UYGULANMAZ.
 */
export const getUndoState = query({
  args: { scopeId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return EMPTY_STATE;

    const scope = await ctx.db.get(args.scopeId);
    if (!scope || scope.userId !== identity.subject) return EMPTY_STATE;

    const entries = await scopeEntries(ctx, args.scopeId);
    const undoable = [...entries].reverse().find((e) => !e.undone);
    const redoable = entries.find((e) => e.undone);

    return {
      canUndo: undoable !== undefined,
      canRedo: redoable !== undefined,
      undoLabel: undoable?.label ?? null,
      redoLabel: redoable?.label ?? null,
    };
  },
});

/**
 * Kapsamdaki son geri alınmamış işlemi geri alır.
 *
 * Yapacak bir şey yoksa hata atmaz, `null` döner — Ctrl+Z boş bir yığında
 * hata toast'ı göstermemeli.
 */
export const undo = mutation({
  args: { scopeId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedScope(ctx, args.scopeId, userId);

    const entries = await scopeEntries(ctx, args.scopeId);
    const entry = [...entries].reverse().find((e) => !e.undone);
    if (!entry) return null;

    await applyHistoryOps(ctx, entry.undo as HistoryOp[]);
    await ctx.db.patch(entry._id, { undone: true });

    return { label: entry.label, kind: entry.kind };
  },
});

/**
 * En son geri alınan işlemi yineler. Geri alınmış kayıtlar arasında EN
 * DÜŞÜK seq'li olan seçilir: 1,2,3 kaydında iki kez undo yapıldıysa
 * (3 ve 2 undone), redo önce 2'yi ileri oynatmalı.
 */
export const redo = mutation({
  args: { scopeId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireOwnedScope(ctx, args.scopeId, userId);

    const entries = await scopeEntries(ctx, args.scopeId);
    const entry = entries.find((e) => e.undone);
    if (!entry) return null;

    await applyHistoryOps(ctx, entry.redo as HistoryOp[]);
    await ctx.db.patch(entry._id, { undone: false });

    return { label: entry.label, kind: entry.kind };
  },
});

/**
 * Kapsamın yığınını temizler. Bir doküman kalıcı silinirken çağrılır —
 * yoksa journal kayıtları öksüz kalır ve `scopeId` ölü bir id'yi gösterir.
 */
export async function clearHistoryScope(
  ctx: MutationCtx,
  scopeId: Id<"documents">,
) {
  const entries = await ctx.db
    .query("history")
    .withIndex("by_scope_seq", (q) => q.eq("scopeId", scopeId))
    .collect();
  await Promise.all(entries.map((e) => ctx.db.delete(e._id)));
}
