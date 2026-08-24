# Self-hosting rehberi

> README kurulumun kısa yolunu verir. Bu dosya tam süreç, altyapı detayları ve
> ters proxy notları içindir.

## Docker Compose

**1.** Depoyu klonla ve env dosyanı oluştur:

```bash
cp .env.example .env
```

**2.** Secret'ları üret:

```bash
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -hex 32      # CONVEX_INSTANCE_SECRET
openssl rand -hex 16      # POSTGRES_PASSWORD / S3_SECRET_ACCESS_KEY
```

`APP_URL` ve `NEXT_PUBLIC_CONVEX_URL` değerlerini kullanacağın iki public hostname'e ayarla.

**3.** Stack'i başlat:

```bash
docker compose up -d --build
```

**4.** Convex admin key üret ve fonksiyonları gönder:

```bash
docker compose exec convex-backend ./generate_admin_key.sh
# anahtarı .env içine CONVEX_SELF_HOSTED_ADMIN_KEY olarak yapıştır, sonra:
docker compose up convex-deploy
```

`convex-deploy` servisi idempotenttir — her `docker compose up` ile yeniden çalışır
ve yalnızca gerçekten değişeni gönderir.

**5.** `APP_URL`'i aç, hesap oluştur, yazmaya başla.

## Volume'ler

| Volume | İçerik |
|---|---|
| `postgres_data` | Convex dokümanları + Better Auth kullanıcı/oturumları |
| `convex_data` | Convex backend çalışma durumu |
| `minio_data` | Yüklenen kapaklar, görseller ve dosyalar |

## Dokploy üzerinde dağıtım

1. **Compose servisi oluştur** (Provider: Git, Compose Path: `./docker-compose.yml`).
2. **`.env` içeriğini** servisin _Environment_ sekmesine yapıştır. En az:
   `APP_URL`, `NEXT_PUBLIC_CONVEX_URL`, `BETTER_AUTH_SECRET`, `POSTGRES_PASSWORD`,
   `CONVEX_INSTANCE_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
3. **İki domain ekle** (_Domains_):
   - `zotion.example.com` → servis `web`, container port `3000`
   - `convex.example.com` → servis `convex-backend`, container port `3210`

   İkisinde de HTTPS'i (Let's Encrypt) aç. Bunlar `APP_URL` ve
   `NEXT_PUBLIC_CONVEX_URL` ile eşleşmeli. İstersen `convex-dashboard` için
   `6791` portunda üçüncü bir domain ekle.
4. **Deploy et.** Sonra servis terminalinde `convex-backend` içinde
   `./generate_admin_key.sh` çalıştır, anahtarı `CONVEX_SELF_HOSTED_ADMIN_KEY`
   olarak koy ve yeniden deploy et ki `convex-deploy` fonksiyonları gönderebilsin.

### Ters proxy notları

- Convex domain'i **WebSocket upgrade**'lerine izin vermeli (Traefik varsayılan olarak veriyor).
- Birkaç MB'ı aşan yüklemeler başarısız oluyorsa proxy'nin body-size limitini ve
  `MAX_UPLOAD_SIZE` değerini yükselt.
- MinIO asla public değildir: dosyalar uygulama üzerinden `/api/files/<key>` ile akıtılır.
  Bu uç nokta erişim kontrolü yapar: dosyayı ya sahibi (oturumla) ya da yayınlanmış
  bir dokümana ait olduğu için herkes okuyabilir; ikisi de değilse 404 döner.

## Kimlik doğrulama akışı

Better Auth, oturum açmış kullanıcı için kısa ömürlü bir RS256 JWT üretir
(`GET /api/auth/token`). Convex bunu `<APP_URL>/.well-known/openid-configuration`
adresindeki JWKS'e karşı doğrular; `ctx.auth.getUserIdentity()` aynen çalışmaya
devam eder — `identity.subject` artık Better Auth kullanıcı id'sidir.

İki sonucu var:

- `APP_URL`, **Convex backend container'ından** erişilebilir olmalı.
- `APP_URL`'i değiştirmek mevcut token'ları geçersiz kılar (kullanıcılar tekrar
  giriş yapar), ama saklanan dokümanları asla etkilemez.

## Bilinen sınırlar

- Tablo görünümü text ve select/multi-select hücrelerini çizer. Number, checkbox
  ve date değerleri saklanır ve board kartlarında görünür, ancak tablo sütununda
  boş çıkar (`components/database/grid-cell.tsx`).
- Hesaplar arası paylaşım modeli yok. Bir doküman ya senindir ya da herkese salt
  okunur yayımlanmıştır.
