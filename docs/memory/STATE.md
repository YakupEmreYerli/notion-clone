# STATE — nerede kalmıştık

> **Oturum başında ilk okunacak dosya.** Sadece *şu anki* durumu tutar; geçmiş
> kararlar `decisions.md`'de, kalıcı kurallar `CLAUDE.md`'de.
> Her oturum sonunda güncelle (bkz. en alttaki şablon).

**Son güncelleme:** 2026-08-25 (Adım 1)

## Aktif iş

**Test altyapısı** — plan `docs/testing.md`, 5 adım. **Adım 1 (Vitest kurulumu)
tamamlandı.** §5 "Karar Bekleyenler" kullanıcıyla görüşüldü.

| Adım | İçerik | Durum |
|---|---|---|
| 1 | Vitest kurulumu + saf mantığı `tests/unit/`'e taşıma | ✅ |
| 2 | Convex backend testleri (`convex-test`) | ⏳ **sıradaki** |
| 3 | Test kütüphanesi (data-builder, page-object) | ⏳ |
| 4 | CI + coverage threshold | ⏳ |
| 5 | A11y + görsel + paralellik | ⏳ |

Board (kanban) görünümü ve view sistemi tamamlandı (`PLAN.md`). Faz 6 (performans
bütçesi, a11y) hâlâ ölçülmedi — ayrı açık madde.

## Bu turda yapılanlar

**Adım 1.** `vitest` + `@vitest/coverage-v8`, `vitest.config.mts` (`.mts` şart —
düz `.ts` Vite'ın CJS yükleyicisinde uyarı veriyor). `@/` alias'ı elle
`resolve.alias`; `vite-tsconfig-paths` bilerek alınmadı (deprecated `tsconfck`).
Katmanlar ayrık: Vitest `tests/unit/**/*.test.ts`, Playwright `tests/e2e/`.
`database-view-operations.spec.ts` → `tests/unit/database-view-operations.test.ts`
(10 test, tamamı saf, `page` kullanmıyordu).

**Karar: Seçenek B.** `docs/testing.md` §1.3'ün "convex/test kullanılamıyor" teşhisi
yanlıştı — `convexTest` hiç `convex` paketinde olmadı, ayrı paket: `convex-test`
v0.0.56 (peer `convex ^1.43.0`). Adım 2'de `convex` 1.42.3 → ≥1.43 bump + `convex-test`.
Backend imajı `:latest`, pinli değil → uyum riski düşük. Gerekçe `decisions.md`.

**Coverage eşiği Adım 4'e ertelendi** — baseline ölçüldü: toplam %17.71,
`convex/lib` %1.84, `lib` %5.98. Dokümandaki %80/%70 önerisi bugünkü koda uygulanamaz.

## Doğrulama durumu (2026-08-25, Adım 1 sonrası)

```
npm test           → 10 geçti (223 ms)
npm run test:e2e   → 19 geçti, 4 atlandı, 0 başarısız (toplam 23; önce 33 idi)
npx tsc --noEmit   → temiz
npm run build      → temiz
npm run lint       → 15 sorun (7 hata / 8 uyarı) — baseline değişmedi, bkz. gotchas.md
```

## Açık maddeler

- **Adım 2 (sıradaki)** — `convex-test` ile Convex mutation testleri. 58 fonksiyonun
  sıfırı test ediliyor; en riskli yüzey `databases.ts` (698) + `databaseViews.ts` (718).
- **Coverage threshold** — Adım 4'te gerçek sayıyla kullanıcıya sorulacak.
- **Snapshot baseline'ı** — Adım 5'te açık (`docs/testing.md` §5.3).
- **Faz 6 (board)** — performans ölçümü ve a11y geçişi.
- **Lint baseline** — 7 hata React-compiler kurallarından, ayrı bir iş.

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
