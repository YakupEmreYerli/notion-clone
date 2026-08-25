# Database hücre etkileşimi — 0'dan analiz + plan

> Amaç: Notion'ın Table view metin/title hücresi davranışını **varsayımsız**,
> baştan ele alıp kendi `DatabaseGrid`'imizde birebir uygulamak konusunda ortak
> bir plan çıkarmak. Bu dosya "nasıl çalışması gerektiği"ni ve mevcut kodun
> nerede olduğunu sade dille anlatır. Sabah buradan devam edilecek.

## 1. Bulgular (araştırma + canlı doğrulama ile netleşti)

Notion'da metin hücresine tek tık, **doğrudan edit moduna** girer — "seçili/idle"
halden geçmez. Yani tek tık = yazmaya başla. Bu, kullanıcının "tek tık edit"
gözlemiyle uyumlu.

**Edit moduna girmeden "seçili (idle) + fill kolu" durumuna ulaşmanın yolları:**
1. Hücre içinde tıkla-sürükle (mini metin seçimi)
2. **Esc** ile edit'ten çık → hücre seçili kalır
3. Tab / ok tuşlarıyla hücreler arası gezinme

**Enter:** değeri commit eder, bir alt satıra geçer (hücre içi yeni satır = Shift+Enter).

**Edit'ten çıkınca (Esc ya da boşluğa tık):** hücre seçili kalır → mavi kontur +
sağ altta **küçük mavi yuvarlak (fill handle)** görünür.

**Fill handle:** yuvarlağı tutup sadece **yukarı/aşağı** sürükleyince değer,
seçili diğer hücrelere kopyalanır. Yatay dolgu fareyle yok; klavyeyle.

**Kısayollar:**
- `Ctrl/⌘+D` → aşağı doğru değer doldurma (fill down)
- `Ctrl/⌘+R` → sağa doğru değer doldurma (fill right)

**Görsel:** seçili hücre mavi (#2383e2) kontur, sağ alt köşede mavi nokta.

## 2. Hedef durum (istediğimiz davranış)

| Etkileşim | Beklenen sonuç |
|---|---|
| Tek tık (text/title) | Hücre **edit** moduna girer (imleç içeride, hemen yazılır) |
| Yazma | İmlecin olduğu yere yazılır |
| Enter | Commit + bir alt satır |
| Esc | Edit'ten çık → hücre seçili (idle) kalır, fill kolu görünür |
| Boşluğa tık | Edit'ten çık → hücre seçili kalır, fill kolu görünür |
| Ok / Tab | Seçim hücreler arası gezer (idle) |
| Fill kolu sürükleme (yukarı/aşağı) | Değer seçili hücrelere kopyalanır |
| Ctrl/⌘+D | Aşağı doğru fill down |
| Non-text (select, checkbox…) | Kendi popover'ı açılır |

## 3. Mevcut durum — ne yapıldı, ne sorunlu

Bugün eklenenler ve durumları:

- **ARIA yapısı**: `role="row"` + `role="columnheader"` + adlandırılmış hücre
  input'u. Tablo gövdesi artık erişilebilir (a11y taraması `color-contrast`
  dışında temiz). ✅
- **Tek tık = edit**: text hücresine tık `beginEditCell` ile edit moduna girer. ✅
- **Boşluğa/click-away ile edit'ten çıkınca idle**: `GridTextCell` `onBlur`
  artık `onEditingDone` çağırıyor → hücre seçili kalıyor, fill kolu görünüyor. ✅
- **Fill handle görsel + sürükleme**: seçili (idle) text hücresinde sağ altta
  mavi yuvarlak; `pointerdown/move/up` ile hedef aralık vurgulanıp değer
  commit ediliyor (`getFillRange` + `updateCell`). ✅ + unit test.
- **Ctrl/⌘+D**: `onKeyDown`'da `rowIndex` sonrası satırlara fill down. ✅
- **Mavi kontur**: `#2383e2` inset shadow ile. ✅

**En kritik kalan nokta — tek tık = edit, idle = ikinci etkileşim.** Bu konuda
kod zaten Notion'a yakın. Ancak baştan, temiz bir pencereden bakılması gereken
konu şu: **tek tıkta edit**, sonra **Esc / boşluğa tık / ok-tab** ile idle'a
dönüş + fill kolunun tetiklenmesi zincirinin **tek bir tutarlı state
makinesi**nde toplanması.

## 4. Plan (sabah için, adım adım)

1. **State makinesini netleştir** (`use-grid-selection.ts`): iki durum
   `idle` ve `editing`. Tek tık → `editing`; Esc/dışarı tık/gezinme → `idle`.
   `activeCell` her iki durumda da korunur (idle iken fill kolu görünür).
   Fill state'i (`fill`, `fillDragging`) idle'a bağlıdır.
2. **Testlerle yakala** (her adımı): tek tık=edit, Enter=alt satır,
   boşluğa tık=idle+fill, Esc=idle+fill, ok/Tab gezinme, fill sürükleme,
   Ctrl/⌘+D. Mevcut `grid-fill-range.test.ts` + `table-parity.spec.ts` buna
   temel.
3. **Fixture'a çok satır** (var): fill'i ve gezinmeyi gerçekten test etmek için
   en az 2 satır şart — eklendi.
4. **Fill handle'ın yönü**: sadece yukarı/aşağı (Notion). Yatayı (Ctrl/⌘+R)
   ayrı iş.
5. **Görsel doğrulama**: seçili hücre mavi kontur + sağ altta mavi nokta;
   edit modunda textbox hafif büyümüş/odaklı. (Notion karşılaştırması için
   `app.notion.com` canlı tablo.)
6. **Kapanış**: `npx tsc --noEmit`, `npm test:coverage`, `npm run test:e2e`,
   `npm run lint`. Görsel snapshot değiştiyse `--update-snapshots` ile
   baseline'ı güncelle (bilinçli UI değişikliği olduğu için).

## 5. Notlar / açık sorular

- **Çift tık**: resmi olarak belgelenmemiş; tek tık zaten edit'e girdiği için
  çift tık = edit + kelime seçimi. Uygulamada gerekmiyor.
- **Title (ilk) hücresi**: bazı durumlarda tık, sayfayı açabilir. Text vs title
  farkı resmi net değil — Title'ı ayrıca ele al.
- **Fill kolu tam konumu**: kaynaklar "sağ alt köşe" diyor; kodda sağ alt.
- **`display: contents` satır sarmalayıcı** (eski a11y notu): gereksiz kaldı;
  satırlar zaten doğrudan `role="row"`.
