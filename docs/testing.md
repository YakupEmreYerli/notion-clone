# Test Alma Yapısı (Test Strategy)

Bu doküman, Zotion (notion-clone) için **kapsamlı ve okunabilir** bir test altyapısı
kurmanın yol haritasıdır. Amaç "ohâ be" dedirtecek bir test kültürü değil; ikisini birden
hedefler: **gerçek koruma** + **insanların okuyup anlayabileceği netlik**.

Doküman üç bölümden oluşur:

1. **Mevcut Durum** — bugün gerçekten ne var, ne yok (ölçülmüş).
2. **Hedef Mimari** — olması gereken katmanlar ve her katmanın sorumluluğu.
3. **Yol Haritası** — adım adım, ölçülebilir, öncelikli uygulama planı.

---

## 1. Mevcut Durum (2026-08-24 ölçümü)

### 1.1 Neler var

| Öğe | Detay |
|---|---|
| Playwright (E2E) | 5 spec dosyası, **23 test** (19 geçen + 4 atlanan), tek Chromium projesi |
| Vitest (unit) | 1 dosya, **10 test** — Adım 1 ile geldi |
| Vitest (convex) | 5 dosya, **36 test**, `convex-test` — Adım 2 ile geldi |
| Fixture'lar | 3 izole route: `clipping`, `table`, `cover-modal` (route kabukları `app/`, bileşenler `tests/support/fixtures/`) |
| Test kütüphanesi | `tests/support/`: data-builder, 3 page-object, `assertNoUnexpectedClipping`, Convex harness |
| Görsel regresyon | 1 snapshot (board surfaces) |
| Script'ler | `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:e2e:update` |

### 1.2 Neler yok (ölçülmüş boşluklar)

| Boşluk | Kanıt | Etkisi |
|---|---|---|
| ~~**Unit test yok**~~ | ✅ Adım 1 ile kapandı: `tests/unit/`, Vitest | — |
| ~~**Convex backend testi yok**~~ | ✅ Adım 2 ile kapandı: `tests/convex/`, `convex-test`. Kapsam `convex/` %33.91, `convex/lib` %40.59 — tam değil ama en riskli yollar (auth sırası, sıralama, cascade, dosya erişimi) korumada | — |
| ~~**Coverage eşiği yok**~~ | ✅ `vitest.config.mts` `thresholds` — ölçülen değerin hemen altı, kademeli yükselecek | — |
| **CI yok** | `.github/workflows/` dizini yok | Merge gate yok — **kullanıcı kararıyla ertelendi** |
| ~~**A11y yok**~~ | ✅ `@axe-core/playwright`, `tests/e2e/a11y.spec.ts` (5 test) | — |
| ~~**Görsel regresyon zayıf**~~ | ✅ 5 snapshot: board + table, property menu, icon picker, cover modal | — |
| ~~**Paralellik kapalı**~~ | ✅ `fullyParallel: true` — 11.8s → 5.4s (aynı 23 test) | — |
| ~~**Okunabilirlik**~~ | ✅ Adım 3 ile kapandı: `tests/support/` (data-builder + page-object + assertion + fixture bileşenleri) | — |

### 1.3 Convex test aracı durumu — ✅ çözüldü (2026-08-25)

> **Düzeltme.** Bu bölüm önceden "`convex@1.42.3` paketinde `convex/test` exports ile
> export edilmemiş, bu yüzden `convexTest` kullanılamıyor" diyordu. Teşhis yanlıştı:
> `convexTest` hiçbir zaman `convex` paketinin içinde olmadı — bağımsız bir npm paketi,
> **`convex-test`** (v0.0.56, peer dep `convex ^1.43.0`).

**Karar: Seçenek B** (`decisions.md` → "Test altyapısı"). Adım 2'de `convex` 1.42.3'ten
≥1.43'e (güncel 1.45.0) çıkılır ve `convex-test` devDependency eklenir. Mutation'lar
(`databases.ts`, `databaseViews.ts`) üretim kodu değiştirilmeden, gerçek db/auth
semantiğiyle test edilir. `convex-test` in-memory çalışır; testler için Docker stack'i
gerekmez. Backend imajı `docker-compose.yml`'de pinli olmadığı (`:latest`) için client
bump'ı sunucu uyum riski taşımıyor.

Seçenek A (mantığı `convex/lib`'e taşıyıp saf fonksiyon olarak test etmek) elendi:
~1400 satırlık üretim kodu refactor'ü isterdi ve `ctx.db`'ye bağlı davranışları
(cascade, auth, ordering) yine test dışı bırakırdı.


---

## 2. Hedef Mimari (Test Piramidi)

```
          ▲  E2E (az, ama gerçek kullanıcı akışı)
         /|\   Playwright + fixture + page-object
        / | \
       /  |  \  INTEGRASYON (Convex backend)  ─── convex/lib testleri
      /   |   \
     /    |    \  UNIT (saf fonksiyon)  ─── Vitest, milisaniye
    /     |     \
   └──────┴──────┘  HER KATMAN coverage raporu üretir
```

### Katman sorumlulukları

| Katman | Araç | Test eder | Hız | Kapsam |
|---|---|---|---|---|
| **Unit** | Vitest | Saf fonksiyonlar: `view-operations`, `grouping`, `ordering`, `coerce`, `cellValue`, `property-icons`, `coverGallery` verisi | <ms | En geniş |
| **Entegrasyon** | `convex/lib` + Vitest (veya `convexTest`) | DB mantığı: filtre/sıralama/arama/cascade, satır taşıma, `visiblePropertyIds` semantiği | ~ms–s | Kritik |
| **E2E** | Playwright | Kullanıcı akışları: tablo, board, menü, ikon picker, cover modal, navbar | sn | Dar ama gerçek |
| **Görsel** | Playwright snapshot | Kritik yüzeylerin piksel bütünlüğü | sn | Dar |

### Desenler (okunabilirlik için)

- **data-builder**: fixture konfigürasyonunu tek satırda kur.
  ```
  const db = databaseBuilder().withTitle("Kitaplar").withSelect("Durum").build();
  ```
- **page-object**: DOM hardcode'unu tek yerde topla. `TablePage`, `BoardPage`, `SidebarPage`.
  Test senaryosu ne yapmak istediğini okur, *nasıl* seçileceğini değil.
- **given/when/then** yorum satırı: her testin neyi neden doğruladığını açıkla.
- **eyebrow teardown**: auth'lu akışlar için her test bağımsız, izole fixture kullanır.

---

## 3. Yol Haritası (adım adım)

Sıralama ROI (yatırım getirisi) esasına göre. Her adım bağımsız merge edilebilir.

### Adım 1 — Vitest kurulumu + saf mantığı taşıma ✅ **tamamlandı (2026-08-25)**
- `vitest` + `@vitest/coverage-v8` devDependency; **`vitest.config.mts`** (`.mts` —
  düz `.ts` Vite'ın CJS yükleyicisinde uyarı veriyor). `@/` alias'ı elle
  `resolve.alias` ile kuruldu (`vite-tsconfig-paths` alınmadı: deprecated `tsconfck`
  sürüklüyor, tek alias için gereksiz).
- Katman ayrımı keskin: Vitest `include: ["tests/unit/**/*.test.ts"]`, Playwright
  `testDir: ./tests/e2e`. Birbirlerinin dosyalarını toplamıyorlar.
- `tests/e2e/database-view-operations.spec.ts` (`page`'i hiç kullanmayan, tamamı saf
  10 test) → `tests/unit/database-view-operations.test.ts`.
- Script'ler: `npm test` (`vitest run`), `test:watch`, `test:coverage`.
- **Ölçülen sonuç:** 10 test **223 ms**'de geçiyor (önce tarayıcı açıyorlardı).
  E2E 33 → 23 test (19 geçen + 4 atlanan). Coverage baseline: toplam %17.71,
  `convex/lib` %1.84, `lib` %5.98. `tsc --noEmit` temiz, `build` temiz,
  `lint` 15 sorunda sabit (baseline değişmedi).

### Adım 2 — Convex backend testleri ✅ **tamamlandı (2026-08-25)**
- `convex` 1.42.3 → **1.45.0**, + `convex-test@0.0.56` ve `@edge-runtime/vm`
  devDependency. `tsc` ve `build` bump sonrası temiz; `convex/_generated/`
  yeniden üretmek gerekmedi (fonksiyon şekilleri değişmedi).
- `vitest.config.mts` artık iki **project** tanımlıyor: `unit` (node ortamı) ve
  `convex` (`edge-runtime` ortamı + `server.deps.inline: ["convex-test"]` —
  `convex-test`, `convex/` modüllerini `import.meta.glob` ile topladığı için
  externalize edilmemeli).
- `tests/support/convex/harness.ts`: `setup()` tek çağrıda sahibi, yabancıyı ve
  anonim ziyaretçiyi verir (`requireUser` kimliğin `subject`'ini userId sayar).
- **36 test**, beş dosya:
  | Dosya | Kapsanan davranış |
  |---|---|
  | `auth.test.ts` | public-before-auth okuma sırası, arşiv/yayın etkileşimi, sahiplik reddi |
  | `databases.test.ts` | fractional index (başa/araya ekleme, komşuları yeniden yazmama), MIN_GAP rebalance, `updateCell` sığ merge, `false`/`0` korunması, `deleteRow` sıra kaydı temizliği |
  | `documents.test.ts` | özyinelemeli alt ağaç silme + cascade, kardeş ağaca dokunmama, archive/restore yürüyüşü, `searchText` ve `fileRefs` senkronu |
  | `databaseViews.test.ts` | `moveRow` group-by hücresi + `GROUP_KEY_NONE`, çift sıra kaydı bırakmama, grup içi sıra, view yaşam döngüsü |
  | `files.test.ts` | `isPubliclyReadable`: yayın/arşiv geçişleri, kapak değişince eski dosyanın kapanması, bilinmeyen anahtarda bilgi sızdırmama |
- **Testlerin diş geçirdiği doğrulandı:** `documents.getById` içindeki
  public-before-auth sırası kasten ters çevrildi → ilgili test kırmızı yandı,
  kod geri alındı. `tsc`/`build` bu bozulmayı yakalamıyor.
- Yan bulgu: ESLint üretilmiş `coverage/` çıktısını tarıyordu (3 sahte uyarı) —
  `eslint.config.mjs` ignore listesine eklendi.
- **Çıktı:** en riskli yüzeyin koruması. Coverage %17.71 → **%31.89**.

### Adım 3 — Test kütüphanesi (okunabilirlik) ✅ **tamamlandı (2026-08-25)**

**Tek kök: `tests/`.** Test'e ait ne varsa buraya toplandı — `app/` altında
yalnızca üç satırlık route kabuğu kaldı (Next.js route'ları `app/` altında olmak
zorunda, fixture bileşenleri değil):

```
tests/
  unit/                     Vitest, saf fonksiyon
  convex/                   Vitest, convex-test
  e2e/                      Playwright spec'leri (+ snapshot'lar)
  support/
    data/database-builder.ts   veri kurucusu
    pages/                     BoardPage · TablePage · CoverModalPage
    fixtures/                  fixture bileşenleri (app/ yalnızca re-export eder)
    assertions/clipping.ts     assertNoUnexpectedClipping
    convex/harness.ts          convex-test kurulumu
```

- **`databaseBuilder(prefix)`** — değişmez (her `with*` yeni kurucu döndürür),
  hücreler özellik **adıyla** verilir, kurucu bunları `_id`'ye çevirir. Böylece
  "hücreler ada göre değil `_id`'ye göre anahtarlanır" üretim kuralı test
  tarafında da bozulmadan kalır. `build()` ayrıca `titleProperty`,
  `visibleProperties`, `view` ve `property(name)` / `propertyId(name)` verir;
  `withTitle()` çağrılmazsa açıkça fırlatır.
- **Page-object'ler** — spec'ler artık `getByTestId("board-card")` değil
  `board.cards` okuyor. Fixture/gerçek-uygulama dallanması (`PLAYWRIGHT_BOARD_PATH`
  ile gelen oturumlu board) tamamen `BoardPage` içinde; spec'lerde `if` yok.
- **Yeniden yazılan yerler:** 3 fixture bileşeni, 3 E2E spec'i ve
  `tests/unit/database-view-operations.test.ts` — hepsi kurucuyu/page-object'i
  kullanıyor. Elle yazılmış `Doc<>` blokları (~150 satır) gitti.
- **Doğrulandı:** 46 Vitest + 19 Playwright testi geçiyor, **piksel snapshot'ı
  dahil** — yani kurucuya geçiş render çıktısını bit düzeyinde değiştirmedi.
  Coverage %31.89'da sabit (bu adım saf refactor, yeni davranış kapsamadı).
- **Çıktı:** senaryolar "ne"yi anlatır, "nasıl"ı gizler; proje kökünde tek test
  dizini.

### Adım 4 — coverage eşiği ✅ · CI ⏸️ **ertelendi (kullanıcı kararı)**
- **CI'ye girilmedi.** `.github/workflows/` hâlâ yok; merge gate açık madde.
- **Coverage threshold kondu** (`vitest.config.mts` → `coverage.thresholds`):
  global 31/23/38/32, `convex/lib/**` için 40/18/68/42 — hepsi 2026-08-25
  ölçümünün hemen altı. Amaç hedefe ulaşmak değil, **geri gitmeyi engellemek**.
  Eşiğin gerçekten ısırdığı ölçüldü: `statements` geçici olarak 99'a çekildi,
  `npm run test:coverage` "does not meet global threshold" ile kırmızı yandı.
- **Paralellik açıldı**: `fullyParallel: true`, `workers` yerelde otomatik
  (CI'da 2'ye sabit — CI kurulunca anlam kazanacak). Aynı 23 testte
  **11.8s → 5.4s**.

### Adım 5 — A11y + görsel regresyon ✅ **tamamlandı (2026-08-25)**

**A11y** — `@axe-core/playwright@4.13`, `tests/support/assertions/a11y.ts` +
`tests/e2e/a11y.spec.ts` (5 test, WCAG 2.1 A/AA). Karşılaştırma **kural
kimliği** üzerinden yapılır, seçici üzerinden değil: Radix'in ürettiği id'ler
(`#radix-_r_l_-trigger-gallery`) her koşuda değişir. Beklenti listesi
**eşitlikle** karşılaştırılır — yeni ihlal de, düzeltilmiş ihlal de testi kırar,
liste kendiliğinden çürüyemez.

Tarama gerçek ihlal buldu; ikiye ayrıldı:

| Sınıf | Kurallar | Durum |
|---|---|---|
| Notion parity borcu | `color-contrast` | Bilinçli — Notion'ın ikincil metni (rgb(142,139,134)) AA eşiğini geçmiyor, düzeltmek piksel parity'sini bozar |
| **Gerçek hata** | `aria-required-children`, `aria-required-parent`, `label`, `aria-hidden-focus` | ⏳ **açık madde** — tablo `role="grid"`/`role="gridcell"` kullanıyor ama arada `role="row"` yok; ekran okuyucu tabloyu satır satır gezemiyor |

**Görsel** — `tests/e2e/visual-parity.spec.ts`, dört **locator** snapshot'ı
(table yüzeyi, property menü, icon picker, cover modal). Locator seçildi ki
sayfa gürültüsü (kaydırma konumu, odak halkası) çerçeveye girmesin. Cover
modal'da galeri maskelenir — karolar uzak CDN'den geliyor, maskesiz snapshot
ağ durumuna bağlı olurdu. Baseline'lar iki ardışık koşuda değişmedi.

- **Çıktı:** 23 → 32 E2E testi (28 geçen + 4 atlanan), 1 → 5 snapshot.

---

## 4. Kabuller ve İlkeler

- **Sahte Kontrol Yok:** Test etmek için işlevsel olmayan kontrol eklenmez; desteklenmeyen
  Notion özelliği varsa test edilmez, atlanır.
- **İzolasyon:** Her E2E testi bağımsız fixture kullanır; `beforeEach` ile temiz ortam.
- **Coverage Hedefi:** Her yeni mantık değişikliği, değişen katmanın testini de getirir.
- **Okunabilirlik > Sıkıcılık:** Test adı neyi doğruladığını söyler; gövde kısa ve net.
- **Gerçek Veri Kullanımı:** Auth'lu gerçek akışlar geliştirme ortamında seed'lenmiş veriyle
  çalıştırılır (Playwright storageState ile).

---

## 5. Karar Bekleyenler

1. ~~**Convex test yaklaşımı**~~ — ✅ **karara bağlandı (2026-08-25): Seçenek B**,
   ayrı `convex-test` paketi + `convex` ≥1.43 bump. Gerekçe §1.3 ve `decisions.md`.
2. ~~**Coverage threshold değeri**~~ — ✅ kapandı: `vitest.config.mts` içinde
   global 31/23/38/32 ve `convex/lib/**` için 40/18/68/42. Ölçüm seyri: %17.71
   (Adım 1) → **%31.89** (Adım 2; Adım 3 ve 5 saf test/refactor olduğu için
   değişmedi). Kullanıcı kararı gereği kademeli yükseltilecek. Eşik CI olmadan
   da `npm run test:coverage` üzerinden yerel gate olarak çalışıyor.
3. ~~**Snapshot baseline'ı**~~ — ✅ kapandı: baseline'lar yerelde üretildi
   (`--update-snapshots`) ve depoya girdi; determinizm iki ardışık koşuda
   doğrulandı. CI kurulduğunda Linux/Chromium baseline'ı zaten hazır.
4. **Tablo ARIA yapısı** — ⏳ açık, a11y taramasının bulduğu gerçek hata.
   `role="grid"` → `role="row"` → `role="gridcell"` zinciri kopuk. Düzeltme CSS
   grid yerleşimini bozmadan `display: contents` taşıyan satır sarmalayıcı
   ister; `a11y.spec.ts`'teki beklenti listesi düzeltmeyle birlikte kısalmalı.
5. **CI** — ⏸️ kullanıcı kararıyla ertelendi.
