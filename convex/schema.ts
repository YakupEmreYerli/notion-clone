import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  cellValueValidator,
  propertyOptionValidator,
  propertyTypeValidator,
} from "./lib/cellValue";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    userId: v.string(),
    isArchived: v.boolean(),
    // Notion'da doğrulanan davranış: trash'teki bir sayfa 30 gün sonra
    // kalıcı olarak silinir. Bu alan, o retention penceresini hesaplamak
    // için "ne zaman trash'e taşındığı"nı tutar — `archive` mutation'ı
    // set eder, `restore` temizler. `convex/crons.ts`'teki günlük iş bunu
    // kullanır. Optional: mevcut satırlar migration istemez.
    archivedAt: v.optional(v.number()),
    parentDocument: v.optional(v.id("documents")),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    // Kapak görselinin dikey konumu (0-100, object-position Y%) —
    // "Drag image to reposition" ile ayarlanır. Varsayılan 50 (ortalanmış).
    coverImageY: v.optional(v.number()),
    icon: v.optional(v.string()),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    isFavorite: v.optional(v.boolean()),
    editorFont: v.optional(v.string()),
    fullWidth: v.optional(v.boolean()),
    smallText: v.optional(v.boolean()),
    showToc: v.optional(v.boolean()),
    lastOpenedAt: v.optional(v.number()),
    // optional: mevcut satırlar migration istemez. undefined => "page"
    type: v.optional(v.union(v.literal("page"), v.literal("database"))),
    // Başlık + içerikten türetilen düz metin — arama index'i bunun
    // üzerinde çalışır. `update` mutation'ı her title/content
    // değişiminde yeniden hesaplar.
    searchText: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentDocument"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["userId"],
    })
    // "Title only" filtresi için başlık-üzeri arama index'i — normal arama
    // `searchText` (başlık + içerik) üzerinde çalışır, bu index yalnızca
    // `title` üzerinde eşleşme yapar (Notion'ın Title only toggle'ı).
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  databaseProperties: defineTable({
    databaseId: v.id("documents"),
    userId: v.string(),
    name: v.string(),
    type: propertyTypeValidator,
    order: v.number(),
    width: v.optional(v.number()),
    icon: v.optional(v.string()),
    options: v.optional(v.array(propertyOptionValidator)),
    isTitle: v.optional(v.boolean()),
  }).index("by_database_order", ["databaseId", "order"]),

  databaseRows: defineTable({
    databaseId: v.id("documents"),
    userId: v.string(),
    order: v.number(),
    // Satır ikonu (emoji). Notion'da side peek bir sayfa gibi davranır ve
    // başlığın üstünde ikon taşır. Opsiyonel: mevcut satırlar migration
    // gerektirmesin (bkz. .claude/rules/project/convex.md).
    icon: v.optional(v.string()),
    /** Satır kapağı — dokümanlardaki `coverImage` ile aynı, göreli URL. */
    coverImage: v.optional(v.string()),
    cells: v.record(v.id("databaseProperties"), cellValueValidator),
  }).index("by_database_order", ["databaseId", "order"]),

  // View sistemi: bir database'in N görünümü olabilir (table/board/...).
  // View'a AİT tüm ayarlar bu kayıtta durur — database dokümanında DEĞİL;
  // aynı database farklı view'larda farklı filtre/gruplama/görünür
  // property'lerle açılır. type ileride gallery/calendar/list ile genişler
  // (şema değişmez, sadece union'a literal eklenir).
  databaseViews: defineTable({
    databaseId: v.id("documents"),
    userId: v.string(),
    name: v.string(),
    type: v.union(v.literal("table"), v.literal("board")),
    position: v.number(),
    filters: v.optional(v.array(v.any())),
    sorts: v.optional(v.array(v.any())),
    groupByPropertyId: v.optional(v.id("databaseProperties")),
    subGroupByPropertyId: v.optional(v.id("databaseProperties")),
    // Sıralı görünür property id listesi — kart/kolon görünürlüğü bundan okunur.
    visiblePropertyIds: v.optional(v.array(v.id("databaseProperties"))),
    hiddenGroupKeys: v.optional(v.array(v.string())),
    // Manuel kolon sırası (group key listesi); yoksa option sırası varsayılan.
    groupOrder: v.optional(v.array(v.string())),
    hideEmptyGroups: v.optional(v.boolean()),
    cardPreview: v.optional(
      v.union(v.literal("none"), v.literal("cover"), v.literal("content")),
    ),
    cardSize: v.optional(
      v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
    ),
  }).index("by_database_position", ["databaseId", "position"]),

  // Kartların view+grup bazlı elle sırası. (viewId, groupKey, order) üçlüsü
  // Notion'daki (view_id, grup, kart) sırasının karşılığıdır: kart bir
  // view'da taşınınca diğer view'ların sırası etkilenmez, group by değişince
  // eski sıralar silinmez. `order` numeric fractional — mevcut orderBetween
  // konvansiyonu (kullanıcı kararı: ayrı string motoru yazılmaz).
  // Convex ikincil sıralama yapmadığı için tüm sıralama noktalarında
  // sortByOrderThenId ile (order, _id) deterministik bağlanır.
  viewCardOrder: defineTable({
    viewId: v.id("databaseViews"),
    databaseId: v.id("documents"),
    userId: v.string(),
    groupKey: v.string(),
    rowId: v.id("databaseRows"),
    order: v.number(),
  })
    .index("by_view_group_order", ["viewId", "groupKey", "order"])
    .index("by_view_row", ["viewId", "rowId"])
    .index("by_row", ["rowId"]),

  // Dosya → doküman eşlemesi. `/api/files/<key>` GET'i "bu dosya yayınlanmış
  // bir dokümana mı ait?" sorusunu buradan cevaplar; sahibi olmayan bir
  // ziyaretçiye ancak eşleşen doküman `isPublished && !isArchived` ise servis
  // edilir. Türetilmiş veridir (kaynak: `coverImage` + BlockNote içeriği),
  // `searchText` gibi her içerik/kapak yazmasında yeniden hesaplanır —
  // `convex/lib/fileRefs.ts`. Aynı dosya birden çok dokümanda geçebileceği
  // için kayıt (key, documentId) çiftidir.
  fileRefs: defineTable({
    key: v.string(),
    documentId: v.id("documents"),
    userId: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_document", ["documentId"]),

  userSettings: defineTable({
    userId: v.string(),
    editorFont: v.optional(v.string()),
    focusMode: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
});
