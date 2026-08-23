import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { cascadeDeleteDatabase } from "./databases";
import { buildSearchText } from "./lib/searchText";
import { requireUser } from "./lib/auth";

// `update`'in parentDocument argümanıyla çağrıldığı her yerde (sidebar
// drag&drop dahil) çağrılır. Tek-ebeveynli ağaç modelinde döngü sadece bir
// düğümü kendi soyundan gelen bir düğümün altına taşımakla oluşabilir, bu
// yüzden hedef ebeveynden köke doğru yürüyüp `documentId`ye rastlanırsa
// reddetmek hem "kendi üzerine taşıma" hem "kendi soyuna taşıma" durumlarını
// tek kontrolle kapsar.
async function assertValidReparent(
  ctx: MutationCtx,
  userId: string,
  documentId: Id<"documents">,
  newParentDocument: Id<"documents">,
) {
  if (newParentDocument === documentId) {
    throw new Error("A page cannot be moved into itself.");
  }

  const parent = await ctx.db.get(newParentDocument);
  if (!parent) {
    throw new Error("Target page not found.");
  }
  if (parent.userId !== userId) {
    throw new Error("Not authorized.");
  }
  if (parent.isArchived) {
    throw new Error("Cannot move a page into a page that is in Trash.");
  }

  let current: Doc<"documents"> | null = parent;
  while (current?.parentDocument) {
    if (current.parentDocument === documentId) {
      throw new Error("Cannot move a page into its own descendant.");
    }
    current = await ctx.db.get(current.parentDocument);
  }
}

export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const exisingDocument = await ctx.db.get(args.id);

    if (!exisingDocument) {
      throw new Error("Document not found");
    }

    if (exisingDocument.userId !== userId) {
      throw new Error("Not authorized");
    }

    const archivedAt = Date.now();

    const recursiveArchive = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", documentId),
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, {
          isArchived: true,
          archivedAt,
        });

        await recursiveArchive(child._id);
      }
    };

    const document = await ctx.db.patch(args.id, {
      isArchived: true,
      archivedAt,
    });

    recursiveArchive(args.id);

    return document;
  },
});

export const getSidebar = query({
  args: {
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", args.parentDocument),
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    documents.sort((a, b) => {
      if (a.order === undefined && b.order === undefined) {
        return a._creationTime > b._creationTime ? -1 : 1;
      }
      if (a.order === undefined) return -1;
      if (b.order === undefined) return 1;

      return a.order - b.order;
    });

    return documents;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
    type: v.optional(v.union(v.literal("page"), v.literal("database"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const document = await ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      userId,
      type: args.type,
      fullWidth: false,
      showToc: true,
      isArchived: false,
      isPublished: false,
      searchText: buildSearchText(args.title, undefined),
    });

    return document;
  },
});

export const getTrash = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    return documents;
  },
});

export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const exisingDocument = await ctx.db.get(args.id);

    if (!exisingDocument) {
      throw new Error("Document not found");
    }

    if (exisingDocument.userId !== userId) {
      throw new Error("Not authorized");
    }

    const recursiveRestore = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", documentId),
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, {
          isArchived: false,
          archivedAt: undefined,
        });

        await recursiveRestore(child._id);
      }
    };

    const options: Partial<Doc<"documents">> = {
      isArchived: false,
      archivedAt: undefined,
    };

    if (exisingDocument.parentDocument) {
      const parent = await ctx.db.get(exisingDocument.parentDocument);

      if (parent?.isArchived) {
        options.parentDocument = undefined;
      }
    }

    // Notion'da doğrulanan davranış: trash'ten restore edilen sayfa eski
    // konumuna değil, ait olduğu listenin EN SONUNA eklenir (bkz.
    // docs/notion-research/sidebar-pages.md).
    const targetParent =
      "parentDocument" in options
        ? options.parentDocument
        : exisingDocument.parentDocument;

    const siblings = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", targetParent),
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    const maxOrder = siblings.reduce(
      (max, sibling) =>
        sibling.order !== undefined && sibling.order > max
          ? sibling.order
          : max,
      -1,
    );
    options.order = maxOrder + 1;

    const document = await ctx.db.patch(args.id, options);

    recursiveRestore(args.id);

    return document;
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const exisingDocument = await ctx.db.get(args.id);

    if (!exisingDocument) {
      throw new Error("Document not found");
    }

    if (exisingDocument.userId !== userId) {
      throw new Error("Not authorized");
    }

    if (exisingDocument.type === "database") {
      await cascadeDeleteDatabase(ctx, args.id);
    }

    const document = await ctx.db.delete(args.id);

    return document;
  },
});

export const getSearch = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    return documents;
  },
});

export const searchDocuments = query({
  args: {
    query: v.string(),
    // Notion "Title only" filtresi — yalnızca başlık üzerinde eşleşme.
    titleOnly: v.optional(v.boolean()),
    // Notion "In" filtresi — yalnızca bu sayfa/database alt ağacında ara.
    scopeId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const trimmed = args.query.trim();
    if (!trimmed) return [];

    const userId = identity.subject;

    // "In" filtresi: seçilen sayfa/database alt ağacını topla.
    let scopeIds: Id<"documents">[] | undefined;
    if (args.scopeId) {
      const all = await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("isArchived"), false))
        .collect();
      const byParent = new Map<string, Doc<"documents">[]>();
      for (const d of all) {
        const key = d.parentDocument ?? "root";
        byParent.set(key, [...(byParent.get(key) ?? []), d]);
      }
      const set = new Set<Id<"documents">>();
      const stack: Id<"documents">[] = [args.scopeId];
      while (stack.length) {
        const cur = stack.pop()!;
        if (set.has(cur)) continue;
        set.add(cur);
        for (const child of byParent.get(cur) ?? []) stack.push(child._id);
      }
      scopeIds = [...set];
    }

    let base = ctx.db
      .query("documents")
      .withSearchIndex(
        args.titleOnly ? "search_title" : "search_text",
        (q) =>
          q
            .search(args.titleOnly ? "title" : "searchText", trimmed)
            .eq("userId", userId),
      )
      .filter((q) => q.eq(q.field("isArchived"), false));

    // Convex filtresinde `in` operatörü yok — scope filtrelemesini sonuç
    // üzerinde yapıyoruz. Arama `take` limitine takılmadan scope içindeki
    // eşleşmeleri korumak için daha geniş bir pencere alıp daraltıyoruz.
    const docs = await base.take(100);

    // Breadcrumb / parent path için ebeveyn zincirini çöz (Notion'un
    // "Main Hub / Kitaplar" gösterimi — search dışında da link picker,
    // move-page gibi yerlerde yeniden kullanılabilir).
    const results = [];
    for (const document of docs) {
      if (scopeIds && !scopeIds.includes(document._id)) continue;

      const breadcrumbs: {
        id: string;
        title: string;
        icon?: string;
        type?: "page" | "database";
      }[] = [];
      let current: Doc<"documents"> = document;
      let guard = 0;
      while (current.parentDocument && guard < 50) {
        const parent = await ctx.db.get(current.parentDocument);
        if (!parent || parent.userId !== userId) break;
        breadcrumbs.unshift({
          id: parent._id,
          title: parent.title,
          icon: parent.icon,
          type: parent.type,
        });
        current = parent;
        guard++;
      }

      results.push({
        _id: document._id,
        title: document.title,
        icon: document.icon,
        type: document.type,
        parentId: document.parentDocument ?? undefined,
        breadcrumbs,
        createdAt: document._creationTime,
        updatedAt: document.updatedAt,
        createdBy: document.userId,
      });

      if (results.length >= 50) break;
    }

    return results;
  },
});

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new Error("Document not found");
    }

    if (document.isPublished && !document.isArchived) {
      return document;
    }

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    if (document.userId !== userId) {
      throw new Error("Not authorized");
    }

    return document;
  },
});

// Navbar breadcrumb'ı için kök -> immediate-parent sırasıyla ata zinciri
// (mevcut sayfa hariç). Notion'da doğrulandığı gibi sadece sahibinin
// oturumunda kullanılır — yayınlanmış/anonim önizleme bu query'yi çağırmaz.
export const getAncestors = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const self = await ctx.db.get(args.documentId);
    if (!self || self.userId !== userId) {
      throw new Error("Document not found");
    }

    const ancestors: Doc<"documents">[] = [];
    let current = self;
    let guard = 0;

    while (current.parentDocument && guard < 50) {
      const parent: Doc<"documents"> | null = await ctx.db.get(
        current.parentDocument,
      );
      if (!parent || parent.userId !== userId) break;
      ancestors.unshift(parent);
      current = parent;
      guard++;
    }

    return ancestors;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    coverImageY: v.optional(v.number()),
    icon: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    editorFont: v.optional(v.string()),
    fullWidth: v.optional(v.boolean()),
    smallText: v.optional(v.boolean()),
    showToc: v.optional(v.boolean()),
    parentDocument: v.optional(v.id("documents")),
    // `parentDocument: undefined` bir Convex mutation çağrısında "alan
    // gönderilmedi" ile ayırt edilemez (optional validator'lar undefined'ı
    // "yok" sayar), bu yüzden bir sayfayı köke taşımak (sidebar'dan sürükleyip
    // çıkarmak) için ayrı, açık bir bayrak gerekiyor.
    unparent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const { id, unparent, ...rest } = args;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    if (args.parentDocument !== undefined) {
      await assertValidReparent(ctx, userId, args.id, args.parentDocument);
    }

    const patch: typeof rest & { updatedAt: number; searchText?: string } = {
      ...rest,
      updatedAt: Date.now(),
    };

    if (unparent) {
      patch.parentDocument = undefined;
    }

    if (args.title !== undefined || args.content !== undefined) {
      const title = args.title ?? existingDocument.title;
      const content = args.content ?? existingDocument.content;
      patch.searchText = buildSearchText(title, content);
    }

    const document = await ctx.db.patch(args.id, patch);

    return document;
  },
});

export const removeIcon = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      icon: undefined,
      updatedAt: Date.now(),
    });

    return document;
  },
});

export const removeCoverImage = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      coverImage: undefined,
      coverImageY: undefined,
      updatedAt: Date.now(),
    });

    return document;
  },
});

export const reorder = mutation({
  args: {
    id: v.id("documents"),
    parentDocument: v.optional(v.id("documents")),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const siblings = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", args.parentDocument),
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    siblings.sort((a, b) => {
      if (a.order === undefined && b.order === undefined) return 0;
      if (a.order === undefined) return -1;
      if (b.order === undefined) return 1;
      return a.order - b.order;
    });

    const itemIndex = siblings.findIndex((sibling) => sibling._id === args.id);
    const [movedItem] = siblings.splice(itemIndex, 1);
    siblings.splice(args.newOrder, 0, movedItem);

    await Promise.all(
      siblings.map((sibling, index) =>
        ctx.db.patch(sibling._id, {
          order: index,
        }),
      ),
    );

    return true;
  },
});

export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .collect();

    const promises = documents.map(async (document) => {
      if (document.type === "database") {
        await cascadeDeleteDatabase(ctx, document._id);
      }
      await ctx.db.delete(document._id);
    });
    await Promise.all(promises);
    return true;
  },
});

export const toggleFavorite = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      isFavorite: !existingDocument.isFavorite,
    });

    return document;
  },
});

export const getFavorites = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isFavorite"), true),
          q.eq(q.field("isArchived"), false),
        ),
      )
      .order("desc")
      .collect();

    return documents;
  },
});

export const duplicate = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const copyTitle = `${existingDocument.title} (Copy)`;

    const document = await ctx.db.insert("documents", {
      userId,
      title: copyTitle,
      parentDocument: existingDocument.parentDocument,
      content: existingDocument.content,
      coverImage: existingDocument.coverImage,
      coverImageY: existingDocument.coverImageY,
      icon: existingDocument.icon,
      editorFont: existingDocument.editorFont,
      fullWidth: existingDocument.fullWidth,
      smallText: existingDocument.smallText,
      showToc: existingDocument.showToc,
      isArchived: false,
      isFavorite: false,
      isPublished: false,
      searchText: buildSearchText(copyTitle, existingDocument.content),
    });

    return document;
  },
});

export const markOpened = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      throw new Error("Document not found");
    }
    if (doc.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.patch(args.id, { lastOpenedAt: Date.now() });
  },
});

export const getRecentlyOpened = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isArchived"), false),
          q.eq(q.field("isPublished"), false),
        ),
      )
      .collect();

    return Promise.all(
      documents
        .filter((doc) => doc.lastOpenedAt)
        .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
        .slice(0, 4)
        .map(async (document) => {
          const breadcrumbs: {
            id: string;
            title: string;
            icon?: string;
            type?: "page" | "database";
          }[] = [];
          let current: Doc<"documents"> = document;
          let guard = 0;
          while (current.parentDocument && guard < 50) {
            const parent = await ctx.db.get(current.parentDocument);
            if (!parent || parent.userId !== userId) break;
            breadcrumbs.unshift({
              id: parent._id,
              title: parent.title,
              icon: parent.icon,
              type: parent.type,
            });
            current = parent;
            guard++;
          }
          return {
            _id: document._id,
            title: document.title,
            icon: document.icon,
            type: document.type,
            parentId: document.parentDocument ?? undefined,
            breadcrumbs,
            createdAt: document._creationTime,
            updatedAt: document.updatedAt,
            createdBy: document.userId,
          };
        }),
    );
  },
});

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Notion'da doğrulanan davranış: trash'teki bir sayfa 30 gün sonra kalıcı
// olarak silinir (bkz. docs/notion-research/sidebar-pages.md). Client'tan
// çağrılamaz — `convex/crons.ts`'teki günlük iş tarafından tetiklenir.
// `archivedAt === undefined` olan (bu alan eklenmeden önce trash'e atılmış)
// belgeler bilerek atlanır — aksi halde ilk cron çalışmasında beklenmedik
// şekilde toplu silinirlerdi.
export const purgeExpiredTrash = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TRASH_RETENTION_MS;

    const expired = await ctx.db
      .query("documents")
      .filter((q) =>
        q.and(
          q.eq(q.field("isArchived"), true),
          q.neq(q.field("archivedAt"), undefined),
          q.lt(q.field("archivedAt"), cutoff),
        ),
      )
      .collect();

    for (const doc of expired) {
      if (doc.type === "database") {
        await cascadeDeleteDatabase(ctx, doc._id);
      }
      await ctx.db.delete(doc._id);
    }

    return { purged: expired.length };
  },
});

// Var olan TÜM kullanıcıların belgeleri için searchText'i doldurur. Client'tan
// erişilemez (internal) — UI'da çağrılmaz, bir kez
// `npx convex run documents:backfillSearchText` ile elle tetiklenir (CLI
// çağrıları için `ctx.auth` kimliği yoktur, bu yüzden internalMutation
// olarak tanımlanmıştır — auth kontrolüne ihtiyaç duymaz).
export const backfillSearchText = internalMutation({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();

    for (const doc of documents) {
      await ctx.db.patch(doc._id, {
        searchText: buildSearchText(doc.title, doc.content),
      });
    }

    return { updated: documents.length };
  },
});
