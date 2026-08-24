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
| Fixture'lar | 3 izole route: `clipping`, `table`, `cover-modal` |
| Yardımcı | 1 adet güçlü `assertNoUnexpectedClipping` (gölge/contain dahil) |
| Görsel regresyon | 1 snapshot (board surfaces) |
| Script'ler | `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:e2e:update` |

### 1.2 Neler yok (ölçülmüş boşluklar)

| Boşluk | Kanıt | Etkisi |
|---|---|---|
| ~~**Unit test yok**~~ | ✅ Adım 1 ile kapandı: `tests/unit/`, Vitest | — |
| ~~**Convex backend testi yok**~~ | ✅ Adım 2 ile kapandı: `tests/convex/`, `convex-test`. Kapsam `convex/` %33.91, `convex/lib` %40.59 — tam değil ama en riskli yollar (auth sırası, sıralama, cascade, dosya erişimi) korumada | — |
| **Coverage eşiği yok** | Vitest v8 raporu var (toplam %31.89), CI gate yok | "Build geçti" ≠ "davranış doğru"; regresyon sessizce girer |
| **CI yok** | `.github/workflows/` dizini yok | Merge gate yok |
| **A11y yok** | `@axe-core` bağımlılığı yok | Klavye/ekran okuyucu parity'si sınanmıyor |
| **Görsel regresyon zayıf** | 1 snapshot | Board dışı yüzeyler (table, menu, picker, cover) görsel olarak kırılabilir |
| **Paralellik kapalı** | `fullyParallel: false`, `workers: 1` | Test süresi UI yüzeyiyle doğrusal artar |
| **Okunabilirlik** | Fixture'lar ad-hoc, DOM doğrudan hardcode | Testin *ne* test ettiğini anlamak zor; değişiklikte kırılma riski |

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
- `tests/convex/support/harness.ts`: `setup()` tek çağrıda sahibi, yabancıyı ve
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

### Adım 3 — Test kütüphanesi (okunabilirlik) ⏱️ 1 gün
- `tests/support/` altına `data-builder`, `page-objects`, `fixture` yardımcıları.
- Mevcut 3 fixture'ı (table/board/cover-modal) builder'la yeniden yaz; DOM hardcode'unu azalt.
- **Çıktı:** senaryolar "ne"yi anlatır, "nasıl"ı gizler.

### Adım 4 — CI + coverage ⏱️ yarım gün
- `.github/workflows/ci.yml`: `lint` + `tsc` + `vitest --coverage` + `playwright` (değişen
  dossyalara göre daraltılmış) + `build`.
- Coverage threshold (özellikle `convex/lib` ve `components/database` için).
- `test:e2e` script'ini worker sayısıyla paralel hale getir.
- **Çıktı:** merge gate + badge.

### Adım 5 — A11y + görsel + paralellik ⏱️ 1-2 gün
- `@axe-core/playwright` ekle; kritik bileşenler için `expect(page).toHaveNoViolations()`.
- Kritik yüzeylere snapshot (table, property menü, icon picker, cover modal).
- `fullyParallel: true`, `workers` artır; fixture'lar izole olduğu için güvenli.
- **Çıktı:** ergonomi + görsel + hız üçlü kazanç.

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
2. **Coverage threshold değeri** — ⏳ **Adım 4'e ertelendi.** Eşik yalnızca CI'da
   anlam kazanıyor. Ölçüm seyri: Adım 1 sonrası toplam %17.71 → Adım 2 sonrası
   **%31.89** (`convex` %33.91, `convex/lib` %40.59, `lib` %5.98). Kullanıcı kararı:
   eşik **kademeli yükseltilecek** — bugünkü ölçülen değeri taban alıp her adımda
   yukarı çekmek, baştan %80 koyup CI'ı sürekli kırmızı bırakmamak.
3. **Snapshot baseline'ı** — ⏳ açık. Görsel regresyon için ilk baseline'lar CI'da
   üretilir ve `--update-snapshots` ile kabul edilir (Adım 5).
