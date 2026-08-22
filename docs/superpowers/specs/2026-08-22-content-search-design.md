# İçerik Araması (Full-Text Search) — Tasarım

## Amaç

`Ctrl+K` arama paleti şu an yalnızca belge **başlıklarında** arıyor
(`components/search-command.tsx`, `convex/documents.ts:getSearch`).
Kullanıcı bir kelimenin bir belgenin *içinde* geçtiğini biliyor ama başlıkta
görmüyorsa o belgeyi bulamıyor. Bu belgenin amacı: aramayı belge içeriğine de
genişletmek, aynı zamanda `getSearch`'ün her arama açılışında **tüm**
belgeleri eager fetch etmesi sorununu da (ölçeklenmiyor) düzeltmek.

Backlink / "bu sayfaya nereden bağlandım" özelliği bu kapsamda **değil** —
editörde sayfalar arası link (mention) özelliği henüz yok, bu ön koşul ayrı
bir iş olarak bırakıldı.

## Yaklaşım

Convex'in yerleşik `searchIndex` özelliği kullanılacak — ayrı bir arama
motoru/servise gerek yok.

### Şema (`convex/schema.ts`)

`documents` tablosuna:
- `searchText: v.optional(v.string())` — başlık + içerikten türetilen, HTML/JSON
  biçimlendirmesi olmadan düz metin. Arama bu tek alan üzerinden yapılacak
  (başlık ve içerik ayrı ayrı indekslenip sonuçları birleştirmek yerine tek
  alanda birleştirmek, tek sorgu + tek sıralama demek — v1 için yeterli).
- `.searchIndex("search_text", { searchField: "searchText", filterFields: ["userId"] })`

### Backend (`convex/documents.ts`)

- Yeni saf fonksiyon `extractPlainText(contentJson: string): string` —
  BlockNote'un JSON blok dizisini recursive gezip her `text` alanını
  birleştirir (DOM'a ihtiyaç yok, düz JSON gezme).
- `update` mutation'ı: `args.title` veya `args.content` değiştiğinde
  `searchText = title + "\n" + extractPlainText(content)` yeniden hesaplanıp
  patch'e eklenir.
- Yeni query `searchDocuments({ query: string })`: boşsa `[]` döner; doluysa
  `ctx.db.query("documents").withSearchIndex("search_text", q =>
  q.search("searchText", query).eq("userId", userId)).filter(isArchived=false).take(20)`.
- Bir kerelik backfill mutation'ı (`backfillSearchText`) — var olan belgeler
  için `searchText` alanını doldurur. UI'da yer almaz, bir kez `npx convex
  run` ile elle tetiklenir.

### Frontend (`components/search-command.tsx`)

- Şu anki "tüm belgeleri eager çek + cmdk client-side filtrele" modeli
  kaldırılır.
- `CommandInput`in değeri debounce edilir (~200ms), boş değilse
  `api.documents.searchDocuments` çağrılır.
- Kutu boşken (henüz yazılmadıysa): `getRecentlyOpened` sorgusu ile "Recently
  opened" listesi gösterilir (backend'de zaten var, sadece bu ekranda
  kullanılacak).
- `Command`e `shouldFilter={false}` verilir — sonuçlar zaten sunucudan
  filtrelenmiş geliyor, cmdk'nin kendi client-side fuzzy filtresi tekrar
  devreye girip sonuçları saklamasın.
- v1 kapsamında içerik eşleşmesi için "şurada geçiyor" snippet'i **yok** —
  sadece eşleşen belgeler listelenir (Notion'daki gibi eşleşen metin
  parçasını alıntılama sonraki bir iyileştirme).

## Kapsam dışı (bilinçli)

- Backlink / sayfa mention'ları (ön koşul: editörde @-link özelliği yoktur).
- Eşleşen metin snippet'i / vurgulama.
- Fuzzy/typo-tolerant arama (Convex search index temelde kelime bazlı; bu v1
  için yeterli kabul edildi).
