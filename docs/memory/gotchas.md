# Tuzaklar

> Bir şey **ikinci kez** zaman kaybettirdiyse buraya yaz. Tek seferlik hatalar buraya
> girmez. Her madde: belirti → sebep → ne yapmalı.
>
> Invariant seviyesindeki kurallar (`patch` sığ merge, public-before-auth sırası)
> `.claude/rules/project/convex.md`'de — burada tekrarlanmaz.

## Ortam / araçlar

### `.env` shell'e alınırken patlıyor
`CONVEX_SELF_HOSTED_ADMIN_KEY` içinde `|` var. **Tırnak içinde** olmalı; tırnaksız
`. ./.env` shell'i kırar. `.env` gitignored ve gerçek secret içeriyor.

### `api.<modül>` tip hatası veriyor
`convex/_generated/` git'e commitli. Yeni Convex modülü veya export eklendiğinde
`npm run convex:dev` / `npx convex deploy` ile regenerate edip `_generated/`'ı
**commit etmek şart**.

### `npx prettier --write "**/*"` devasa diff üretiyor
Dokunulmamış dosyalarda (özellikle `components/ui/*`) gereksiz churn yaratıyor.
Sadece değiştirilen dosyalarda çalıştır.

## Lint baseline

`npm run lint` **temiz değil** — 2026-08-24 itibarıyla 8 hata / 9 uyarı, hepsi
önceden var olan React-compiler kuralları:

| Kural | Adet | Dosyalar |
|---|---|---|
| `react-hooks/set-state-in-effect` | 7 | `useOrigin.tsx`, `mode-toggle.tsx`, `modal-provider.tsx`, `search-command.tsx`, `CoverImageModal.tsx`, `Navigation.tsx` |
| `react-hooks/exhaustive-deps` | 6 | `document-view.tsx`, `editor.tsx`, `toolbar.tsx`, `search-command.tsx` |
| `react-hooks/immutability`, `next/no-img-element`, `import/no-anonymous-default-export` | 4 | `single-image-dropzone.tsx`, `convex/auth.config.js`, `eslint.config.mjs` |

**Kural:** Yeni/değiştirilen dosyalar lint temiz olmalı. Bu baseline'ı düşürmek ayrı
bir iş — başka bir işin yan etkisi olarak düzeltme.

## Convex mutation'larında rekürsif gezinme

`convex/documents.ts`'te alt ağaç gezen üç yardımcı var (`recursiveArchive`,
`recursiveRestore`, `recursiveRemove`). Üçü de **`await` edilmek zorunda**: Convex
mutation handler'ı döndüğünde transaction kapanır, `await`siz bırakılan gezinmenin
kalan kısmı sessizce düşer. Bu ikisi 2026-08-25'e kadar `await`siz çağrılıyordu ve
`remove` hiç rekürsif değildi (yetim alt sayfalar); ikisi de düzeltildi — deseni
yeni koda taşıma.

## Deploy

Convex backend `APP_URL`'i kendi içinden çözebilmeli (JWKS için). Dokploy'da genelde
sorunsuz; değilse `docker-compose.yml`'deki hazır `extra_hosts` satırını aç.

## Ölü kod taraması

### "Adı başka dosyada geçiyor mu" kontrolünde envanter dosyalarını dışla
`.claude/ecc/install-state.json` (368 KB) kurulan **her** dosyanın adını listeliyordu;
ham grep ile referans arayınca 134 ölü adayın 134'ü birden "referanslı" göründü ve tarama
işe yaramaz sonuç verdi. Manifest/envanter/lock dosyaları çağrı değildir — referans
taramasında hariç tut. (O dosya artık silindi, ama desen tekrar eder.)

### Silme öncesi/sonrası aynı doğrulayıcıyı çalıştır
Vendor'lanmış script ağacında silme yapmadan önce bağımlılık kapanışını ölç, sildikten
sonra aynı ölçümü tekrarla ve **sayıların birebir aynı** olduğunu gör (23 kök / 53 modül /
0 eksik). Yalnızca "sonrası temiz" demek, baseline zaten kırıksa bir şey kanıtlamaz.

