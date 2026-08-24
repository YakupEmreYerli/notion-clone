import { expect, test } from "@playwright/test";

import { CoverModalPage } from "@/tests/support/pages/cover-modal-page";
import { TablePage } from "@/tests/support/pages/table-page";

/**
 * Kritik yüzeylerin piksel bütünlüğü.
 *
 * Board snapshot'ı `board-clipping.spec.ts`'te (tam sayfa); buradakiler
 * **locator** snapshot'ı — sayfa gürültüsü (kaydırma konumu, odak halkası)
 * çerçeveye girmesin diye. Uzak CDN'den gelen kapak görselleri maskelenir,
 * yoksa snapshot ağ durumuna bağlı olur.
 */
test.describe("Critical surface snapshots", () => {
  test("table surface", async ({ page }) => {
    const table = new TablePage(page);
    await table.goto();
    await expect(table.root).toBeVisible();

    await expect(table.root).toHaveScreenshot("table-surface.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("property menu", async ({ page }) => {
    const table = new TablePage(page);
    await table.goto();
    const menu = await table.openPropertyMenu("Author");
    await expect(table.menuItem("Delete property")).toBeVisible();

    await expect(menu).toHaveScreenshot("property-menu.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("icon picker", async ({ page }) => {
    const table = new TablePage(page);
    await table.goto();
    await table.openPropertyMenu("Author");
    const picker = await table.openIconPicker();
    await expect(table.icon("camera")).toBeVisible();

    await expect(picker).toHaveScreenshot("icon-picker.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("cover modal", async ({ page }) => {
    const cover = new CoverModalPage(page);
    await cover.goto();
    await expect(cover.dialog).toBeVisible();
    await expect(cover.galleryCells.first()).toBeVisible();

    await expect(cover.dialog).toHaveScreenshot("cover-modal.png", {
      animations: "disabled",
      caret: "hide",
      // Galeri karoları uzak CDN'den geliyor — içerik yerine yerleşim korunur.
      mask: [cover.gallery],
      maxDiffPixelRatio: 0.01,
    });
  });
});
