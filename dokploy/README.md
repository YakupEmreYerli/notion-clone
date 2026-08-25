# Dokploy şablonu — hazırlık

Bu dizin, Zotion'ı [dokploy/templates](https://github.com/Dokploy/templates)
deposuna göndermek için hazırlanan blueprint'i tutar. Buradaki
`blueprints/zotion/` klasörü, o deponun fork'undaki `blueprints/` altına
**olduğu gibi** kopyalanacak şekilde yazılmıştır.

Depoda tutulmasının sebebi: şablon, Zotion'ın kendi `Dockerfile`'ı ve
`docker-compose.yml`'iyle birlikte değişmek zorunda. Ayrı bir fork'ta unutulup
sürüklenmesin.

## Durum

| Parça | Durum |
|---|---|
| `docker-compose.yml` | ✅ taslak — `ports` yok, `container_name` yok, ağ tanımı yok |
| `template.toml` | ✅ taslak — iki domain, üretilen secret'lar, postgres init mount'u |
| `meta.json` | ✅ taslak |
| `zotion.svg` | ✅ `public/logo.svg` kopyası |
| **Yayımlanmış imajlar** | ❌ **eksik — asıl blokaj** |
| Convex admin key otomasyonu | ❌ `convex-cli` imajı değişmeli |
| Gerçek instance'ta test | ❌ yapılmadı |

## Kapatılması gereken iki blokaj

### 1. İmajlar yayımlanmalı

Dokploy şablonları `image:` kullanır, `build:` değil. İki imaj gerekiyor:

- `ghcr.io/yakupemreyerli/zotion` — `Dockerfile` `runner` hedefi
- `ghcr.io/yakupemreyerli/zotion-convex-cli` — `convex-cli` hedefi

Depoda **hiç GitHub Actions workflow'u yok**; ikisini etikete basan bir
workflow yazılması gerekiyor.

### 2. Convex admin key

`convex-deploy`, backend'e push edebilmek için admin key ister. Ölçüldü:

- Anahtar `generate_key <INSTANCE_NAME> <INSTANCE_SECRET>` ile üretiliyor.
- **Deterministik değil** — aynı girdiyle iki farklı anahtar çıkıyor; backend
  üretilen her geçerli anahtarı kabul ediyor. Yani şablonda önceden
  hesaplanamaz, ama deploy anında üretilebilir.
- `generate_key` convex-backend imajının içinde ve o imaj **Ubuntu 24.04**
  tabanlı (glibc). Bizim `convex-cli` hedefimiz `node:22-alpine` (musl) —
  binary olduğu gibi çalışmaz.

Yapılacak: `convex-cli` hedefi Debian tabanlı bir imaja alınıp `generate_key`
(ve `read_credentials.sh`) convex-backend imajından çok aşamalı kopyalanacak;
`docker/convex-deploy.sh` anahtarı elle beklemek yerine kendisi üretecek.
Böylece şablonda elle adım kalmaz.

## Ayrıca doğrulanacak

- `template.toml` şeması: `env` dizisinin `[config]` altındaki yeri ve
  `${...}` yardımcıları, hedef depodaki
  `node build-scripts/generate-meta.js --check` ile doğrulanmalı.
- İki domain gerçekten şart mı: tarayıcı Convex backend'ine doğrudan bağlanıyor,
  bu yüzden `NEXT_PUBLIC_CONVEX_URL` dışarıdan erişilebilir olmalı. Zotion bu
  değeri **çalışma anında** okuduğu için tek imaj her domain'e hizmet edebiliyor
  (`lib/env.ts`) — şablon için doğru tasarım zaten mevcut.
- Postgres init script'i şu an mount olarak gömülü; deponun kendi
  `docker/postgres-init.sh` dosyasıyla aynı kalmalı.
