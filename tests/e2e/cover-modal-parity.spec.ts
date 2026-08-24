import { expect, test } from "@playwright/test";

test.describe("Notion-style cover image modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-fixtures/cover-modal");
    await expect(page.locator("[data-cover-modal-fixture]")).toBeVisible();
  });

  test("matches the desktop modal geometry and tab structure", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Page cover" });

    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("width", "540px");
    await expect(dialog).toHaveCSS("height", "485px");
    await expect(dialog).toHaveCSS("right", "12px");
    await expect(dialog).toHaveCSS("border-radius", "10px");
    await expect(dialog.getByRole("tablist")).toHaveCSS("height", "40px");

    await expect(dialog.getByRole("tab", { name: "Gallery" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Upload" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Link" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Colors" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Remove" })).toBeVisible();
  });

  test("keeps the cover action chip visible while the modal is open", async ({
    page,
  }) => {
    const controls = page.getByTestId("page-cover-controls");

    await expect(page.getByRole("dialog", { name: "Page cover" })).toBeVisible();
    await expect(controls).toBeVisible();
    await expect(controls).toHaveCSS("opacity", "1");
  });

  test("uses a four-column, independently scrolling gallery", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Page cover" });
    const gallery = dialog.locator("[data-cover-gallery]");
    const firstCell = gallery.getByRole("button").first();

    await expect(gallery).toHaveCSS("height", "445px");
    await expect(firstCell).toHaveCSS("height", "64px");
    await expect(firstCell).toHaveAttribute("aria-pressed", "true");
    await firstCell.hover();
    await expect(firstCell).toHaveCSS("opacity", "0.85");
    const [firstBox, fifthBox] = await gallery
      .getByRole("button")
      .evaluateAll((buttons) =>
        [buttons[0], buttons[4]].map((button) => {
          const box = button.getBoundingClientRect();
          return { x: box.x, y: box.y };
        }),
      );
    expect(fifthBox.x).toBe(firstBox.x);
    expect(fifthBox.y).toBeCloseTo(firstBox.y + 70, 0);

    await gallery.hover();
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => gallery.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await expect(dialog).toBeVisible();
  });

  test("keeps the Link tab functional and fits a mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const dialog = page.getByRole("dialog", { name: "Page cover" });

    await expect(dialog).toHaveCSS("width", "351px");
    await dialog.getByRole("tab", { name: "Link" }).click();
    await expect(
      dialog.getByRole("textbox", { name: "Image link" }),
    ).toBeVisible();
    const imageLink = dialog.getByRole("textbox", { name: "Image link" });
    const submit = dialog.getByRole("button", { name: "Submit" });
    await expect(submit).toBeDisabled();
    await imageLink.fill("not-an-image-url");
    await expect(submit).toBeDisabled();
    await imageLink.fill("https://example.com/cover.jpg");
    await expect(submit).toBeEnabled();
  });
});
