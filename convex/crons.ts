import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Notion'da doğrulanan davranış: trash'teki bir sayfa 30 gün sonra kalıcı
// olarak silinir (bkz. docs/notion-research/sidebar-pages.md). Günlük
// çalışması, kullanıcıların anlık bir gecikme hissetmeden bu pencereyi
// aşan belgeleri düzenli olarak temizlemesi için yeterli.
const crons = cronJobs();

crons.interval(
  "purge expired trash",
  { hours: 24 },
  internal.documents.purgeExpiredTrash,
);

// View sistemi öncesi oluşturulmuş database'lere "Table" view'ı seed eder.
// Idempotent: view'sız database kalmayana kadar hiçbir şey yapmaz; ikinci
// çalıştırmada zaten view'ı olanlar atlanır.
crons.interval(
  "ensure default views",
  { hours: 24 },
  internal.databaseViews.ensureDefaultViews,
);

// Soft-delete edilen tablo satır/kolonlarını 30 gün sonra kalıcı siler
// (bkz. databases.ts: purgeSoftDeleted). Undo penceresi çoktan kapanmış
// kayıtların sonsuza kadar yer kaplamasını engeller.
crons.interval(
  "purge soft deleted database records",
  { hours: 24 },
  internal.databases.purgeSoftDeleted,
);

export default crons;
