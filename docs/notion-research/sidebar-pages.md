# Notion araştırması — Sidebar + sayfa oluşturma + sayfa ağacı

> Kaynak: gerçek Notion web uygulamasında (app.notion.com) Playwright/Claude-in-Chrome ile
> canlı gözlem (2026-08-22). Sadece burada listelenen davranışlar doğrulanmıştır; tahmin
> içermez. Zotion karşılaştırması bu konuşmanın parity raporundadır — bu dosya sadece
> uzun ömürlü, doğrulanmış Notion davranışlarını kayıt altına alır.

## Sayfa oluşturma

- Sidebar bölüm başlığının (`Private` vb.) sağındaki `+` ikonu, o bölümün köküne **anında**
  yeni bir sayfa ekler ve otomatik olarak o sayfaya navigate eder. Yeni sayfa listenin
  **en üstünde** belirir (oluşturulma sırasına göre değil, en yeni en üstte).
- Yeni sayfa açıldığında imleç **otomatik olarak başlık alanına focus olur** — kullanıcı
  tıklamadan yazmaya başlayabilir.
- Başlık her tuş vuruşunda **canlı** olarak şuraya senkronize olur: sidebar satırı, tarayıcı
  sekmesi başlığı, URL slug'ı. Görünür bir "kaydediliyor" durumu yoktur.
- Yeni sayfanın varsayılan olarak ikonu/kapağı yoktur. Başlığın hemen üzerine hover
  yapıldığında `Add icon` / `Add cover` / `Add comment` hayalet butonları belirir.

## İkon davranışı

- `Add icon`'a tıklamak **anında rastgele bir emoji atar** ve aynı anda emoji seçiciyi açar.
  Seçici `Emoji` / `Icons` / `Upload` sekmeleri ve bir `Remove` seçeneği içerir.
  Seçilen emoji; sayfa başlığı, sidebar satırı ve breadcrumb ikonuna anında yayılır.

## Alt sayfa oluşturma

- Sidebar'da bir sayfa satırının üzerine gelindiğinde solda expand/collapse chevron'u,
  sağda `+` (alt sayfa ekle) ve `...` (diğer aksiyonlar) ikonları belirir.
- Satırdaki `+`'ya tıklamak yeni alt sayfayı **tam navigasyon değil, bir peek/preview modal**
  içinde açar: üstte "Add to: <ebeveyn>" breadcrumb'ı, arkada solgunlaşmış ebeveyn sayfası.
- Bu modal, sayfa **hâlâ başlıksız ve içeriksizken** (Escape ile) kapatılırsa, sayfa
  **sessizce silinir** — sidebar'da ebeveyn tekrar "No pages inside" boş durumuna döner.
- Modal kapatılmadan bir başlık girilirse sayfa kalıcı olur: sidebar'da ebeveynin altında
  girintili görünür VE ebeveyn sayfanın içeriğine bir `child_page` link bloğu eklenir.
- İlk alt sayfa oluşturulduğunda ebeveyn satırı sidebar'da **otomatik olarak genişler**
  (chevron elle tıklanmadan expanded duruma geçer).

## Expand/collapse ve seçili durum

- Sidebar satırındaki chevron sadece o dalı expand/collapse eder.
- Açık/seçili sayfa sidebar'da arka plan rengiyle vurgulanır; breadcrumb üzerinden
  navigasyon yapıldığında da bu vurgu senkronize kalır (bkz. Breadcrumb bölümü).
- Genişletilmiş ama içi boş bir ebeveyn için sidebar'da "No pages inside" satırı gösterilir.

## Diğer aksiyonlar menüsü (sidebar `...`)

Sırayla: Add to Favorites, Copy link, Duplicate (`Ctrl+D`), Rename (`Ctrl+Shift+R`),
Move to (`Ctrl+Shift+P`), Move to Trash, Turn into wiki, Open in new tab
(`Ctrl+Shift+Enter`), Open in side peek (`Alt+Click`); altta "Last edited by X" notu.

- `Alt+Click` bir sidebar satırını **side peek** (bölünmüş panel) içinde açar; ana görünüm
  değişmeden kalır, alt sayfa yan panelde görüntülenir.

## Sürükle-bırak

- Bir sayfa aynı seviyede sürüklenip bırakıldığında (satırın alt/orta bölgesine) hedef
  sayfanın **child'ı olacak şekilde nest edilebilir** — sadece sıralama değişmez.
- Nest sonucu oluşan taşımada ekranın altında "Moved X to Y · Visit · Undo" toast'ı
  belirir; Undo geri alır.

## Silme / Trash akışı

- "Move to Trash" (hem sidebar `...` hem sayfa içi `...` menüsünden) **onay penceresi
  göstermeden anında** çalışır.
- Görüntülenmekte olan sayfa trash'e taşınırsa uygulama otomatik olarak başka bir sayfaya
  yönlendirir (boş/silinmiş sayfada kalınmaz).
- Alt kısımda "Moved to Trash · Restore" toast'ı belirir (Restore = undo).
- Trash, tam sayfa değil **kayan bir popover**'dır: arama kutusu ("Search pages in Trash"),
  filtre çipleri (Last edited by / In / Teamspaces) ve alt bilgi notu:
  "Once a page has been in Trash for 30 days, it will be automatically deleted."
- Her trash satırında satır-içi Restore (↩) ve kalıcı-sil (🗑) ikonları vardır.
- Trash'ten geri yüklenen (restore) bir sayfa, eski konumuna değil, ait olduğu listenin
  **en sonuna** eklenir.

## Breadcrumb ↔ sidebar ilişkisi

- Sayfa üstündeki breadcrumb ebeveyn zincirini gösterir (örn. "Main Hub / Alt Sayfa").
- Breadcrumb'daki bir segmente tıklamak hem o sayfaya navigate eder hem de sidebar'daki
  karşılık gelen satırı seçili/vurgulu hale getirir — iki UI birbiriyle senkronize kalır.

## Sayfa içi `...` menüsü (üst sağ, sidebar menüsünden farklı ve daha geniş)

Font seçimi (Default/Serif/Mono), Copy link, Copy page contents, Duplicate, Move to,
Move to Trash, Small text / Full width / Lock page toggle'ları, Use with AI, Suggest
edits, Translate, Undo, Import, Export, Turn into wiki, Updates & analytics,
Version history.

## Ölçülen sidebar metrikleri (2026-08-24, dark tema)

Gerçek Notion'da `getBoundingClientRect()` + `getComputedStyle()` ile ölçüldü.
Zotion farkları ve düzeltmeleri bu konuşmanın parity raporundadır.

### Container
- Genişlik: **270px** (varsayılan). Resize sınırları: **min 270, max 600**.
  Resize ile 270'in altına inilemez; genişlik reload sonrası korunur.
- bg `#202020`, border YOK — sağ kenar `inset 0 -1px 0 0 rgb(44,44,43)` shadow ile.
- Collapse transition: `width 0.2s`.
- İçerik üst padding 6px.

### Dikey anatomi (dark, ölçülen y'ler)
- Workspace switcher: y=6, h=32 (avatar 20x20, text 14px)
- Nav tabları (Home/Chat/Meetings): y=52, h=32, pill radius 9999, gap 2px.
  Aktif pill bg `rgba(255,255,255,.07)`, text `#f0efed`; pasif text `#ada9a3`.
- Private section header: y=98, h=30, padding-x 8, radius 6. Label 12px/500/lh-12,
  renk text-tertiary (dark `#7d7a75`, light `#a19e99`).
- Tree rows: y=129'dan başlar, **h=30 (min 27), padding 5px 8px, radius 6,
  gap 1px**, text 14px/500/lh-21.

### Satır state'leri
- Default: bg transparent, text `#bcbab6` (dark) / `#5f5e59` (light).
- Aktif (aria-current=page): bg `rgba(255,255,255,.055)`, text `#f0efed`.
- Hover: bg `rgba(255,255,255,.055)` — aktif ile aynı güçte.
- Action ikonları (chevron, `+`, `...`) hover'da visibility ile belirir.

### Satır içi ölçüler
- İkon slotu: 22x18, margin-right 8. İndent: **seviye başına 8px**.
  Level 0 text x=38, level 1 text x=46 (row-relative).
- Chevron: SVG 12x12, hit 20x20 radius **4px**, fill icon-tertiary
  (dark `#7d7a75`, light `#ada9a3`), transition transform 200ms, kapalıyken -90°.
- `+` (Add a page inside): SVG 16x16, hit 20x20 radius 4, fill `#ada9a3`.
- `...` (More): SVG 16x16, hit 20x20 radius 4, fill `#ada9a3`.
- Action hover: hit alanı bg `rgba(255,255,255,.055)`.

### Notion'da ölçülen → Zotion'da düzeltilen farklar
- Varsayılan genişlik 240 → **270**; min 180 → **270**; max 480 → **600**.
- Nav → Private arası dikey boşluk 20px → **14px** (Private header y=98,
  ilk row y=129 — Notion ile birebir).
- Section label rengi: dark `#9b9b9b`→`#7d7a75`, light `#91918e`→`#a19e99`.
- Chevron rengi `#ada9a3` → icon-tertiary (`#7d7a75` dark / `#ada9a3` light),
  radius 9999 → **4px**.
- `+` / `...` butonları radius 9999 → **4px**; `...` SVG 12x12 → **16x16**.
- Home nav pill'inden ring kaldırıldı (Notion pill'lerinde ring yok).
- Collapse transition `all 300ms` → **`width 200ms`** (Notion `width 0.2s`).

### Uzun başlık / ellipsis davranışı (2026-08-24, ölçüldü)

Uzun başlıklı sayfada (satır 254px, dark):
- **Rest**: aksiyon butonları yer kaplamaz (1px clipped / absolute) → başlık satırın
  tam genişliğine kadar uzanır (sağ kenar x=246) ve **en sağda ellipsis** alır.
- **Hover**: `+`/`...` butonları görünür ve yer kaplar (Add x=204, More x=226) →
  başlık x=201'e kadar daralır, orada ellipsis. Butonlar daralmış başlığın sağına biner.
- Başlık element: `flex:1 1 auto; min-width:0; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis; font-weight:500`. Satır `min-width:max-content` değil —
  react-arborist bunu inline `min-width:max-content` ile dayatır, o yüzden Zotion'da
  satırı `min-width:0 !important` ile sabitlemek gerekir (aksi halde uzun başlık
  satırı yüzlerce px'e şişirir ve ağaçta yatay scrollbar belirir).
- Zotion düzeltmesi: aksiyon container'ı rest'te `w-0 overflow-hidden` (visibility:hidden
  layout'tan düşmez), hover'da `group-hover:w-auto` → rest'te başlık sağ kenara kadar
  (242), hover'da 200'e daralır (Notion 246/201 ile aynı davranış).

---

Not: DnD nest-eşiği (tam olarak hangi drop bölgesi nest vs. reorder tetikliyor) pixel
düzeyinde net doğrulanamadı — genel davranış (nest edilebilirlik + toast metni) doğrulandı,
ama tam drop-zone sınırları "doğrulanmadı" sayılmalı.
