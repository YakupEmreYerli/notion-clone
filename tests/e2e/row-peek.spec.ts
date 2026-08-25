import { expect, test } from "@playwright/test";

/**
 * Side peek — ölçüm: docs/notion-research/board-parity.md
 * (Notion'da panel viewport'un %48.5'i, sol kenarından sürüklenerek
 * boyutlandırılıyor ve modal DEĞİL: arkadaki board kullanılmaya devam ediyor).
 */
test.describe("Row side peek", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto("/test-fixtures/row-peek");
    await expect(page.getByTestId("row-peek")).toBeVisible();
  });

  test("opens at the measured Notion width", async ({ page }) => {
    const box = await page.getByTestId("row-peek").boundingBox();
    // Notion: 761/1568 = %48.5. Eskiden max-w-sm (384px) sabitti.
    expect((box?.width ?? 0) / 1400).toBeCloseTo(0.485, 2);
  });

  test("lets the badges be edited instead of only displayed", async ({
    page,
  }) => {
    // Regresyon: select rozeti salt görünümdü (yanında ayrı bir native
    // <select> vardı), multiSelect ise hiç düzenlenemiyordu.
    await page.getByText("Next", { exact: true }).click();
    const options = page.locator('[data-slot="popover-content"]');
    await expect(options).toBeVisible();

    await page.getByText("Reading", { exact: true }).click();
    await expect(
      page.getByTestId("row-peek").getByText("Reading", { exact: true }),
    ).toBeVisible();
  });

  test("stays out of the way: the page behind keeps working", async ({
    page,
  }) => {
    // Regresyon: Radix modal Dialog body'ye pointer-events:none koyuyordu —
    // peek açıkken arkadaki hiçbir hover/tık çalışmıyordu.
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).pointerEvents))
      .toBe("auto");

    const behind = page.getByRole("button", { name: "Open peek" });
    await expect(behind).toBeEnabled();
    await behind.click();
    // Arkaya tıklamak peek'i kapatmamalı (Notion da kapatmıyor).
    await expect(page.getByTestId("row-peek")).toBeVisible();
  });

  test("resizes by dragging its left edge", async ({ page }) => {
    const peek = page.getByTestId("row-peek");
    const before = await peek.boundingBox();
    const handle = page.locator('[aria-label="Resize side peek"]');
    const hb = await handle.boundingBox();
    if (!hb || !before) throw new Error("peek not measurable");

    await page.mouse.move(hb.x + hb.width / 2, 400);
    await page.mouse.down();
    await page.mouse.move(hb.x - 200, 400, { steps: 10 });
    await page.mouse.up();

    const after = await peek.boundingBox();
    expect((after?.width ?? 0) - before.width).toBeGreaterThan(150);
  });
});
