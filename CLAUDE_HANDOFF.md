# CLAUDE_HANDOFF.md

Bu dosya, çalışmayı başka bir Claude Code oturumunda kaldığı yerden sürdürmek için yazıldı.
Son güncelleme: 2026-08-22.

---

## 1. Genel durum — iki ayrı iş var

| # | İş | Durum |
|---|---|---|
| **A** | Zotion'ı tamamen self-host edilebilir hale getirmek (Clerk→Better Auth, Convex Cloud→self-hosted Convex, EdgeStore→MinIO, Docker/Dokploy) | ✅ **Bitti ve uçtan uca doğrulandı. Ama HİÇ COMMIT EDİLMEDİ.** |
| **B** | Notion tarzı **Database (tablo)** özelliği eklemek | 📋 **Sadece plan var. Kullanıcı henüz onaylamadı. Tek satır kod yazılmadı.** |

> ⚠️ **Kritik:** B işine başlamadan önce kullanıcıdan açık onay al. Son mesajda plan sunuldu, kullanıcı "başla" demedi — limiti bittiği için oturum kesildi.

---

## 2. İş A — Self-host geçişi (TAMAMLANDI)

### Hedef
Harici SaaS bağımlılığı olmadan kendi VPS'inde (Dokploy + reverse proxy) çalışan bir Notion clone. Mevcut UI/UX ve tüm çalışan özellikler (editör, nested pages, drag-drop, search, trash, cover, icon, publish) korunacaktı — korundu.

### Yapılan mimari değişiklikler

**Clerk → Better Auth** (Postgres destekli, email+parola)
- Convex köprüsü **JWT üzerinden**: Better Auth `jwt` plugin'i **RS256** token üretiyor, Convex `<APP_URL>/.well-known/openid-configuration` → JWKS ile doğruluyor.
- `convex/documents.ts` içindeki `identity.subject` mantığı **hiç değişmedi** — sadece userId kaynağı Clerk'ten Better Auth'a geçti.
- Clerk modal'ları yerine mevcut shadcn Dialog'larla `AuthModal` (giriş/kayıt) + `AccountModal` (isim/parola değiştirme).
- Auth tabloları sunucu ilk açılışta `instrumentation.ts` ile **otomatik migrate** ediliyor (`AUTH_AUTO_MIGRATE=false` ile kapatılabilir).

**EdgeStore → MinIO/S3**
- Dosyalar **private bucket**'ta; tarayıcıya `/api/files/<key>` üzerinden stream ediliyor → MinIO dışarı açılmıyor, publish/preview çalışmaya devam ediyor.
- URL'ler **relative** saklanıyor (`/api/files/...`) → domain değişince eski dosyalar bozulmuyor.

**Altyapı**
- `Dockerfile` (multi-stage: deps → builder → **convex-cli** → runner), `output: "standalone"`.
- `docker-compose.yml`: postgres / convex-backend / convex-dashboard / minio / minio-init / web + idempotent `convex-deploy` job.
- `docker-compose.dev.yml`: lokal geliştirme override'ı (portları publish eder, convex-backend'i host network'e alır).
- `NEXT_PUBLIC_CONVEX_URL` **build'e gömülmüyor**, runtime'da okunuyor (`lib/env.ts` + root layout'ta `export const dynamic = "force-dynamic"`) → aynı image her domaine deploy edilebiliyor.

### Değiştirilen/eklenen dosyalar

**Yeni (untracked):**
```
lib/auth.ts  lib/auth-client.ts  lib/auth-migrate.ts  lib/env.ts  lib/s3.ts  lib/storage.ts
app/api/auth/[...all]/route.ts   app/api/files/route.ts   app/api/files/[...key]/route.ts
app/api/oidc-config/route.ts     instrumentation.ts
components/modals/AuthModal.tsx  components/modals/AccountModal.tsx  components/user-button.tsx
hooks/useAuthModal.tsx           hooks/useAccountModal.tsx
Dockerfile  .dockerignore  docker-compose.yml  docker-compose.dev.yml
docker/convex-deploy.sh  docker/postgres-init.sh
eslint.config.mjs
```

**Değiştirilen (tracked):**
```
.env.example  .gitignore  README.md  package.json  next.config.mjs  proxy.ts
convex/auth.config.js  app/layout.tsx  app/globals.css
components/providers/convex-provider.tsx  components/providers/modal-provider.tsx
components/cover.tsx  components/editor.tsx  components/search-command.tsx
components/modals/CoverImageModal.tsx
app/(landing)/_components/Heading.tsx  app/(landing)/_components/Navbar.tsx
app/(main)/(routes)/documents/page.tsx  app/(main)/_components/TrashBox.tsx
app/(main)/_components/UserItem.tsx
```

**Silinen:** `lib/edgestore.ts`, `app/api/edgestore/[...edgestore]/route.ts`, `.eslintrc.json`, `.clerk/`

**Kaldırılan bağımlılıklar:** `@clerk/nextjs`, `@clerk/themes`, `@edgestore/react`, `@edgestore/server`, `zod`
**Eklenen:** `better-auth`, `pg`, `@aws-sdk/client-s3`, `@types/pg`

> `AGENTS.md` ve `CLAUDE.md` untracked görünüyor ama **bu çalışmaya ait değil** — oturum başında da untracked'di (`next dev` tarafından üretiliyor).

### Doğrulanmış (gerçek stack ile test edildi)
- Kayıt → JWT (`alg=RS256`, `iss=APP_URL`, `aud=convex`) → self-hosted Convex mutation/query **kabul edildi**; auth'suz istek "Not authenticated" ile reddedildi.
- Upload/serve/delete; yetkisiz upload 401, yetkisiz delete 401, path traversal 404.
- Cover PNG'si `next/image` optimizer'ından 200.
- Doküman oluştur → cover ata → publish → **çerezsiz** `/preview/<id>` 200.
- Docker image build edilip çalıştırıldı; `convex-deploy` servisi fonksiyonları push etti; `docker compose config` geçerli.
- `npm run build` ve `npx tsc --noEmit` temiz.

### İş A'da kalan tek şey
**Commit yok.** `git status` tamamen kirli. Yeni oturumda ilk iş: değişiklikleri gözden geçirip commit'lemek (kullanıcı onayıyla — repo `master` üzerinde, önce branch açmak gerekebilir).

---

## 3. İş B — Database özelliği (PLAN VAR, ONAY YOK)

### Plan dosyası
`/home/yakup/.claude2/plans/ok-g-zel-bir-plan-quirky-orbit.md` — **tam ve detaylı**. Aşağısı sadece özet; uygulamaya geçmeden önce o dosyayı oku.

### Kullanıcının açık kapsam kararları (genişletme!)
1. **Full-page database** — sidebar'da normal sayfa gibi duran, açılınca editör yerine tablo gösteren yeni doküman türü. Inline BlockNote bloğu **değil**.
2. **Sadece Table view** — "excel gibi tablo olsa yeter". Board/Calendar/Gallery **yok**, view-switcher soyutlaması **yok**.
3. **Property tipleri:** **Text, Select, Multi-select** kesin. Number/Checkbox/Date/URL M6'da **opsiyonel** (kullanıcı veto edebilir).
4. **Satırlar sadece veri** — satır bir doküman **değil**, kendi sayfası yok.

### Şema özeti
- `documents`'a `type: v.optional(v.union(v.literal("page"), v.literal("database")))` — optional, migration gerektirmez.
- `databaseProperties` (databaseId, userId, name, type, order:float, width, options[{id,label,color}], isTitle)
- `databaseRows` (databaseId, userId, order:float, `cells: v.record(v.id("databaseProperties"), <union>)`)
- Tek index: `by_database_order` (["databaseId","order"]).

### Aşamalar
- **M1** Şema + `convex/lib/*` + `convex/databases.ts` + `documents.create`'e `type` + **cascade silme** + Navigation "New database" + `page.tsx` dallanması + text hücreli grid
- **M2** Sütun yönetimi (rename/tip/sil/sırala/genişlik)
- **M3** **Select & Multi-select** ← kullanıcının asıl istediği
- **M4** Excel klavye navigasyonu + satır sürükleme
- **M5** `duplicate` derin kopya + `/preview` salt-okunur + ikonlar + `Menu.tsx` koşulları
- **M6** Ek tipler (opsiyonel)

---

## 4. Önemli kararlar ve gerekçeleri

**İş A**
- **Relative dosya URL'i** (`/api/files/...`) — domain değişince eski cover/görseller bozulmasın. `lib/storage.ts:isFileUrl` hem `http(s)` hem relative kabul eder; `isManagedFileUrl` sadece relative (yani sadece bizim silebileceklerimiz).
- **Dosyalar private + app üzerinden stream** — MinIO'yu public etmemek için. Bedeli: bant genişliği Next üzerinden geçer.
- **RS256** seçildi (Better Auth default'u EdDSA) — Convex'in OIDC doğrulayıcısıyla uyum için.
- **OIDC discovery dokümanı elle yazıldı** (`app/api/oidc-config/route.ts` + `next.config.mjs` rewrite) — Better Auth'un `jwt` plugin'i discovery doc sunmuyor, sadece `/jwks`.
- **Postgres host portu 55432** — 5432'yi kullanıcının başka projesi (`opencut-ai`) kullanıyor.
- **`POSTGRES_DB=postgres`** — Convex `CONVEX_INSTANCE_NAME` adıyla kendi DB'sini yaratıyor, çakışmasın diye bootstrap DB ayrı.

**İş B (plan kararları)**
- **Hücreler property `_id` ile anahtarlanır**, ad ile değil → sütun rename'i sıfır satır yazması.
- **Hücrede option `id` saklanır**, label değil → option rename/recolor O(1).
- **Fractional (float) ordering** — mevcut `documents.reorder` her kardeşi yeniden yazıyor (O(n)); satırlar için kopyalanmayacak.
- **`getSchema` ve `getRows` ayrı sorgu** — birleşik olsaydı her hücre düzenlemesi sütun tanımlarını geçersiz kılar ve açık select popover'ını kapatırdı.
- **Renk *token* adı saklanır** ("blue"), Tailwind class string'i değil — Tailwind v4 dinamik class göremiyor.
- **CSS grid**, `<table>` değil → `npx shadcn add table` gerekmiyor.

---

## 5. Çalıştırılması gereken kontroller

```bash
# Lokal altyapı (veriler named volume'larda kalıcı)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d \
  postgres minio minio-init convex-backend convex-dashboard
npm run dev                     # http://localhost:3000

# Convex fonksiyonlarını self-hosted backend'e it
npx convex deploy -y            # .env'den CONVEX_SELF_HOSTED_URL + ADMIN_KEY okur

# Kontroller
npx tsc --noEmit                # temiz olmalı
npm run build                   # temiz olmalı
npm run lint                    # aşağıdaki nota bak
```

**Servisler:** app `:3000` · Convex `:3210` · Convex dashboard `:6791` · MinIO console `:9001` · Postgres `:55432`

**Uçtan uca duman testi:** kayıt ol → not oluştur → cover yükle (MinIO console'da `zotion` bucket'ında görünmeli) → publish → **gizli pencerede** `/preview/<id>` açılmalı.

---

## 6. Dikkat edilmesi gereken noktalar

1. **`.env` gitignored ve gerçek secret içeriyor** (lokal için üretildi). `CONVEX_SELF_HOSTED_ADMIN_KEY` **tırnak içinde** olmalı — içinde `|` var, tırnaksız `. ./.env` ile shell'e alınca patlar.
2. **`convex/_generated/` git'e commitli.** Yeni bir Convex modülü (`convex/databases.ts`) eklendiğinde `npx convex deploy` / `npm run convex:dev` ile regenerate edip **`_generated/`'ı commit etmek şart**, yoksa `api.databases` tip hatası verir.
3. **`documents.getById` (`convex/documents.ts:244`) public dal içeriyor** — yayınlanmış dokümanı auth kontrolünden **önce** döner. Yeni okuma sorguları bu sırayı taşımazsa `/preview` anonim ziyaretçide patlar.
4. **`ctx.db.patch` sığ merge yapar.** `patch({ cells: {...} })` `cells`'i komple değiştirir → tek hücre güncellemesi oku-değiştir-yaz olmalı.
5. **`npm run lint` 16 adet önceden var olan hata veriyor** (Next 16'nın yeni React-compiler kuralları: `Navigation.tsx`, `DocumentList.tsx`, `toolbar.tsx`, `useOrigin.tsx`, `mode-toggle.tsx` vb.). Bunlar **bu çalışmaya ait değil** ve kapsam dışı bırakıldı. Eklenen yeni dosyalar lint temiz — öyle kalmalı.
6. **`recursiveArchive`/`recursiveRestore` `await` edilmeden çağrılıyor** (`documents.ts:47`, `:190`) — latent bug, bilinçli olarak dokunulmadı. Yeni kodda tekrarlama.
7. **`documents.remove` rekürsif değil** — çocukları yetim bırakıyor. Mevcut eksik; database cascade'i eklerken bunu düzeltmeye çalışma (ayrı iş).
8. **Convex backend `APP_URL`'i kendi içinden çözebilmeli** (JWKS için). Dokploy'da genelde sorunsuz; değilse `docker-compose.yml`'de hazır bekleyen `extra_hosts` satırını aç.
9. **Prettier çalıştırırken dikkat** — `npx prettier --write "**/*"` dokunulmamış dosyalarda (özellikle `components/ui/*`) gereksiz churn üretiyor. Sadece değiştirilen dosyalarda çalıştır.
10. **Repo `master` üzerinde ve hiç commit yok.** Commit/push öncesi kullanıcıya sor; muhtemelen önce feature branch açılmalı.
