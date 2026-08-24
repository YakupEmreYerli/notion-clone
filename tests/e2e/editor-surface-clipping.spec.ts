import { expect, test } from "@playwright/test";

import { assertNoUnexpectedClipping } from "./helpers/clipping";

test.describe("Editor floating surface clipping", () => {
  test.skip(
    !process.env.PLAYWRIGHT_EDITOR_PATH,
    "Set PLAYWRIGHT_EDITOR_PATH and PLAYWRIGHT_STORAGE_STATE to a seeded editor fixture with text, an image and a cover.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_EDITOR_PATH!);
  });

  test("text selection menu is portalled and fully visible", async ({
    page,
  }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible();
    await editor.evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const text = walker.nextNode();
      if (!text?.textContent)
        throw new Error("Seeded editor fixture has no text");
      const range = document.createRange();
      range.selectNodeContents(text);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });

    const menu = page.locator(".zsm-floating");
    await expect(menu).toBeVisible();
    await expect(
      menu.evaluate((element) => element.parentElement?.tagName),
    ).resolves.toBe("BODY");
    await assertNoUnexpectedClipping(menu, { includeShadow: true });
  });

  test("image context menu escapes editor overflow", async ({ page }) => {
    const image = page.locator("[data-content-type='image']").first();
    await expect(image).toBeVisible();
    await image.click({ button: "right" });

    const menu = page.getByRole("menu").filter({ hasText: "Search actions" });
    await expect(menu).toBeVisible();
    await expect(
      menu.evaluate((element) => element.parentElement?.tagName),
    ).resolves.toBe("BODY");
    await assertNoUnexpectedClipping(menu, { includeShadow: true });
  });

  test("page cover controls remain inside the cover", async ({ page }) => {
    const cover = page.getByTestId("page-cover");
    await expect(cover).toBeVisible();
    await cover.hover();

    const controls = page.getByTestId("page-cover-controls");
    await expect(controls).toBeVisible();
    await assertNoUnexpectedClipping(controls, { includeShadow: true });
  });
});
