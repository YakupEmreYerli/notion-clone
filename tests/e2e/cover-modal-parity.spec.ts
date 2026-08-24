import { expect, test } from "@playwright/test";

import { CoverModalPage } from "@/tests/support/pages/cover-modal-page";

test.describe("Notion-style cover image modal", () => {
  let cover: CoverModalPage;

  test.beforeEach(async ({ page }) => {
    cover = new CoverModalPage(page);
    await cover.goto();
    await expect(cover.root).toBeVisible();
  });

  test("matches the desktop modal geometry and tab structure", async () => {
    await expect(cover.dialog).toBeVisible();
    await expect(cover.dialog).toHaveCSS("width", "540px");
    await expect(cover.dialog).toHaveCSS("height", "485px");
    await expect(cover.dialog).toHaveCSS("right", "12px");
    await expect(cover.dialog).toHaveCSS("border-radius", "10px");
    await expect(cover.tablist).toHaveCSS("height", "40px");

    await expect(cover.tab("Gallery")).toBeVisible();
    await expect(cover.tab("Upload")).toBeVisible();
    await expect(cover.tab("Link")).toBeVisible();
    await expect(cover.tab("Colors")).toHaveCount(0);
    await expect(cover.button("Remove")).toBeVisible();
  });

  test("keeps the cover action chip visible while the modal is open", async () => {
    await expect(cover.dialog).toBeVisible();
    await expect(cover.coverControls).toBeVisible();
    await expect(cover.coverControls).toHaveCSS("opacity", "1");
  });

  test("uses a four-column, independently scrolling gallery", async () => {
    const firstCell = cover.galleryCells.first();

    await expect(cover.gallery).toHaveCSS("height", "445px");
    await expect(firstCell).toHaveCSS("height", "64px");
    await expect(firstCell).toHaveAttribute("aria-pressed", "true");
    await firstCell.hover();
    await expect(firstCell).toHaveCSS("opacity", "0.85");

    // Dört sütun: beşinci hücre birincinin tam altına, 70px aşağıya düşer.
    const [firstBox, fifthBox] = await cover.galleryCells.evaluateAll(
      (buttons) =>
        [buttons[0], buttons[4]].map((button) => {
          const box = button.getBoundingClientRect();
          return { x: box.x, y: box.y };
        }),
    );
    expect(fifthBox.x).toBe(firstBox.x);
    expect(fifthBox.y).toBeCloseTo(firstBox.y + 70, 0);

    await cover.scrollGallery(600);
    await expect
      .poll(() => cover.gallery.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await expect(cover.dialog).toBeVisible();
  });

  test("keeps the Link tab functional and fits a mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await expect(cover.dialog).toHaveCSS("width", "351px");
    await cover.tab("Link").click();
    await expect(cover.imageLink).toBeVisible();

    const submit = cover.button("Submit");
    await expect(submit).toBeDisabled();
    await cover.imageLink.fill("not-an-image-url");
    await expect(submit).toBeDisabled();
    await cover.imageLink.fill("https://example.com/cover.jpg");
    await expect(submit).toBeEnabled();
  });
});
