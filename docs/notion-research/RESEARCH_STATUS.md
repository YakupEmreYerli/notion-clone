# Notion parity araştırması — durum

> Bu dosya, çok session'a yayılan Notion↔Zotion parity çalışmasının devam noktasıdır.
> Yeni bir session başladığında önce bunu oku.

## Son güncelleme

2026-08-23 — sidebar + sayfa ağacı alanı tamamlandı ve doğrulandı.

## Tamamlanan alanlar

### 1. Sidebar + page tree — TAMAMLANDI

Kaynak: `docs/notion-research/sidebar-pages.md` (2026-08-22 tarihli, gerçek Notion
gözlemi). Bu session'dan önceki bir session'da büyük ölçüde uygulanmıştı (uncommitted
durumda bulundu); bu session bunu doğruladı ve kalan iki farkı kapattı.

Uygulanmış olan (önceki session, bu session'da doğrulandı):
- Breadcrumb component'i (`app/(main)/_components/Breadcrumb.tsx`) — ata zinciri,
  tıklanabilir, sidebar ile route üzerinden senkron.
- Sidebar ağacı için tek merkezi `DndContext` (`hooks/useSidebarDragAndDrop.tsx`,
  `lib/sidebarDnd.ts`) — üst/alt %30 = reorder, orta %40 = nest (cross-level taşıma),
  nest sonucunda "Page moved · Undo" toast'ı.
- Alt sayfa oluşturma artık peek modal'da açılıyor (`pendingEmpty: true`) ve
  başlıksız+içeriksiz kapatılırsa sessizce siliniyor (`PeekModal.tsx`).
- İlk alt sayfa oluşturulduğunda ebeveyn sidebar'da otomatik expand oluyor.
- Başlık her tuş vuruşunda sidebar'a canlı yansıyor (`hooks/useLiveTitleDrafts.tsx`) —
  backend yazımı hâlâ debounce'lu, sadece sidebar'ın GÖSTERDİĞİ değer anlık.
- Alt+Click ile side peek (`DocumentList.tsx: onRedirect`).
- Move to Trash anında (onay yok), arşivlenen sayfa görüntüleniyorsa otomatik
  başka sayfaya yönlendirme + "çöp kutusunda" bandının navigasyon bitene kadar
  gizlenmesi (`hooks/useArchivingDoc.tsx`).
- Trash popover'ı: arama, "Trash is empty", 30 gün sonra otomatik silinme notu.
- 30 günlük trash retention gerçekten uygulanıyor: `convex/documents.ts:
  purgeExpiredTrash` + `convex/crons.ts` (günlük).

Bu session'da eklenen iki parity düzeltmesi:
- **Restore → listenin sonuna eklenir** (Notion'da doğrulanan davranış, önceden
  uygulanmamıştı): `convex/documents.ts: restore` artık hedef ebeveynin
  kardeşleri arasında en yüksek `order` + 1 değeriyle patch ediyor, eski
  `order` değerini korumak yerine.
- **Sidebar `...` menü sırası**: Notion'da doğrulanan sıra "Duplicate, Rename,
  Move to..." iken Zotion'da "Rename, Move to, Duplicate" idi — sıra düzeltildi
  (`app/(main)/_components/Item.tsx`).

Doğrulama bu session'da:
- `npx tsc --noEmit` → temiz.
- `npm run lint` → dokunulan dosyalarda (`Item.tsx`, `convex/documents.ts`) hata yok.
  Repo genelinde 18 pre-existing lint hatası var (ör. `Navigation.tsx:83` "collapse
  accessed before declared") — bunlar bu session'dan ÖNCE de `master`'da mevcuttu,
  sidebar parity çalışmasıyla ilgisiz, kapsam dışı bırakıldı.
- `npm run build` → başarılı (production build).
- `npx convex deploy -y` → yerelde zaten çalışan self-hosted backend'e (native
  `convex-local-backend` process + `next dev`, bu makinede session'dan bağımsız
  sürekli çalışıyor) başarıyla push edildi.
- **Canlı browser doğrulaması YAPILAMADI**: `/documents` route'u proxy tarafından
  login sayfasına yönlendirdi, oturum açık değildi. Yeni hesap oluşturmak
  (Join Zotion) benim tarafımdan yapılmaması gereken bir aksiyon (hesap
  oluşturma / kimlik bilgisi girme — izin gerektiren/yasak eylemler listesinde).
  Kullanıcı isterse kendi hesabıyla giriş yapıp restore-sona-ekleme ve menü
  sırası değişikliklerini gözle doğrulayabilir.

Doğrulanmamış kalan detay (sidebar-pages.md'de zaten not edilmiş):
- DnD nest eşiğinin tam pixel sınırları (üst/alt %30 vs orta %40 heuristiği
  makul ama Notion'da pixel-hassasiyetinde doğrulanmadı).

Kapsam dışı bırakılan (P2/P3, ayrı bir "interaction-patterns" geçişinde ele alınmalı):
- Sidebar `...` menüsündeki kısayol etiketleri (Ctrl+D, Ctrl+Shift+R,
  Ctrl+Shift+P, Ctrl+Shift+Enter) hiç gösterilmiyor ve gerçek kısayollar
  bağlı değil — Notion'da bunlar var. Global kısayol sistemi Zotion'da henüz yok.
- "Turn into wiki" menü öğesi yok — Zotion'da wiki kavramı hiç yok, bilinçli
  kapsam dışı (yarım implementasyon yapılmadı).

## Sırada

**2. Page creation + page header + navigation** — henüz başlanmadı.
Bkz. görev talimatındaki bölüm 2 (title initial focus, Add icon/cover, share,
page ... menüsü, page width, font, lock, duplicate/move, open in new tab,
side/center/full peek, breadcrumb, title↔sidebar↔tab senkronu).
Kayıt hedefi: `docs/notion-research/page-header-navigation.md`.

## Önemli implementasyon kararları

- Sidebar DnD tamamen dnd-kit üzerinde, tek `DndContext` (Navigation.tsx) — her
  seviye kendi `SortableContext`'i (`lib/sidebarDnd.ts: toContainerId`).
- Reorder mutation'ı (`convex/documents.ts: reorder`) TÜM kardeşleri 0..n-1
  olarak yeniden numaralandırıyor (fractional order'dan bilinçli sapma —
  `.claude/rules/project/convex.md`'de zaten belgeli, sidebar ağacı küçük
  olduğu için kabul edilebilir).
- Restore'daki yeni "sona ekle" mantığı da aynı `order` alanını kullanıyor ama
  reorder'ın normalize ettiği 0..n-1 aralığının dışına (max+1) çıkabilir —
  sorun değil, sıralama karşılaştırmalı olduğu için; bir sonraki `reorder`
  çağrısı zaten normalize eder.

## Genel ortam notları (sonraki session için)

- Yerel dev backend (`convex-local-backend` native process, port 3210/3211) ve
  `next dev` (port 3000) bu makinede session'dan BAĞIMSIZ sürekli çalışıyor
  görünüyor — `docker compose up` ile YENİDEN başlatmaya gerek yok, hatta
  `docker-compose.dev.yml`'deki host portları (9000, 9001, 55432, 3210) zaten
  dolu olduğu için compose ile paralel başlatma ÇAKIŞIR. Convex fonksiyon
  değişikliği yapıldıysa sadece `npx convex deploy -y` (env `.env` +
  `.env.local`'dan `source` edilerek) yeterli.
- Kalıcı bir "doğrulanmış test kullanıcısı" oturumu/çerezi bu ortamda hazır
  değil — canlı UI doğrulaması için kullanıcının kendi hesabıyla giriş yapması
  ya da bana test kimlik bilgisi vermesi gerekiyor.
