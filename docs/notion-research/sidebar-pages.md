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

---

Not: DnD nest-eşiği (tam olarak hangi drop bölgesi nest vs. reorder tetikliyor) pixel
düzeyinde net doğrulanamadı — genel davranış (nest edilebilirlik + toast metni) doğrulandı,
ama tam drop-zone sınırları "doğrulanmadı" sayılmalı.
