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

export default crons;
