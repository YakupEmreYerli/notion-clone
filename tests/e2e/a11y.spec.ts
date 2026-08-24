import { expect, test } from "@playwright/test";

import { expectA11yViolations } from "@/tests/support/assertions/a11y";
import { BoardPage } from "@/tests/support/pages/board-page";
import { CoverModalPage } from "@/tests/support/pages/cover-modal-page";
import { TablePage } from "@/tests/support/pages/table-page";

/**
 * Bilinen ihlaller — **iki ayrı sınıf**, karıştırılmamalı:
 *
 * 1. `color-contrast`: Notion parity'sinin doğrudan sonucu. Notion'ın kendi
 *    ikincil metni (ör. "+ New" için rgb(142,139,134)) AA eşiğini geçmiyor;
 *    kontrastı yükseltmek piksel parity'sini bozar. Bilinçli borç, ayrı bir
 *    tasarım kararı olmadan kapanmaz.
 * 2. ARIA yapısı (`aria-required-children`, `aria-required-parent`, `label`,
 *    `aria-hidden-focus`): bunlar **gerçek hata**. Tablo `role="grid"` ve
 *    `role="gridcell"` kullanıyor ama arada `role="row"` yok (CSS grid düz bir
 *    hücre dizisi); ekran okuyucu tabloyu satır satır gezemiyor. Açık madde
 *    olarak `docs/memory/STATE.md`'de kayıtlı.
 *
 * Liste **eşitlikle** karşılaştırılır: yeni ihlal de, düzeltilmiş ihlal de
 * testi kırar — yani liste kendiliğinden çürüyemez.
 */
const NOTION_PARITY_CONTRAST = ["color-contrast"];
const GRID_ARIA_STRUCTURE = ["aria-required-children", "aria-required-parent"];

test.describe("Accessibility (WCAG 2.1 A/AA)", () => {
  test("board surface has no violation beyond Notion's muted palette", async ({
    page,
  }) => {
    await new BoardPage(page).goto();

    await expectA11yViolations(page, NOTION_PARITY_CONTRAST);
  });

  test("cover modal is reachable and correctly labelled", async ({ page }) => {
    const cover = new CoverModalPage(page);
    await cover.goto();
    await expect(cover.dialog).toBeVisible();

    // Sekmeler, galeri hücreleri ve "Remove" düğmesi adlandırılmış olmalı;
    // geriye yalnızca sekme metninin kontrastı kalıyor.
    await expectA11yViolations(page, NOTION_PARITY_CONTRAST);
  });

  test("cover modal traps nothing unlabelled inside the dialog itself", async ({
    page,
  }) => {
    const cover = new CoverModalPage(page);
    await cover.goto();
    await expect(cover.dialog).toBeVisible();

    await expectA11yViolations(page, NOTION_PARITY_CONTRAST, {
      include: '[role="dialog"]',
    });
  });

  test("table grid still reports the known ARIA structure gap", async ({
    page,
  }) => {
    const table = new TablePage(page);
    await table.goto();
    await expect(table.root).toBeVisible();

    // `label`: başlık hücresinin metin girişinin erişilebilir adı yok.
    await expectA11yViolations(page, [
      ...NOTION_PARITY_CONTRAST,
      ...GRID_ARIA_STRUCTURE,
      "label",
    ]);
  });

  test("property menu and icon picker add no violation of their own", async ({
    page,
  }) => {
    const table = new TablePage(page);
    await table.goto();
    await table.openPropertyMenu("Author");

    // `aria-hidden-focus`: menü açıkken arkadaki grid aria-hidden oluyor ama
    // içindeki hücre girişleri hâlâ odaklanabilir durumda.
    await expectA11yViolations(page, [
      ...NOTION_PARITY_CONTRAST,
      "aria-required-children",
      "aria-hidden-focus",
    ]);

    await table.openIconPicker();
    await expectA11yViolations(page, [
      ...NOTION_PARITY_CONTRAST,
      "aria-required-children",
    ]);
  });
});
