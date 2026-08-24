import { expect, test } from "@playwright/test";

import { assertNoUnexpectedClipping } from "./helpers/clipping";

test.describe("assertNoUnexpectedClipping", () => {
  test("reports the clipping ancestor and CSS property", async ({ page }) => {
    await page.setContent(`
      <div data-parent style="position:relative;width:100px;height:40px;overflow:hidden">
        <button data-surface style="position:absolute;top:30px;width:80px;height:24px">Cut</button>
      </div>
    `);

    await expect(
      assertNoUnexpectedClipping(page.locator("[data-surface]")),
    ).rejects.toThrow(/div clips via overflow-y: hidden/);
  });

  test("does not flag content fully outside a normal scroll viewport", async ({
    page,
  }) => {
    await page.setContent(`
      <div style="width:100px;height:40px;overflow:auto">
        <div style="height:100px"></div>
        <button data-surface>Off-screen item</button>
      </div>
    `);

    await assertNoUnexpectedClipping(page.locator("[data-surface]"));
  });

  test("includes shadow bleed when requested", async ({ page }) => {
    await page.setContent(`
      <div style="width:100px;height:40px;overflow:hidden">
        <button data-surface style="width:100px;height:40px;box-shadow:0 0 8px #000">Shadow</button>
      </div>
    `);

    await expect(
      assertNoUnexpectedClipping(page.locator("[data-surface]"), {
        includeShadow: true,
      }),
    ).rejects.toThrow(/overflow-x: hidden/);
  });
});
