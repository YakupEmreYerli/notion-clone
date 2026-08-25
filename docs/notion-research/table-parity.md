# Notion table (database) yüzeyi — ölçüm kaydı

> **Gerçek Notion'da (app.notion.com, giriş yapılmış oturum) `getComputedStyle()`
> + `getBoundingClientRect()` ile ölçüldü. Tahmin yok.**
> `theme-parity.md` ve `sidebar-pages.md` ile aynı disiplin.
>
> Ölçüm tarihi: 2026-08-25 · Yöntem: Playwright CDP (headed Chromium,
> kullanıcının kendi oturumu), `.notion-table-view` üzerinde, açık + koyu tema.

## Neden bu dosya var

Tablo yüzeyi daha önce hiç ölçülmemişti; değerler Notion'ın "bilinen"
token'larından ve bir ekran görüntüsünden **çıkarsanıyordu**. Çıkarsamaların
yarısı ölçümle yanlış çıktı (aşağıda tablo).

## Ölçülen değerler

Tema-bağımsız olanlar tek sütun; farklı olanlar ayrı.

### Satır ve hücre

| Şey | Açık tema | Koyu tema |
|---|---|---|
| Veri hücresi yüksekliği | **37px** (36px içerik + 1px alt kenarlık) | aynı |
| Hücre kenarlığı (alt **ve** sağ) | `1px solid rgba(42, 28, 0, 0.07)` | `1px solid rgba(255, 255, 243, 0.082)` |
| Hücre metni | `16px` / `line-height: 24px` | aynı |
| Hücre metin rengi | `rgb(44, 44, 43)` | `rgb(240, 239, 237)` |
| Hücre arka planı | `rgba(0,0,0,0)` | aynı |
| Hücre `border-radius` | `0px` | aynı |
| Sayfa arka planı | `rgb(255,255,255)` | `rgb(25, 25, 25)` |

### Başlık satırı

| Şey | Açık tema | Koyu tema |
|---|---|---|
| Yükseklik | **36px** | aynı |
| Arka plan | `rgba(0,0,0,0)` — **kendi dolgusu YOK** | aynı |
| Kenarlık | yok (`0px none`) | aynı |
| Metin rengi | `rgb(125, 122, 117)` | `rgb(173, 169, 163)` |
| Font | `14px` / `font-weight: 400` | aynı |

Not: bu iki renk Zotion'ın mevcut `--muted-foreground` token'ıyla **birebir
aynı** (`#7d7a75` / `#ada9a3`) — `theme-parity.md`'de zaten doğru ölçülmüş.

### Satır hover

**Yok.** Fare satırın üzerindeyken satır ve hücrenin `backgroundColor` değeri
hâlâ `rgba(0,0,0,0)`. Notion table view'da satır hover tint'i uygulamıyor.

### Seçili hücre

Kontur hücrenin kendisinde değil, hücre içine `position: absolute` yerleşen
ayrı bir **overlay** div'inde. Her iki temada da aynı:

| Şey | Değer |
|---|---|
| Arka plan | `rgba(35, 131, 226, 0.07)` — **hafif mavi dolgu var** |
| Kontur | `box-shadow: rgb(39, 131, 222) 0 0 0 2px inset` |
| `border-radius` | **2px** |
| `z-index` | 84 |
| Kutu | hücreden 1px küçük (479×36 vs 480×37) — kenarlıkların üstüne binmiyor |

### Fill tutamacı

Her iki temada da aynı geometri; yalnızca içi sayfa arka planını taşıyor:

| Şey | Değer |
|---|---|
| Boyut | **9px × 9px** |
| Şekil | `border-radius: 50%` |
| Arka plan | açık: `rgb(255,255,255)` · koyu: `rgb(25,25,25)` → **sayfa arka planı** |
| Kenarlık | **`2px solid rgb(39, 131, 222)`** — mavi halka, ortası boş |
| İmleç | **`ns-resize`** |
| Konum | köşe üzerinde ortalı; merkez sapması `dx: -1.5px`, `dy: -0.5px` |

**Dolu mavi nokta değil** — içi boş, halkalı. Küçük ölçekte ekran
görüntüsünde dolu görünüyor, ölçüm aksini söylüyor.

## Çıkarsama yanlıştı — ölçümün düzelttiği varsayımlar

| Konu | Tahmin edilmişti | Ölçülen gerçek |
|---|---|---|
| Seçili hücre dolgusu | dolgu yok, saydam | `rgba(35,131,226,0.07)` mavi dolgu **var** |
| Seçim mavisi | `#2383e2` | kontur `rgb(39,131,222)`, dolgu `rgba(35,131,226,.07)` |
| Seçim köşesi | keskin (0px) | **2px radius** |
| Fill tutamacı | 7px, **dolu mavi**, arka plan halkası | 9px, **içi sayfa bg**, 2px mavi halka |
| Tutamaç imleci | `crosshair` | `ns-resize` |
| Satır hover | `rgba(255,255,255,0.03)` tint | **hover tint yok** |
| Hücre font boyutu | 14px | **16px** / 24px |
| Çizgi (açık tema) | `rgba(55,53,47,0.09)` | `rgba(42, 28, 0, 0.07)` |
| Çizgi (koyu tema) | `rgba(255,255,255,0.055)` | `rgba(255, 255, 243, 0.082)` |

Doğru çıkan tahminler: başlıkta kendi arka planı olmaması, konturun 2px olması,
tutamacın köşe üzerinde ortalanması, satır+kenarlık toplamının 37px olması.

## Henüz ölçülmemiş (çıkarsama yapılmayacak)

- Kolon başlığı hover davranışı ve ikon boyutu/rengi.
- Select/multi-select rozetlerinin renk paleti ve padding'i.
- Checkbox / date / person hücre kromu.
- Fill sürüklemesi sırasındaki hedef-aralık vurgusunun rengi.
- Kolon yeniden boyutlandırma tutamacı (ölçümde 5px×36px'lik div'ler olarak
  göründü, detaylandırılmadı).
- Boş tablo durumu, "New page" footer'ı.

## Ölçüm ortamı (tekrarlanabilirlik)

- Claude-in-Chrome eklentisi bu makinede **bağlı değildi**; Playwright
  `launchPersistentContext` ile görünür Chromium açıldı, CDP portu **9222**.
- Profil scratchpad altında (`notion-profile`) — kullanıcının gerçek Chrome
  profiline dokunulmadı. Giriş kullanıcı tarafından yapıldı; parola hiçbir
  aşamada okunmadı veya girilmedi.
- Ölçüm scriptleri repo kökünde `_launch-notion.mjs`, `_measure-notion*.mjs`
  olarak duruyor — **geçici, commit edilmeyecek.**
