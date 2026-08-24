import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { deleteDatabaseChildren } from "./lib/databaseCascade";
import { buildSearchText } from "./lib/searchText";
import { ORDER_GAP } from "./lib/ordering";

// README ekran görüntüleri için demo bir workspace kurar; `locale` ile
// İngilizce ve Türkçe iki ayrı içerik seti üretir (README.md / README.tr.md).
// Client'tan erişilemez (internal) — `documents:backfillSearchText` ile aynı
// gerekçe: CLI çağrılarında `ctx.auth` kimliği yoktur.
//
// UYARI: verilen userId'ye ait TÜM dokümanları silip yeniden yazar. Yalnızca
// `scripts/seed-demo.mjs` içindeki demo hesapların id'leriyle çağrılır;
// gerçek bir hesabın id'siyle çalıştırmayın.

const baseProps = {
  textColor: "default",
  backgroundColor: "default",
  textAlignment: "left",
} as const;

const inline = (text: string) => [{ type: "text", text, styles: {} }];

const block = (
  id: string,
  type: string,
  text: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  type,
  props: { ...baseProps, ...extra },
  content: inline(text),
  children: [],
});

const doc = (
  blocks: { id: string; type: string; text: string; level?: 1 | 2 | 3 }[],
) =>
  JSON.stringify(
    blocks.map(({ id, type, text, level }) =>
      block(id, type, text, level ? { level } : {}),
    ),
  );

type SeededProperty = {
  key: string;
  name: string;
  type: "text" | "select" | "multiSelect" | "number";
  icon?: string;
  width?: number;
  isTitle?: boolean;
  options?: { id: string; label: string; color: string }[];
};

type SeededBook = {
  title: string;
  author: string;
  status: string;
  genre: string[];
  year: number;
  pages: number;
};

type Locale = {
  workspaceTitle: string;
  home: { title: string; icon: string; content: string };
  notes: { title: string; icon: string; content: string };
  siblings: { title: string; icon: string; content?: string }[];
  roots: { title: string; icon: string }[];
  database: { title: string; icon: string; tableView: string; boardView: string };
  properties: SeededProperty[];
  books: SeededBook[];
};

// --- English -------------------------------------------------------------

const EN: Locale = {
  workspaceTitle: "Reading",
  home: {
    title: "Reading",
    icon: "📚",
    content: doc([
      {
        id: "e-h",
        type: "paragraph",
        text: "Everything I am reading, have read, or keep meaning to read. The tracker below is the source of truth; these pages are where the actual thinking happens.",
      },
    ]),
  },
  notes: {
    title: "The Pragmatic Programmer",
    icon: "📗",
    content: doc([
      { id: "e1", type: "heading", text: "Why I keep coming back to it", level: 2 },
      {
        id: "e2",
        type: "paragraph",
        text: "Twenty-five years on, the chapters that aged best are the ones about people and habits, not the ones about tools. The tooling advice is dated; the mindset is not.",
      },
      {
        id: "e3",
        type: "quote",
        text: "Care about your craft. Why spend your life developing software unless you care about doing it well?",
      },
      { id: "e4", type: "heading", text: "Ideas worth stealing", level: 2 },
      {
        id: "e5",
        type: "bulletListItem",
        text: "Tracer bullets — build one thin path end to end before widening it.",
      },
      {
        id: "e6",
        type: "bulletListItem",
        text: "DRY is about knowledge, not about text. Two identical lines can be fine.",
      },
      {
        id: "e7",
        type: "bulletListItem",
        text: "Keep a broken-window list. Small rot invites bigger rot.",
      },
      {
        id: "e8",
        type: "bulletListItem",
        text: "Prototype to learn, then throw the prototype away.",
      },
      { id: "e9", type: "heading", text: "Where it shows its age", level: 2 },
      {
        id: "e10",
        type: "paragraph",
        text: "The chapter on code generators reads like a workaround for languages that could not express the abstraction. Most of that is solved now.",
      },
    ]),
  },
  siblings: [
    {
      title: "Weekly review",
      icon: "🗓️",
      content: doc([
        { id: "w1", type: "heading", text: "Week 34", level: 2 },
        {
          id: "w2",
          type: "bulletListItem",
          text: "Finished The Mythical Man-Month. Brooks's law still explains most of my last three projects.",
        },
        {
          id: "w3",
          type: "bulletListItem",
          text: "Halfway through Designing Data-Intensive Applications, chapter 5 on replication.",
        },
        {
          id: "w4",
          type: "paragraph",
          text: "Next week: finish the replication chapter, start Thinking, Fast and Slow.",
        },
      ]),
    },
    { title: "Quotes", icon: "💬" },
  ],
  roots: [
    { title: "Inbox", icon: "📥" },
    { title: "Meeting notes", icon: "🗒️" },
  ],
  database: {
    title: "Book tracker",
    icon: "📖",
    tableView: "All books",
    boardView: "By status",
  },
  properties: [
    { key: "title", name: "Title", type: "text", width: 360, isTitle: true },
    { key: "author", name: "Author", type: "text", icon: "user", width: 230 },
    {
      key: "status",
      name: "Status",
      type: "select",
      icon: "book-open",
      width: 170,
      options: [
        { id: "reading", label: "Reading", color: "blue" },
        { id: "finished", label: "Finished", color: "green" },
        { id: "shelved", label: "Want to read", color: "gray" },
      ],
    },
    {
      key: "genre",
      name: "Genre",
      type: "multiSelect",
      icon: "tag",
      width: 300,
      options: [
        { id: "software", label: "Software", color: "purple" },
        { id: "design", label: "Design", color: "orange" },
        { id: "scifi", label: "Sci-fi", color: "blue" },
        { id: "psychology", label: "Psychology", color: "pink" },
        { id: "reportage", label: "Reportage", color: "brown" },
      ],
    },
    { key: "year", name: "First published", type: "number", icon: "calendar", width: 150 },
    { key: "pages", name: "Pages", type: "number", icon: "book-open", width: 120 },
  ],
  books: [
    { title: "The Pragmatic Programmer", author: "Andrew Hunt & David Thomas", status: "finished", genre: ["software"], year: 1999, pages: 352 },
    { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", status: "reading", genre: ["software"], year: 2017, pages: 616 },
    { title: "Refactoring", author: "Martin Fowler", status: "reading", genre: ["software"], year: 1999, pages: 448 },
    { title: "The Mythical Man-Month", author: "Frederick P. Brooks Jr.", status: "finished", genre: ["software"], year: 1975, pages: 322 },
    { title: "Structure and Interpretation of Computer Programs", author: "Abelson & Sussman", status: "shelved", genre: ["software"], year: 1985, pages: 657 },
    { title: "The Design of Everyday Things", author: "Don Norman", status: "finished", genre: ["design"], year: 1988, pages: 368 },
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", status: "shelved", genre: ["psychology"], year: 2011, pages: 499 },
    { title: "Dune", author: "Frank Herbert", status: "finished", genre: ["scifi"], year: 1965, pages: 412 },
    { title: "The Soul of a New Machine", author: "Tracy Kidder", status: "shelved", genre: ["reportage"], year: 1981, pages: 293 },
  ],
};

// --- Türkçe --------------------------------------------------------------

const TR: Locale = {
  workspaceTitle: "Okuma",
  home: {
    title: "Okuma",
    icon: "📚",
    content: doc([
      {
        id: "t-h",
        type: "paragraph",
        text: "Okuduğum, okuyacağım ve bir türlü sıra gelmeyen her şey. Aşağıdaki takip listesi asıl kayıt; bu sayfalar da üzerine düşündüğüm yer.",
      },
    ]),
  },
  notes: {
    title: "Tutunamayanlar",
    icon: "📗",
    content: doc([
      { id: "t1", type: "heading", text: "Neden hep geri dönüyorum", level: 2 },
      {
        id: "t2",
        type: "paragraph",
        text: "Elli yılı aşkın süre sonra bile en taze duran yanı biçimsel oyunları değil, Turgut'un çevresiyle kurduğu ilişkinin tarifi. Roman, dili kadar yalnızlığı da anlatıyor.",
      },
      {
        id: "t3",
        type: "quote",
        text: "Ben buraya kadar geldim, siz daha ileriye gidin.",
      },
      { id: "t4", type: "heading", text: "Not aldığım yerler", level: 2 },
      {
        id: "t5",
        type: "bulletListItem",
        text: "Selim Işık'ın ardından bırakılan izler, romanı bir arayış anlatısına çeviriyor.",
      },
      {
        id: "t6",
        type: "bulletListItem",
        text: "Şarkılar, dipnotlar ve mektuplar — biçim, anlatının kendisi hâline geliyor.",
      },
      {
        id: "t7",
        type: "bulletListItem",
        text: "Mizah, acıyı yumuşatmak için değil, daha görünür kılmak için kullanılıyor.",
      },
      {
        id: "t8",
        type: "bulletListItem",
        text: "\"Tutunamamak\" bir başarısızlık değil, bir konum olarak kuruluyor.",
      },
      { id: "t9", type: "heading", text: "Yanına koyduklarım", level: 2 },
      {
        id: "t10",
        type: "paragraph",
        text: "Aylak Adam ve Saatleri Ayarlama Enstitüsü ile birlikte okununca, üçü de aynı soruyu farklı yerlerden soruyor: bu düzene ne kadar uyacağız?",
      },
    ]),
  },
  siblings: [
    {
      title: "Haftalık değerlendirme",
      icon: "🗓️",
      content: doc([
        { id: "tw1", type: "heading", text: "34. hafta", level: 2 },
        {
          id: "tw2",
          type: "bulletListItem",
          text: "Kürk Mantolu Madonna bitti — Raif Efendi'nin defterleri kısmı beklediğimden çok daha sert.",
        },
        {
          id: "tw3",
          type: "bulletListItem",
          text: "İnce Memed'in ortasındayım; Çukurova tasvirleri olayın önüne geçiyor.",
        },
        {
          id: "tw4",
          type: "paragraph",
          text: "Gelecek hafta: İnce Memed'i bitirip Huzur'a başlamak.",
        },
      ]),
    },
    { title: "Alıntılar", icon: "💬" },
  ],
  roots: [
    { title: "Gelen kutusu", icon: "📥" },
    { title: "Toplantı notları", icon: "🗒️" },
  ],
  database: {
    title: "Kitap takibi",
    icon: "📖",
    tableView: "Tüm kitaplar",
    boardView: "Duruma göre",
  },
  properties: [
    { key: "title", name: "Başlık", type: "text", width: 360, isTitle: true },
    { key: "author", name: "Yazar", type: "text", icon: "user", width: 230 },
    {
      key: "status",
      name: "Durum",
      type: "select",
      icon: "book-open",
      width: 170,
      options: [
        { id: "reading", label: "Okunuyor", color: "blue" },
        { id: "finished", label: "Bitti", color: "green" },
        { id: "shelved", label: "Okunacak", color: "gray" },
      ],
    },
    {
      key: "genre",
      name: "Tür",
      type: "multiSelect",
      icon: "tag",
      width: 300,
      options: [
        { id: "modern", label: "Modern roman", color: "purple" },
        { id: "roman", label: "Roman", color: "blue" },
        { id: "koy", label: "Köy romanı", color: "green" },
        { id: "hiciv", label: "Hiciv", color: "orange" },
        { id: "buyulu", label: "Büyülü gerçekçilik", color: "pink" },
      ],
    },
    { key: "year", name: "İlk basım", type: "number", icon: "calendar", width: 150 },
    { key: "pages", name: "Sayfa", type: "number", icon: "book-open", width: 120 },
  ],
  books: [
    { title: "Tutunamayanlar", author: "Oğuz Atay", status: "finished", genre: ["modern"], year: 1972, pages: 724 },
    { title: "Kürk Mantolu Madonna", author: "Sabahattin Ali", status: "finished", genre: ["roman"], year: 1943, pages: 160 },
    { title: "İnce Memed", author: "Yaşar Kemal", status: "reading", genre: ["koy"], year: 1955, pages: 424 },
    { title: "Saatleri Ayarlama Enstitüsü", author: "Ahmet Hamdi Tanpınar", status: "reading", genre: ["modern", "hiciv"], year: 1961, pages: 384 },
    { title: "Huzur", author: "Ahmet Hamdi Tanpınar", status: "shelved", genre: ["modern"], year: 1949, pages: 384 },
    { title: "Aylak Adam", author: "Yusuf Atılgan", status: "finished", genre: ["modern"], year: 1959, pages: 160 },
    { title: "Çalıkuşu", author: "Reşat Nuri Güntekin", status: "finished", genre: ["roman"], year: 1922, pages: 408 },
    { title: "Yaban", author: "Yakup Kadri Karaosmanoğlu", status: "shelved", genre: ["koy"], year: 1932, pages: 192 },
    { title: "Sevgili Arsız Ölüm", author: "Latife Tekin", status: "shelved", genre: ["buyulu"], year: 1983, pages: 240 },
  ],
};

const LOCALES: Record<string, Locale> = { en: EN, tr: TR };

// Tablo grid'i (components/database/grid-cell.tsx) bugün yalnızca text ve
// select/multiSelect hücrelerini çiziyor; number/checkbox/date oraya boş
// düşer. Board'un kendi renderer'ı (board/property-value.tsx) hepsini çizer.
// Her view yalnızca gerçekten gösterebildiğini listeler — böylece ekran
// görüntülerinde tek bir boş hücre kalmaz.
const TABLE_PROPERTIES = ["title", "author", "status", "genre"];
const BOARD_PROPERTIES = ["author", "genre", "year", "pages"];

const COVER =
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920&q=80";

export const demoWorkspace = internalMutation({
  args: {
    userId: v.string(),
    locale: v.union(v.literal("en"), v.literal("tr")),
  },
  handler: async (ctx, args) => {
    const locale = LOCALES[args.locale];
    const userId = args.userId;

    // 1) Kullanıcının mevcut içeriğini temizle — seed her çalıştığında aynı
    // sonucu vermeli, yoksa ekran görüntüleri birikmiş artıkları gösterir.
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const existingDoc of existing) {
      if (existingDoc.type === "database") {
        await deleteDatabaseChildren(ctx, existingDoc._id);
      }
      await ctx.db.delete(existingDoc._id);
    }

    const page = async (input: {
      title: string;
      icon?: string;
      content?: string;
      coverImage?: string;
      parentDocument?: Id<"documents">;
      order: number;
      isFavorite?: boolean;
    }) =>
      ctx.db.insert("documents", {
        title: input.title,
        userId,
        isArchived: false,
        isPublished: false,
        type: "page",
        icon: input.icon,
        content: input.content,
        coverImage: input.coverImage,
        parentDocument: input.parentDocument,
        order: input.order,
        isFavorite: input.isFavorite,
        // Workspace'in tamamı full-width — dar kolon hem ekran görüntüsünde
        // hem kullanımda tercih edilen görünüm değil.
        fullWidth: true,
        updatedAt: Date.now(),
        searchText: buildSearchText(input.title, input.content),
      });

    // 2) Sidebar ağacı — tek başına duran bir sayfa yerine gerçek bir
    // workspace görünsün diye iç içe birkaç sayfa.
    const home = await page({
      ...locale.home,
      order: ORDER_GAP,
      isFavorite: true,
    });

    const notes = await page({
      ...locale.notes,
      coverImage: COVER,
      parentDocument: home,
      order: ORDER_GAP,
    });

    for (const [index, sibling] of locale.siblings.entries()) {
      await page({
        ...sibling,
        parentDocument: home,
        order: ORDER_GAP * (index + 2),
      });
    }

    for (const [index, root] of locale.roots.entries()) {
      await page({ ...root, order: ORDER_GAP * (index + 3) });
    }

    // 3) Kitap takibi database'i.
    const books = await ctx.db.insert("documents", {
      title: locale.database.title,
      userId,
      isArchived: false,
      isPublished: false,
      type: "database",
      icon: locale.database.icon,
      fullWidth: true,
      order: ORDER_GAP * 2,
      updatedAt: Date.now(),
      searchText: buildSearchText(locale.database.title, undefined),
    });

    const propertyIds = new Map<string, Id<"databaseProperties">>();
    for (const [index, property] of locale.properties.entries()) {
      propertyIds.set(
        property.key,
        await ctx.db.insert("databaseProperties", {
          databaseId: books,
          userId,
          name: property.name,
          type: property.type,
          order: (index + 1) * ORDER_GAP,
          width: property.width,
          icon: property.icon,
          options: property.options,
          isTitle: property.isTitle,
        }),
      );
    }

    const id = (key: string) => {
      const value = propertyIds.get(key);
      if (!value) throw new Error(`Seed property missing: ${key}`);
      return value;
    };

    const rowIds: { rowId: Id<"databaseRows">; groupKey: string }[] = [];
    for (const [index, bookRow] of locale.books.entries()) {
      const rowId = await ctx.db.insert("databaseRows", {
        databaseId: books,
        userId,
        order: (index + 1) * ORDER_GAP,
        cells: {
          [id("title")]: bookRow.title,
          [id("author")]: bookRow.author,
          [id("status")]: bookRow.status,
          [id("genre")]: bookRow.genre,
          [id("year")]: bookRow.year,
          [id("pages")]: bookRow.pages,
        },
      });
      rowIds.push({ rowId, groupKey: bookRow.status });
    }

    const tableView = await ctx.db.insert("databaseViews", {
      databaseId: books,
      userId,
      name: locale.database.tableView,
      type: "table",
      position: ORDER_GAP,
      visiblePropertyIds: TABLE_PROPERTIES.map(id),
    });

    const boardView = await ctx.db.insert("databaseViews", {
      databaseId: books,
      userId,
      name: locale.database.boardView,
      type: "board",
      position: ORDER_GAP * 2,
      groupByPropertyId: id("status"),
      visiblePropertyIds: BOARD_PROPERTIES.map(id),
      cardSize: "medium",
    });

    // Board kolonlarındaki kart sırası viewCardOrder'dan okunur; kayıt yoksa
    // sıralama (order, _id) ile bağlanır ve _id'ler her seed'de değiştiği için
    // kartlar yer değiştirir — bu da her çalıştırmada aynı ekran görüntüsünü
    // üretmeyi imkânsız kılar. Sırayı burada açıkça yazmak kareleri sabitler.
    for (const [index, { rowId, groupKey }] of rowIds.entries()) {
      await ctx.db.insert("viewCardOrder", {
        viewId: boardView,
        databaseId: books,
        userId,
        groupKey,
        rowId,
        order: (index + 1) * ORDER_GAP,
      });
    }

    return {
      homePageId: home,
      notesPageId: notes,
      bookTrackerId: books,
      tableViewId: tableView,
      boardViewId: boardView,
      rows: locale.books.length,
    };
  },
});
