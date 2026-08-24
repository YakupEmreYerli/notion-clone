# STATE — nerede kalmıştık

> **Oturum başında ilk okunacak dosya.** Sadece *şu anki* durumu tutar; geçmiş
> kararlar `decisions.md`'de, kalıcı kurallar `CLAUDE.md`'de.
> Her oturum sonunda güncelle (bkz. en alttaki şablon).

**Son güncelleme:** 2026-08-25

## Aktif iş

Board (kanban) görünümü ve view sistemi **tamamlandı ve commit'lendi**. Plan ve
onaylı kararlar: `PLAN.md`.

| Faz | İçerik | Durum |
|---|---|---|
| 0 | Keşif + plan | ✅ `PLAN.md` |
| 1 | Playwright ölçümleri, token dosyaları | ✅ `design/` |
| 2 | `databaseViews` + `viewCardOrder` şeması, mutation'lar | ✅ M5 |
| 3 | Statik board render | ✅ M6 |
| 4 | Drag & drop (iptal, optimistic + rollback) | ✅ M6 |
| 5 | Toolbar / filtre / sort / property'ler / row peek | ✅ M7 |
| 6 | Dark mode, a11y, performans (500 kart / 8 kolon, p95 < 16ms) | ⏳ **sıradaki** |

Faz 6 açık: performans bütçesi henüz ölçülmedi.

## Doğrulama durumu (2026-08-25, tüm commit'ler sonrası)

```
npx tsc --noEmit   → temiz
npm run build      → temiz; route listesinde /test-fixtures/* yok
npm run lint       → 15 sorun (7 hata / 8 uyarı) — baseline, bkz. gotchas.md
npm run test:e2e   → 29 geçti, 4 atlandı, 0 başarısız
```

## Bu turda kapatılanlar

Kod incelemesinden çıkan altı madde: doküman ağacı silme/arşivleme davranışı,
dosya katmanı içerik tipi politikası ve hız sınırı, hata/yükleme yüzeyleri,
fixture'ların production'a sızmaması. Gerekçeler `decisions.md`'de.

**Dosya erişim kontrolü** — `/api/files/<key>` GET'i capability URL modelinden
gerçek ACL'e geçti: `fileRefs` eşlemesi (`convex/files.ts`, `convex/lib/fileRefs.ts`),
sahibi veya yayınlanmış doküman → 200, aksi hâlde 404. Kapaklar `next/image`'da
`unoptimized` (optimizer çerez taşımıyor). Backfill:
`npx convex run files:backfillFileRefs` (çalıştırıldı: 38 doküman / 2 referans).

## Açık maddeler

- **Faz 6** — performans ölçümü ve a11y geçişi.
- **Convex mutation testleri yok** — 58 fonksiyonun sıfırı test ediliyor;
  E2E suite'i geometri/parity odaklı. `docs/testing.md` yol haritası.
- **Lint baseline** — 7 hata React-compiler kurallarından, ayrı bir iş.
- **design/ ağırlığı** — 31 PNG ≈ 10.9 MB git'te; JSON ölçümler 132 KB.
  Kullanıcı bunu ayrıca değerlendirecek.

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
