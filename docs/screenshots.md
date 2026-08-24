# README ekran görüntüleri

> README'lerdeki galeri **üretilir**, elle yazılmaz. Bu dosya nasıl üretildiğini
> anlatır; README'lerin kendisinde bu bilgi yer almaz (okuyucuyu değil,
> katkı vereni ilgilendirir).

## Tek komut

```bash
npm run screenshots     # seed + yakalama + iki README'nin galeri bloğu
npm run hooks:install   # core.hooksPath -> .githooks (klon başına bir kez)
```

Tüm stack ayakta olmalı (`docs/runbook.md`): Postgres, MinIO, Convex backend ve
`npm run dev`. Kapalıysa kareler bir uyarıyla **atlanır**, commit'lenmiş görseller
korunur — commit asla altyapı yüzünden engellenmez.

## Parçalar

| Dosya | Sorumluluğu |
|---|---|
| `scripts/screenshots/shots.ts` | **Tek kaynak.** Hangi görünüm, hangi dil, hangi tema, hangi başlık/açıklama |
| `convex/seed.ts` | `demoWorkspace` internal mutation — demo içeriği (`en` / `tr`) |
| `scripts/seed-demo.mjs` | İki demo hesabını açar/girer, seed'i çalıştırır, oturum + id'leri `.screenshots/` altına yazar |
| `scripts/screenshots/capture.spec.ts` | Her kare için ayrı oturumlu context; 1920×1080 düzen, 2× raster, WebP |
| `playwright.screenshots.config.ts` | Ayrı config — `npm run test:e2e` kare üretmesin diye |
| `scripts/update-readme-gallery.mjs` | `README.md` ve `README.tr.md` içindeki `SCREENSHOTS:START/END` bloğunu yazar |
| `.githooks/pre-commit` | UI dosyası stage'lendiyse yakalamayı tekrarlar ve sonucu stage'ler |

## Kararlar ve gerekçeleri

- **Gerçek uygulama, fixture değil.** Kareler demo hesapla oturum açılmış gerçek
  uygulamadan alınır. İzole bileşen fixture'ları (`/test-fixtures/*`) stack'siz
  çalışırdı ama sidebar/navbar olmadan ürünün ne olduğunu göstermiyordu.
- **1920×1080 düzen, 2× raster.** Düzen sıradan bir masaüstü ekranının oranında
  ölçülür; 3840×2160 rasterize edilip WebP'ye kodlanır, böylece README genişliğinde
  küçültülünce yazı keskin kalır ve galerinin tamamı ~2 MB'ta durur.
- **İki hesap, iki dil.** `demo-en@` → `README.md`, `demo-tr@` → `README.tr.md`.
  Her README kendi dilinde içerik gösterir. Dil-bağımsız kareler (karşılama
  sayfası) bir kez çekilip ikisinde de kullanılır.
- **Bayt karşılaştırması.** Birebir aynı çıkan bir yakalama yeniden yazılmaz, yani
  değişmeyen görünümler diff üretmez.
- **Board kart sırası açıkça yazılır.** `viewCardOrder` kaydı olmayan kartlar
  `(order, _id)` ile sıralanır; `_id`'ler her seed'de değiştiği için kartlar yer
  değiştirir ve her çalıştırma yeni bir görsel üretirdi. Seed bu sırayı sabitler.
- **Tablo/board farklı property gösterir.** Tablo grid'i (`components/database/
  grid-cell.tsx`) bugün yalnızca text ve select/multiSelect hücrelerini çiziyor;
  board'un kendi renderer'ı hepsini çiziyor. Her view yalnızca gerçekten
  gösterebildiğini listeler — galeride boş hücre kalmaz.

## Yeni bir kare eklemek

`scripts/screenshots/shots.ts` içindeki `VIEWS` dizisine bir kayıt ekle: `group`,
`title`/`caption`, `titleTr`/`captionTr`, `path` (seed id'leri için `{token}`),
ve dil başına `waitFor` seçicisi. `npm run screenshots` gerisini halleder —
üretilen bloğu elle düzenleme, ilk `npm run screenshots` üstüne yazar.

## Kaçış yolu

```bash
ZOTION_SKIP_SCREENSHOTS=1 git commit ...
```

## Dikkat

`convex/seed.ts`, verilen `userId`'ye ait **tüm** dokümanları silip yeniden yazar.
Yalnızca `demo-en@zotion.local` / `demo-tr@zotion.local` hesaplarının id'leriyle
çağrılır; gerçek bir hesabın id'siyle çalıştırma.
