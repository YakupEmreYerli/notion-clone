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
