# STATE — nerede kalmıştık

> **Oturum başında ilk okunacak dosya.** Sadece *şu anki* durumu tutar; geçmiş
> kararlar `decisions.md`'de, kalıcı kurallar `CLAUDE.md`'de.
> Her oturum sonunda güncelle (bkz. en alttaki şablon).

**Son güncelleme:** 2026-08-24

## Aktif iş

**Database "Board" (kanban) görünümü** — plan: `PLAN.md` (Faz 0 çıktısı, kararlar §6).

Durum: Faz 1–5 arası büyük ölçüde **commit'lenmemiş çalışma ağacında** duruyor.

| Faz | İçerik | Durum |
|---|---|---|
| 0 | Keşif + plan | ✅ `PLAN.md` |
| 1 | Playwright ölçümleri, token dosyaları | ✅ `design/notion-measurements/`, `design/kanban-tokens.{md,css}` |
| 2 | `databaseViews` şema + mutation'lar | ✅ `convex/databaseViews.ts` (14 export), `convex/schema.ts` |
| 3 | Statik board render | ✅ `components/database/board/` (17 dosya) |
| 4 | Drag & drop | ✅ `use-board-dnd.ts`, `drop-target.ts` |
| 5 | Toolbar / filtre / sort / property'ler / row peek | ✅ `database-toolbar.tsx`, `database-filter-menu.tsx`, `database-sort-menu.tsx`, `components/modals/RowPeekModal.tsx` |
| 6 | Dark mode, a11y, performans (500 kart / 8 kolon, p95 < 16ms) | ⏳ **sıradaki** |

## Dikkat — commit edilmemiş

Çalışma ağacında ~349 değişiklik var (`git status`). Board sistemi, view sistemi,
Playwright testleri ve `design/` çıktıları **henüz commit'lenmedi**. Yeni işe
başlamadan önce bunları parçalara ayırıp commit etmek gerekiyor.

## Doğrulama (test altyapısı artık VAR)

```bash
npx tsc --noEmit && npm run lint && npm run build
npm run test:e2e          # playwright — tests/e2e/*.spec.ts
npm run test:e2e:update   # snapshot güncelleme
```

Playwright fixture sayfaları: `app/test-fixtures/` (clipping, table).
Mevcut spec'ler: board-clipping, clipping-helper, editor-surface-clipping,
database-view-operations, table-parity, cover-modal-parity.

## Harness / dokümantasyon (bu oturumda kuruldu)

Katmanlı memory sistemi (`docs/README.md` haritası, `docs/memory/*`, `docs/runbook.md`),
`CLAUDE.md`'ye `@docs/memory/STATE.md` import'u, `.claude/hooks/state-guard/` hook'ları
(SessionStart izleme + Stop zorlaması) ve iki turlu ECC budaması yapıldı
(`.claude` 3.0 MB → 1.5 MB). Detay: `decisions.md`.

**Bu oturumda başka bir ajan da aynı ağaçta çalışıyordu** (cover gallery + screenshot
tooling: `CoverGallery.tsx`, `lib/coverGallery.ts`, `scripts/`, `.githooks/`,
`docs/screenshots/`). O iş ayrı commit'lenmeli, buradakiyle karıştırılmamalı.

## Paralel devam eden iş

**Notion parity** (UI birebir uyum) — devam noktası `docs/notion-research/RESEARCH_STATUS.md`.
Tema ve sidebar parity tamam; kalanlar `NOTION_PARITY.md` tablosunda.

## Oturum sonu şablonu

```md
**Son güncelleme:** <tarih>
## Aktif iş
<tek cümle: ne üzerinde çalışılıyor, plan dosyası nerede>
## Bitti / Sıradaki
<faz veya madde tablosu>
## Açık sorular
<karar bekleyen şeyler — yoksa "yok">
```
