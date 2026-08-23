# Notion araştırması — Page sistemi (başlangıç, 2026-08-24)

> Kaynak: gerçek Notion (app.notion.com) Playwright ile ölçüldü. Tahmin içermez.
> Bu dosya page lifecycle / geometri parity'sinin mevcut durumunu kaydeder.

## Ölçülen Notion page referansı (1920px viewport, dark)

### Title
- Font: **40px / 700 / line-height 48px**, letter-spacing normal, padding `0 8px`.
- Notion small text: title küçülür (~32px).
- Renk: text-primary (light `#2c2c2b`, dark `#f0efed`).

### İçerik genişliği
- Default page: **720px** max column, main alanı içinde ortalanır (1920'de x≈728).
- "Full width" opt-in toggle ile genişler.
- Body text 16px.

### Text selection (iki tema)
- `::selection` background: **rgba(35,131,226,.28)**, metin rengi değişmez.
- Light: koyu metin açık mavi üstünde; dark: açık metin koyu mavi üstünde — okunur.

## Zotion'da bulunan farklar → düzeltilenler

| Alan | Notion | Zotion (önce) | Düzeltme |
|---|---|---|---|
| Title font-size | 40px | 48px (`text-5xl`) | → 40px/lh-48 (small 32px) |
| Default content genişliği | 720px column | full-width (%90) | → default narrow 720px |
| Yeni page fullWidth default | false | true (convex create) | → false |
| Text selection | rgba(35,131,226,.28) + sabit metin rengi | Chrome dark UA gri seçim + karartılmış metin | global `::selection` kuralı eklendi |
| Menü format butonları undo | — | mousedown selection'ı temizliyordu → toggle uygulanmıyor / undo yok | `.zsm-menu` `onMouseDown preventDefault` → toggle + Ctrl+Z çalışıyor |

## Doğrulama (Playwright)
- Yeni page: container **720px**, title **40px** (Notion ile aynı).
- Selection: computed `rgba(35,131,226,.28)` + metin rengi korunuyor (light/dark).
- Bold undo: menüden bold kaldır → Ctrl+Z geri getirir (partial selection dahil).
- Sidebar More menüsü, block-type dropdown, diğer menü aksiyonları çalışıyor.
- `tsc`/`lint`/`build` temiz.

## İkinci tur (2026-08-24): Empty page + title parity

### Ölçülen Notion (boş page)
- Boş page: title **40px**, placeholder "New page", **title'a otomatik focus**.
- Title'da Enter → ilk block'a geçer (başlık yeni satır almaz).
- Title → ilk block arası **16px** boşluk; ilk block 16px/24px lh.
- `/` → slash menu açılır. Boş title'da "Add icon/cover/comment" hayalet butonları.
- Topbar 44px; title y=156.

### Zotion'da bulunup düzeltilenler
| Alan | Notion | Zotion önce | Düzeltme |
|---|---|---|---|
| Title ilk focus | oluşturma sonrası focus | focus yok | create akışlarına `?fresh=1`, DocumentView `history.replaceState` + `focusEnd` |
| Title'da Enter | ilk block'a geçer | sadece blur | `onFocusEditor()` çağrısı |
| Title→ilk block boşluğu | 16px | 9px | Toolbar `mb-[7px]` → 16px |
| Title tipografi | 40px/700/lh-48 | 48px | önceki turda 40px |

### Kalan bilinçli farklar (yapısal, kabul edildi)
- **Title top offset: Notion y=156, Zotion y=148 (8px).** Sebep yapısal: Zotion navbar 56px vs Notion topbar 44px + içerik üst padding farkı. Zotion'un topbar'ı farklı bir bileşen; zorla kaydırmak cover/topbar düzenini bozardı.
- **Full width** genişliği: Notion'da menüden toggle'lanıp ölçülemedi (test page toolbar'ında menü butonu yoktu) — 720px default doğrulandı, full-width değeri ölçülmedi (BLOCKED).
- Duplicate metadata / derin nested ağaç / cover picker geometrisi derin ölçülmedi (bu tur kapsamı dışı).

## Üçüncü tur (2026-08-24): Full-width, icon, cover, top-offset

### Ölçülen Notion
| Ölçü | Notion |
|---|---|
| Narrow content | 720px (x≈735, main 1650) |
| **Full width content** | **1431px**, kenar boşlukları ~102-117px (main 1650) |
| Page icon (emoji) | **78x78**, image; icon→title gap **40px** |
| Icon cover overlap | icon cover'a **-42px** biner |
| Cover | full-bleed **271px** (y=44), cover→title (no-icon) **40px** |
| No-cover title top | **y=156** (topbar 44 + 112px içerik padding) |
| Emoji picker | 408x390, radius 10, popup shadow |
| Cover picker (modal) | Zotion 512x518, radius 10 (Notion yakın) |

### Zotion'da düzeltilenler
| Alan | Notion | Zotion önce | Değişiklik | Son |
|---|---|---|---|---|
| Full width | 1431 | %90 (1485) | `max-w-[calc(100%-220px)]` | **1420** |
| Icon boyutu | 78px | 60px (text-6xl) | `text-[78px]` | 78px |
| Icon→title gap | 40px | 48px | Add-row `py-2`→`py-1` | **40px** |
| Icon cover overlap | -42px | -32px (-mt-8) | `-mt-[42px]` | -42px |
| No-cover title top | y=156 | y=140 | cover spacer `h-25`→`h-[116px]` | **y=156** |
| Cover→title (no icon) | 40px | 40px | (zaten eşit) | PASS |
| Cover height | 271px | 280px | (yakın, kabul) | PASS |

### Doğrulama (bu tur)
- Full width Zotion 1420 vs Notion 1431 ✓
- No-cover title y=156 (light ve dark) = Notion ✓
- Icon 78px, gap 40px, overlap -42px ✓
- Keyboard: title→Tab/ArrowDown editor'a geçer; title Y sabit (layout shift yok)
- `tsc`/`lint`/`build` temiz; test page'leri temizlendi

## Dördüncü tur (2026-08-24): Page shell geometry — gerçek layout ilişkileri

### Ölçülen Notion (4 viewport: 1280/1440/1650/1920, sidebar açık 270px)
- **Topbar: 44px** (padding yok, içerik tam yükseklik).
- **Narrow**: content max-width **720px** (gerçek), ortalanır. titleW=720 her viewport'ta.
- **Full-width algoritması**: kenar boşluğu **SABİT 96px** her viewport'ta → content = mainW − 192.
  - 1280: main 1010 → title 818. 1440: main 1170 → 978. 1650: main 1380 → 1188. 1920: main 1650 → 1458.
- Title Y: **156** (topbar 44 + 112px içerik padding).
- Horizontal rhythm: title box = first block = content sol kenarı (x=366 @1440 full).
- Title text: box padding-left 8px.

### Zotion'da düzeltilenler
| Alan | Notion | Zotion önce | Değişiklik | Son |
|---|---|---|---|---|
| Topbar/navbar | 44px | 56px (`py-2.5`) | Navbar `py-1` | **44px** |
| Full-width | main−192 (96px kenar) | `calc(100%-220px)` | `calc(100%-192px)` | **96px kenar** |
| Title X hizası | box/block sütun solunda | `pl-12` (48px içerden) | Toolbar `pl-0` + title `pl-2` | **x=366 @1440 full** |
| Narrow title | 720, ortalanmış | 720 | (zaten) | **495/156/720 @1440** |

### Doğrulama (1440×900, temiz page, 0px delta)
| Metric | Notion | Zotion |
|---|---|---|
| Navbar height | 44 | **44** |
| Sidebar | 270 | 270 |
| Narrow title X/Y/W | 495/156/720 | **495/156/720** |
| Narrow margins | 225/225 | **225/225** |
| Full title X/Y/W | 366/156/978 | **366/156/978** |
| Full margins | 96/96 | **96/96** |
| Title↔block hizalama | x=366 | **x=366** |

### Scrollbar notu
Uzun sayfada (scroll olduğunda) tarayıcı default scrollbar'ı ~10px yer kaplar — bu her iki uygulamada da aynı (platform davranışı), layout kuralı değil. Kısa sayfada 0px.

## Beşinci tur (2026-08-24): Cover height + sidepeek navbar

### Ölçülen Notion
- **Cover height (tam sayfa)**: viewport yüksekliğine bağlı → **min(30vh, 280px)**.
  - 600h→180, 700h→210, 800h→240, 900h→270, 1000h→280 (clamp), 1200h→280. 4 viewport genişliğinde aynı.
- **Cover→title**: **48px** (tüm yüksekliklerde sabit). title→block: 16px.
- Notion side peek: cover **20vh** (tam sayfadan farklı) — ama Zotion kararı: **her yerde aynı** (kullanıcı isteği), peek'te de min(30vh,280).

### Zotion'da düzeltilenler
| Alan | Notion | Zotion önce | Değişiklik | Son |
|---|---|---|---|---|
| Cover height | min(30vh,280px) | 280px sabit | `h-[min(30vh,280px)]` | **270 @900h** |
| Cover→title | 48px | 40px | cover+icon'suz durumda Add-row `mt-2` | **48px** |
| Cover başlangıcı | y=44 (topbar altı) | y=0 (navbar altında) | wrapper `pt-11` + spacer `h-[72px]` | **y=44** |
| Cover'la title Y | 362 @900h | 318 | yukarıdaki | **362** |
| Sidepeek navbar | 44px | 56px (`py-2.5`) | PeekModal `py-1` | **44px** |

### Doğrulama (1440×900)
- No cover: title **156** ✓, title→block 16 ✓.
- Cover: coverY **44**, coverH **270**, titleY **362**, cover→title **48**, title→block **16** — Notion ile 0px delta.
- Cover her yüzeyde aynı (peek dahil) — kullanıcı isteği.
- `tsc`/`lint`/`build` temiz; test page'leri temizlendi.

### Kalan (BLOCKED veya kapsam-dışı, somut sebep)
- Cover reposition (drag) matrisi: Zotion reposition drag mevcut, Notion ile pixel karşılaştırması derin yapılmadı.
- Deep nested ağaç (2-3 seviye) + drag/drop tam matrisi: Zotion DnD önceki oturumlarda Notion spec'ine göre implement edildi; bu tur tekrar doğrulandı (nest+toast+indent).
- Duplicate metadata matrisi: Zotion duplicate title/content/nested'i kopyalıyor; cover/fullWidth/smallText metadata davranışı Notion ile birebir karşılaştırılmadı (yeni test verisi gerektiriyor).