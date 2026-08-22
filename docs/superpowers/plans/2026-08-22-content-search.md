# İçerik Araması (Full-Text Search) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Ctrl+K` arama paletini, sadece başlıkta değil belge içeriğinde de arama yapacak, sunucu taraflı (debounced) bir aramaya dönüştürmek.

**Architecture:** Convex'in yerleşik `searchIndex` özelliği kullanılır. `documents` tablosuna türetilmiş bir `searchText` alanı (başlık + BlockNote içeriğinin düz metni) eklenir ve bu alan üzerinde bir search index tanımlanır. `update` mutation'ı her `title`/`content` değişikliğinde bu alanı yeniden hesaplar. Frontend'de `search-command.tsx`, şu anki "tüm belgeleri eager çek + client-side filtrele" modelinden, debounce edilmiş sunucu sorgusuna geçer.

**Tech Stack:** Convex (schema + query/mutation), Next.js/React (search-command.tsx), TypeScript. Bu projede bir test çalıştırıcısı (jest/vitest) yok — doğrulama adımları `npx tsc --noEmit -p tsconfig.json` ve pure fonksiyonlar için tek seferlik `npx tsx` ile manuel çalıştırmadır.

**Spec:** `docs/superpowers/specs/2026-08-22-content-search-design.md`

## Global Constraints

- Backlink / sayfa mention'ları bu planın kapsamı dışında.
- Eşleşen metin snippet'i / vurgulama bu planın kapsamı dışında (v1).
- Her adımdan sonra `npx tsc --noEmit -p tsconfig.json` temiz olmalı.
- Şema değişikliklerinden sonra `npx convex dev --once` ile yerel backend'e deploy edilmeli (bu repo self-hosted bir Convex backend kullanıyor, `convex dev` sürekli izlemede değilse manuel `--once` gerekir).

---

### Task 1: `extractPlainText` yardımcı fonksiyonu

**Files:**
- Create: `convex/lib/searchText.ts`
- Test (manuel, tek seferlik): scratchpad script, kalıcı dosya değil.

**Interfaces:**
- Produces: `extractPlainText(contentJson: string | undefined): string` — BlockNote'un `editor.document`'inin `JSON.stringify` edilmiş halini alır, tüm blokları (ve `children` içindeki iç içe blokları) recursive gezip her inline content öğesinin `text` alanını boşlukla birleştirilmiş tek bir string olarak döner. `contentJson` `undefined`/boş/parse edilemez ise `""` döner (hata fırlatmaz).
- Consumes: Yok (bağımsız pure fonksiyon).

BlockNote blok şekli (ilgili alanlar): `{ type: string, content?: Array<{ type: "text", text: string } | { type: string, [k: string]: unknown }>, children?: Block[] }`. `content` her zaman text tipi öğeler içermeyebilir (örn. `link` inline tipi içinde de `content` alt-array'i olabilir) — bu yüzden metin çıkarımı hem blok `content` dizisini hem her öğenin kendi `content` alt-dizisini (varsa) recursive gezmelidir.

- [ ] **Step 1: `convex/lib/searchText.ts` dosyasını oluştur**

```typescript
// BlockNote'un JSON.stringify edilmiş `editor.document`'inden arama için
// düz metin çıkarır. DOM'a ihtiyaç duymaz, saf JSON gezme — Convex
// fonksiyonları içinde (server tarafında) çalışabilir.

type InlineContent = {
  type?: string;
  text?: string;
  content?: InlineContent[];
};

type Block = {
  type?: string;
  content?: InlineContent[];
  children?: Block[];
};

const collectInlineText = (items: InlineContent[] | undefined, out: string[]) => {
  if (!items) return;
  for (const item of items) {
    if (typeof item.text === "string" && item.text.length > 0) {
      out.push(item.text);
    }
    if (item.content) {
      collectInlineText(item.content, out);
    }
  }
};

const collectBlockText = (blocks: Block[] | undefined, out: string[]) => {
  if (!blocks) return;
  for (const block of blocks) {
    collectInlineText(block.content, out);
    if (block.children) {
      collectBlockText(block.children, out);
    }
  }
};

export const extractPlainText = (contentJson: string | undefined): string => {
  if (!contentJson) return "";

  let blocks: Block[];
  try {
    blocks = JSON.parse(contentJson);
  } catch {
    return "";
  }

  if (!Array.isArray(blocks)) return "";

  const out: string[] = [];
  collectBlockText(blocks, out);
  return out.join(" ");
};
```

- [ ] **Step 2: Manuel doğrulama**

Scratchpad'de geçici bir script ile çalıştır (repo'ya commit edilmez):

```bash
cat > /tmp/claude-1000/-home-yakup-Masa-st--Projeler-notion-clone/9fd64198-45e4-435e-a0f4-5dc92c9dcf9c/scratchpad/verify-extract.ts <<'EOF'
import { extractPlainText } from "/home/yakup/Masaüstü/Projeler/notion-clone/convex/lib/searchText";

const sample = JSON.stringify([
  { type: "paragraph", content: [{ type: "text", text: "Merhaba " }, { type: "text", text: "dünya" }] },
  { type: "heading", content: [{ type: "text", text: "Alt başlık" }], children: [
    { type: "paragraph", content: [{ type: "text", text: "İç içe blok" }] },
  ] },
]);

console.log(JSON.stringify(extractPlainText(sample)));
console.log(JSON.stringify(extractPlainText(undefined)));
console.log(JSON.stringify(extractPlainText("not json")));
EOF
npx tsx /tmp/claude-1000/-home-yakup-Masa-st--Projeler-notion-clone/9fd64198-45e4-435e-a0f4-5dc92c9dcf9c/scratchpad/verify-extract.ts
```

Beklenen çıktı (sıra önemli):
```
"Merhaba dünya Alt başlık İç içe blok"
""
""
```

- [ ] **Step 3: tsc kontrolü**

Run: `npx tsc --noEmit -p tsconfig.json` (repo kökünden)
Expected: temiz, hata yok.

- [ ] **Step 4: Commit**

```bash
git add convex/lib/searchText.ts
git commit -m "feat: add BlockNote plain-text extractor for search indexing"
```

---

### Task 2: Şema — `searchText` alanı ve search index

**Files:**
- Modify: `convex/schema.ts`

**Interfaces:**
- Consumes: Yok.
- Produces: `documents` tablosunda `searchText: v.optional(v.string())` alanı ve `"search_text"` adlı search index (`searchField: "searchText"`, `filterFields: ["userId"]`) — Task 3 ve Task 4 bunu kullanır.

- [ ] **Step 1: `convex/schema.ts`'i düzenle**

`documents` tablosunun alan listesine ekle (`type` alanından sonra):

```typescript
    // Başlık + içerikten türetilen düz metin — arama index'i bunun
    // üzerinde çalışır. `update` mutation'ı her title/content
    // değişiminde yeniden hesaplar.
    searchText: v.optional(v.string()),
```

Tablo tanımının index zincirine ekle (`.index("by_user_parent", ...)`'ten sonra):

```typescript
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["userId"],
    }),
```

- [ ] **Step 2: tsc kontrolü**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: temiz.

- [ ] **Step 3: Yerel Convex backend'ine deploy et**

Run: `npx convex dev --once` (repo kökünden)
Expected: "Convex functions ready!" — şema değişikliği (yeni alan + search index) deploy edilir.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add searchText field and search index to documents table"
```

---

### Task 3: `update` mutation'ında `searchText`'i yeniden hesapla + backfill

**Files:**
- Modify: `convex/documents.ts` (`update` mutation, satır ~280 civarı)

**Interfaces:**
- Consumes: `extractPlainText` (Task 1, `convex/lib/searchText.ts`)
- Produces: `update` mutation'ı artık `title` veya `content` argümanlarından biri geldiğinde `searchText` alanını da patch'e ekliyor. Ayrıca yeni bir tek-seferlik `backfillSearchText` mutation'ı (var olan belgeler için).

- [ ] **Step 1: `convex/documents.ts`'in başına import ekle**

```typescript
import { extractPlainText } from "./lib/searchText";
```

- [ ] **Step 2: `update` mutation'ının handler'ını düzenle**

Şu anki handler (`convex/documents.ts:294-321` civarı):

```typescript
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const { id, ...rest } = args;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      ...rest,
      updatedAt: Date.now(),
    });

    return document;
  },
```

Şununla değiştir:

```typescript
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const { id, ...rest } = args;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Document not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const patch: typeof rest & { updatedAt: number; searchText?: string } = {
      ...rest,
      updatedAt: Date.now(),
    };

    if (args.title !== undefined || args.content !== undefined) {
      const title = args.title ?? existingDocument.title;
      const content = args.content ?? existingDocument.content;
      patch.searchText = `${title}\n${extractPlainText(content)}`;
    }

    const document = await ctx.db.patch(args.id, patch);

    return document;
  },
```

- [ ] **Step 3: Tek seferlik backfill mutation'ı ekle**

`convex/documents.ts`'in sonuna ekle:

```typescript
// Var olan belgeler için searchText'i doldurur. UI'da çağrılmaz — bir kez
// `npx convex run documents:backfillSearchText` ile elle tetiklenir.
export const backfillSearchText = mutation({
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
      .collect();

    for (const doc of documents) {
      await ctx.db.patch(doc._id, {
        searchText: `${doc.title}\n${extractPlainText(doc.content)}`,
      });
    }

    return { updated: documents.length };
  },
});
```

- [ ] **Step 4: tsc kontrolü**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: temiz.

- [ ] **Step 5: Deploy ve backfill'i çalıştır**

```bash
npx convex dev --once
npx convex run documents:backfillSearchText
```

Expected: `{ updated: <sayı> }` şeklinde bir sonuç, hata yok.

- [ ] **Step 6: Commit**

```bash
git add convex/documents.ts
git commit -m "feat: recompute searchText on update, add one-off backfill"
```

---

### Task 4: `searchDocuments` query'si

**Files:**
- Modify: `convex/documents.ts`

**Interfaces:**
- Consumes: `documents` tablosunun `"search_text"` search index'i (Task 2).
- Produces: `searchDocuments({ query: v.string() })` query'si — boş/whitespace-only `query` için `[]`, doluysa en fazla 20 eşleşen belge (`isArchived: false`, çağıran kullanıcıya ait) döner, her biri `_id, title, icon, type` alanlarını içerir (mevcut `getSearch`'ün döndürdüğü şekle benzer, `search-command.tsx` bunu bekliyor).

- [ ] **Step 1: `convex/documents.ts`'e ekle (mevcut `getSearch`'ün hemen altına)**

```typescript
export const searchDocuments = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const trimmed = args.query.trim();
    if (!trimmed) return [];

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withSearchIndex("search_text", (q) =>
        q.search("searchText", trimmed).eq("userId", userId),
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .take(20);

    return documents;
  },
});
```

- [ ] **Step 2: tsc kontrolü**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: temiz.

- [ ] **Step 3: Deploy**

Run: `npx convex dev --once`
Expected: "Convex functions ready!"

- [ ] **Step 4: Commit**

```bash
git add convex/documents.ts
git commit -m "feat: add searchDocuments query using the search index"
```

---

### Task 5: `search-command.tsx` — sunucu taraflı debounce edilmiş arama

**Files:**
- Modify: `components/search-command.tsx`

**Interfaces:**
- Consumes: `api.documents.searchDocuments` (Task 4), `api.documents.getRecentlyOpened` (mevcut, `convex/documents.ts`'te zaten var — `app/(main)/_components/RecentList.tsx` silinmiş olsa da backend fonksiyonu duruyor).
- Produces: Yok (uç bileşen).

- [ ] **Step 1: `components/search-command.tsx`'i şu hale getir**

Mevcut dosyanın tamamını şununla değiştir:

```typescript
"use client";

import { useEffect, useState } from "react";
import { File } from "lucide-react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearch } from "@/hooks/useSearch";
import { api } from "@/convex/_generated/api";
import { DialogTitle } from "./ui/dialog";
import { getDocumentLabel } from "@/lib/utils";

const DEBOUNCE_MS = 200;

export const SearchCommand = () => {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch((store) => store.onClose);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(rawQuery.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  useEffect(() => {
    if (!isOpen) {
      setRawQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen]);

  const recent = useQuery(
    api.documents.getRecentlyOpened,
    debouncedQuery ? "skip" : {},
  );
  const results = useQuery(
    api.documents.searchDocuments,
    debouncedQuery ? { query: debouncedQuery } : "skip",
  );

  const documents = debouncedQuery ? results : recent;

  const onSelect = (id: string) => {
    router.push(`/documents/${id}`);
    onClose();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={onClose}
      shouldFilter={false}
      loop
    >
      <DialogTitle hidden>Search Documents</DialogTitle>
      <CommandInput
        value={rawQuery}
        onValueChange={setRawQuery}
        placeholder={`Search ${session?.user?.name}'s Zotion..`}
      />
      <CommandList>
        <CommandEmpty>
          {documents === undefined ? "Searching…" : "No results found."}
        </CommandEmpty>
        <CommandGroup
          heading={debouncedQuery ? "Results" : "Recently opened"}
          className="pb-1"
        >
          {documents?.map((document) => (
            <CommandItem
              key={document._id}
              value={document._id}
              title={getDocumentLabel(document.title, document.type)}
              onSelect={() => onSelect(document._id)}
            >
              {document.icon ? (
                <p className="mr-2 text-[1.125rem] leading-0">
                  {document.icon}
                </p>
              ) : (
                <File className="mr-2 h-4 w-4" />
              )}
              <span>{getDocumentLabel(document.title, document.type)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command.Dialog>
  );
};
```

Not: `Command` bileşeni `cmdk`'nin kendi `Command.Dialog` alt bileşenini
kullanıyor olabilir ya da olmayabilir — `components/ui/command.tsx`'te
`CommandDialog` diye ayrı bir export var (`Dialog` + `Command` sarmalayan).
`Command.Dialog` burada YANLIŞ, gerçek export `CommandDialog`. Adımı
düzelt: yukarıdaki `Command.Dialog` kullanımı yerine `components/ui/command.tsx`'ten
`CommandDialog`'u import et ve kullan:

```typescript
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
```

ve JSX'te dış sarmalayıcıyı şuna çevir:

```typescript
  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={onClose}
      title="Search Documents"
      description={`Search ${session?.user?.name ?? ""}'s Zotion`}
      showCloseButton={false}
    >
      <Command shouldFilter={false} loop>
        <CommandInput
          value={rawQuery}
          onValueChange={setRawQuery}
          placeholder={`Search ${session?.user?.name}'s Zotion..`}
        />
        <CommandList>
          <CommandEmpty>
            {documents === undefined ? "Searching…" : "No results found."}
          </CommandEmpty>
          <CommandGroup
            heading={debouncedQuery ? "Results" : "Recently opened"}
            className="pb-1"
          >
            {documents?.map((document) => (
              <CommandItem
                key={document._id}
                value={document._id}
                title={getDocumentLabel(document.title, document.type)}
                onSelect={() => onSelect(document._id)}
              >
                {document.icon ? (
                  <p className="mr-2 text-[1.125rem] leading-0">
                    {document.icon}
                  </p>
                ) : (
                  <File className="mr-2 h-4 w-4" />
                )}
                <span>{getDocumentLabel(document.title, document.type)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
```

(`CommandDialog`'un gerçek prop imzasını `components/ui/command.tsx`'ten
doğrula — `title`/`description`/`showCloseButton` prop'ları zaten orada
tanımlı, önceki `DialogTitle hidden` satırının yerini alır.)

- [ ] **Step 2: tsc kontrolü**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: temiz. `CommandItem`'ın `value` prop'u artık `document._id` —
önceki `${title}|${id}` formatından farklı; `cmdk`'nin `value` alanı artık
sadece filtreleme değil seçim/anahtar için kullanılıyor, `shouldFilter={false}`
olduğu için `value`'nin insan-okunur olması gerekmiyor, `key`/tıklama için
`_id` yeterli. Bunun tsc'yi etkilemeyeceğini doğrula (tip hatası değil,
davranış notu).

- [ ] **Step 3: Commit**

```bash
git add components/search-command.tsx
git commit -m "feat: search-command uses server-side debounced content search"
```

---

## Self-Review Notu (plan yazarı için)

- Spec kapsaması: şema (Task 2), backend hesaplama+backfill (Task 3), arama
  query'si (Task 4), frontend (Task 5) — spec'teki tüm maddeler karşılanıyor.
  Backlink ve snippet bilinçli olarak kapsam dışı bırakıldı (spec'te de öyle).
- Placeholder taraması: yok, her adımda gerçek kod var.
- Tip tutarlılığı: `extractPlainText` imzası Task 1'de tanımlandı, Task 3'te
  aynı imzayla import edilip kullanıldı. `searchDocuments`'ın döndürdüğü
  belge şekli (`_id, title, icon, type, ...`) Task 5'te `document.title`,
  `document.icon`, `document.type`, `document._id` olarak tutarlı kullanıldı.
