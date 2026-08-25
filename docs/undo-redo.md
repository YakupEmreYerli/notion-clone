# Undo / Redo altyapısı

> Ctrl+Z / Ctrl+Y'nin nasıl çalıştığı, hangi yüzeylerin bağlı olduğu ve
> yeni bir mutation'ı nasıl bağlayacağın. Kararların gerekçesi
> `docs/memory/decisions.md`'de (2026-08-25 kaydı).

## Neden sunucu tarafı

Ölçüm: proje bu işe başlamadan önce tablo/sidebar/board yüzeylerinde
**hiç** geri alma yoktu. Çalışan tek şey BlockNote'un kendi ProseMirror
history plugin'iydi (sayfa editörü metni) ve `Item.tsx`'teki tek seferlik
arşivleme toast'ıydı.

İstemci tarafı bir komut yığını yetmiyor, çünkü **silmenin tersi "yeniden
yarat" değil**:

- `databaseRows.cells` **propertyId ile anahtarlı** — yeni id ile geri gelen
  bir kolon eski hücrelerine asla bağlanmaz.
- `viewCardOrder.rowId` satırı id'siyle referans ediyor — yeni id ile
  gelen satır board'daki yerini kalıcı kaybeder.
- Convex `db.insert` id seçtirmiyor.

Bu yüzden: **soft-delete** (`deletedAt`) + **sunucu tarafı journal**.

## Parçalar

| Dosya | Ne yapar |
|---|---|
| `convex/lib/history.ts` | Op tipleri, `recordHistory`, `applyHistoryOps`, `patchInverse` |
| `convex/history.ts` | `undo` / `redo` / `getUndoState` + `clearHistoryScope` |
| `convex/lib/softDelete.ts` | `liveRows` / `liveProperties` / `liveViews` / `liveViewOrders` / `liveRowOrders` / `assertLive` |
| `hooks/useUndo.tsx` | `useUndo` (durum + eylemler), `useUndoShortcuts` (klavye) |
| `history` tablosu | Doküman başına yığın, `HISTORY_LIMIT` (50) kayıt |

### Kapsam

Yığın **doküman başına** (`scopeId: Id<"documents">`) — Notion'ın
davranışı. Bir tablodaki Ctrl+Z başka sayfadaki değişikliği geri almaz.
Kayıtlar sunucuda olduğu için yığın **reload'ı atlatır**.

### Op-log

Onlarca mutation için onlarca tipli inverse yerine **üç** op var:

| Op | Ne yapar |
|---|---|
| `patch` | Alanları eski değerlerine yazar (`remove` listesi alanı kaldırır) |
| `restore` | `deletedAt`'i temizler — silmenin tersi |
| `softDelete` | `deletedAt` koyar — **yaratmanın** tersi |

**`insert`/`delete` op'ları bilerek YOK.** Undo bir insert'i delete ile geri
alsaydı, redo kaydı yeniden eklerken Convex **yeni bir `_id`** verirdi;
journal'daki undo op'u eski id'yi gösterip hiçbir şey bulamaz, sessizce
atlanır ve **çift kayıt** kalırdı. Yaratmanın tersi bu yüzden aynı `_id`
üzerinde `softDelete`, redo da aynı `_id` üzerinde `restore` — kimlik hiç
değişmediği için `undo→redo→undo` döngüsü sonsuza kadar tutarlı.
Bu, `tests/convex/databaseViews.test.ts`'te açıkça test ediliyor.

Dört tablo soft-delete taşır: `databaseRows`, `databaseProperties`,
`databaseViews`, `viewCardOrder`.

**`remove` neden ayrı:** Convex bir objeyi saklarken `undefined` değerli
anahtarları düşürür. `fields: { icon: undefined }` diskte `fields: {}`
olur ve patch no-op'a döner — "bu alan eskiden yoktu" durumu `fields` ile
temsil edilemez. Bu bir testle yakalandı, tahminle değil.

## Yeni bir mutation'ı journal'a bağlamak

```ts
const row = assertLive(await requireOwnedRow(ctx, args.rowId, userId), "Row");
if (row.icon === args.icon) return;        // değişmediyse kayıt düşme

await ctx.db.patch(args.rowId, { icon: args.icon });

await recordHistory(ctx, {
  scopeId: row.databaseId,                 // HANGİ dokümanın yığını
  userId,
  kind: "row.icon",                        // makine tarafı
  label: "Satır ikonu değişti",            // kullanıcıya görünen
  undo: [patchInverse("databaseRows", row, ["icon"])],
  redo: [{ t: "patch", table: "databaseRows", id: args.rowId,
           fields: { icon: args.icon } }],
});
```

Kurallar:

1. **Önceki hâli mutation'dan ÖNCE oku** — `patchInverse` fotoğraf çeker.
2. **Değişmediyse kayıt düşme.** Yoksa hücreye girip çıkmak bile yığını
   doldurur ve Ctrl+Z hiçbir şey yapmıyormuş gibi görünür.
3. **Yan etkileri de geri al.** `deleteProperty` view ayarlarını da
   sıfırlıyor; o patch'lerin inverse'i de aynı kayda giriyor.
4. **Soft-delete tablolarından okuma `live*` yardımcılarıyla.**
   Doğrudan `.query("databaseRows")` silinmiş kayıtları sızdırır. Tek
   istisna `databaseCascade.ts` (kalıcı silme, bilinçli).
5. **Kayıt yaratıyorsan tersi `softDelete`, asla `delete` değil.** Aksi
   hâlde redo yeni bir `_id` üretir ve döngü bozulur.
6. **Bir kaydı bir yerden bir yere taşıyorsan sil+ekle YAPMA, patch'le.**
   `moveRow` böyle çalışıyor: sıra kaydının `groupKey` + `order` alanları
   güncelleniyor, kayıt hiç ölmüyor.

## Klavye yönlendirmesi

Ctrl+Z / Ctrl+Y **sessizdir** — Notion'da olduğu gibi toast göstermez.
Geri alınan şey zaten ekranda görünüyor; üstüne bildirim koymak gürültü.
Boş yığında da sessiz (sunucu `null` döner, hata değil). `getUndoState`'in
`undoLabel`/`redoLabel` alanları duruyor — ileride menü öğesi/ipucu için.

`useUndoShortcuts` `document` üzerinde dinler ama **metin girişindeyken
çekilir**: `contentEditable`, `textarea` ve `readOnly` olmayan `input`
hedeflerinde olay bize gelmez. Böylece hücrede yazarken Ctrl+Z yazılan
harfi geri alır (tarayıcı), satır silmeyi değil; ve BlockNote'un kendi
history'si elinden alınmaz.

## Kalıcılık ve budama

- Yığın kapsam başına `HISTORY_LIMIT` (50) kayıtla sınırlı; taşınca en
  eski budanır (`recordHistory`).
- Undo'dan sonra yeni bir işlem gelirse **redo dalı kesilir**.
- Soft-delete edilen satır/kolonlar 30 gün sonra kalıcı silinir
  (`databases.purgeSoftDeleted`, günlük cron). Kolon kalıcı silinirken
  hücreleri süpürülür — o noktada geri alınacak bir şey yok.

## Bağlanmış yüzeyler

**`convex/databases.ts` — tamamı** (`setPropertyWidth` hariç, gerekçesi
aşağıda): `updateCell`, `createRow`, `deleteRow`, `duplicateRow`,
`reorderRow`, `setRowIcon`, `setRowCover`, `createProperty`,
`renameProperty`, `deleteProperty`, `duplicateProperty`, `reorderProperty`,
`changePropertyType`, `setPropertyIcon`, `addSelectOption`,
`updateSelectOption`, `deleteSelectOption`.

**`convex/databaseViews.ts` — tamamı** (`rebalanceGroupChunk` hariç):
`createView`, `renameView`, `deleteView`, `duplicateView`, `reorderView`,
`updateViewSettings`, `setGroupByProperty`, `setSubGroupByProperty`,
**`moveRow` (board kart sürükleme)**, `createRowInView`.

**`convex/documents.ts`:** `update` (başlık/ikon/kapak/sayfa ayarları),
`removeIcon`, `removeCoverImage`, `toggleFavorite`. Kalıcı silme yollarının
dördü de `clearHistoryScope` çağırıyor.

**İstemci:** `DatabaseView` (database dokümanları) ve `DocumentView`
(sayfalar) — ikisi asla aynı anda bağlanmaz, yoksa tek tuş iki undo çalıştırır.

### `moveRow` nasıl id-kararlı oldu

Eski akış "eski gruptaki sıra kaydını sil → hedef grupta yenisini ekle"
idi. Yeni akış kaydı **hiç öldürmüyor**: `groupKey` ve `order` alanları
patch'leniyor. Kart ilk kez sıralanıyorsa (kayıt yoksa) ekleniyor ve
tersi `softDelete` oluyor. Respace/rebalance'ın dokunduğu diğer kartlar
`orderDiffOps` fotoğraf farkıyla yakalanıyor.

## Bilinçli olarak dışarıda

- **Editör içeriği** (`documents.update`'in `content` alanı). BlockNote'un
  ProseMirror history'si Ctrl+Z'yi zaten yönetiyor; ikisini birden bağlamak
  çift geri alma üretirdi. `searchText`/`updatedAt` da türetilmiş alanlar.
- **`setPropertyWidth`.** Sürükleyerek boyutlandırma yığını doldururdu;
  Notion da kolon genişliğini geri almıyor.
- **`rebalanceGroupChunk`.** Kullanıcı niyeti değil, istemcinin sıkışmış
  fractional index'i açmak için sürdüğü bakım işi.
- **`archive` / `restore`.** Yığın doküman kapsamlı; arşivlenen dokümandan
  zaten yönlendiriliyorsun, kapsamına Ctrl+Z ulaşamıyor. `Item.tsx`'teki
  toast "Undo" bu akışı hâlâ karşılıyor.

## Kalıcı silme

Soft-delete edilen satır/kolon/view/sıra kayıtları 30 gün sonra
`databases.purgeSoftDeleted` (günlük cron) tarafından kalıcı siliniyor.
View kalıcı silinirken sıra kayıtları da gidiyor; kolon silinirken
hücreleri süpürülüyor — o noktada geri alınacak bir şey yok.

## Geri kalan açık maddeler

- `documents.reorder` (sidebar sıralaması) bağlanmadı.
- UI: menüde geri al/yinele düğmeleri yok — `getUndoState` etiketleri hazır.
- Optimistic update yok; her undo bir sunucu round-trip'i. Projede hiç
  `withOptimisticUpdate` kullanılmıyor, ayrı bir iş.
- E2E testi yok; koruma Convex katmanında (29 test).
