# Notion dark/light theme parity — araştırma kaydı

> Tarih: 2026-08-24. Gerçek Notion'da (app.notion.com, giriş yapılmış oturum)
> `getComputedStyle()` + pixel okuma ile ölçüldü. Renkler tahmin değil,
> tarayıcının döndürdüğü değerlerdir. Değerler `--c-*` / `--ca-*` CSS
> custom property'lerinden ve gerçek DOM öğelerinin computed style'ından alındı.

## 1. Notion tema davranışı (ölçülen)

- **Konum**: Settings & members → Preferences → Appearance → Theme.
  Üç seçenek: **Use system setting**, **Light**, **Dark**.
- **Mekanizma**: Tema `body.dark` class'ı + `.notion-app-inner` üzerinde
  `notion-dark-theme` / `notion-light-theme` class'ı ile uygulanır. CSS
  custom property'leri (772+ adet) bu class'a göre değişir.
- **Reload**: Tema değişimi **sayfayı reload etmez**; açık dialog/menu
  (Settings dialog dahil) açık kalır ve anında yeni temaya geçer.
- **Kalıcılık**: `localStorage["theme"] = {"mode":"dark"|"light"}` (çözümlenen
  değer) ve `localStorage["LRU:KeyValueStore2:appearanceSettingStorageKey"]
  = {"value":"dark"|"light"|"system"}` (kullanıcı tercihi). Full reload sonrası
  tema korunur; başka sayfaya geçince de korunur.
- **System**: "Use system setting" seçiliyken `prefers-color-scheme`
  değişimini canlı takip eder (reload yok). `theme` key'i çözümlenen modu,
  appearance key'i "system" tercihini tutar.
- **Flash yok**: `body` class'ı (`notion-dark-theme`/`notion-light-theme`)
  server HTML'inde inline olarak gelir; hydration sırasında yanlış tema
  flash'ı gözlenmedi (document-start MutationObserver ile doğrulandı).
- **Hydration öncesi bg**: İlk mutation'dan itibaren bg doğru temadaydı.

## 2. Notion semantic token referansı (ölçülen)

| Notion değişkeni | Zotion karşılığı | Light | Dark |
|---|---|---|---|
| `--c-bacPri` | background (sayfa) | `#ffffff` | `#191919` |
| `--c-bacSec` | surface (sidebar) | `#f9f8f7` | `#202020` |
| `--c-bacInt` | surface-secondary (interactive) | `#f4f3f3` | `#262626` |
| `--c-bacTer` | surface-tertiary | `#f0efed` | `#383836` |
| `--c-bacEle` | element bg | `#ffffff` | `#202020` |
| `--c-texPri` | text-primary | `#2c2c2b` | `#f0efed` |
| `--c-texSec` | text-secondary | `#7d7a75` | `#ada9a3` |
| `--c-texTer` | text-tertiary | `#a19e99` | `#7d7a75` |
| `--c-texAccPri` | text-muted (sidebar row) | `#5f5e59` | `#bcbab6` |
| `--c-texDis` | text-disabled | `#bcbab6` | `#5f5e59` |
| `--c-icoPri` | icon-primary | `#383836` | `#e6e5e3` |
| `--c-icoSec` | icon-secondary | `#8e8b86` | `#ada9a3` |
| `--c-icoTer` | icon-tertiary | `#ada9a3` | `#7d7a75` |
| `--c-icoDis` | icon-disabled | `#bcbab6` | `#5f5e59` |
| `--c-borPri` | border (divider) | `#e6e5e3` | `#383836` |
| `--c-borSec` | border-secondary | `#f0efed` | `#2c2c2b` |
| `--c-borStr` | border-strong | `#d4d3cf` | `#5f5e59` |
| `--ca-borPriTra` | divider-trace | `rgba(28,19,1,.11)` | `rgba(255,255,235,.1)` |
| `--ca-borSecTra` | divider-trace-soft | `rgba(42,28,0,.07)` | `rgba(255,255,243,.082)` |
| `--c-popBac` | popup (menu/modal/dropdown) | `#ffffff` | `#252525` |
| `--ca-staHov` | hover | `rgba(55,53,47,.04)` | `rgba(255,255,255,.055)` |
| `--ca-staPre` | pressed/active | `rgba(55,53,47,.1)` | `rgba(255,255,255,.13)` |
| `--ca-butHovBac` | button-hover | `rgba(55,53,47,.06)` | `rgba(255,255,255,.055)` |
| `--ca-outButHovBac` | outline-button-hover | `rgba(55,53,47,.06)` | `rgba(255,255,255,.055)` |
| `--ca-sidIteSelBac` | sidebar-selected | `rgba(0,0,0,.03)` | `rgba(255,255,255,.055)` |
| `--c-sidSecCol` | sidebar-section-label | `#91918e` | `#9b9b9b` |
| `--ca-bacIntTra` | interactive-trace | `rgba(33,27,23,.05)` | `rgba(255,255,255,.055)` |
| `--c-whiButBac` | "white" button | `#ffffff` | `#252525` |
| `--c-whiButHovBac` | "white" button hover | `#efefee` | `#2f2f2f` |
| `--c-shaSMThiOut` | popup thin outline shadow | `0 0 0 2px rgba(84,72,49,.08), 0px 4px 12px -2px rgba(0,0,0,.08)` | `0 0 0 2px #383836, 0px 4px 12px -2px rgba(0,0,0,.16)` |
| `--c-shaMDPriOut` | popup medium shadow | `0px 14px 28px -6px rgba(0,0,0,.1), 0px 2px 4px -1px rgba(0,0,0,.06), 0 0 0 1px rgba(28,19,1,.11)` | `inset 0 0 0 1px rgba(255,255,235,.1), 0px 14px 28px -6px rgba(0,0,0,.2), 0px 2px 4px -1px rgba(0,0,0,.12)` |
| `--c-focSha` | focus ring | `rgba(35,131,226,.57) 0 0 0 1px inset, rgba(35,131,226,.35) 0 0 0 2px` | aynı |
| `--c-texInvPri` | inverse text (on dark) | `#f0efed` | `#f0efed` |
| `--c-codStiBloBac` | code/embed block bg | `#f7f6f3` | `#272727` |

Öğe bazlı ölçümler (dark, gerçek DOM):

- Sidebar bg: `rgb(32,32,32)` = `#202020`; genişlik 270px.
- Sidebar satır (normal): bg transparent, text `#bcbab6`.
- Sidebar satır (hover): `rgba(255,255,255,.055)`.
- Sidebar satır (seçili): bg `rgba(255,255,255,.055)`, text `#f0efed`.
- Sidebar ikonu: `#ada9a3`, 20x20.
- Sayfa (editor) bg: `#191919`; title/body text `#f0efed`.
- Page ".../Actions" dropdown (dark): bg `#252525`, text `#f0efed`,
  radius `10px`, shadow `rgb(56,56,54) 0 0 0 1px, rgba(25,25,25,.2) 0 14px 28px -6px, rgba(25,25,25,.118) 0 2px 4px -1px`.
- Menu option hover: `rgba(255,255,255,.055)`.
- Seçili menü öğesi (ör. "Default"): `#2783de` (rgb(39,131,222)) — Notion mavi accent.

## 3. Zotion mevcut durum — Notion ile farklar

### Light

| Alan | Notion | Zotion (şu an) | Fark |
|---|---|---|---|
| Sayfa bg | `#ffffff` | `#ffffff` | ✓ |
| Sidebar bg | `#f9f8f7` | `#202020` (hardcoded) | ✗ **bug: light'ta da dark** |
| Sidebar text | `#2c2c2b` | `#e7e7e6` (hardcoded) | ✗ **bug: dark text light'ta** |
| Text primary | `#2c2c2b` | `#0b0b0a` (oklch .145) | ✗ çok koyu |
| Text secondary | `#7d7a75` | `#727372` (oklch .556) | ~ |
| Border | `#e6e5e3` | `#e5e5e5` | ~ |
| Popover | `#ffffff` | `#ffffff` | ✓ |
| Hover | `rgba(55,53,47,.04)` | `oklch(.97)` ≈ `#f4f5f4` | ~ |
| Focus ring | `rgba(35,131,226,…)` | shadcn `oklch(.708)` gri | ✗ |

### Dark

| Alan | Notion | Zotion (şu an) | Fark |
|---|---|---|---|
| Sayfa bg | `#191919` | `#1f1e1e` (`--dark` oklch 23.9%) | ~ (kabul edilebilir yakın) |
| Sidebar bg | `#202020` | `#202021` | ✓ |
| Text primary | `#f0efed` | `#fbfbfa` (oklch .985) | ~ |
| Editor text | `#f0efed` | `#cececf` (BlockNote `--bn-colors-editor-text`) | ✗ daha koyu |
| Popover | `#252525` | `#171717` (oklch .205) | ✗ çok koyu |
| Border | `#383836` | `oklch(1/10%)` ≈ `#262626` | ✗ daha koyu |
| Muted-fg | `#ada9a3` | `oklch(.708)` ≈ `#8b8b8b` | ✗ daha koyu |

## 4. Zotion tema mimarisi

- `next-themes` (storageKey `zotion-theme-2`, attribute=class, defaultTheme=system).
  Light/Dark/System seçenekleri mevcut, kalıcılık ve system davranışı Notion
  ile aynı çalışıyor.
- Sidebar baştan aşağı **dark için hardcode edilmiş** (Navigation.tsx,
  Item.tsx, DocumentList.tsx vb. `bg-[#202020]`, `text-[rgba(255,255,255,…)]`).
  Light temada da koyu kalıyor → en kritik fark.
- shadcn token'ları (`--background`, `--popover`, `--accent`…) varsayılan
  shadcn oklch değerlerinde; Notion'a göre koyu temada popover/editor çok koyu,
  light temada text çok koyu.
- BlockNote (`--bn-colors-*`) kendi editor surface'ını set ediyor; editor
  metni `#cececf`, Notion `#f0efed`.

## 5. Hedef token haritası (uygulanacak)

Mevcut token sistemini (shadcn + `--sidebar-*` + `--dark`) geliştirerek
Notion değerlerine çek:

- `--background`/`--foreground`: Notion `--c-bacPri`/`--c-texPri`.
- `--popover`/`--popover-foreground`: Notion `--c-popBac`/`--c-texPri`.
- `--secondary`/`--muted`/`--accent`: Notion `--c-bacSec`/`--c-bacInt`
  ve hover değerleri.
- `--muted-foreground`: Notion `--c-texSec`.
- `--border`/`--input`: Notion `--c-borPri`.
- `--ring`: Notion `--c-focSha` rengi (`#2383e2`).
- `--dark`: `#191919` (sayfa bg, dark).
- `--sidebar-*`: Notion sidebar token'ları (light + dark).
- Popup shadow token'ı: Notion `--c-shaSMThiOut` / `--c-shaMDPriOut`.
- `--accent` (shadcn) = hover/selected token'ı: light `#f3f3f2`
  (rgba(55,53,47,.06) blend), dark `rgba(255,255,255,.055)` — **düz renk
  (#262626) popup (#252525) üzerinde görünmez kalıyordu; Notion'un gerçek
  `--ca-staHov` değeri olan yarı-saydam beyaz kullanılmalı.**