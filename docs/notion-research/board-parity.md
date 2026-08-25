# Notion board (kanban) yüzeyi — ölçüm kaydı

> **Gerçek Notion'da (app.notion.com, kullanıcının kendi oturumu)
> `getComputedStyle()` + `getBoundingClientRect()` ile ölçüldü. Tahmin yok.**
> Yöntem `table-parity.md` ile aynı: Playwright CDP, headed Chromium.
>
> Ölçüm tarihi: 2026-08-25.

## Kart hover aksiyonları

**Sürükleme butonu YOK.** Notion'da kartın kendisi sürükleme yüzeyi; hover'da
yalnızca iki buton çıkıyor.

| Şey | Ölçülen değer |
|---|---|
| Kap (çip) | tek kutu, **57×24**, `border-radius: 4px` |
| Çip zemini | sayfa/popover arka planı (açık temada `rgb(255,255,255)`) |
| Çip gölgesi | `rgba(25,25,25,0.027) 0 8px 12px` (yumuşak yükselti) |
| Sol buton | **29×24**, ikon `pencilLineSmall` |
| Sağ buton | **28×24**, ikon `ellipsisSmall` |
| Buton zemini | **saydam** — zemin ve gölge butonlarda değil, ÇİPTE |
| Buton hover zemini | `rgb(239, 239, 238)` (açık tema) |
| İkon rengi | `rgb(125, 122, 117)` — Zotion'ın `--muted-foreground`'u ile birebir |

### Edit butonunun iki durumu

Ölçümle doğrulandı: kart düzenleme modunda **değilken** sol butonun ikonu
`pencilLineSmall`; başlık düzenlemeye girildiğinde aynı buton `peekSide`
ikonuna dönüşüyor ve ikinci tık side peek'i açıyor.

### Zotion'da düzeltilenler

- Sürükleme butonu kaldırıldı (zaten çalışmıyordu: aksiyon kabındaki
  `stopPropagation` sürükleme motoruna ulaşmasını engelliyordu).
- İki ayrı gölgeli/kenarlıklı çip → tek çip + iki saydam buton.
- `--kanban-card-actions-width` 54px → **57px** (ölçülen çip genişliği).
- Aksiyonlar menü açıkken görünür kalıyor (portal'a geçince kart `mouseleave`
  alıp onları kaybediyordu — "hover takılı kalıyor" şikâyeti buydu).
- Başlık düzenleme katmanı çipin **soluna** sınırlandı: `inset-x-0` + sağ
  padding kullanmak kutuyu çipin altına kadar uzatıyor ve `z-20 > z-10`
  olduğu için side-peek butonunu tıklanamaz hale getiriyordu.

## Side peek

| Şey | Ölçülen değer |
|---|---|
| Genişlik | **761px** — viewport'un **%48.5**'i (1568px'de) |
| Konum | sağa yaslı, `y: 44` (üst bar altında), yükseklik `viewport - 44` |
| Kap zemini/gölgesi | kapta yok (saydam); yüzey içeride |

### Başlık çubuğu kontrolleri (hepsi 24×24, sol grup)

| Sıra | Etiket | İkon |
|---|---|---|
| 1 | `Close` | `arrowChevronDoubleForward` |
| 2 | `Switch peek mode` | `peekSide` |
| 3 | `Previous page` | `arrowChevronSingleUp` |
| 4 | `Next page` | `arrowChevronSingleDown` |

Sağ grup: `Share` (71×28), `Favorite` (yıldız, 28×28).

**Zotion'da olmayanlar:** peek modu değiştirme (side ↔ center ↔ full),
önceki/sonraki kayda geçme, Share, Favorite.

### Panel yüzeyi ve düzeni (kullanıcının paylaştığı DOM'dan)

| Şey | Ölçülen değer |
|---|---|
| Yüzey zemini | `var(--c-bacEle)` = **#202020** (sayfa zemininden bir kademe yukarıda) |
| Gölge | `var(--c-shaOutMd)` = `0 0 0 1px #383836, 0 4px 12px -2px rgba(25,25,25,.08)` |
| Sol kenarlık | **yok** — ayrımı gölge yapıyor |
| Başlık çubuğu | `height: 44px`, `padding-inline: 12px 10px`, sol grup `column-gap: 2px` |
| Boyutlandırma tutamacı | `role="separator"`, `cursor: col-resize`, **genişlik 12px**, tam yükseklik |
| İçerik kolonu | grid, `--margin-width: **76px**` iki yanda; `padding-bottom: 120px` |
| Kapak | `height: 20vh; max-height: 280px; object-position: center 100%` |
| Kapaklıyken kontrol satırı | `padding-top: 16px` (kapaksızken 4px) |
| İkon | 36×36, `font-size: 36px`, `border-radius: .25em`, `margin-inline-start: 8px` |
| Başlık | `32px / 700 / line-height 1.2`, h1 `padding-inline: 8px` |

### Property satırı

| Şey | Ölçülen değer |
|---|---|
| Satır aralığı | `margin-bottom: 4px` |
| Etiket hücresi | `160×34`, `color: var(--c-texSec)`, iç buton `radius 6px`, `padding: 0 6px` |
| Etiket içeriği | `font-size 14px`, `line-height 20px`, `gap 6px`, `font-weight 400` |
| Etiket ikonu | 16×16, `transform: scale(1.2)`; **hover'da sürükleme tutamacına dönüşüyor** |
| Değer hücresi | soldan toplam 8px içeride, `min-height 34px`, `padding: 7px 6px`, `radius 4px` |
| Rozet | `height 20px`, `radius 4px`, `padding-inline 6px`, `line-height 120%`, `14px` |
| `Add a property` | `height 34px`, `14px`, `color var(--c-texTer)`, `padding-inline: 6px 8px` |

### Property etiketi menüsü

`width: 220px` (min 180, max-height 70vh), `background: var(--c-popBac)` (#252525),
`border-radius: 10px`, `box-shadow: var(--c-shaOutLg)`. Sıra:
Rename · Edit property · Comment │ Property visibility › · Duplicate property ·
Delete property │ Customize layout.

Zotion'da `Comment`, `Property visibility` ve `Customize layout` yok (yorum
sistemi yok; diğer ikisi view ayarı ve panel view'ı bilmiyor).

## Henüz ÖLÇÜLMEDİ — çıkarsama yapılmayacak

Yukarıdaki "Panel yüzeyi ve düzeni" bölümü kullanıcının paylaştığı tam DOM'dan
geldiği için önceki eksiklerin çoğu kapandı. Kalanlar:

- Peek açılış animasyonu ve minimum/maksimum genişlik sınırları.

## Çözülmüş bulgular

- **Rozetlere ulaşılamıyor** — sebebi bulundu ve düzeltildi: `select` rozeti
  salt görünümdü (düzenleme için yanına ayrı bir native `<select>` konmuştu),
  `multiSelect` ise hiç düzenlenemiyordu. İkisi de tablonun gerçek `SelectCell`
  editörünü kullanıyor.
- **Peek açıkken arkadaki arayüz ölüydü** — Radix `Dialog` modaldı ve `body`'ye
  `pointer-events: none` koyuyordu. `modal={false}` + dışarı etkileşiminin
  paneli kapatmaması.
- **Kapak gösterilmiyordu** — eklenebiliyor ama render edilmiyordu.
