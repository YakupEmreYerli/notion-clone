# Notion Board — Ölçülen Token'lar (Faz 1 + 1.5 çıktısı)

> Kaynak: Notion app (2026-08-24) — "Kitaplar" database'inin Board view'ı, 1920px pencere.
> Light + Dark ölçüldü. Değerler `getComputedStyle` ile alındı, screenshot'lar
> `design/notion-measurements/` altında. Renkler Notion'un kendi CSS değişkenlerinden
> çözüldü (`--c-*` / `--ca-*`), implementasyonda kendi token'larımıza map edilecek.
> **1.5 güncellemesi:** drag mekaniği (A), dark grup renkleri (B), küçük eksikler (C).

---

## 1. Boyutlar ve boşluklar

| Token (bizim ad) | Değer | Notion karşılığı |
|---|---|---|
| `--kanban-col-width` | 276px | kolon genişliği (içerik 260px) |
| `--kanban-col-gap` | 12px | kolonlar arası (margin-right) |
| `--kanban-col-pad-x` | 8px | kolon iç yatay padding |
| `--kanban-col-pad-bottom` | 8px | kolon alt padding |
| `--kanban-col-margin-bottom` | 16px | kolon alt boşluk |
| `--kanban-col-radius` | 0 0 10px 10px | sadece alt köşeler yuvarlak |
| `--kanban-col-header-h` | 40px | kolon başlık satırı yüksekliği |
| `--kanban-col-header-pad-x` | 8px | başlık iç yatay padding |
| `--kanban-card-gap` | 8px | kartlar arası dikey boşluk |
| `--kanban-card-radius` | 10px | kart köşe yarıçapı |
| `--kanban-card-pad-x` | 10px | kart iç yatay padding |
| `--kanban-card-pad-top` | 8px | kart başlık satırı üst padding |
| `--kanban-card-pad-bottom` | 6px + 8px | başlık alt + property satırı alt |
| `--kanban-card-min-h` | 73px | tek satır başlık kartı yüksekliği (~72.5) |
| `--kanban-board-margin-x` | 96px | full-width kenar (margin 0 96px) |
| `--kanban-board-pad-left` | 8px | board sol padding |
| `--kanban-scrollbar-h` | ~14px | yatay scrollbar yüksekliği (ölçüm ekran görüntüsünde görünür) |
| `--kanban-cover-h` | 148px | kart cover yüksekliği (260px genişlikte, object-fit cover) |

## 2. Tipografi

| Token | Değer |
|---|---|
| `--kanban-title-size` | 15px |
| `--kanban-title-weight` | 500 |
| `--kanban-title-lh` | 22.5px (1.5) |
| `--kanban-title-color` (light) | #2c2c2b |
| `--kanban-title-color` (dark) | #f0efed |
| `--kanban-col-title-size` | 14px (başlık badge'inde) |
| `--kanban-col-title-lh` | 120% |
| `--kanban-col-title-weight` | 400 |
| `--kanban-col-title-color` | grup rengi koyu varyant (örn. kahverengi #494846) |
| `--kanban-card-prop-size` | 12px (property badge) |
| `--kanban-card-prop-lh` | 120% |
| `--kanban-badge-h` | 18px |
| `--kanban-badge-radius` | 4px |
| `--kanban-badge-pad-x` | 6px |
| `--kanban-prop-row-min-h` | 28px |
| `--kanban-prop-row-pad` | 5px |
| `--kanban-prop-row-radius` | 5px |
| `--kanban-prop-row-gap` | rowGap 4px / columnGap 6px |
| `--kanban-count-size` | 12px (sayaç) |
| Font ailesi | `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, "Apple Color Emoji", Arial, "Segoe UI Emoji", "Segoe UI Symbol"` |

## 3. Renkler

### Yüzeyler
| Öğe | Light | Dark |
|---|---|---|
| Board arka plan | #fff | #191919 |
| Kart yüzeyi | #fff | #2c2c2b |
| Kolon arka plan (tint) | grup rengine göre (aşağıda) | rgba(252,252,252,.03) |
| Kart 1px halkası | grup rengi tint (örn. kahverengi rgba(42,28,0,.07)) | rgba(255,255,243,.082) |
| Menü popup | #fff, shaOutLg | #252525 |

### Grup renkleri (light, --ca-*BacTerTra = badge bg / --c-*TexPri = badge text)
| Renk | Badge bg | Badge text | Kolon başlık tint |
|---|---|---|---|
| gray | rgba(28,19,1,.11) | #494846 | rgba(66,35,3,.03) |
| brown | rgba(28,19,1,.11) | #494846 | rgba(66,35,3,.03) |
| orange | — | — | — |
| yellow | rgba(209,156,0,.282) | #655121 | rgba(207,175,0,.063) |
| green | rgba(0,96,38,.157) | #2a533c | rgba(3,87,31,.035) |
| blue | rgba(0,118,217,.204) | #264a72 | rgba(0,128,213,.047) |
| purple | — | — | — |
| pink | — | — | — |
| red | rgba(206,24,0,.165) | #6d3531 | rgba(199,3,3,.035) |

### Grup renkleri (dark, ölçülen badge örnekleri)
| Renk | Badge bg | Badge text |
|---|---|---|
| yellow | rgba(255,252,235,.306) | #f0efed |
| blue | rgba(81,166,255,.494) | #e5f2fc |

### Diğer
| Öğe | Değer |
|---|---|
| `--c-texPri` (light/dark) | #2c2c2b / #f0efed |
| `--c-texSec` | #7d7a75 / #ada9a3 |
| `--c-whiButBac` (buton/kart bg) | #fff / #252525 |

## 4. Gölgeler

| Token | Light | Dark |
|---|---|---|
| Kart gölgesi (idle) | `rgba(25,25,25,.027) 0px 4px 12px, rgba(25,25,25,.02) 0px 1px 2px, <grup rengi> 0px 0px 0px 1px` | `rgba(25,25,25,.08) 0px 2px 4px, rgba(255,255,243,.082) 0px 0px 0px 1px` |
| `--c-shaOutMd` | `0px 8px 12px rgba(25,25,25,.027), 0px 2px 6px rgba(25,25,25,.027), 0px 0px 0px 1px rgba(42,28,0,.07)` | `0px 0px 0px 1px #383836, 0px 4px 12px -2px rgba(25,25,25,.08)` |
| `--c-shaOutLg` (menü popup) | `0px 20px 24px rgba(25,25,25,.05), 0px 5px 8px rgba(25,25,25,.027), 0px 0px 0px 1px rgba(42,28,0,.07)` | — |
| "+ New" buton halkası | `0 0 0 1px rgba(42,28,0,.07)` | — |

## 5. Motion

| Öğe | Değer |
|---|---|
| Kart hover bg geçişi | `background 0.1s ease-out` |
| Kart ⋯ buton görünümü | `opacity 200ms ease` (position: absolute, inset-inline-end 8px, top 8px, min-height 24px, radius 4px) |
| Başlık badge hover bg | `background 0.02s ease-in` |
| Drag preview | pointer'a kilitli klon, dış katman opacity ~0.4, kart yüzeyi radius 10 + kart gölgesi |
| Drag sırasında kaynak kart | yerinde kalır, opacity 1 (preview ayrı portalla) |

## 6. Drag & hover yapısı

- **Drag preview:** portal `.notion-overlay-container` (fixed, z 999), kart klonu pointer'da; kaynak kart DOM'da yerinde (opacity 1).
- **Kart hover butonları:** iki buton — drag handle (29×24) + ⋯ (28×24), `padding 4px 6px`, renk `--c-texSec`.
- **Kolon header hover:** + ("New page", 24×24) ve ⋯ ("More group options", 24×24), header hücresinin sağında belirir.
- **Kart ⋯ buton:** absolute, üst-sağ (8px içeriden), `background: --c-whiButBac`, `box-shadow: --c-shaOutMd`, radius 4px, min-height 24px, font 12px.
- **"+ New" (kolon altı):** 260×40, radius 10px, `padding 0 10px`, 1px halka `rgba(42,28,0,.07)`, renk `--c-texSec` (#8e8b86).
- **Kart iç yapısı:** `<a>` → [hover katmanı, title satırı (`pad 8px 10px 6px`, align center), property satırı (`line-height 1.5`, `pad-bottom 8px`)].

## 7. Side peek (kart tıklama)

- Side peek paneli: **pencere genişliğinin %50'si** (1920'de 960px, 1280'de 640px — ölçüldü), tam yükseklik, sağdan açılır.
- Üstte: Close / Open in full page / Share / Favorite / Actions.

## 8. Boş durumlar

- Boş kolon: sadece "+ New" butonu (260×40) görünür; kolon yüksekliği ~51px.
- Boş board / filtre-boş: ayrı empty state (bu view'da ölçülmedi — Faz 6'da).

## 9. View/toolbar

- View settings menüsü: Layout (Group by, Open pages in, Card preview None/Page cover/Page properties/Page content, Card size), Property visibility, Filter, Sort, Group, Sub-group, Conditional color, Copy link.
- Card preview seçenekleri: None / Page cover / Page properties / Page content.
- Filter menüsü (boş): 290×208, #fff, radius 10px, "Add advanced filter".
- Kolon ⋯ menüsü: Edit groups, Hide aggregation, Hide group, Move to Trash + Colors (Default/Gray/Brown/Orange/Yellow/Green/Blue/Purple/Pink/Red).
- Grup ayarları paneli: visible + hidden gruplar, "Show group"/"Hide group", "Pin group".
- **Collapse chevron bu sürümde yok** — kolon gizleme "Hide group" + "Edit groups" panelinden yapılıyor.

---

## 10. Drag mekaniği (1.5A — ölçüldü)

| Konu | Ölçüm |
|---|---|
| **Drag başlama eşiği** | **8px** (0/2/5px'te overlay yok, 8px'te overlay + klon beliriyor) — Zotion'un mevcut `distance:8` eşiğiyle birebir |
| **Placeholder biçimi** | **Ayrı placeholder elemanı YOK.** Drag preview = 0.4 opacity'te translusent klon, pointer'ı 1:1 takip eder (klon top = pointer − 39px, grab offset sabit; slot'a snap YOK) |
| Hedef kolon kartları | Drag sırasında **kaymaz** (gap açılmaz); kartlar yerinde kalır |
| Kolonlar arası geçiş | Klon kolon sınırını aşınca hedef kolonun üzerinde belirir; özel bir "belirme anı" yok (pointer takibi) |
| **Drop animasyonu** | **YOK** — bırakınca kart DOM'da anında hedef konumda; yüzey transition'ı sadece `background 0.1s ease-out` |
| **Auto-scroll (yatay)** | Eşik: kenara **~100px** kala başlar (150px'te yok, 100px'te başlıyor). Hız **mesafeyle artar**: ~100px'te ~350-500px/s, ~70px'te ~1000px/s, ~45px'te anında max. Scroller `notion-scroller vertical horizontal` (hem yatay hem dikey) |
| **Kolon reorder** | **Header drag YOK** — bu sürümde kolonlar "Edit groups" panelinden sürüklenerek sıralanıyor (panel liste drag'i; görsel placeholder standart liste çizgisi) |
| Drag overlay | `.notion-overlay-container` fixed, z 999; klon dış katman opacity 0.4, iç yüzey kart gölgesi + `rgba(55,53,47,.06)` tint |
| Kaynak kart | Drag boyunca yerinde, opacity 1 |

## 11. Dark mode grup renkleri (1.5B — tam liste)

Badge/başlık token çiftleri (`--ca-<color>BacTerTra` bg / `--c-<color>TexPri` text):

| Renk | Light bg | Light text | Dark bg | Dark text |
|---|---|---|---|---|
| gray | rgba(28,19,1,.11) | #494846 | rgba(255,252,235,.306) | #f0efed |
| brown | rgba(28,19,1,.11) | #494846 | rgba(255,184,132,.365) | #f5ede9 |
| orange | — (ölçülmedi) | — | rgba(255,143,71,.482) | #fbebde |
| yellow | rgba(209,156,0,.282) | #655121 | rgba(255,188,53,.46) | #f9f3dc |
| green | rgba(0,96,38,.157) | #2a533c | rgba(113,255,175,.337) | #e8f1ec |
| blue | rgba(0,118,217,.204) | #264a72 | rgba(81,166,255,.494) | #e5f2fc |
| purple | — (ölçülmedi) | — | rgba(208,147,255,.427) | #f3ebf9 |
| pink | — (ölçülmedi) | — | rgba(255,133,192,.427) | #fae9f1 |
| red | rgba(206,24,0,.165) | #6d3531 | rgba(255,116,105,.525) | #fce9e7 |

Kolon header tint'leri:

| Renk | Light | Dark |
|---|---|---|
| red | rgba(199,3,3,.035) | rgba(251,107,107,.047) |
| gray | rgba(66,35,3,.03) | rgba(252,252,252,.03) |
| blue | rgba(0,128,213,.047) | rgba(41,139,253,.063) |
| yellow | rgba(207,175,0,.063) | rgba(255,232,48,.043) |
| green | rgba(3,87,31,.035) | rgba(83,255,140,.035) |

**Kart halkası dark'ta da grup bazlı:** sarı (Sıradaki) → `rgba(255,225,117,.13)`; gray/No Durum → `rgba(255,255,243,.082)` (varsayılan light halka). Light'ta: brown `rgba(42,28,0,.07)`, blue `rgba(0,124,215,.094)`, yellow `rgba(211,168,0,.137)`.

## 12. Küçük ölçümler (1.5C)

- **Kart başlığı line-clamp: YOK** — `webkit-line-clamp: none`, `overflow: visible`; başlık serbest sarar (Dost Kazanma 2 satır = 45px doğal wrap).
- **Yatay scrollbar:** 15px yükseklik, **tarayıcı default stili** (Notion `::-webkit-scrollbar` stillendirmiyor); yalnızca içerik taşınca görünür (scrollW > clientW).
- **Board dış padding:** board view `margin 0 96px` (full-width), sol `padding 8px`; üst seviye container padding 0.
- **Kolon max-height: none** — kolonlar içerikle büyür; dikey scroll'u board scroller'ı (`vertical horizontal`) yönetir, kolon kendi içinde scroll yapmaz.
- **Side peek: %50** (1920→960, 1280→640 ölçüldü).
