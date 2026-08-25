# Tuzaklar

> Bir şey **ikinci kez** zaman kaybettirdiyse buraya yaz. Tek seferlik hatalar buraya
> girmez. Her madde: belirti → sebep → ne yapmalı.
>
> Invariant seviyesindeki kurallar (`patch` sığ merge, public-before-auth sırası)
> `.claude/rules/project/convex.md`'de — burada tekrarlanmaz.

## Ortam / araçlar

### `.env` shell'e alınırken patlıyor
`CONVEX_SELF_HOSTED_ADMIN_KEY` içinde `|` var. **Tırnak içinde** olmalı; tırnaksız
`. ./.env` shell'i kırar. `.env` gitignored ve gerçek secret içeriyor.

### `api.<modül>` tip hatası veriyor
`convex/_generated/` git'e commitli. Yeni Convex modülü veya export eklendiğinde
`npm run convex:dev` / `npx convex deploy` ile regenerate edip `_generated/`'ı
**commit etmek şart**.

### `npx prettier --write "**/*"` devasa diff üretiyor
Dokunulmamış dosyalarda (özellikle `components/ui/*`) gereksiz churn yaratıyor.
Sadece değiştirilen dosyalarda çalıştır.

## Lint baseline

`npm run lint` **temiz değil** — 2026-08-24 itibarıyla 8 hata / 9 uyarı, hepsi
önceden var olan React-compiler kuralları:

| Kural | Adet | Dosyalar |
|---|---|---|
| `react-hooks/set-state-in-effect` | 7 | `useOrigin.tsx`, `mode-toggle.tsx`, `modal-provider.tsx`, `search-command.tsx`, `CoverImageModal.tsx`, `Navigation.tsx` |
| `react-hooks/exhaustive-deps` | 6 | `document-view.tsx`, `editor.tsx`, `toolbar.tsx`, `search-command.tsx` |
| `react-hooks/immutability`, `next/no-img-element`, `import/no-anonymous-default-export` | 4 | `single-image-dropzone.tsx`, `convex/auth.config.js`, `eslint.config.mjs` |

**Kural:** Yeni/değiştirilen dosyalar lint temiz olmalı. Bu baseline'ı düşürmek ayrı
bir iş — başka bir işin yan etkisi olarak düzeltme.

## Convex mutation'larında rekürsif gezinme

`convex/documents.ts`'te alt ağaç gezen üç yardımcı var (`recursiveArchive`,
`recursiveRestore`, `recursiveRemove`). Üçü de **`await` edilmek zorunda**: Convex
mutation handler'ı döndüğünde transaction kapanır, `await`siz bırakılan gezinmenin
kalan kısmı sessizce düşer. Bu ikisi 2026-08-25'e kadar `await`siz çağrılıyordu ve
`remove` hiç rekürsif değildi (yetim alt sayfalar); ikisi de düzeltildi — deseni
yeni koda taşıma.

## Deploy

Convex backend `APP_URL`'i kendi içinden çözebilmeli (JWKS için). Dokploy'da genelde
sorunsuz; değilse `docker-compose.yml`'deki hazır `extra_hosts` satırını aç.

## Ölü kod taraması

### "Adı başka dosyada geçiyor mu" kontrolünde envanter dosyalarını dışla
`.claude/ecc/install-state.json` (368 KB) kurulan **her** dosyanın adını listeliyordu;
ham grep ile referans arayınca 134 ölü adayın 134'ü birden "referanslı" göründü ve tarama
işe yaramaz sonuç verdi. Manifest/envanter/lock dosyaları çağrı değildir — referans
taramasında hariç tut. (O dosya artık silindi, ama desen tekrar eder.)

### Silme öncesi/sonrası aynı doğrulayıcıyı çalıştır
Vendor'lanmış script ağacında silme yapmadan önce bağımlılık kapanışını ölç, sildikten
sonra aynı ölçümü tekrarla ve **sayıların birebir aynı** olduğunu gör (23 kök / 53 modül /
0 eksik). Yalnızca "sonrası temiz" demek, baseline zaten kırıksa bir şey kanıtlamaz.


## Tarayıcıda sürükleme

### Küçük bir tutamaçtan sürüklenecekse `setPointerCapture` şart
`pointermove`/`pointerup` varsayılan olarak imlecin **o anda üzerinde olduğu**
elemana gider. 7-10px'lik bir tutamaçtan sürükleme başlatıp elemana
`onPointerMove`/`onPointerUp` bağlamak, imleç ilk pikselde dışarı çıktığı için
pratikte hiç çalışmaz — üstelik `pointerup` hiç gelmediğinden sürükleme state'i
temizlenmez ve UI "takılı" görünür. Bu iki kez zaman kaybettirdi: önce görsel
bir hata sanıldı (ekranda kalan mavi dolgu), asıl neden eksik capture'dı.
`onPointerDown`'da `event.currentTarget.setPointerCapture(event.pointerId)`,
`onPointerUp`'ta `releasePointerCapture`, ayrıca `onPointerCancel` ile bitir.

### Playwright ile sürüklemeyi gerçekten test et
`locator.click()` ya da tek bir `mouse.down()/up()` bu hatayı yakalamaz —
`mouse.down()` → `mouse.move(..., { steps: N })` → `mouse.up()` zinciri gerekir
ve **sürükleme sırasında** bir ölçüm alınmalı. Bırakma sonrası tek ölçüm,
"hiç ilerlemedi" ile "ilerledi ve temizlendi" durumlarını ayırt edemez.

## Notion parity ölçümü

### Ölçmeden "Notion ile aynı" deme
Tablo yüzeyinde makul görünen çıkarsamaların yaklaşık yarısı yanlıştı
(bkz. `docs/notion-research/table-parity.md` "Çıkarsama yanlıştı" tablosu).
Düşük çözünürlüklü bir ekran görüntüsü rengi verir ama padding, satır
yüksekliği, font boyutu ve "içi boş mu dolu mu" gibi şeyleri vermez —
9px'lik halkalı bir daire, küçük ölçekte dolu nokta gibi görünür.

### Notion tema değişkenleri stylesheet'ten okunamıyor
`.notion-light-theme` / `.notion-dark-theme` kurallarından CSS custom
property çekme denemesi **boş döndü**. Her iki temanın değerini almak için
kullanıcıdan temayı çevirmesini isteyip ikinci bir ölçüm almak gerekiyor;
`waitForFunction` ile `.notion-dark-theme` beklenip otomatik ölçüm alınabilir.

## Route silerken

### `app/` altından route silince `.next/types` eskimiş kalır
`app/(landing)` silindikten sonra `npx tsc --noEmit` iki hata verdi:
`Cannot find module '../../app/(landing)/page.js'`. Kaynak kodda hiçbir referans
yoktu — hata `.next/types/validator.ts` içindeki **üretilmiş** dosyadandı.
`rm -rf .next/types` + bir sayfa isteği (ya da yeni build) yeterli. Kaynak
ağacında referans aramakla vakit kaybetme.

## Proje dili

### Arayüz metni İngilizce, yorumlar Türkçe
Kolayca karıştırılıyor: `CLAUDE.md`'deki "Türkçe" kuralı **kullanıcıyla
iletişim** içindir. Ürün arayüzü tamamen İngilizce (README İngilizce, Türkçesi
ayrı dosya). Kod yorumları ise Türkçe — `app/` + `lib/` altında 171 Türkçe yorum
satırı var, bu yerleşik konvansiyon. Yeni bir kullanıcı-görünür string yazarken
İngilizce yaz; yorumda Türkçe serbest.

### Grid'de Escape sonrası odak `body`'ye düşüyor
`role="grid"` üzerindeki `onKeyDown` yalnızca odak grid'deyken çalışır. Hücre
düzenlemesinden Escape ile çıkınca input blur oluyor ve odak `body`'ye gidiyor
— yani "idle hücrede yazmaya başla" yolu klavyeden erişilemiyor. Testte
`TablePage.focusGrid()` ile açıkça odaklamak gerekti. Gerçek kullanıcı için de
bu bir a11y pürüzü: Escape'ten sonra odağın grid'e dönmesi gerekir (açık madde).

## Radix Dialog

### Modal Dialog arkadaki arayüzü tamamen ölü bırakır
`Dialog` varsayılan olarak modaldır ve `body`'ye `pointer-events: none` koyar.
Yan panel (side peek) gibi "arkasıyla çalışılabilen" yüzeylerde `modal={false}`
şart; ayrıca dışarı tıklamanın paneli kapatmaması için
`onPointerDownOutside` / `onInteractOutside` engellenmeli. Bir de: modal
değilken popover içinde Escape'e basmak Dialog'a sıçrayıp paneli kapatır.

## Sürükleyerek boyutlandırma

### Genişliği state'e yazmak + CSS geçişi = gecikme hissi
İki ayrı sebep üst üste biner: her `pointermove`'da `setState`
(+ `localStorage`) ve elemanın kendi `transition`'ının genişliği
animasyonlaması. İkincisi tek başına imleci ~40px geride bırakıyordu.
Sürükleme boyunca doğrudan `style.width` yazıp `transition`'ı kapat,
state'i bırakınca güncelle.

## Test yazarken

### "Görünür mü" testi "çalışıyor mu" testi değildir
Side-peek butonunun görünürlüğü doğrulanmıştı, tıklanınca peek'in açıldığı
değil — üstelik fixture'ın `onOpenRow`'u boş bir fonksiyondu, yani açılış
gözlemlenebilir bile değildi. Kullanıcı hatayı elle buldu. Fixture artık
açılan satırı DOM'a yazıyor ve test iki tıklık akışın tamamını sürüyor.
Yeni bir regresyon testi yazınca **hatayı geri koyup kırmızı olduğunu gör**;
ilk denemede className'i geri alıp inline stili unutunca test yeşil kalmıştı.
