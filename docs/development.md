# Yerel geliştirme

Portlar ve duman testi için `docs/runbook.md`; galeri boru hattı için
`docs/screenshots.md`.

```bash
npm install
cp .env.example .env
npm run hooks:install   # ekran görüntüsü pre-commit hook'unu etkinleştirir

# yalnızca altyapı
docker compose up -d postgres minio minio-init convex-backend

# Convex fonksiyonlarını gönder (CONVEX_SELF_HOSTED_URL + admin key ister)
npm run convex:dev

# başka bir terminalde
npm run dev
```

Yerel çalıştırma için `APP_URL=http://localhost:3000`,
`NEXT_PUBLIC_CONVEX_URL=http://localhost:3210`,
`S3_ENDPOINT=http://localhost:9000` ayarla ve ilgili portları aç.

Better Auth tabloları sunucu ilk açılışta otomatik oluşturulur
(`AUTH_AUTO_MIGRATE=false` bunu kapatır).

## Script'ler

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Next.js geliştirme sunucusu |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Tip kontrolü |
| `npm run test:e2e` | Playwright uçtan uca testleri (`tests/e2e`) |
| `npm run seed:demo` | Ekran görüntülerinin alındığı iki demo çalışma alanını tohumlar |
| `npm run screenshots` | Tohumlar, `docs/screenshots/` içeriğini yeniler, iki README'yi de yazar |
| `npm run hooks:install` | Git'i `.githooks/` dizinine yönlendirir (klon başına bir kez) |
| `npm run convex:dev` | Convex fonksiyonlarını self-hosted backend'e gönderir, izleyerek |
| `npm run convex:deploy` | `convex deploy -y` |
