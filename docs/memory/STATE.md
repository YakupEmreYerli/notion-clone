# STATE — nerede kalmıştık

> **Oturum başında ilk okunacak dosya.** Sadece *şu anki* durumu tutar; geçmiş
> kararlar `decisions.md`'de, kalıcı kurallar `CLAUDE.md`'de.
> Her oturum sonunda güncelle (bkz. en alttaki şablon).

**Son güncelleme:** 2026-08-25 (undo/redo altyapısı — Faz 1-2 + tablo yüzeyi)

## Aktif iş

**Undo/redo altyapısı** — plan ve kullanım kılavuzu **`docs/undo-redo.md`**,
kararlar `decisions.md` (2026-08-25 undo/redo kaydı).

Ölçüm: proje bu işten önce tablo/sidebar/board'da **hiç** geri alma
taşımıyordu; çalışan tek şey BlockNote'un kendi ProseMirror history'siydi.
Kullanıcı kararıyla seçilen mimari: **sunucu tarafı journal + hedefli
soft-delete**, kapsam **doküman başına**, yığın **kalıcı** (reload'ı atlatır).

### Bu turda biten

| Parça | Durum |
|---|---|
| `history` tablosu + `deletedAt` (rows, properties) | ✅ |
| `convex/lib/history.ts` — op-log, `recordHistory`, `patchInverse` | ✅ |
| `convex/history.ts` — `undo` / `redo` / `getUndoState` | ✅ |
| `convex/lib/softDelete.ts` + 14 sorgu noktasının taşınması | ✅ |
| `databases.purgeSoftDeleted` + günlük cron (30 gün) | ✅ |
| `hooks/useUndo.tsx` + Ctrl+Z / Ctrl+Y bağlanması | ✅ |
| `databases.ts` — **tüm** mutation'lar (17) bağlandı | ✅ |
| `databaseViews.ts` — **tamamı**: view CRUD + `moveRow` (board sürükleme) | ✅ |
| `databaseViews` + `viewCardOrder` soft-delete'i (4 tablo oldu) | ✅ |
| Op-log'dan `insert`/`delete` kaldırıldı — çift kayıt yapısal olarak imkânsız | ✅ |
| `documents.ts` — update/removeIcon/removeCoverImage/toggleFavorite + 4 yerde `clearHistoryScope` | ✅ |
| İstemci: `DatabaseView` (database) + `DocumentView` (sayfa), **toast'sız** | ✅ |
| Testler — `history.test.ts` 26 + view/undo regresyonları | ✅ |

### Bildirim (toast) yüzeyi bu turda sadeleşti

18 `toast.promise` çağrısı kaldırıldı; başarı artık her yerde sessiz,
hata mesajları korundu. Tek başarı bildirimi Notion'ın "Moved to Trash" +
Restore snackbar'ı (`lib/snackbar.tsx`, `Item.tsx` + `Menu.tsx`).
Gerekçe `decisions.md`'de.

### Sidebar "..." menüsü Notion yapısına çekildi

265px genişlik, 20px ikonlar, üç ayraçlı grup, tip etiketi, "Move to Trash",
"Last edited by" altbilgisi. Yeni saf fonksiyon `formatLastEdited`
(`lib/utils.ts`, 4 test). Gerekçe ve shadcn ikon-ezme tuzağı
`decisions.md`'de.

### View "..." menüsü de Notion yapısına çekildi

220px, Notion sırası, "Duplicate view"/"Delete view", "Source" satırı,
**"Edit view"** (toolbar ayar paneline bağlandı — panel state'i
`database-view.tsx`'e kaldırıldı, toolbar artık kontrollü).
Yeni `databaseViews.setViewType` ("Display as", journal'a bağlı, 3 test).
**Source kaynak değiştirme kullanıcı kararıyla eklenmedi** — satır yalnızca
kaynağı gösteriyor.

### Property tipi + side peek menüsü

Tip değişince otomatik ad da yenileniyor (kullanıcı adı korunuyor, 3 test).
Side peek "Edit property" menüsünde seçili tip artık onay işaretiyle
gösteriliyor.

### Board sürüklemesi düzeltildi

Kart artık TUTULDUĞU noktadan sürükleniyor (`grabX` eklendi; eskiden sol
kenar imlece yapışıyordu) ve klon kaynağın genişliğini alıyor. Kapak
`<img>`'i sürüklemeyi kırıyordu — `pointer-events: none` + `draggable=false`.

### Board kartı kapak + ikon

Kart `row.coverImage` ve `row.icon`'u hiç okumuyordu; kapak yerine gri yer
tutucu vardı. İkisi de bağlandı, yer tutucu kaldırıldı. Ayrıca
`cardPreview` varsayılanı "cover" yapıldı — alanı yazan bir ayar UI'ı
olmadığı için her view'da `undefined` geliyordu ve kapak asla çizilmiyordu.

### İç içe menü tıklaması düzeltildi + hover ile açılma

Alt menüye tıklama hiç ulaşmıyordu (ayrı portal → ana menü pointerdown'da
kapanıp alt menüyü unmount ediyordu). `ContextMenu`'ye `rootRef`/`ignoreRef`
eklendi. "Display as" artık hover ile de açılıyor, komşu satırda kapanıyor.

### "Display as" düzeltildi + menü açılış konumu

"Display as" Notion'da view türü değil SEKME GÖRÜNÜMÜ (Text and icon /
Text only / Icon only). Yeni `databaseViews.tabDisplay` alanı,
`updateViewSettings` üzerinden gidiyor (journal'a bağlı, 2 test).
`ContextMenu` ilk açılışta ekranın sol üstünden uçuyordu — konum artık
render'da türetiliyor.

### Menü konumları tetikleyiciye sabitlendi

View sekmesi menüsü, board kolonu "..." menüsü ve "Display as" alt menüsü
artık fare konumunu değil tetikleyicinin rect'ini kullanıyor. Gerçek sağ
tık menüleri (editördeki görsel) bilinçli olarak fare konumunda kaldı.

### Menü ikonları + animasyon

View menüsü ikonları Notion'un kendi SVG'leriyle değiştirildi (6 yeni ikon
`_components/icons/` altında). `ContextMenu` artık 200ms ease açılış
animasyonu taşıyor. **Kırmızı çöp ikonu projeden tamamen kalktı** — her
yerde sidebar'ın `TrashIcon`'u, `danger` prop'u kaldırıldı.

### Side peek satır kapağı düzeltildi

Kapak hiç render edilmiyordu (baştan eksik, regresyon değil). Artık panelin
tam genişliğinde çiziliyor; hover'da Change cover / Remove.

### Sıradaki (tam liste `docs/undo-redo.md` sonunda)

1. `documents.reorder` (sidebar sıralaması).
2. UI: menüde geri al/yinele düğmeleri (`getUndoState` etiketleri hazır).
3. E2E testi + optimistic update (projede hiç `withOptimisticUpdate` yok,
   her undo bir sunucu round-trip'i).

### Önceki iş — board kartı + side peek Notion parity'si

**Board kartı + side peek Notion parity'si** — bu turda tamamlandı ve
commit'lendi (`f07fddf`, `bac6fb6`, `17b8a48`, `f7bc127`). Ölçüm kaydı
**`docs/notion-research/board-parity.md`**.

Kapatılanlar:
- Kart hover'ında sürükleme butonu kaldırıldı (Notion'da yok; bizimki zaten
  çalışmıyordu). Yerine tek çip içinde pencil + ellipsis; pencil başlığı
  düzenlemeye açıyor ve buton side-peek'e dönüşüyor.
- Side peek: genişlik %48.5 (ölçülen), sol kenardan sürüklenebilir,
  `modal={false}` (peek açıkken arkadaki arayüz çalışıyor), rozetler
  düzenlenebilir, tipografi Notion DOM'undan birebir, satır ikonu + kapağı,
  `Add a property`, property etiketi menüsü (Rename / Edit / Duplicate /
  Delete).
- `createProperty` artık tipin adını veriyor (Text, Text 2, Select…) —
  hepsi "Property" oluyordu.

**Sıradaki:** Notion'ın peek başlığındaki `Share`, `Favorite`, `...` ve üç
modlu `Switch peek mode` (side / center / full) bizde yok.

**Not:** `cover-modal-parity` testi tam paralel koşuda bir kez düştü, tek
başına ve sonraki tam koşularda geçti — kararsız (uzak CDN görselleri).

**Auth yüzeyi yenilendi** (bu turun ikinci işi) — landing sayfası kaldırıldı,
`/login` + `/register` Dokploy tarzı split-screen olarak kuruldu, Zotion tek
kurulum sahibi modeline geçti. Detay `decisions.md` 2026-08-25 kaydında.

Öncesinde: **Database (table) görünümünün Notion parity'si** — plan
`docs/database-cell-interaction.md`, ölçüm kaydı
**`docs/notion-research/table-parity.md`** (bu turda oluşturuldu).

Test altyapısı (`docs/testing.md`, 5 adım) CI dışında bitti — CI kullanıcı
kararıyla ertelendi. Board (kanban) + view sistemi tamamlandı (`PLAN.md`).

## Bu turda yapılanlar

### 1. Doğrulanan gerçek hatalar (ölçümle bulundu, tahminle değil)

| Bulgu | Önce | Sonra |
|---|---|---|
| Fill sürüklemesi | sürükleme boyunca 1 hücre, değer hiç kopyalanmıyor | 2 hücre, aralık büyüyor |
| Bırakınca mavi vurgu | **takılı kalıyor** | temizleniyor |
| Tutamaç | 10px, hücre içinde, `overflow-hidden` kırpıyor | köşe üzerinde, kırpılmıyor |
| Başlık satırı | `bg-secondary/50` gri bant | sayfa arka planı |

Kök neden: tutamaçta **pointer capture yoktu**; imleç tutamacın dışına çıkar
çıkmaz `pointermove`/`pointerup` başka elemana gidiyordu.

### 2. Notion tablosu ilk kez ÖLÇÜLDÜ

Kullanıcı "Notion'a yakın diyorsun ama aynı diyemiyorsun" dedi — haklıydı, hedef
değerler çıkarsamaydı. Kullanıcının kendi Notion oturumunda (Playwright CDP,
headed Chromium) açık **ve** koyu tema ölçüldü. Çıkarsamaların yarısı yanlıştı;
tam liste `docs/notion-research/table-parity.md`'de. En kritikleri:

- Seçili hücrede **hafif mavi dolgu var** (`rgba(35,131,226,0.07)`), kontur
  `rgb(39,131,222)` 2px inset, **2px radius** (keskin değil).
- Fill tutamacı **9px, içi sayfa arka planı, 2px mavi halka**, `ns-resize` —
  dolu mavi nokta değil.
- Notion table view'da **satır hover tint'i yok**.
- Hücre metni **16px / 24px** (bizde 14px'ti).
- Çizgi: açık `rgba(42,28,0,0.07)`, koyu `rgba(255,255,243,0.082)`.

Hepsi uygulandı.

### 3. Dosya değişiklikleri

- **Yeni**: `components/database/fill-handle.tsx` (pointer capture'lı tutamaç),
  `docs/notion-research/table-parity.md`, `tests/unit/grid-fill-range.test.ts`.
- `app/globals.css`: `--table-border`, `--table-selection`,
  `--table-selection-fill` token'ları (açık + koyu, `@theme`'e bağlı).
- `database-grid.tsx`: `overflow-hidden` iç sarmalayıcıya taşındı (tutamaç
  köşede taşabilsin), satır hover tint'i kaldırıldı, seçim overlay stiline
  geçti, hücreye `data-fill-range` işareti eklendi.
- `use-grid-selection.ts`: `fillDragging` state'i kaldırıldı — sürükleme
  durumu artık `FillHandle`'ın kendi ref'inde.
- `grid-cell.tsx`: metin `text-base leading-6` (ölçülen 16/24).
- `column-header.tsx`, `row-menu.tsx`: tablo çizgisi token'ına geçiş.
- Testler: `table-parity.spec.ts`'e 3 regresyon testi; `TablePage`'e
  `selectCell` / `dragFillHandle` / `highlightedCellCount`.
- Silinen geçici dosyalar: `tests/e2e/_tmp-fill.spec.ts`, `after-blank.png`,
  `after-enter.png`, `notion-selected-cell.png`, tüm `_measure*.mjs`.

## Doğrulama durumu (2026-08-25, undo/redo turu sonu)

```
npx tsc --noEmit  → temiz
npm test          → 83 geçti (9 dosya)
npm run build     → temiz
npm run lint      → 15 sorun (7 hata / 8 uyarı) — baseline DEĞİŞMEDİ,
                    dokunulan dosyaların hepsi lint-temiz
```

E2E bu turda çalıştırılmadı — undo/redo'nun E2E kapsaması henüz yok.

## Doğrulama durumu (önceki tur, tam geçiş)

```
npx tsc --noEmit        → temiz
npm test                → 54 geçti (8 dosya)
npm run test:e2e        → 37 geçti, 4 atlandı, 0 başarısız
npm run build           → temiz
npm run lint            → 15 sorun (7 hata / 8 uyarı) — baseline değişmedi,
                          hiçbiri dokunulan dosyalarda değil
```

Görsel snapshot **bilinçli olarak güncellendi**
(`tests/e2e/visual-parity.spec.ts-snapshots/table-surface-chromium-linux.png`) —
başlık bandı, çizgi renkleri, seçim ve tutamaç değişti.

## Auth yüzeyi — bu turda yapılanlar

- **Silindi**: `app/(landing)/` (7 dosya), `components/modals/AuthModal.tsx`,
  `hooks/useAuthModal.tsx` (modal'ın tek tetikleyicisi landing'di).
- **Yeni**: `app/(auth)/{layout,login/page,register/page}.tsx` +
  `_components/{AuthHeader,LoginForm,RegisterForm}.tsx`, içerik tutmayan
  yönlendirici `app/page.tsx`, saf karar fonksiyonu `lib/auth-routing.ts`
  (+ `tests/unit/auth-routing.test.ts`, 4 test).
- **Kayıt kapatma**: `lib/auth.ts`'e `hasAnyUser()` ve
  `databaseHooks.user.create.before` — ilk hesaptan sonra sign-up API'si de
  reddediyor, sadece redirect değil.
- `proxy.ts`: girişsiz kullanıcı `/login`'e, PUBLIC_ROUTES'a `/login`+`/register`.
- `scripts/screenshots/`: "landing" çekimi "login" ile değişti, `signedOut`
  bayrağı eklendi (auth ekranları oturumsuz çekilmeli).
- `CLAUDE.md` + `.claude/rules/project/frontend.md` route grupları güncellendi.

Tarayıcıda doğrulanan yönlendirme akışı (bu kurulumda hesap var):
`/` → `/login`, `/register` → `/login`, `/documents` → `/login`.

### Görsel altyapısı — bu turda çalışır hâle getirildi

- `docs/screenshots/landing-*.webp` **silindi**; `npm run screenshots` tam
  olarak koşturuldu → `login-light/dark.webp` üretildi, iki README galerisi de
  yeniden yazıldı (4 bölüm, landing kalıntısı yok).
- **Galeri tek kullanımlık yığına taşındı** (`scripts/gallery/run.mjs`,
  `docker/gallery/compose.yml`). `ZOTION_ALLOW_SIGNUP` kaçış kapısı **koddan
  tamamen silindi**; demo hesabı boş yığında ilk kullanıcı olarak açılıyor,
  seed operatörün verisine erişemiyor. Uçtan uca koşturuldu: 14 çekim, iki
  README yeniden yazıldı, yığın volume'larıyla silindi, dev yığını
  dokunulmadı.
- **`/register` artık doğrulanabiliyor**: kabuk `AuthShell` olarak ayrıldı,
  `app/test-fixtures/register` + `tests/support/fixtures/register-fixture.tsx`
  gerçek bileşenleri veritabanından bağımsız render ediyor.
  `tests/e2e/auth-pages.spec.ts` → 4 test.

### Kod incelemesi bulguları (bu turda kapatıldı)

- **Taslak silinmesi — GERÇEK, düzeltildi.** Düzenlenen hücrenin içine tıklamak
  yazılanı siliyordu; `beginEditCell` aynı hücrede no-op yapıldı + regresyon
  testi. Ölçümle doğrulandı (`"ab"` → tık → `"ab"`, önce `"A table page"`).
- **"fill-handle.tsx yok" — YANLIŞ POZİTİF.** Dosyalar diskte var, sadece
  git'te untracked; bulut incelemesi untracked dosyaları bundle'a almıyor.
- **Karışık girinti — GERÇEK, düzeltildi** (`database-grid.tsx` prop listesi).
  Not: `node_modules/.bin/prettier` bu makinede çalıştırılamıyor (izin hatası),
  elle düzeltildi.

## Açık maddeler

- **Untracked dosyalar incelemeye girmiyor** — `app/(auth)/`, `app/page.tsx`,
  `lib/auth-routing.ts`, `components/database/fill-handle.tsx` vb. hâlâ
  `git add` edilmedi. **Auth işi fiilen hiç incelenmedi.** Commit'lemeden
  (tablo + auth ayrı) yeni bir inceleme anlamlı olmaz.
- **Escape sonrası odak `body`'ye düşüyor** — grid'in `onKeyDown`'ı devre dışı
  kalıyor, "idle hücrede yazmaya başla" klavyeden erişilemez. A11y pürüzü,
  ayrı iş (`gotchas.md`).
- **Login sayfası 1920px'de seyrek duruyor** — sol panel `max-w-[560px]` ile
  %29'a düşüyor, form geniş sağ panelde küçük kalıyor. README çekimi doğru ama
  görsel olarak zayıf; panel oranı veya form ölçeği gözden geçirilebilir.

- **Tabloda henüz ölçülmemiş yüzeyler** — kolon başlığı hover'ı ve ikon
  boyutu, select/multi-select rozet paleti, checkbox/date/person hücreleri,
  fill sürüklemesi sırasındaki hedef-aralık vurgu rengi, kolon boyutlandırma
  tutamacı, boş tablo durumu. Liste `table-parity.md` sonunda. **Çıkarsama
  yapılmayacak** — aynı yöntemle ölçülecek.
- **Fixture fill'in değer yazdığını doğrulayamıyor** — `table-fixture.tsx`
  satırları statik prop, Convex round-trip'i yok. E2E yalnızca vurgu aralığını
  görüyor; değer kopyalama `tests/unit/grid-fill-range.test.ts` ve Convex
  mutation testleriyle korunuyor.
- **CI** — ⏸️ kullanıcı kararıyla ertelendi.
- **`color-contrast` borcu** — Notion parity'sinin sonucu.
- **`lib/` kapsamı %5.98** — storage, editorFont testsiz.
- **Faz 6 (board)** — performans ölçümü ve a11y geçişi.
- **Lint baseline** — 7 hata React-compiler `set-state-in-effect`, ayrı iş.

## Commit edilmemiş iş

**Undo/redo turu (bu tur).** Yeni: `convex/history.ts`,
`convex/lib/history.ts`, `convex/lib/softDelete.ts`, `hooks/useUndo.tsx`,
`tests/convex/history.test.ts`, `docs/undo-redo.md`. Değişen:
`convex/schema.ts` (history tablosu + iki `deletedAt`), `convex/databases.ts`,
`convex/databaseViews.ts`, `convex/crons.ts`, `convex/_generated/`,
`components/database/database-view.tsx`, `components/document-view.tsx`,
`convex/documents.ts`, `tests/convex/{databases,databaseViews}.test.ts`,
`app/(main)/_components/{Banner,TrashBox,DocumentList,FavoritesList,Publish,Item,Menu,NavDrawer}.tsx`,
`app/(main)/(routes)/documents/page.tsx`, `components/modals/NewPageModal.tsx`;
yeni `lib/snackbar.tsx`, `tests/unit/format-last-edited.test.ts`;
değişen `lib/utils.ts`,
`docs/memory/{STATE,decisions}.md`.


Her şey `master`'da **commit edilmemiş** (son commit `83ac4c8`) ve artık iki ayrı
iş bir arada duruyor — **commit'lerken tabloyu ve auth'u ayır.**

*Tablo parity'si*: `app/globals.css`,
`components/database/{column-header,database-grid,grid-cell,row-menu,use-grid-selection}`,
`tests/e2e/{a11y,table-parity}.spec.ts`,
`tests/support/{fixtures/table-fixture,pages/table-page}`, görsel snapshot;
yeni `components/database/fill-handle.tsx`,
`docs/database-cell-interaction.md`, `docs/notion-research/table-parity.md`,
`tests/unit/grid-fill-range.test.ts`.

*Auth*: silinen `app/(landing)/`, `components/modals/AuthModal.tsx`,
`hooks/useAuthModal.tsx`; değişen `lib/auth.ts`, `proxy.ts`,
`components/providers/modal-provider.tsx`, `scripts/screenshots/{shots,capture.spec}.ts`,
`CLAUDE.md`, `.claude/rules/project/frontend.md`, `docs/runbook.md`,
`scripts/seed-demo.mjs`; silinen `docs/screenshots/landing-*.webp`; yeniden
üretilen `README.md` + `README.tr.md` galerileri ve `docs/screenshots/*`;
yeni `app/(auth)/`, `app/page.tsx`, `lib/auth-routing.ts`,
`app/test-fixtures/register/`, `tests/support/fixtures/register-fixture.tsx`,
`tests/unit/auth-routing.test.ts`, `tests/e2e/auth-pages.spec.ts`.

`docs/notion-research/RESEARCH_STATUS.md` henüz **güncellenmedi** — tablo
bölümünün oraya da eklenmesi gerekiyor.

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
