# PLAN — Zotion Board (Kanban) Görünümü

> Faz 0 çıktısı. Bu dosya kod yazılmadan önce onaylanmalı.
> Kapsam kararları için `docs/notion-research/` ve `CLAUDE_HANDOFF.md`'deki
> önceki "Sadece Table view, board yok, view-switcher yok" kararı **genişletiliyor**
> (bu görev yeni bir kullanıcı isteği).

---

## 1. Keşif özeti (mevcut durum)

| Konu | Bulgu |
|---|---|
| View sistemi | **YOK.** `database-view.tsx` sabit bir "Table" rozeti render ediyor; view kaydı, view switcher yok |
| Property tipleri | Sadece `text` / `select` / `multiSelect` (`convex/lib/cellValue.ts`) |
| Ordering | Numeric fractional index: `ORDER_GAP=1024`, `orderBetween` (`convex/lib/ordering.ts`) — LexoRank **değil** |
| Drag helper | **VAR:** `@dnd-kit/{core,sortable,modifiers}` zaten kurulu; `database-grid.tsx` satır/sütun drag'inde kullanılıyor (PointerSensor `distance:8` eşiği, `closestCorners`, `restrictToParentElement`) |
| Kart = doküman mı? | **Hayır.** `databaseRows` veridir, kendi sayfası yok (önceki kullanıcı kararı) |
| Row title | `databaseRows`'ta title yok; başlık `isTitle:true` property hücresinde |
| Renk | Token adı saklanıyor (`colors.ts` → `OPTION_COLOR_CLASSES`) |
| UI primitives | `dialog, dropdown-menu, popover, context-menu, switch, tabs, tooltip, command, avatar, alert-dialog` hazır |
| Modal deseni | Zustand store + `use<Thing>` hook (`hooks/usePeek.tsx` → `PeekModal.tsx` side peek mevcut) |
| Auth | `requireUser` / `requireOwnedDatabase` / `requireReadableDatabase` (public-before-auth sırası kritik) |
| Test | Yok; doğrulama = `tsc --noEmit` + `npm run lint` + `npm run build` |
| Dark mode | `next-themes`, `globals.css` token'ları |

**Notion ölçüm erişimi doğrulandı (Playwright):** Kullanıcının Notion workspace'inde
"Kitaplar" database'ine **Board** view eklendi (Durum'a göre gruplu). Yapısal seçiciler:
`.notion-board-view`, `.notion-board-group` (kolon), kartlar = grup içindeki
`a[href^="/p/"]`. Hash class'lar kırılgan → ölçümlerde yapısal seçim kullanılacak.

---

## 2. Veri modeli değişiklikleri (ONAYLI kararlara göre)

### Yeni tablo: `databaseViews` — type-agnostic view sistemi
```ts
databaseViews: defineTable({
  databaseId: v.id("documents"),
  userId: v.string(),
  name: v.string(),
  type: v.union(v.literal("table"), v.literal("board")), // ileride gallery/calendar/list
  position: v.number(),           // view switcher sırası
  // View'a AİT ayarlar (database dokümanında DEĞİL):
  filters: v.optional(v.array(v.any())),            // Faz 5'te doldurulacak filtre AST'i
  sorts: v.optional(v.array(v.any())),              // sıralama tanımları
  groupByPropertyId: v.optional(v.id("databaseProperties")),
  subGroupByPropertyId: v.optional(v.id("databaseProperties")),
  visiblePropertyIds: v.optional(v.array(v.id("databaseProperties"))), // sıralı
  hiddenGroupKeys: v.optional(v.array(v.string())), // gizlenmiş kolon key'leri
  groupOrder: v.optional(v.array(v.string())),      // manuel kolon reorder (option id'leri)
  hideEmptyGroups: v.optional(v.boolean()),
  cardPreview: v.optional(v.union(v.literal("none"), v.literal("cover"), v.literal("content"))),
  cardSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
}).index("by_database_position", ["databaseId", "position"])
```
- Her database'e `createDatabase` ile **"Table" default view** seed'lenir (mevcut davranış birebir korunur).
- Bir database **view'sız kalamaz**; son view silinemez.
- Kartları elle sırala (group by değişince eski sıralar silinmez — view+grup bazlı).

### Yeni tablo: `viewCardOrder` (grup bazlı kart sırası)
```ts
viewCardOrder: defineTable({
  viewId: v.id("databaseViews"),
  databaseId: v.id("documents"),
  userId: v.string(),
  groupKey: v.string(),          // select option id | "no-<propId>" | "default"
  rowId: v.id("databaseRows"),
  order: v.number(),             // numeric fractional — ayrı string motoru YOK
}).index("by_view_group_order", ["viewId", "groupKey", "order"])
```
> **Sıralama kararı (kullanıcı onaylı):** LexoRank/string motoru YAZILMAZ; mevcut
> `orderBetween`/`ORDER_GAP` konvansiyonu (view_id, group_key) bazında uygulanır.
> Şartlar: sunucu otoriter (istemci `{toGroupKey,beforeId,afterId}` gönderir, order'ı
> sunucu hesaplar, response'ta döner; istemci optimistic gösterir, response ile uzlaşır);
> uç ekleme midpoint DEĞİL (`first - ORDER_GAP` / `last + ORDER_GAP`); precision guard —
> `|b-a| < EPSILON` veya mid==komşu ise aynı transaction'da (view,group) rebalance
> (ORDER_GAP katları, sıra korunur, tüm etkilenen order'lar response'ta); deterministik
> tiebreak `ORDER BY (order, rowId)`; index `(viewId, groupKey, order, rowId)`; kart bir
> view'da taşınınca diğer view sıraları bozulmaz.
> **Test:** aynı iki kart arasına 500 ardışık insert → rebalance tetiklenir, nihai sıra
> beklenenle birebir; rebalance sırasında paralel move → transaction tutarlı.

### Mutation'lar (yeni `convex/databaseViews.ts` + `convex/databases.ts`'e eklemeler)
- `createView`, `renameView`, `deleteView` (son view koruması), `duplicateView` (ayarları kopyalar), `reorderView`
- `updateViewSettings` (filters/sorts/visiblePropertyIds/hideEmptyGroups/cardPreview/cardSize)
- `setGroupByProperty`, `setSubGroupByProperty`, `setGroupOrder`, `setHiddenGroups`
- `moveRow` — **tek atomik işlem:** `{ rowId, toGroupKey, beforeRowId, afterRowId }` →
  group-by hücresini `toGroupKey`'e set + `viewCardOrder` içinde order'ı hesapla (yukarıdaki
  guard'larla), aynı transaction'da.
- Grup-by property / option silinince view ayarlarını temizleme (cascade).

### Property tipleri (GENİŞLETME — onaylı: tüm tipler)
`convex/lib/cellValue.ts`'e yeni tipler + cell değer şemaları:
`checkbox` (bool), `number`, `date` (timestamp), `url`, `email`/`phone`,
`person` (userId[]), `relation` (rowId[]), `formula`, `files` (storage key[]).
- Renk/token deseni korunur; yeni renderer'lar `components/database/` altında paylaşılır
  (select badge, date format, person avatar → mevcut `avatar.tsx`, relation → page-picker
  deseni, files → `/api/files/...`).
- Group by destekleri: select/multiSelect (ilk değer), checkbox (Doğru/Yanlış bucket'ları),
  date (aralık bucket'ları — Notion'dan ölçülür), person, relation, formula.

---

## 3. Frontend yapısı (yeni dosyalar)

```
components/database/
  board/
    board-view.tsx          // DndContext + gruplar + toolbar (view switcher dahil)
    board-column.tsx        // bir kolon: header + kart listesi + "+ New"
    board-column-header.tsx // renk noktası + isim + sayaç + hover'da +/⋯, drag handle, collapse
    board-card.tsx          // kart: kapak, başlık, property badge'leri, ⋯ menü, drag
    board-toolbar.tsx       // Group by / Filter / Sort / Search / Properties / view ayarları
    board-menu.tsx          // kolon ⋯ menüsü (rename, renk, hide, delete, sort)
    card-menu.tsx           // kart ⋯ menüsü
    board-create-card.tsx   // inline "+ New" başlık input'u
    use-board-dnd.ts        // dnd-kit sensor/strategy + optimistic move + rollback
    use-board-groups.ts     // rows → (groupKey → ordered rows) hesaplama + memo
    board-tokens.css        // Faz 1 ölçümlerinden türetilen token'lar
  database-view.tsx         // DÜZENLENİR: view switcher (tabs) + board/table dallanması
  board-empty.tsx           // boş board / boş kolon / filtre-boş empty state'leri
```

- `BoardCard` click → **row peek** (onaylı: Notion gibi side peek). Satırlar doküman
  değil (önceki karar korunur) → mevcut `PeekModal` deseniyle **satırın property'lerini
  düzenleyen** bir side peek paneli (`useRowPeek` Zustand store). Aynı panel kart
  menüsünden de açılır.
- `row-menu.tsx` / `column-menu.tsx` / `option-badge.tsx` desenleri yeniden kullanılır.

### Faz 4 teknik notu (ölçüm gerekçesiyle güncellendi)

- **dnd-kit yerine özel pointer motoru** (`use-board-dnd.ts`). Gerekçe: ölçülen Notion
  davranışları dnd-kit'in yeteneklerini aşıyor — (1) Esc ile programatik drag iptali
  dnd-kit'te desteklenmiyor, (2) kaynak kart drag boyunca YERİNDE ve OPAK kalıyor
  (dnd-kit sortable kaynağı gizler), (3) hedef kolon kartları drag sırasında KAYMIYOR
  (gap/placeholder yok — sadece 0.4 opacity klon pointer'ı takip ediyor). Table view
  dnd-kit kullanmaya devam eder; board kendi motoruyla pointer-events tabanlı (touch +
  mouse tek yol), 8px eşik, ~100px auto-scroll kenar eşiği + mesafeyle artan hız.
- **Kolon reorder**: Notion'da header drag YOK (ölçüldü) — kolon sıralaması "Edit groups"
  panelinden yapılır → Faz 5 kapsamına alındı.

---

## 3b. Performans bütçesi (onaylı: önce ölç, akıcılık baştan şart)

1. `content-visibility: auto` + `contain-intrinsic-size` (kart yüksekliğine yakın);
   kolonlara `contain: layout paint style`.
2. Drag sırasında **sıfır React/DOM re-render**: transform (top/left değil),
   pointermove → rAF, hover hedefi throttle, drag başlarken `will-change: transform`,
   bitince kaldır. Drop placeholder tek eleman taşımasıyla çizilir, liste re-render olmaz.
3. Kart `memo`; props referans-stabil. State kolon bazlı, tek büyük board state değil.
4. Bütçe: **500 kart / 8 kolon** seed ile drag boyunca uzun task yok, p95 < 16ms
   (Performance trace ile raporlanır). Sanallaştırma ancak bu bütçe düşerse tartışılır
   — o durumda kütüphane değil, kolon içi window'lama.

---

## 4. Faz sırası

| Faz | İçerik | Çıktı | Dur |
|---|---|---|---|
| **0** | Keşif + plan | `PLAN.md` | ✅ (buradayız) |
| **1** | Playwright ölçümleri (12 state), screenshot, `design/notion-measurements/*.json`, `design/kanban-tokens.{md,css}` | token dosyaları | ✅ onay bekliyor |
| **2** | `databaseViews` + `databaseViewOrders` şema, mutation'lar, `_generated` regen, tablo-view geriye uyum | Convex katmanı | |
| **3** | Statik board render + token'larla stil; Notion screenshot karşılaştırması | çalışan board (drag'siz) | |
| **4** | Drag & drop motoru (kolon içi/arası, preview, placeholder, auto-scroll, iptal, optimistic+rollback) | drag çalışır | |
| **5** | Toolbar (Group by/Filter/Sort/Properties), menüler, kart oluşturma, kolon yönetimi | tam feature set | |
| **6** | Dark mode, a11y, performans (200+ kart), empty state'ler | parity + DoD | |

---

## 5. DoD'ye hazırlık notları

- 12 state'in Notion referans screenshot'ları `design/notion-measurements/`'ta.
- Her faz sonunda kendi UI screenshot'ı + fark listesi `design/` altına yazılır.
- `npx tsc --noEmit` + `npm run lint` + `npm run build` her faz sonunda temiz.
- Kopyalanan üçüncü parti CSS/asset yok; sadece ölçüm değerleri.

---

## 6. Onaylanan kararlar (2026-08-24)

1. **View sistemi:** Tam view sistemi — `databaseViews` (type-agnostic) + view switcher
   (sekmeler, add/rename/duplicate/delete/drag-reorder, overflow menüsü). View `?v=<id>`
   ile adreslenebilir, son açılan view hatırlanır. Sadece table+board şimdilik, switcher
   menüsü ileride tip eklemeye açık. Migration: her database'e "Table" default view.
2. **Property tipleri:** TAM — checkbox, number, date, url/email/phone, person, relation,
   formula, files eklenir.
3. **Kart tıklaması:** Notion gibi side peek — satır property editörü (row peek).
4. **Sıralama:** Numeric fractional (orderBetween), sunucu otoriter, rebalance guard,
   tiebreak (order, rowId). String motoru YOK.
5. **Performans:** Önce ölç; content-visibility + memo + drag'de sıfır re-render;
   bütçe 500 kart / 8 kolon p95 < 16ms.

> Görev promptundaki "LexoRank/mid-string" ifadesi 4. kararla geçersiz — `tasks/kanban-parity.md`
> varsa güncellenebilir (kullanıcıya soruldu; şimdilik not düşüldü).
