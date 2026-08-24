# Lokal çalıştırma runbook

> Kurulum/deploy adımlarının tamamı `README.md`'de. Bu dosya günlük geliştirme
> döngüsü ve duman testi için kısa referans.

## Ayağa kaldırma

```bash
# 1) Altyapı (veriler named volume'larda kalıcı)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d \
  postgres minio minio-init convex-backend convex-dashboard

# 2) Convex fonksiyonlarını self-hosted backend'e it (ayrı terminal)
npm run convex:dev        # .env'den CONVEX_SELF_HOSTED_URL + ADMIN_KEY okur

# 3) Uygulama (ayrı terminal)
npm run dev               # http://localhost:3000
```

## Portlar

| Servis | Port |
|---|---|
| Next.js app | 3000 |
| Convex backend | 3210 |
| Convex dashboard | 6791 |
| MinIO console | 9001 |
| Postgres | 55432 |

## Doğrulama

```bash
npx tsc --noEmit      # temiz olmalı
npm run build         # temiz olmalı
npm run lint          # baseline: docs/memory/gotchas.md
npm run test:e2e      # playwright, tests/e2e/*.spec.ts
```

## Uçtan uca duman testi

kayıt ol → not oluştur → cover yükle (MinIO console'da `zotion` bucket'ında görünmeli)
→ publish → **gizli pencerede** `/preview/<id>` açılmalı (anonim erişim çalışıyor mu).
