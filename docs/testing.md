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
| Playwright (E2E) | 6 spec dosyası, **33 test**, tek Chromium projesi |
| Fixture'lar | 3 izole route: `clipping`, `table`, `cover-modal` |
| Yardımcı | 1 adet güçlü `assertNoUnexpectedClipping` (gölge/contain dahil) |
| Görsel regresyon | 1 snapshot (board surfaces) |
| Script'ler | `test:e2e`, `test:e2e:update` |

### 1.2 Neler yok (ölçülmüş boşluklar)

| Boşluk | Kanıt | Etkisi |
|---|---|---|
| **Unit test yok** | `database-view-operations.spec.ts` saf fonksiyonu tarayıcı açarak koşuyor (`page` kullanmıyor) | Saf mantık Playwright'ın yavaşlığına mahkûm; hız ~50x düşük |
| **Convex backend testi yok** | `convex/databases.ts` (698 satır), `databaseViews.ts` (718), `lib/*` (toplam ~2095 satır) sıfır test | **En riskli yüzey**: arama, sıralama, filtre, cascade, auth, optimistik taşıma regresyona açık |
| **Coverage yok** | `playwright.config.ts` reporter'da coverage yok | "Build geçti" ≠ "davranış doğru"; regresyon sessizce girer |
| **CI yok** | `.github/workflows/` dizini yok | Merge gate yok |
| **A11y yok** | `@axe-core` bağımlılığı yok | Klavye/ekran okuyucu parity'si sınanmıyor |
| **Görsel regresyon zayıf** | 1 snapshot | Board dışı yüzeyler (table, menu, picker, cover) görsel olarak kırılabilir |
| **Paralellik kapalı** | `fullyParallel: false`, `workers: 1` | Test süresi UI yüzeyiyle doğrusal artar |
| **Okunabilirlik** | Fixture'lar ad-hoc, DOM doğrudan hardcode | Testin *ne* test ettiğini anlamak zor; değişiklikte kırılma riski |

### 1.3 Convex test aracı durumu (dikkat!)

`convex@1.42.3` paketinde `convex/test` yardımcı modülü **exports ile export edilmemiş**.
`convexTest`, `convex/test` import'u şu anda kullanılamıyor. Bu yüzden plan iki seçenek sunar:

- **Seçenek A (önerilen):** Convex fonksiyonlarını `convex/lib/*` içindeki saf fonksiyonlara
  taşıyıp **Vitest** ile test et. Mutation'ları ince bir kabuk bırak; mantığı saf fonksiyonda tut.
  → test edilebilirlik en yüksek, Convex'e bağımlılık en düşük.
- **Seçenek B:** Convex'i yeni sürüme yükseltip (`convex/test` destekli) resmi `convexTest`
  kullanmak. Backend'i bütünsel test eder ama yükseltme riski ve bağımlılık getirir.

> Her iki seçenek de dokümanda aynı hedef test listesini kapsar; fark **execution runner**'da.

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

### Adım 1 — Vitest kurulumu + saf mantığı taşıma ⏱️ yarım gün
- `vitest` devDependency ekle; `vitest.config.ts` oluştur (`@/` alias için `resolve.alias`).
- `database-view-operations.spec.ts` içindeki saf fonksiyon testlerini `tests/unit/` altına taşı.
- Bu testler tarayıcı açmayı bırakır; hız ~50x artar.
- **Çıktı:** ilk çalışan unit katmanı + coverage raporu.

### Adım 2 — Convex backend testleri ⏱️ 1-2 gün
- `convex/lib/*` içindeki saf fonksiyonları (varsa) çıkar; `ordering`, `coerce`, `cellValue`,
  `databaseCascade` bunu destekler.
- Mutation'ları **arrange/act/assert** üçlüsüyle Vitest'te test et (Convex'i mockleyen ince
  bir backend stub ile).
- Kapsanan davranışlar:
  - `orderBoardProperties` boş liste (legacy) semantiği
  - `visiblePropertyIds` arama/filtre/sıralama etkileşimi
  - satır taşıma (`beforeRowId`/`afterRowId`) sırası
  - `coerce` -> `cellValue` tür dönüşümleri (false/0 korunmalı)
  - `databaseCascade` silme ağacı
- **Çıktı:** en riskli yüzeyin koruması.

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

1. **Convex test yaklaşımı:** Bu doküman Seçenek A (saf fonksiyon + Vitest) önerir.
   `convex/test` destekli sürüme yükseltme (Seçenek B) onay bekler.
2. **Coverage threshold değeri:** `convex/lib` için %80, bileşenler için %70 önerilir;
   son değer CI adımında ayarlanır.
3. **Snapshot baseline'ı:** Görsel regresyon için ilk baseline'lar CI'da üretilir ve
   `--update-snapshots` ile kabul edilir.
