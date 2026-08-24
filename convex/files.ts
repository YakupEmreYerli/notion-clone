import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";
import { extractFileKeys, syncFileRefs } from "./lib/fileRefs";

/**
 * `/api/files/<key>` GET'inin anonim ziyaretçi için sorduğu tek soru:
 * bu dosya, yayınlanmış ve arşivlenmemiş bir dokümana mı ait?
 *
 * Bilinçli olarak kimlik istemez — public-before-auth: yayın durumu
 * kimlikten ÖNCE (ve burada: kimlikten bağımsız) belirlenir, aksi halde
 * `/preview/<id>` sayfasındaki görseller anonim ziyaretçide kırılır.
 * Sahibin kendi dosyasına erişimi bu sorgudan geçmez; route anahtarın
 * içindeki `<userId>` ile oturumu karşılaştırıp hızlı yoldan servis eder.
 *
 * Dönen değer kasıtlı olarak yalnızca bir boolean: dosyanın var olup
 * olmadığı, hangi dokümana ait olduğu veya sahibi kim olduğu sızmaz.
 */
export const isPubliclyReadable = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const refs = await ctx.db
      .query("fileRefs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .collect();

    for (const ref of refs) {
      const document = await ctx.db.get(ref.documentId);
      if (document?.isPublished && !document.isArchived) {
        return true;
      }
    }

    return false;
  },
});

// Eşleme tablosu türetilmiş veridir; bu mutation var olan TÜM belgeler için
// onu sıfırdan kurar. Client'tan erişilemez (internal) — bir kez
// `npx convex run files:backfillFileRefs` ile elle tetiklenir.
// `documents:backfillSearchText` ile aynı desen: CLI çağrısında `ctx.auth`
// kimliği olmadığı için auth kontrolü yoktur.
export const backfillFileRefs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();

    let refs = 0;

    for (const document of documents) {
      await syncFileRefs(
        ctx,
        document._id,
        document.userId,
        document.coverImage,
        document.content,
      );
      refs += extractFileKeys(document.coverImage, document.content).length;
    }

    // Silinmiş belgelerden kalmış olabilecek yetim kayıtları da temizle
    // (eşleme tablosu bu mutation'dan önce hiç tutulmuyordu).
    const all = await ctx.db.query("fileRefs").collect();
    const alive = new Set(documents.map((document) => document._id));
    const orphans = all.filter((ref) => !alive.has(ref.documentId));
    await Promise.all(orphans.map((ref) => ctx.db.delete(ref._id)));

    return {
      documents: documents.length,
      refs,
      orphansRemoved: orphans.length,
    };
  },
});
