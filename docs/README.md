# Zotion dokümantasyon haritası

> Bu dosya **indekstir**. Amacı: her oturumda her şeyi okumak yerine, işe göre
> yalnızca gereken dosyayı açmak. Bir dosyayı açmadan önce buradaki "Ne zaman oku"
> sütununa bak.

## Katmanlar

| Katman | Dosya | Her oturum yüklenir mi? | Ne zaman oku |
|---|---|---|---|
| Kalıcı kurallar | `CLAUDE.md` | **Evet** (otomatik) | — zaten context'te |
| Backend invariant'ları | `.claude/rules/project/convex.md` | Evet (otomatik) | — zaten context'te |
| Frontend konvansiyonları | `.claude/rules/project/frontend.md` | Evet (otomatik) | — zaten context'te |
| **Devam noktası** | `docs/memory/STATE.md` | Hayır | Oturum başında, "nerede kalmıştık" için |
| Karar günlüğü | `docs/memory/decisions.md` | Hayır | "Bu neden böyle?" sorusu çıkınca; yeni bir kalıcı karar alınınca yaz |
| Tuzaklar | `docs/memory/gotchas.md` | Hayır | Bir şey ikinci kez ısırdığında oku/yaz |
| Aktif plan | `PLAN.md` | Hayır | Board (kanban) işine devam ederken |
| Lokal çalıştırma / portlar | `docs/runbook.md` | Hayır | Uygulamayı ayağa kaldırırken, duman testi yaparken |
| Geliştirme akışı | `docs/development.md` | Hayır | Günlük geliştirme komutları; `runbook.md`'yi tamamlar |
| Self-hosting | `docs/self-hosting.md` | Hayır | Deploy, ters proxy, altyapı detayı (README kısa yolu verir) |
| Test stratejisi | `docs/testing.md` | Hayır | Yeni test yazarken veya kapsamı genişletirken |
| README görsel galerisi | `docs/screenshots.md` | Hayır | README ekran görüntülerini yeniden üretirken (`scripts/`) |
| Self-hosting / dağıtım | `docs/self-hosting.md` | Hayır | Docker Compose, Dokploy, ters proxy, auth akışı, bilinen sınırlar |
| Yerel geliştirme | `docs/development.md` | Hayır | Kurulum, script tablosu |
| README ekran görüntüleri | `docs/screenshots.md` | Hayır | Galeri kareleri değişecekse, yeni kare eklerken, pre-commit hook'u anlamak için |
| Notion parity araştırması | `docs/notion-research/` | Hayır | Notion'a birebir uyum gereken UI işinde. Önce `RESEARCH_STATUS.md`, sonra ilgili alan dosyası |
| Ölçüm/token çıktıları | `design/` | Hayır | Board/table piksel-parity işinde (`kanban-tokens.md`, `notion-measurements/*.json`) |
| Arşiv | `docs/archive/` | Hayır | Tarihsel bağlam gerekirse (`2026-08-22-handoff.md`). **Güncel değil** |

## Otomasyon (hook'lar)

`.claude/hooks/state-guard/state_guard.py`, `.claude/settings.json` üzerinden üç yere bağlı:

| Olay | Ne yapar |
|---|---|
| `SessionStart` | Gerçek repo durumunu (branch, commit'lenmemiş dosya sayısı, son commit'ler) context'e basar; `STATE.md` son commit'ten eskiyse uyarır |
| `PostToolUse` (Edit/Write) | Oturumda hangi **kaynak** dosyaların değiştiğini işaretler (`docs/` hariç) |
| `Stop` | Kaynak değişti ama `STATE.md` güncellenmediyse oturumu bitirtmez, güncellemeyi ister. `stop_hook_active` ile en fazla bir kez tekrarlar |

İşaretler `.claude/.state-guard/` altında tutulur (gitignored). Hook hata verirse
oturum kırılmaz, sessizce atlanır.

## Yazma kuralları

- **Tek kaynak.** Aynı bilgi iki dosyada durmasın; ikincisi birinciye link versin.
- `CLAUDE.md` sadece *kalıcı* şeyleri tutar (mimari, invariant, komut). Oturuma özel
  ilerleme oraya **yazılmaz** — `docs/memory/STATE.md`'ye yazılır.
- Bir karar alındığında: `decisions.md`'ye tek satır + gerekçe. Kod yorumuna değil.
- Araştırma çıktısı (ölçüm, gözlem) `docs/notion-research/` altına; özet
  `NOTION_PARITY.md` tablosuna.
- Bir dosya 400 satırı geçtiyse böl ve buraya satır ekle.
