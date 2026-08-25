# Karar günlüğü

> "Bu neden böyle?" sorusunun cevabı burada. **Append-only** — eski kayıt silinmez,
> geçersiz kalırsa üstü çizilir (~~...~~) ve altına yeni karar yazılır.
>
> Buraya **gerekçesi olmayan** şey yazma. Kodun kendisinden okunabilen şeyler
> (dosya yapısı, fonksiyon isimleri) buraya değil, koda ait.
> Kalıcı *kurallar* `CLAUDE.md` ve `.claude/rules/project/*` içinde — burası
> onların **neden** öyle olduğunu tutar.

Format: `### <tarih> — <karar>` + **Gerekçe** + (varsa) **Bedeli**.

---

## Self-host / altyapı (2026-08-22)

### Dosya URL'leri relative saklanır (`/api/files/...`)
**Gerekçe:** Domain değişince eski cover/görseller bozulmasın; tek Docker image her
domaine hizmet edebilsin. `lib/storage.ts:isFileUrl` hem `http(s)` hem relative kabul
eder; `isManagedFileUrl` sadece relative (yani yalnızca bizim silebileceklerimiz).

### Dosyalar private bucket'ta, uygulama üzerinden stream edilir
**Gerekçe:** MinIO'yu public etmemek.
**Bedeli:** Bant genişliği Next.js üzerinden geçer.

### JWT imzası RS256 (Better Auth default'u EdDSA)
**Gerekçe:** Convex'in OIDC doğrulayıcısıyla uyum.

### OIDC discovery dokümanı elle yazıldı (`app/api/oidc-config/route.ts`)
**Gerekçe:** Better Auth'un `jwt` plugin'i discovery doc sunmuyor, sadece `/jwks`.

### Postgres host portu 55432, `POSTGRES_DB=postgres`
**Gerekçe:** 5432'yi kullanıcının başka projesi (`opencut-ai`) kullanıyor. Convex
`CONVEX_INSTANCE_NAME` adıyla kendi DB'sini yaratıyor — bootstrap DB'si ayrı olsun.

---

## Database (table/board) veri modeli (2026-08-22)

### Hücreler property `_id` ile anahtarlanır, ad ile değil
**Gerekçe:** Sütun rename'i sıfır satır yazması olsun.

### Hücrede option `id` saklanır, label değil
**Gerekçe:** Option rename/recolor O(1), satırlara dokunmaz.

### Fractional (float) ordering — `documents.reorder` deseni kopyalanmaz
**Gerekçe:** `reorder` her kardeşi yeniden yazıyor (O(n)); sidebar ağacı küçük olduğu
için orada kabul edilebilir, potansiyel olarak büyük tablolarda değil.

### `getSchema` ve `getRows` ayrı sorgu
**Gerekçe:** Birleşik olsaydı her hücre düzenlemesi sütun tanımlarını geçersiz kılar,
açık select popover'ı kapanırdı.

### Option rengi *token adı* olarak saklanır ("blue"), Tailwind class'ı değil
**Gerekçe:** Tailwind v4 dinamik olarak kurulmuş class adlarını göremiyor.

### Tablo CSS grid ile render edilir, `<table>` ile değil
**Gerekçe:** `npx shadcn add table` bağımlılığı gerekmesin.

---

## Board (kanban) view sistemi (2026-08-24, `PLAN.md` §6)

### Tam view sistemi: `databaseViews` (type-agnostic) + view switcher
`?v=<id>` ile adreslenebilir, son açılan view hatırlanır. Şimdilik table + board.
Migration: her database'e "Table" default view seed'lenir; database view'sız kalamaz.
**Gerekçe:** Gallery/calendar/list ileride şema değişikliği olmadan eklenebilsin.

### Property tipleri tam set
checkbox, number, date, url/email/phone, person, relation, formula, files.

### Karta tıklama → side peek (row peek), ayrı sayfa değil
**Gerekçe:** `databaseRows` veridir, kendi dokümanı yoktur (kullanıcı kararı).

### Sıralama numeric fractional (`orderBetween`), sunucu otoriter
Rebalance guard + tiebreak (order, rowId). ~~LexoRank / mid-string~~ **kullanılmıyor**
— görev promptundaki ifade bu kararla geçersiz.

### Performans bütçesi: 500 kart / 8 kolon, p95 < 16ms
Önce ölç, sonra optimize et. Drag sırasında sıfır gereksiz re-render.

---

## Dokümantasyon / harness (2026-08-24)

### ECC'nin proje kopyası budandı; plugin sürümü kaynak kabul edilir
`.claude/{agents,skills,commands}` içinde yalnızca bu stack'e (Next.js + React +
TypeScript + Convex) uyanlar ve projeye özel olanlar (`convex-reviewer`,
`notion-clone-patterns`) bırakıldı. `.claude/rules/ecc/` yalnızca
`common/ typescript/ react/ web/`.
**Gerekçe:** Aynı ECC hem user-scope plugin (`ecc:` öneki) hem proje kopyası olarak
kuruluydu; agent/skill listesi sistem prompt'unda ikiye katlanıp her oturumda
on binlerce token yiyordu. Silinenlere `ecc:` önekiyle hâlâ erişilebilir.

### `.claude/**` eslint ignore listesine eklendi
**Gerekçe:** Vendor edilmiş ECC scriptleri lint hatası üretiyordu (24 → 17 sorun).

### STATE.md hook ile zorunlu tutulur, slash komutla değil
`.claude/hooks/state-guard/` — SessionStart'ta gerçek repo durumunu enjekte eder,
Stop'ta kaynak kod değişip `STATE.md` güncellenmediyse oturumu bitirtmez.
**Gerekçe:** `/state` gibi kullanıcı tetikli bir komut, çalıştırılması unutulduğu anda
işe yaramaz; bayat STATE hiç olmamasından kötüdür. Dokümanın taze kalması modelin
veya kullanıcının hatırlamasına değil, mekanizmaya bağlanmalı.
**Bedeli:** Kaynak kod değiştiren her oturumda bir ek tur (STATE yazımı) maliyeti var.

---

## İçerik araması (full-text search) — 2026-08-22

> Kaynak: `docs/superpowers/` altındaki spec/plan dosyaları. Özellik sevk edildikten
> sonra o dosyalar silindi (git geçmişinde duruyor); kalıcı olan kararlar burada.

### Tek birleşik `searchText` alanı indekslenir, başlık ve içerik ayrı ayrı değil
`documents.searchText = title + "\n" + extractPlainText(content)`, üzerinde
`search_text` search index'i (`filterFields: ["userId"]`).
**Gerekçe:** Tek sorgu + tek sıralama; iki ayrı indeksin sonuçlarını birleştirip
yeniden sıralamaya gerek kalmıyor.
**Bedeli:** Eşleşmenin başlıktan mı içerikten mi geldiği ayırt edilemiyor.

### Ayrı arama motoru/servisi yok — Convex'in yerleşik `searchIndex`'i
**Gerekçe:** Stack'te SaaS bağımlılığı olmaması ilkesi; ek servis işletme maliyeti yok.

### `search-command.tsx`'te cmdk'ye `shouldFilter={false}` verilir
**Gerekçe:** Sonuçlar sunucudan zaten filtreli geliyor; cmdk'nin client-side fuzzy
filtresi devrede kalırsa eşleşen sonuçları ikinci kez eleyip gizliyor. Bu satır
kaldırılırsa arama "çalışmıyor" gibi görünür — silme.

### Arama sunucu taraflı ve debounce'lu (~200ms); kutu boşken "Recently opened"
Eski model (tüm belgeleri eager çekip client'ta filtrele) kaldırıldı.

### `backfillSearchText` tek seferlik mutation'dır, UI'da yer almaz
`npx convex run` ile elle tetiklenir. Var olan belgelerin `searchText`'ini doldurur.

### v1'de bilinçli kapsam dışı
Backlink / sayfa mention'ları (ön koşul: editörde @-link yok), eşleşen metin
snippet'i ve vurgulama, fuzzy/typo-tolerant arama.

### Vendor edilmiş ECC dosyaları budandı (2026-08-24, ikinci tur)
Silinenler: ECC'nin kendi repo dosyaları (`.claude/{README,AGENTS,PLUGIN_SCHEMA_NOTES}.md`,
`the-security-guide.md`, `marketplace.json`, `plugin.json`, `ecc/install-state.json` 368 KB),
Notion ikon kazıma artıkları (`notion_svgs_unique.zip`, kökteki `manifest.json`) ve
`.claude/scripts` altında ulaşılamayan 115 modül (847 KB). `.claude` 3.0 MB → 1.5 MB.
**Gerekçe:** ECC kullanıcı seviyesinde plugin olarak kurulu; bunlar kurulum makinesinin
projeye kopyalanmış artıkları. Kurulum/GitHub/worktree/plan-canvas script'leri bu projede
hiçbir zaman çalışmıyor.
**Yöntem:** `hooks/hooks.json`'daki 23 kökten `require` kapanışı çıkarıldı → 53 modül canlı.
Ada göre çağrılabilecek 19 dosya (`spawn`'lı `.py`/`.sh` dahil) listeden çıkarıldı.
Silme öncesi ve sonrası aynı doğrulayıcı çalıştırıldı: her ikisinde de 23 kök / 53 modül /
0 eksik bağımlılık; ardından 23 kök `node --check` ile doğrulandı.
**Korunanlar:** Aktif hook zinciri (GateGuard dahil) ve `.claude/scripts/lib`'in canlı kısmı.

---

## Dayanıklılık ve dosya katmanı (2026-08-25)

### Yüklenen dosyanın içerik tipi hiçbir zaman istemciden geldiği gibi saklanmaz
`lib/fileTypes.ts` tek kaynak: yüklemede `normalizeStoredType` bilinen-güvenli görüntü
tiplerini korur, gerisini `application/octet-stream`'e indirger; servis ederken
`serveHeadersFor` yalnızca allowlist'teki tipleri `inline`, kalanını `attachment`
olarak döndürür ve `nosniff` ekler. SVG bilinçli olarak allowlist dışında.
**Gerekçe:** `File.type` istemci kontrolündedir; olduğu gibi saklanıp geri servis
edilirse uygulamanın kendi origin'inde çalıştırılabilir içerik doğar.
**Bedeli:** SVG cover/görsel olarak satır içi gösterilmez, indirilir.

### `/api/files/<key>` GET'i kimlik doğrulamaz — capability URL modeli
Yayınlanmış sayfanın görselleri anonim ziyaretçiye açılmak zorunda. Anahtarlar UUID
içerdiği için tahmin edilemez. Sızıntı yüzeyi başlıklarla daraltıldı:
`cache-control: private` (paylaşımlı önbellekler tutmaz), `referrer-policy: no-referrer`
(URL üçüncü taraflara sızmaz), `nosniff` + tip politikası.
~~**Açık kalan:** Bu tam bir erişim kontrolü değil — URL'yi ele geçiren yayınlanmamış bir
sayfanın görselini de görebilir. Gerçek çözüm, dosya→doküman eşlemesi tutan bir kayıt
(publish durumuna bağlı kontrol) veya süreli imzalı URL; ikisi de şema değişikliği
gerektirdiği için ayrı bir iş olarak duruyor.~~ → 2026-08-25'te kapatıldı, aşağıya bak.

### Yükleme hız sınırı süreç içi sayaçla
`lib/rateLimit.ts`, kullanıcı başına 40 yükleme / 5 dakika (env ile ayarlanır).
**Gerekçe:** Uygulama tek Next.js süreci olarak çalışıyor; paylaşımlı bir sayaç (Redis)
eklemek stack'e yeni bir servis sokardı ve "SaaS/servis bağımlılığı yok" ilkesine
karşı gelirdi. Çok replikaya çıkılırsa etkin limit replika sayısıyla çarpılır — o
noktada paylaşımlı sayaca taşınmalı (dosyada not düşüldü).

### Playwright fixture sayfaları production'da hiç route olmaz
Sayfalar `page.fixture.tsx` olarak adlandırıldı; `next.config.mjs` `pageExtensions`'a
bu uzantıyı yalnızca production dışında ekliyor.
**Gerekçe:** Önceki koruma `proxy.ts`'te tahmin edilebilir bir header kontrolüydü —
sayfalar yine derlenip production bundle'ına giriyordu. Artık build çıktısında
`/test-fixtures/*` route'u yok.

### Hata yüzeyi segment bazına ayrıldı
`app/(main)/error.tsx` (reset'li), `app/(main)/loading.tsx`,
`app/(public)/(routes)/preview/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx`.
**Gerekçe:** Tek bir kök `error.tsx` vardı ve "Go back → /documents" diyordu; anonim
preview ziyaretçisi için bu link anlamsız, üstelik geçici bir hatada yeniden deneme
imkânı yoktu.

### `documents.remove` alt ağacı da siler, rekürsif gezinmeler `await` edilir
**Gerekçe:** Sayfa silindiğinde alt sayfalar `parentDocument`'i var olmayan bir kayda
işaret eder halde kalıyordu (sidebar'da görünmez, veritabanında birikir).
`await`siz gezinme ise handler döndüğünde transaction'ı kapatıp kalan işi sessizce
düşürüyordu. Uzun süre bilinçli non-fix olarak tutulmuşlardı; artık düzeltildi ve
`CLAUDE.md` ile `.claude/rules/project/convex.md` bu yönde güncellendi.

---

## Dosya erişim kontrolü (2026-08-25)

### `/api/files/<key>` GET'i artık gerçek erişim kontrolü yapar — `fileRefs` eşlemesi
Capability URL modeli bitti. İki yol var: (1) anahtarın içindeki `<userId>` oturum
sahibiyle eşleşiyorsa servis edilir, (2) aksi hâlde dosya `isPublished && !isArchived`
bir dokümana aitse anonim servis edilir (`convex/files.ts: isPubliclyReadable`).
İkisi de tutmazsa **404** — 403 değil, çünkü yanıt var olmayan bir anahtarınkinden
ayırt edilebilirse hangi anahtarların gerçek olduğu sızar. Convex'e ulaşılamazsa da
404 (fail-closed).
**Gerekçe:** Yükleme anahtarı UUID içeriyor diye erişim kontrolü sayılmıyordu; URL
sızdığı anda (log, ekran görüntüsü, kopyala-yapıştır) yayınlanmamış bir sayfanın
görseli de açılıyordu.
**Neden bu tasarım, süreli imzalı URL değil:** Kullanıcı kararı. Ek olarak imzalı URL
saklanan URL'yi süreli hâle getirir — dokümanda saklanan `/api/files/...` yolunun
domain'den ve zamandan bağımsız kalması ("dosya URL'leri relative saklanır" kararı)
bozulurdu; her render'da yeniden imzalama katmanı gerekirdi.

### Eşleme türetilmiş veridir, `searchText` ile aynı sözleşme
`fileRefs(key, documentId, userId)` + `by_key` / `by_document` index'leri. Kaynağı
dokümanın `coverImage`'ı ve BlockNote içeriği; `convex/lib/fileRefs.ts` bunları saf
JSON gezerek çıkarır (`convex/lib/searchText.ts` ile aynı yaklaşım — Convex `lib/`'ten
import edemez, `lib/storage.ts:getDocumentUrls` istemci tarafındaki ikizidir; medya
blok tipi listesi ikisinde de aynı tutulmalı).
`update` (içerik/kapak), `removeCoverImage`, `duplicate` senkronlar; `remove` (alt
ağaç dahil), `removeAll` ve `purgeExpiredTrash` siler. Arşivleme eşlemeye dokunmaz —
`isArchived` kontrolü okuma anında yapılır.
**Bedeli:** Her kapak/içerik yazması bir de eşleme farkı yazıyor. Sahibi olmayan her
dosya isteği bir Convex sorgusu daha ekliyor (sahibi için ek okuma yok).

### Backfill tek seferlik internal mutation
`npx convex run files:backfillFileRefs` — `documents:backfillSearchText` deseni.
Var olan tüm belgeler için eşlemeyi kurar, yetim kayıtları siler. Bu kurulumda
38 doküman / 2 referans ile çalıştırıldı.

### Yüklenen kapaklar `next/image` ile **unoptimized** render edilir
**Gerekçe:** next/image optimizer'ı görseli sunucu tarafından, ziyaretçinin çerezleri
OLMADAN çekiyor. Erişim kontrolü gelince sahibinin kendi yayınlanmamış kapağı
`/_next/image` üzerinden 400 dönmeye başladı (ölçüldü). `unoptimized` isteği tarayıcıya
geri veriyor, oturum çerezi taşınıyor. Yayınlanmış kapaklar için de aynı yol kullanılır
(tek kod yolu). Editördeki BlockNote görselleri zaten düz `<img>`, etkilenmiyor.
**Bedeli:** Kapak görselleri artık Next tarafından yeniden boyutlandırılmıyor/WebP'ye
çevrilmiyor.

## Test altyapısı (2026-08-25, `docs/testing.md`)

### Convex backend testleri için Seçenek B: ayrı `convex-test` paketi
`docs/testing.md` §1.3 yanlış teşhis koymuştu: "`convex/test` exports ile export
edilmemiş, bu yüzden `convexTest` kullanılamıyor". Ölçüm: `convexTest` **hiçbir zaman**
`convex` paketinin içinde olmadı — bağımsız bir npm paketi, `convex-test` (v0.0.56,
peer dep `convex ^1.43.0`). Depodaki sürüm `convex@1.42.3`, en güncel 1.45.0.
**Karar:** Seçenek B. Adım 2'de `convex` ≥1.43'e çıkılır ve `convex-test` devDependency
eklenir. Gerekçe: Seçenek A (mantığı `convex/lib`'e taşıyıp saf fonksiyon test etmek)
en riskli yüzeyi test edebilmek için `databases.ts` (698 satır) + `databaseViews.ts`
(718 satır) üzerinde üretim kodu refactor'ü ister ve `ctx.db`'ye bağlı davranışları
(cascade, auth, ordering) yine test dışı bırakır. `convex-test` bunları olduğu gibi,
in-memory çalıştırır — testler için Docker stack'i gerekmez.
**Bedeli:** Bir minor client bump. Risk düşük: `docker-compose.yml`'de backend imajı
`ghcr.io/get-convex/convex-backend:${CONVEX_BACKEND_VERSION:-latest}`, pinli değil.

### Unit katmanı Vitest, `tests/unit/**/*.test.ts`
`vitest.config.mts` (`.mts` — düz `.ts` Vite'ın CJS yükleyicisinde uyarı veriyor),
`@/` alias'ı elle `resolve.alias` ile kuruldu; `vite-tsconfig-paths` alınmadı çünkü
deprecated `tsconfck`'i sürüklüyor ve tek bir alias için gereksiz.
Ayrım keskin: Vitest yalnızca `tests/unit/`'e bakar, Playwright `testDir: ./tests/e2e`.
`database-view-operations.spec.ts` (`page`'i hiç kullanmayan, tamamı saf 10 test)
`tests/unit/database-view-operations.test.ts`'e taşındı. Ölçülen etki: aynı 10 test
Playwright altında tarayıcı açarken, Vitest'te **223 ms**'de koşuyor.
E2E sayısı 33 → 23 (19 geçen + 4 atlanan).

### Coverage eşiği bu turda belirlenmedi
Ölçülen baseline: toplam **%17.71** satır, `convex/lib` **%1.84**, `lib` **%5.98**.
Eşik yalnızca CI adımında (Adım 4) anlam kazandığı için o adıma bırakıldı —
`docs/testing.md` §5.2'deki %80/%70 önerisi henüz onaylanmadı.

### Convex testleri `tests/convex/`, iki Vitest project'i
`vitest.config.mts` iki project tanımlar: `unit` (node) ve `convex`
(`edge-runtime` + `server.deps.inline: ["convex-test"]`). Inline şart:
`convex-test`, `convex/` altındaki fonksiyon modüllerini kendi dist'i içinden
`import.meta.glob` ile toplar; externalize edilirse glob dönüşmez ve hiçbir
Convex fonksiyonu bulunamaz. `edge-runtime` ortamı da `convex-test`'in
gereksinimi (`@edge-runtime/vm` devDependency).
`convex` 1.42.3 → 1.45.0 bump'ı `tsc`/`build` tarafında sorunsuz geçti ve
`convex/_generated/` yeniden üretmeyi gerektirmedi — fonksiyon şekilleri
değişmedi.
Kimlik: `requireUser` `identity.subject`'i userId sayar, bu yüzden
`tests/support/convex/harness.ts` `setup()` üç erişim verir — `owner`,
`stranger`, `anonymous`.

### Testlerin diş geçirdiği ölçüldü, varsayılmadı
`documents.getById` içindeki public-before-auth sırası kasten ters çevrildi
(auth kontrolü yayın kontrolünden öne alındı); ilgili test kırmızı yandı, kod
geri alındı. Bu değişmezi `tsc --noEmit` de `npm run build` de yakalamıyor —
tek koruma bu test. Yeni bir kritik değişmez test edilirken aynı şey yapılmalı:
bozup kırmızıyı görmeden test yazıldı sayılmaz.

### ESLint üretilmiş `coverage/` çıktısını tarıyordu
`npm run test:coverage` sonrası lint 15 → 18 sorun gösteriyordu; üç uyarı
`coverage/*.js` (istanbul'un HTML raporu) içindendi, kaynak koddan değil.
`eslint.config.mjs` ignore listesine `coverage/**` eklendi. `.gitignore`'da
zaten vardı — lint ile gitignore ayrı listeler, biri diğerini takip etmiyor.

### Coverage eşiği kademeli yükseltilecek
Kullanıcı kararı: baştan %80 hedefi koyup CI'ı sürekli kırmızı bırakmak yerine,
o anki ölçülen değeri taban alıp her adımda yukarı çekmek. Seyir: Adım 1 sonrası
%17.71 → Adım 2 sonrası %31.89. Eşik Adım 4'te (CI) devreye girecek.

## 2026-08-25 — Test kütüphanesi (Adım 3)

### Test'e ait her şey tek kökte: `tests/`
Fixture bileşenleri `app/test-fixtures/` altındaydı; `app/` altında yalnızca üç
satırlık **route kabuğu** bırakıldı (`export { X as default } from
"@/tests/support/fixtures/..."`) ve bileşenler `tests/support/fixtures/`'a
taşındı. Gerekçe: Next.js yalnızca *route'un* `app/` altında olmasını şart
koşuyor, bileşenin değil — kabuğu bırakmak proje kökünde tek bir test dizini
verirken fixture route'larının dev/test-only kalmasını (`pageExtensions`,
`next.config.mjs`) bozmuyor. Aynı hamlede `tests/e2e/helpers/clipping.ts` →
`tests/support/assertions/`, `tests/convex/support/harness.ts` →
`tests/support/convex/` taşındı; `tests/e2e/` artık yalnızca spec + snapshot
tutuyor.

### Veri kurucusu hücreleri **adla** alır, `_id`'ye kendisi çevirir
`tests/support/data/database-builder.ts`. Testte `{ Title: "...", Status: "next" }`
yazılır; kurucu bunu özelliğin `_id`'sine anahtarlar. Böylece test verisi
okunur kalırken üretimdeki "hücreler ada göre değil `_id`'ye göre anahtarlanır"
değişmezi test tarafında da yaşar — testin veri şekli üretimden sapmaz. Kurucu
değişmez (her `with*` yeni kurucu döndürür); `withTitle()` yoksa `build()`
sessizce `undefined` döndürmek yerine fırlatır.

### Page-object, spec'teki fixture/gerçek-uygulama dallanmasını yutar
`BoardPage` hem izole fixture route'unu hem `PLAYWRIGHT_BOARD_PATH` ile gelen
oturumlu gerçek board'u sürüyor; spec'lerde `if (fixture) ... else ...` kalmadı.
`TablePage`/`CoverModalPage` DOM seçicilerini tek yerde topluyor.

### Refactor'ün davranışı değiştirmediği ölçüldü
Piksel snapshot testi (`board-surfaces.png`) `--update-snapshots` olmadan geçti:
fixture'ların kurucuya taşınması render çıktısını değiştirmedi. Coverage %31.89'da
sabit kaldı — bu adım saf okunabilirlik yatırımı, yeni davranış kapsamadı.

## 2026-08-25 — A11y, görsel regresyon, paralellik (Adım 4-5)

### CI ertelendi, coverage eşiği yine de kondu
Kullanıcı kararı: `.github/workflows/` bu turda kurulmadı. Eşik CI'ye bağlı
tutulmadı — `vitest.config.mts` `coverage.thresholds` yerelde de
`npm run test:coverage`'i kırmızı yakıyor. Değerler ölçülenin hemen altı
(global 31/23/38/32, `convex/lib/**` 40/18/68/42); amaç hedefe ulaşmak değil,
**geri gitmeyi engellemek**. Eşiğin ısırdığı ölçüldü: `statements` geçici olarak
99'a çekilip kırmızı görüldü, sonra geri alındı.

### A11y beklentisi kural kimliğiyle karşılaştırılır, seçiciyle değil
Radix üretilmiş id'ler (`#radix-_r_l_-trigger-gallery`) her koşuda değişiyor;
seçiciyi beklentiye yazmak testi kırılgan yapardı. `scanA11y` benzersiz kural
kimliklerini döndürür, tam liste yalnızca başarısızlık mesajına iliştirilir.
Karşılaştırma **eşitlik**: yeni ihlal de, düzeltilen ihlal de testi kırar —
bilinen-ihlal listesi kendiliğinden çürüyemez.

### Bulunan ihlaller ikiye ayrıldı — biri borç, biri hata
`color-contrast` bilinçli borç: Notion'ın kendi ikincil metni (rgb(142,139,134))
AA eşiğini geçmiyor, kontrastı yükseltmek piksel parity'sini bozar. Buna karşılık
`aria-required-children` / `aria-required-parent` / `label` /
`aria-hidden-focus` **gerçek hata**: `components/database/database-grid.tsx`
`role="grid"` ve `role="gridcell"` kullanıyor ama arada `role="row"` yok (CSS
grid düz bir hücre dizisi). Ekran okuyucu tabloyu satır satır gezemiyor.
Düzeltme yerleşimi bozmamak için `display: contents` taşıyan satır sarmalayıcı
ister — ayrı iş olarak açık bırakıldı, testte bilinen ihlal olarak kayıtlı.

### Görsel regresyon locator snapshot'ı kullanır
Tam sayfa yerine locator: kaydırma konumu ve odak halkası çerçeveye girmesin.
Cover modal'da galeri maskelendi — karolar uzak CDN'den (`app.notion.com`,
metmuseum, clevelandart) geliyor, maskesiz snapshot ağ durumuna bağlı olurdu.
Determinizm iki ardışık koşuda doğrulandı.

### Playwright paralelliği fixture izolasyonu sayesinde güvenli
`fullyParallel: true`, `workers` yerelde otomatik. Fixture route'ları paylaşılan
sunucu durumu tutmuyor (hepsi saf bileşen), bu yüzden çakışma yok. Aynı 23
testte 11.8s → 5.4s.

## 2026-08-25 — Tablo yüzeyi: parity değerleri ölçülür, çıkarsanmaz

### Notion tablo değerleri artık `docs/notion-research/table-parity.md`'de
Tablo yüzeyi tema/sidebar'ın aksine hiç ölçülmemişti; değerler Notion'ın
"bilinen" token'larından ve ekran görüntüsünden çıkarsanıyordu. Kullanıcı canlı
Notion ile yan yana koyunca fark görüldü ve **çıkarsamaların yarısı yanlış
çıktı**: seçili hücrede hafif mavi dolgu (`rgba(35,131,226,0.07)`) olduğu,
konturun `rgb(39,131,222)` + **2px radius** olduğu, fill tutamacının **dolu
mavi değil, içi sayfa arka planı olan 2px halkalı 9px daire** olduğu, imlecin
`ns-resize` olduğu, satır hover tint'inin **hiç olmadığı**, hücre metninin
14px değil **16px/24px** olduğu ancak ölçümle ortaya çıktı.

**Karar:** tablo (ve bundan sonra her yüzey) için parity değeri yalnızca gerçek
Notion'da `getComputedStyle` ile ölçülerek yazılır. Ölçülmemiş bir şey
uygulanmaz; `table-parity.md`'nin sonunda "henüz ölçülmemiş" listesi tutulur.
Gerekçe: makul görünen çıkarsama, ölçümle yarı yarıya tutturuyor — "yakın"
ile "aynı" arasındaki farkın tamamı burada.

### Ölçüm ortamı: kullanıcının profiline dokunmayan headed Playwright
Claude-in-Chrome eklentisi bu makinede bağlı değil. Ölçüm için Playwright
`launchPersistentContext` ile görünür Chromium açıldı (profil scratchpad'de,
CDP portu 9222); **kullanıcı kendi giriş yaptı**, parola hiçbir aşamada
okunmadı/girilmedi. Tema değişkenleri UI'ya dokunmadan stylesheet'ten okunmaya
çalışıldı; Notion bunları expose etmediği için kullanıcıdan temayı çevirmesi
istenip ikinci ölçüm alındı. Tekrar gerekirse aynı yöntem.

### Fill tutamacı ayrı bir bileşen ve pointer capture kullanır
`components/database/fill-handle.tsx`. Tutamaç 9px; `setPointerCapture`
olmadan imleç bu 9px'in dışına çıkar çıkmaz `pointermove`/`pointerup` başka
elemana gidiyordu — sürükleme hiç ilerlemiyor, bırakma yakalanmadığı için de
aralık vurgusu ekranda **takılı kalıyordu** (kullanıcının "sağ alttaki şey
problemli" dediği şey buydu). Capture ile sürükleme grid'in tamamında çalışır
ve bırakma her koşulda yakalanır; `pointercancel` de sürüklemeyi bitirir.
Sürükleme durumu artık hook'ta değil bileşenin kendi ref'inde (`fillDragging`
state'i kaldırıldı) — durum sahibi, olayı dinleyen taraf.

### Hücrede `overflow-hidden` dış kapta değil iç sarmalayıcıda
Tutamaç Notion'da hücrenin sağ-alt köşesinin **üzerinde** ortalanır, yani
yarısı hücrenin dışında kalır. Dış kapta `overflow-hidden` olduğu sürece
kırpılıp görünmez olur. Metin kırpması hâlâ gerekli, bu yüzden kırpma
`DatabaseCell`'i saran iç div'e taşındı, dış `role="gridcell"` kabı taşımaya
açık bırakıldı.

### Fill aralığı `data-fill-range` ile işaretlenir
Seçili hücre de, fill hedef aralığı da aynı mavi dolguyu taşıdığı için
"arka planı dolu hücreleri say" testi ayırt edici değil. Aralık DOM'da açık
bir işaretle (`data-fill-range`) belirtiliyor; test rengi değil anlamı sayıyor.

## 2026-08-25 — Landing kaldırıldı, auth kendi sayfalarına taşındı

### Zotion tek kurulum sahibi (single-owner) modeline geçti
Kullanıcı kararı: bir Zotion sunucusunda **ilk hesap sunucuyu kurar, sonrası
kapanır**. `/register` herhangi bir kullanıcı var olduğu anda `/login`'e
yönlendirir. Gerekçe: self-hosted bir kurulumda açık kayıt, URL'i bilen herkesin
hesap açabilmesi demek.

**Zorlama iki katmanda ve asıl olan ikincisi:** sayfa yönlendirmesi yalnızca UI
kolaylığı; `/api/auth/sign-up/email` doğrudan çağrılabildiği için kural
`lib/auth.ts`'teki `databaseHooks.user.create.before` içinde, veritabanı
yazımının önünde duruyor (`APIError("FORBIDDEN")`). Yalnız redirect'e güvenmek
kaydı kapatmaz.

### Landing sayfası ve auth modal'ı silindi
`app/(landing)/` (7 dosya) ve `components/modals/AuthModal.tsx` +
`hooks/useAuthModal.tsx` kaldırıldı. Modal'ın tek tetikleyicileri landing'deki
iki butondu — landing gidince ölü kod olurdu. Giriş artık yalnızca `/login`'de.

### `/` içerik tutmayan bir yönlendirici
`app/page.tsx` hiçbir şey render etmiyor; oturum → `/documents`, hiç hesap yok →
`/register`, diğer → `/login`. Karar `lib/auth-routing.ts`'te **saf** bir
fonksiyon (`resolveRootDestination`) olarak duruyor ki üç dal da veritabanı veya
tarayıcı olmadan test edilebilsin. Oturum varken kullanıcı sayımı sorgusu hiç
yapılmıyor.

`proxy.ts` artık girişsiz kullanıcıyı `/` yerine `/login`'e atıyor; `/` yine
public (yönlendirme yaptığı için), `/login` ve `/register` PUBLIC_ROUTES'a eklendi.

### Auth kabuğu: split-screen, sol panel `lg` altında gizli
`app/(auth)/layout.tsx` — solda marka paneli (logo üstte, slogan altta),
sağda ortalanmış form kolonu. Dar ekranda iki kolonu sıkıştırmak yerine sol
panel tamamen kaldırılıp form tam genişliği alıyor. Referans: Dokploy'un
"Setup the server" ekranı.

Register formu First/Last Name olarak ikiye ayrılıyor ama Better Auth tek bir
`name` alanı tuttuğu için istemcide `"First Last"` olarak birleşiyor — auth
şemasına dokunmaya gerek kalmadı.

### Ekran görüntüsü yakalayıcısına `signedOut` bayrağı
`scripts/screenshots/`: eski "landing" çekimi "login" ile değiştirildi. Auth
ekranları oturumluyu `/documents`'a attığı için çekim **oturumsuz** bağlamda
yapılmalı — `View.signedOut` bayrağı `capture.spec.ts`'te `storageState`'i
atlatıyor. Not: üretilen dosya adları `landing-*.webp` → `login-*.webp` olarak
değişir, README galerileri bir sonraki `npm run screenshots` ile güncellenir.

### ~~Tek sahip kuralı demo seed'ini kırıyordu — dev bayrağı eklendi~~ (İPTAL)
> Aşağıdaki `ZOTION_ALLOW_SIGNUP` çözümü **geri alındı**; yerine tek kullanımlık
> galeri yığını geldi (bu dosyanın sonundaki kayıt). Bayrak artık kodda yok.


`scripts/seed-demo.mjs` README galerisi için **iki** hesap açıyor
(`demo-en@`, `demo-tr@`). Kayıt kapatma bunu temiz bir kurulumda ikinci hesapta
403'le durdururdu; bu kurulumda fark edilmedi çünkü hesaplar zaten vardı ve
script sign-in'e düşüyordu. Çözüm: `lib/auth.ts`'te sunucu tarafı, varsayılan
kapalı `ZOTION_ALLOW_SIGNUP=1` kaçış kapısı; seed script 403'ü ayırt edip
bayrağı söyleyen bir hata mesajı veriyor. Üretimde ayarlanmaz.

### `/register` fixture route'undan doğrulanıyor
Gerçek `/register` yalnızca hesapsız kurulumda açılır, bu yüzden testte
render edilemiyor. Kabuk `AuthShell` olarak layout'tan ayrıldı; hem
`app/(auth)/layout.tsx` hem `tests/support/fixtures/register-fixture.tsx`
aynı bileşeni kullanıyor — fixture gerçek işaretlemeyi doğruluyor, kopya değil.
`tests/e2e/auth-pages.spec.ts` 4 test: split-screen kabuk, dar ekranda panelin
gizlenmesi, kurulum formunun tüm alanları, parola eşleşmemesi.

### `beginEditCell` aynı hücrede no-op
Düzenlenen hücrenin İÇİNE tıklamak (imleci taşımak için) `onClick` üzerinden
`beginEditCell`'i yeniden çağırıyordu; `setEditSeed(null)` `GridTextCell`'in
`key`'ini değiştirdiği için input remount oluyor ve yazılan taslak siliniyordu.
Ölçülen repro: idle hücre + grid odaklı → `a`, `b` → değer `"ab"` → input'a tık
→ değer `"A table page"`. Koruma `onClick`'e değil hook'a kondu (aynı hücre +
`mode === "editing"` ise erken dön), böylece `beginEditCell`'in her çağıranı
korunuyor. Regresyon testi `table-parity.spec.ts`'te.

## 2026-08-25 — README galerisi tek kullanımlık bir yığında üretiliyor

`ZOTION_ALLOW_SIGNUP` kaçış kapısı **tamamen kaldırıldı**. Sorun şuydu: galeri
iki dilde doküman seti istiyor, Zotion ise tek sahip modelinde — ikinci demo
hesabı ancak üretim kuralı delinerek açılabiliyordu. Tek hesaba inmek de
çözmüyordu, çünkü tek sahipli bir kurulumda o hesap **operatörün kendi
hesabıdır** ve `seed:demoWorkspace` onun bütün dokümanlarını siler.

**Karar:** `npm run screenshots` artık `scripts/gallery/run.mjs`. Kendi Compose
**projesini** (`zotion-gallery`) kaldırıyor — ayrı volume'lar, kaydırılmış
portlar (app 3100, Convex 3310/3311, Postgres 55433, MinIO 9010) — Convex
fonksiyonlarını itiyor, demo hesabını **normal kayıt akışıyla** açıyor (o boş
yığında gerçekten ilk kullanıcıdır), `en` ve `tr` içeriğini aynı hesaba sırayla
seed'leyip her dilin çekimini hemen alıyor, README'leri yazıyor ve yığını
`down -v` ile yok ediyor.

Kazanımlar: kuralda delik yok; seed operatörün verisine erişemiyor; galeri her
makinede tekrarlanabilir; CI'da da koşabilir.

Uygulama detayları (hepsi denemeyle bulundu):
- **Ağ**: uygulama host'ta çalışıyor, konteynerler ona `docker0` üzerinden
  (`172.17.0.1`) ulaşıyor. Bu adres host'ta da yerel arayüz olduğu için tarayıcı
  ve Convex backend aynı origin'i görür (tek JWT audience/çerez alanı). Compose
  ağına sabit subnet vermek **işe yaramadı**: ağ oluşuyor ama gateway host'ta
  arayüz olarak belirmiyor. `GALLERY_HOST` ile değiştirilebilir.
- **Sunucu**: `next dev` değil `next build` + `next start`. Next 16 aynı dizinde
  ikinci bir dev sunucusuna izin vermiyor; ayrıca galeri üretim çıktısını
  göstermeli. Build ayrı dizine gidiyor (`NEXT_DIST_DIR=.next-gallery`) ki
  çalışan dev sunucusunun `.next`'i ezilmesin. `output: "standalone"` o build'de
  kapalı — `next start` standalone ile çalışmıyor.
- **Convex**: `auth.config` issuer'ı push anında **deployment** ortamından okur;
  `npx convex env set CONVEX_AUTH_ISSUER` deploy'dan önce gerekli
  (`docker/convex-deploy.sh` ile aynı desen).
- **Çekim iki geçişte**: `GALLERY_LOCALE` o geçişin çekimlerini filtreler,
  `manifest.json` geçişler arasında birleştirilir (yoksa ikinci geçiş
  birincinin sonuçlarını siler).
- `.next-gallery` hem `.gitignore`'a hem eslint `ignores` listesine eklendi —
  eklenmezse lint 15'ten 57 soruna fırlıyor.

## 2026-08-25 — Board kartı ve side peek Notion'a göre yeniden kuruldu

Ölçüm kaydı `docs/notion-research/board-parity.md` (gerçek Notion, CDP).

### Kart hover'ında sürükleme butonu yok
Notion'da kartın kendisi sürükleme yüzeyi. Bizdeki buton zaten ölüydü: aksiyon
kabındaki `stopPropagation` olayın sürükleme motoruna ulaşmasını engelliyordu.
Zemin ve gölge butonlarda değil, onları saran **tek çipte** (57×24, radius 4).

### Side peek modal DEĞİL
Radix `Dialog` varsayılanı `body`'ye `pointer-events: none` koyuyor — peek
açıkken arkadaki board'da hiçbir hover/tık çalışmıyordu. `modal={false}` ve
`onPointerDownOutside`/`onInteractOutside` engellenmiş: dışarı tık peek'i
kapatmıyor, Notion da kapatmıyor. Kapanış Close butonu ya da Escape ile.

### Sürükleme sırasında React state'i değil DOM güncellenir
Her `pointermove`'da `setState` + `localStorage` yazmak **ve** panelin CSS
geçişinin genişliği animasyonlaması, sürüklemeyi gözle görülür şekilde
geciktiriyordu. Sürükleme boyunca genişlik doğrudan DOM'a yazılıyor ve
`transition` kapatılıyor; state/depolama yalnızca bırakınca güncelleniyor.

### Peek'in sunum katmanı ayrı (`RowPeekPanel`)
`RowPeekModal` Convex `useQuery`'ye bağlı olduğu için fixture'da render
edilemiyordu ve hiç testi yoktu. Panel prop alacak şekilde ayrıldı; gerçek
uygulama ve fixture aynı bileşeni kullanıyor.

### Satırlar ikon ve kapak taşıyor
`databaseRows.icon` / `coverImage` (opsiyonel, migration gerektirmeyen desen)
+ `setRowIcon` / `setRowCover`. `CoverImageModal` doğrudan `documents.update`'e
bağlıydı; üç uygulama noktası tek `applyCover()` altında toplanıp hedef
doküman **veya** satır olabilecek hale getirildi (`useCoverImage.onOpenRow`).

### Yeni property'nin adı tipinden gelir
Sabit "Property" adı, birkaç property eklenince Board'un görünürlük listesini
okunamaz hale getiriyordu. Ad tipten üretiliyor ve çakışırsa numaralanıyor.

## 2026-08-25 — Undo/redo: sunucu tarafı journal + hedefli soft-delete

### Yığın sunucuda, doküman başına, kalıcı
İstemci tarafı komut yığını elendi. Sebep ölçüldü: `databaseRows.cells`
**propertyId ile anahtarlı** ve `viewCardOrder.rowId` satırı id'siyle
referans ediyor; Convex `db.insert` id seçtirmediği için "sil → geri al =
yeniden yarat" veriyi sessizce koparıyor. Bu yüzden `databaseRows` ve
`databaseProperties` soft-delete (`deletedAt`) kazandı ve geri alma bir
patch'e dönüştü. Yığın `history` tablosunda, `scopeId` başına — Notion gibi
doküman kapsamlı — ve reload'ı atlatıyor. Detay `docs/undo-redo.md`.

### Tipli inverse yerine jenerik op-log
Her mutation için ayrı inverse yazmak yerine beş op: `patch`, `restore`,
`softDelete`, `insert`, `delete`. Yeni bir mutation'ı bağlamak yeni bir op
tipi gerektirmiyor.

### `patch` op'unda `remove` listesi ayrı taşınır
Convex bir objeyi saklarken `undefined` değerli anahtarları DÜŞÜRÜR:
`fields: { icon: undefined }` diskte `fields: {}` olur ve patch no-op'a
döner. "Bu alan eskiden yoktu" durumu bu yüzden `fields` ile temsil
edilemiyor; kaldırılacak alan adları ayrı bir `remove` dizisinde taşınıyor
ve `undefined` uygulama anında üretiliyor. Testle yakalandı (ilk geçişte
"iki kez undo" testi kırmızıydı), tahminle değil.

### `deleteProperty` artık hücreleri süpürmüyor
Hücreler propertyId ile anahtarlı olduğu için süpürülen veri geri
alınamaz. Kolon canlı şemadan (`liveProperties`) düştüğü için render
etmiyor — zaten orphan-toleranslı. Yan fayda: eski "2000 satırdan büyük
tabloda süpürmeyi atla" özel durumu ortadan kalktı. Kalıcı süpürme 30 gün
sonra `databases.purgeSoftDeleted` cron'una taşındı.

### `deleteRow` `viewCardOrder` kayıtlarını KORUYOR
Eski davranış hepsini siliyordu ("hayalet kart" gerekçesiyle). Satır artık
canlı okumalardan düştüğü için hayalet kart oluşmuyor, kayıtların
korunması ise geri alındığında kartın eski grubuna ve sırasına dönmesini
sağlıyor. `tests/convex/databases.test.ts`'teki ilgili test yeni sözleşmeye
göre yeniden yazıldı.

### Soft-delete okuması tek yardımcıdan geçer
`liveRows` / `liveProperties` (`convex/lib/softDelete.ts`). 14 sorgu
noktası bunlara taşındı; tek bilinçli istisna `databaseCascade.ts` —
database kalıcı silinirken soft-delete edilmişler de gitmeli.

### Ctrl+Z metin girişinde bize ait DEĞİL
`useUndoShortcuts` `contentEditable`, `textarea` ve `readOnly` olmayan
`input` hedeflerinde çekiliyor. Böylece hücrede yazarken Ctrl+Z yazılan
harfi geri alıyor (tarayıcı), satır silmeyi değil; BlockNote'un kendi
ProseMirror history'si de elinden alınmıyor. Editör **içeriği** bilinçli
olarak journal dışında — ikisini birden bağlamak çift geri alma üretirdi.

### `setPropertyWidth` bilinçli olarak journal dışında
Sürükleyerek boyutlandırma her pikselde kayıt düşürüp yığını doldururdu.
Notion da kolon genişliğini geri almıyor.

### `moveRow` ve view CRUD journal'a BAĞLANMADI — id kararlılığı
`insert`/`delete` op çifti undo→redo→undo döngüsünde bozuluyor: redo
kaydı yeniden eklerken Convex yeni bir `_id` veriyor, journal'daki undo
op'u eski id'yi gösteriyor, ikinci undo hiçbir şey bulamayıp sessizce
atlanıyor ve çift kayıt kalıyor. `deleteView` aynı sınıfta —
`viewCardOrder.viewId` view'ın id'sini referans ediyor. Çözüm
`viewCardOrder` + `databaseViews` tablolarına da `deletedAt` eklemek;
ayrı bir iş olarak bırakıldı. Yarım bağlamaktansa hiç bağlamamak seçildi:
sessizce çift kart üreten bir undo, olmayan undo'dan kötü.

### Sıralama geri alması fotoğraf farkıyla yapılır
`reorderRow`/`reorderProperty` normalde tek satır yazıyor ama fractional
index sıkışınca TÜM kardeşleri yeniden numaralandırıyor (rebalance). Elle
"şu satırın order'ını geri yaz" demek o durumu kaçırırdı; `orderDiffOps`
önce/sonra fotoğrafının farkını alıyor, iki durumu da aynı kodla doğru
geri alıyor.

### `archive`/`restore` journal dışında
Yığın doküman kapsamlı, arşivlenen dokümandan zaten yönlendiriliyorsun —
kapsamına Ctrl+Z ulaşamıyor. `Item.tsx`'teki toast "Undo" bu akışı
karşılamaya devam ediyor.

### Kalıcı silme yığını da siler
`documents.remove`/`removeAll`/`purgeExpiredTrash`'in dört
`deleteFileRefs` çağrı noktasının yanına `clearHistoryScope` kondu —
yoksa journal kayıtları ölü bir `scopeId`'yi gösterirdi.

## 2026-08-25 — Undo/redo tamamlandı: op-log'dan `insert`/`delete` kaldırıldı

### Kimlik kararlılığı op şemasıyla garanti altına alındı
Önceki turda `moveRow` ve view CRUD "id kararsızlığı" gerekçesiyle
bağlanmamıştı. Doğru çözüm mutation'ları özel-durumlamak değil, **op
şemasından `insert`/`delete`'i tamamen çıkarmak** oldu. Artık üç op var:
`patch`, `restore`, `softDelete`. Yaratmanın tersi aynı `_id` üzerinde
`softDelete`, redo aynı `_id` üzerinde `restore` — kimlik hiç değişmediği
için `undo→redo→undo` döngüsü tutarlı kalıyor. Çift kayıt yapısal olarak
imkânsız; regresyon testi `databaseViews.test.ts`'te ("moveRow → undo →
redo → undo döngüsü çift kart üretmez").

### `databaseViews` ve `viewCardOrder` de soft-delete taşıyor
Dört tablo oldu. `deleteView` artık view'ı ve sıra kayıtlarını
soft-delete ediyor; geri alma hepsini AYNI id'lerle döndürüyor, yani kart
sıraları birebir geri geliyor.

### `moveRow` sil+ekle yerine patch yapıyor
Eski akış sıra kaydını silip hedef grupta yenisini ekliyordu. Yeni akış
kaydı hiç öldürmüyor — `groupKey` + `order` patch'leniyor. Kart ilk kez
sıralanıyorsa ekleniyor ve tersi `softDelete` oluyor. Yan etki: hedef
grubun komşuları hesaplanırken taşınan kaydın kendisi listeden çıkarılıyor
(eskiden silinmiş olduğu için listede olmuyordu).

### `rebalanceGroupChunk` journal dışında
Kullanıcı niyeti değil; istemcinin sıkışmış fractional index'i açmak için
sürdüğü bakım işi.

### Ctrl+Z / Ctrl+Y sessiz — toast yok
İlk uygulamada her geri almada "Geri alındı: Kart taşındı" toast'ı
çıkıyordu. Notion'da böyle bir bildirim yok ve kullanıcı da bunu istemedi:
geri alınan şey zaten ekranda görünüyor, üstüne toast koymak gürültü.
`getUndoState`'in `undoLabel`/`redoLabel` alanları kaldı — ileride menü
öğesi/ipucu için kullanılacak, kısayolda değil.

## 2026-08-25 — Bildirimler: başarı sessiz, tek istisna çöpe taşıma

### Başarı toast'ları kaldırıldı (18 → 0 `toast.promise`)
Sidebar/doküman chrome'u her işlemde loading+success+error üçlüsü
gösteriyordu ("Moving to trash..." → "Note moved to trash!"); database
yüzeyi ise zaten yalnızca hatada konuşuyordu. İki gelenek, database
yüzeyinin kuralında birleştirildi: **başarı sessiz, hata konuşur.**
Başarılı bir işlemin sonucu zaten ekranda görünüyor. `toast.promise`
çağrılarının hepsi `promise.catch(() => toast.error(...))` oldu — hata
mesajları birebir korundu.

### Tek başarı bildirimi: Notion'ın "Moved to Trash" snackbar'ı
Çöpe taşıma bunun istisnası, çünkü bildirim dekoratif değil **işlevsel**:
içindeki `Restore` düğmesi tek geri alma yolu (arşivleme undo journal'ına
bağlı değil, bkz. aynı dosyadaki undo/redo kaydı). `lib/snackbar.tsx`
Notion'ın hapını uyguluyor — ters renk, 8px radius, 11px/16px padding,
14px metin; ölçüler kullanıcının paylaştığı Notion DOM'undan alındı.
İki çağrı yeri var ve ikisi de aynı eylem: `Item.tsx` (sidebar) ve
`Menu.tsx` (doküman menüsü). `Menu.tsx` eskiden Restore sunmuyordu,
artık sunuyor.

### TrashBox'ta hiçbir başarı bildirimi yok
Kalıcı silme, geri yükleme ve çöpü boşaltma sessiz. Kalıcı silmeye
"Restore" düğmesi konulamaz — `documents.remove` geri dönüşsüz ve alt
ağacı da siliyor.

### Korunanlar: ekranda karşılığı olmayan onaylar
`"Link copied"` (Item), `"Link copied to clipboard"` (view-switcher),
`"Name updated!"` / `"Password changed!"` (AccountModal). Bunlarda ekranda
hiçbir şey değişmiyor, bildirim tek geri besleme. NOT: iki link mesajı
farklı yazılmış — birleştirilmedi, ayrı bir tutarlılık işi.

### Snackbar'daki "Restore" sırayı korur, trash'ten yükleme korumaz
`documents.restore` sayfayı bilerek listenin SONUNA taşıyor — bu Notion'da
ölçülmüş davranış, ama **trash'ten geri yükleme** için (bkz.
`docs/notion-research/sidebar-pages.md`). Snackbar'ın "Restore" düğmesi ise
az önceki arşivlemenin GERİ ALINMASI; Notion orada sayfayı eski yerinde
bırakıyor. Tek mutation iki işi görüyordu, `keepPosition` bayrağıyla
ayrıldı: bayrak varsa `order` yeniden yazılmıyor (`archive` zaten `order`
alanına dokunmuyor, o yüzden dokunmamak sırayı korumaya yetiyor).
TrashBox bayrağı geçmez, davranışı değişmedi. İkisinin de testi
`tests/convex/documents.test.ts`'te.

### Snackbar stilinde `!` zorunlu — provider her toast'ı eziyor
`components/providers/toaster-provider.tsx` `toastOptions.classNames.toast`
ile TÜM toast'lara `bg-popover! text-popover-foreground!` dayatıyor
(üstelik ternary'nin iki dalı birebir aynı — eski bir artık). Bu yüzden
snackbar'ın ters renkli hapı açık zeminli çıkıyor ve "Restore" yazısı
okunmaz koyulukta oluyordu. `lib/snackbar.tsx` kendi renklerini `!` ile
yazıyor. Provider'daki ölü ternary temizlenmedi: kaldırmak richColors'ı
devreye sokup TÜM hata toast'larının görünümünü değiştirir, istenmeyen
kapsam. Ayrı bir iş olarak duruyor.

## 2026-08-25 — Sidebar "..." menüsü Notion yapısına çekildi

### Yapı ve ölçüler paylaşılan Notion DOM'undan
Genişlik 265px, en fazla 70vh; ikonlar 20px; menü metni 14px; kısayol
ipucu 12px ve soluk; üstte doküman tipini yazan soluk 12px etiket
("Page" / "Database"). Öğeler üç gruba ayrıldı ve aralarına ayraç kondu:
(1) favori, (2) Copy link / Duplicate / Rename / Move to / Move to Trash,
(3) Open in new tab / Open in side peek. Altbilgi "Last edited by <ad>" +
`formatLastEdited` damgası ("Today at 5:57 PM").
"Delete" etiketi Notion'daki gibi **"Move to Trash"** oldu.

### Kısayol ipucu yalnızca ÇALIŞAN kısayol için yazılır
Notion menüsü Ctrl+⇧+R (Rename), Ctrl+⇧+P (Move to), Ctrl+⇧+↵ (yeni sekme)
gösteriyor; bunlar projede yok, o yüzden yazılmadı — çalışmayan ipucu
yanıltıcı. Yazılan tek ipucu `Alt+Click` ve o gerçekten çalışıyor
(`DocumentList.tsx:147`, Notion-doğrulanmış).

### shadcn `DropdownMenuItem` ikon boyutunu ve rengini EZİYOR
Primitive'in sınıfında `[&_svg:not([class*='size-'])]:size-4` ve
`[&_svg:not([class*='text-'])]:text-muted-foreground` var. Bunlar
descendant seçici olduğu için svg'nin kendi `h-5 w-5`/renk utility'sinden
daha yüksek özgüllükte — ikonlar sessizce 16px ve soluk çıkardı. Çözüm
seçicinin kaçış kapısını kullanmak: her ikonun sınıfında **"size-" ve
"text-" alt dizileri** geçiyor (`size-5 text-sidebar-icon`; kare olmayan
LinkIcon/ArrowDiagonalUpRightIcon için `size-auto h-5 w-auto`). Bu
dosyada yeni ikon eklerken aynı kural geçerli.

## 2026-08-25 — View "..." menüsü Notion yapısına çekildi

### Yapı ve ölçüler
Genişlik 220px (paylaşılan Notion DOM'u), ikonlar 20px. Sıra Notion'ınki:
Rename · Display as ▸ · Source — ayraç — Copy link to view — ayraç —
Duplicate view · Delete view. "Duplicate"/"Delete" etiketleri Notion'daki
gibi "… view" ekiyle yazıldı.

### `setViewType` mutation'ı eklendi ("Display as")
View'ın türünü table↔board değiştiriyor; board'a özgü ayarlar (groupBy,
kart sırası) SİLİNMİYOR — tabloda görmezden geliniyor, geri dönünce
yerinde duruyor. Journal'a bağlı, geri alınabilir. `ContextMenu`
primitive'i iç içe menü desteklemediği için alt menü, ana menünün sağına
(x + 220) açılan ikinci bir `ContextMenu` olarak kuruldu.

### "Source" satırı chevron'suz ve tıklanamaz
Notion'da bu satır kaynağı DEĞİŞTİREN bir alt menü açıyor; bizde kaynak
değiştirilemiyor. Chevron koymak olmayan bir yeteneği vaat ederdi —
satır yalnızca hangi database olduğunu gösteriyor (`databaseTitle` prop'u,
`database-view.tsx`'ten geliyor; aynı `getById` sorgusu `DocumentView`'da
da çalıştığı için Convex tekilleştirmesi sayesinde ek maliyeti yok).

### "Edit view" eklenmedi
Notion'da view ayar panelini açıyor. Bizde panel `database-toolbar`'ın
kendi state'inde; menüden açmak bileşenler arası state kaldırmayı
gerektirir. Ayrı bir iş olarak bırakıldı — dead menü öğesi konmadı.

### Side peek satır kapağı hiç render EDİLMİYORDU
`bac6fb6` "Add cover" düğmesini ve `databases.setRowCover` mutation'ını
ekledi ama `row-peek-panel.tsx` kapağı ekrana basmıyordu — `row.coverImage`
yalnızca düğmeyi gizlemek için okunuyordu. Semptom: kapak seçilince düğme
kayboluyor, kapak hiç görünmüyor. Regresyon DEĞİL, baştan eksikmiş
(kullanıcının hatırladığı çalışan kapak doküman kapağı, `components/cover.tsx`).
Kapak artık panelin tam genişliğinde (yatay padding'in dışında) render
ediliyor; hover'da "Change cover" / "Remove" düğmeleri çıkıyor
(`onRemoveCover` → `setRowCover(undefined)`).

### "Edit view" toolbar ayar paneline bağlandı
Panelin açık/kapalı state'i `database-view.tsx`'e kaldırıldı;
`DatabaseToolbar` artık `settingsOpen` / `onSettingsOpenChange` ile
kontrollü. Böylece hem toolbar düğmesi hem view menüsündeki "Edit view"
aynı paneli açıyor — ikinci bir panel kopyası yok.

### "Source" kaynak değiştirme özelliği EKLENMEDİ (kullanıcı kararı)
Bizde view kaynak dokümana ait (`databaseViews.databaseId`), Notion'daki
gibi sayfaya konan bağımsız bir blok değil. Kaynağı değiştirmek view'ı
hedef database'e TAŞIR ve bulunulan sayfadan kaldırır; ayrıca property'ye
bağlı tüm ayarların ve kart sıralarının temizlenmesini gerektirir. Bir
`setViewSource` mutation'ı yazılıp denendi, sonra kullanıcı kararıyla
tamamen geri alındı. Menüdeki "Source" satırı yalnızca kaynağı gösteriyor:
chevron yok, tıklanmıyor.

## 2026-08-25 — Menü ikonları Notion'un kendi çizimleri, kırmızı çöp ikonu kaldırıldı

### View menüsü ikonları lucide değil, Notion SVG'leri
Paylaşılan DOM'daki path'ler birebir alındı ve
`app/(main)/_components/icons/` altına kondu: `PencilLineIcon` (Rename),
`PaintBrushIcon` (Display as), `SlidersLargeIcon` (Edit view),
`PathRoundEndsIcon` (Source), `DuplicateIcon`, `ChevronRightSmallIcon`.
`SlidersIcon` (16px `slidersSmall`) ile `SlidersLargeIcon` (20px `sliders`)
FARKLI çizimler — birbirinin yerine kullanılmaz.

### Kırmızı çöp ikonu projede YOK
Kullanıcı kuralı: her yerde sidebar'ın `TrashIcon`'u kullanılır, kırmızı
varyant kullanılmaz. lucide `Trash`/`Trash2` kullanan altı dosya
(`row-peek-panel`, `row-menu`, `column-menu`, `database-sort-menu`,
`database-filter-menu`, `board-card`) `TrashIcon`'a geçirildi.
`ContextMenuItem`'ın `danger` prop'u — tek işi satırı kırmızıya boyamaktı —
tamamen kaldırıldı ki yanlışlıkla geri gelmesin. Notion menülerinde de
"Delete"/"Move to Trash" normal renkte.

### `ContextMenu` açılış animasyonu
Ölçülen değerler: 200ms, `ease`, `opacity + transform`, transform-origin
sol-üst (`0% top`). Başlangıç değerleri DOM'da yoktu (fotoğraf animasyon
bittikten sonra alınmıştı); Radix menülerimizin `zoom-in-95` açılışı
kullanıldı ki uygulamadaki iki menü türü aynı hissetsin. State + rAF ile
denendi ama React-compiler'ın `set-state-in-effect` kuralına takıldı —
CSS animasyonu (`animate-in`) doğru araç.

### `ContextMenuItem` ikon yuvası 20px, boyut ezme guard'lı
Yuva `size-[18px]` + `[&_svg]:size-[15px]` idi; descendant seçici olduğu
için ikonun kendi boyutunu eziyordu (aynı tuzak shadcn
`DropdownMenuItem`'da da var). Artık yuva `size-5` ve zorlama
`[&_svg:not([class*='size-'])]:size-[15px]` — kendi boyutunu söyleyen
Notion ikonları 20px kalıyor, eskiler 15px'te.

### Düğme/sekme menüleri fare konumuna DEĞİL, tetikleyiciye sabitlenir
Notion DOM'u: view sekmesinin menüsü `--x-insetInlineStart: 0`,
sarmalayıcı `top: 100%` — yani sekmenin sol-alt köşesine sabit. Bizimki
`e.clientX/clientY` kullanıyordu, menü her açılışta biraz farklı yerde
beliriyordu. Artık tetikleyicinin `getBoundingClientRect()`'i kullanılıyor:
view sekmesi menüsü ve board kolonunun "..." menüsü. "Display as" alt
menüsü de sabit piksel tahmini (`menu.x + 220`) yerine tetikleyen SATIRIN
sağ kenarına hizalanıyor — bunun için `ContextMenuItem.onClick` artık
mouse event geçiyor.

**İstisna — gerçek sağ tık menüleri fare konumunda kalır:** editördeki
görsel sağ tık menüsü (`editor.tsx`). Orada işaretçi konumu platform
sözleşmesi ve Notion da aynısını yapıyor; görselin köşesine sabitlemek
büyük görsellerde menüyü ekranın uzağına atardı.

### "Display as" Notion'da view TÜRÜ değil, SEKME GÖRÜNÜMÜ
İlk uygulamada table/board değiştirici sanılmıştı — yanlış. Paylaşılan DOM
ve ekran görüntüsü: seçenekler **Text and icon / Text only / Icon only**,
altında ayraç ve "Only applies to you" bilgi satırı, satırlarda ikon yok,
seçili olanda sağda `checkmarkSmall`. Yeni `databaseViews.tabDisplay`
alanı `SETTING_FIELDS`'a eklendi, yani `updateViewSettings` üzerinden
gidiyor ve journal'a otomatik bağlı. "Only applies to you": Zotion tek
sahipli olduğu için ayarı view kaydında tutmak fiilen kullanıcıya özel
tutmakla aynı.

`setViewType` mutation'ı duruyor ama artık menüden erişilmiyor — Notion'da
view türü "Edit view" panelinden değişiyor; oraya bağlanması ayrı iş.

### `ContextMenu` ilk açılışta ekranın sol üstünden "uçuyordu"
Konum state'i `useState({left: x, top: y})` ile bir KEZ ilkleniyordu;
menü kapalıyken `x`/`y` 0 geldiği için ilk açılış (0,0)'da boyanıyor,
layout effect'i ancak sonraki karede düzeltiyordu — açılış animasyonu bunu
sol üstten bir yolculuk gibi gösteriyordu. Artık konum render sırasında
türetiliyor: ölçüm yapılana kadar doğrudan çapanın kendisi kullanılıyor,
ölçüm hangi çapa için yapıldığı (`forX`/`forY`) ile birlikte saklanıyor.

### İç içe menüde tıklama HİÇ ULAŞMIYORDU — ayrı portal tuzağı
"Display as" alt menüsündeki bir seçeneğe tıklayınca menü kapanıyor ama
hiçbir şey değişmiyordu. Sebep: `ContextMenu` dışına `pointerdown` gelince
kapanıyor ve alt menü AYRI BİR PORTAL'a çiziliyor, yani ana menünün
`menuRef.current.contains(target)` kontrolü onu "dışarısı" sayıyordu.
Alt menüye basıldığı anda ana menü kapanıyor, alt menü de `menu !== null`
koşuluyla unmount oluyor ve `click` olayı hiç ulaşmıyordu (pointerdown
click'ten önce gelir).

Çözüm: `ContextMenu`'ye `rootRef` (kök elemanı dışarı verir) ve
`ignoreRef` (bu elemanın içindeki pointerdown'lar kapatmaz) props'ları.
Ana menü alt menünün ref'ini `ignoreRef` olarak alıyor. İç içe menü
eklerken bu bağlantı KURULMAZSA tıklama sessizce çalışmaz.

### Alt menü hover ile açılır, gecikme yok
Notion'da "Display as" üzerine gelmek yetiyor; komşu satıra geçilince
kapanıyor. Tıklama da çalışmaya devam ediyor. Hover-intent gecikmesi
KONMADI — kullanıcı Notion'da gecikme olmadığını belirtti.

### Board kartı satırın KAPAĞINI ve İKONUNU gösteriyor
Kart ölçüleri zaten Notion'dan alınmıştı (`--kanban-*` token'ları: 10px
yan boşluk, 8/6 üst-alt, 148px kapak, 15px başlık, 28px/5px/5px property
satırı) — eksik olan veriydi. Kart `row.coverImage` ve `row.icon`
alanlarını hiç okumuyordu; kapak yerine gri bir "Cover" yer tutucu vardı
("satırların sayfası yok" gerekçesiyle, artık geçersiz: satırlar
`setRowCover`/`setRowIcon` ile ikon ve kapak taşıyor).

Kapak yoksa alan HİÇ çizilmiyor (Notion böyle) — yer tutucu kaldırıldı.
İkon: 24x24 yuva, içinde 20x20, emoji 14px, radius 5, sola -2px taşma,
başlığa 4px boşluk, uzun başlıkta üste hizalı (DOM'dan birebir).

### Board kartında `cardPreview` varsayılanı "cover"
Kapak kartta hâlâ görünmüyordu: `databaseViews.cardPreview` optional ve
onu YAZAN bir ayar UI'ı hiç yok, yani her view'da `undefined` geliyor.
`cardPreview === "cover"` koşulu bu yüzden asla tutmuyordu. Notion'ın
board varsayılanı zaten "Card preview: Page cover" — `BoardCard`'ın
destructure'ında `cardPreview = "cover"` verildi. Ayar UI'ı eklenirse
varsayılan yine burada kalır.

Not: satır kapakları galeriden seçildiğinde HARİCİ URL olarak saklanıyor
(`https://app.notion.com/images/page-cover/...`), yüklenenler ise göreli
`/api/files/...`. Kapak arayan bir sorgu ikisini de hesaba katmalı.

### Board sürüklemesi kartı SOLA sıçratıyordu — tutma ofseti tek eksendi
`use-board-dnd.ts` yalnızca `grabY` (dikey ofset) saklıyordu; klon
`translate3d(x, y + grabY)` ile konumlanıyordu, yani kartın SOL KENARI
imlece yapışıyordu. Notion'da kart tutulduğu noktadan gider. `grabX`
eklendi (`cardRect.left - e.clientX`) ve transform iki eksende de ofset
uyguluyor. `onPointerDown` imzası `cardTop: number` yerine
`cardRect: { top, left, width }` alıyor.

Ayrıca klonun genişliği yoktu: `position: fixed` bir kap içerik kadar
daralır, sürüklenen kart orijinalinden dar görünüyordu. Kaynağın genişliği
drag durumunda taşınıp klona veriliyor.

### Kapak `<img>`'i sürüklemeyi kırmıştı
`<img>` tarayıcıda varsayılan olarak sürüklenebilir; kapaktan tutunca
tarayıcının HTML5 görsel sürüklemesi başlayıp kartın pointer sürüklemesini
engelliyordu. Notion'un kapak sarmalayıcısında da `pointer-events: none`
var — aynısı uygulandı, ayrıca `draggable={false}`. Karta Notion'daki gibi
`user-select: none` kondu (başlık girişine `select-text` ile istisna).

### Tip değişince otomatik ad da yenilenir
Kolonun tipi değişince adı eskisi gibi kalıyordu ("Text" adlı kolon
"select" olunca hâlâ "Text"). Notion'da ad TÜRETİLMİŞ varsayılansa yeni
tipin adına döner. `changePropertyType` artık adın otomatik olup olmadığını
sınıyor (`PROPERTY_TYPE_LABELS[eskiTip]` ya da `"<label> <n>"` kalıbı) ve
yalnızca öyleyse `uniquePropertyName` ile yeniliyor — kullanıcının verdiği
ad korunuyor. Ad değişimi journal'a da giriyor (undo eski adı geri getirir).

### Side peek "Edit property" menüsünde seçili tip görünmüyordu
Tip listesi tamamen işaretsizdi; hangi tipin yürürlükte olduğu belli
değildi. Seçili satıra `CheckmarkSmallIcon` kondu (Notion'daki gibi sağda).
