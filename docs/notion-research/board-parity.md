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

## Henüz ÖLÇÜLMEDİ — çıkarsama yapılmayacak

Bu tur ölçüm alınamayan yüzeyler (kart tıklaması peek'i toggle'ladığı için
ikinci geçiş boş döndü):

- **`Add cover` / `Customize layout`** satırı — başlığın üstünde, yalnızca
  hover'da beliriyor (kullanıcının ekran görüntüsünde görünür).
- **Genişlik sürükleme tutamacı** — peek'in sol kenarındaki `col-resize`
  bölge; ölçümde bulunan tek `col-resize` sidebar'a aitti, peek'inki ayrıca
  ölçülmeli.
- Property satırlarının hizası/ölçüleri, `Add a property`, `Comments` bölümü.
- Peek açılış animasyonu ve minimum/maksimum genişlik sınırları.

## Bilinen Zotion hatası (henüz düzeltilmedi)

Kullanıcı bildirimi: **side peek açıkken içindeki rozetlere (select/multi-select
chip) ulaşılamıyor.** Henüz doğrulanmadı, sebebi bulunmadı —
`components/modals/RowPeekModal.tsx` üzerinde ayrıca incelenecek.
