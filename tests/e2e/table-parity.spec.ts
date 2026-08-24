import { expect, test } from "@playwright/test";

test.describe("Notion-style database table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-fixtures/table");
    await expect(page.locator("[data-table-fixture]")).toBeVisible();
  });

  test("fills the available width and uses the Notion add-page footer", async ({
    page,
  }) => {
    const fixture = page.locator("[data-table-fixture]");
    const header = page.getByTestId("database-header");
    const fixtureBox = await fixture.boundingBox();
    const headerBox = await header.boundingBox();

    expect(headerBox?.width).toBe(fixtureBox?.width);
    await expect(page.getByRole("button", { name: "New page" })).toBeVisible();
    await expect(page.getByText("New row", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/\d+ rows?/)).toHaveCount(0);
  });

  test("keeps the property icon on the eight-pixel header baseline", async ({
    page,
  }) => {
    const authorHeader = page.getByTestId("database-column-header").nth(1);
    const authorIcon = authorHeader.locator("svg.lucide-user");
    const headerBox = await authorHeader.boundingBox();
    const iconBox = await authorIcon.boundingBox();

    expect(iconBox?.x).toBe((headerBox?.x ?? 0) + 8);
    await expect(authorIcon).toBeVisible();
    await authorHeader.hover();
    await expect(authorIcon).toBeVisible();
    await expect(
      authorHeader.getByRole("button", { name: "Reorder column" }),
    ).toHaveCount(0);
  });

  test("opens the functional property menu and searchable icon catalog", async ({
    page,
  }) => {
    await page.getByText("Author", { exact: true }).click();

    for (const name of [
      "Change type",
      "Filter",
      "Sort",
      "Hide",
      "Insert left",
      "Insert right",
      "Duplicate property",
      "Delete property",
    ]) {
      await expect(page.getByRole("menuitem", { name })).toBeVisible();
    }
    await expect(page.getByText("AI Autofill", { exact: true })).toHaveCount(0);

    const menu = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(
      menu.locator('[data-slot="dropdown-menu-separator"]'),
    ).toHaveCount(3);
    const duplicateColor = await page
      .getByRole("menuitem", { name: "Duplicate property" })
      .evaluate((element) => getComputedStyle(element).color);
    await expect(
      page.getByRole("menuitem", { name: "Delete property" }),
    ).toHaveCSS("color", duplicateColor);

    await page.getByRole("button", { name: "Change icon" }).click();
    const picker = page.getByLabel("Icon", { exact: true });
    await expect(picker).toHaveCSS("width", "408px");
    await page.waitForTimeout(200);
    const pickerBox = await picker.boundingBox();
    const menuBox = await menu.boundingBox();
    expect(pickerBox?.width).toBeCloseTo(408, 0);
    expect(pickerBox?.height).toBeLessThanOrEqual(356);
    expect(pickerBox?.x ?? 0).toBeLessThan(menuBox?.x ?? 0);
    expect((pickerBox?.x ?? 0) + (pickerBox?.width ?? 0)).toBeCloseTo(
      (menuBox?.x ?? 0) + (menuBox?.width ?? 0) - 4,
      0,
    );
    expect(pickerBox?.y ?? 0).toBeGreaterThan(menuBox?.y ?? 0);
    await expect(
      page.getByRole("textbox", { name: "Filter icons" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "camera", exact: true }),
    ).toBeVisible();

    const iconGrid = picker.locator("[data-property-icon-grid]");
    const firstNotionIcon = page.getByRole("button", {
      name: "123",
      exact: true,
    });
    await expect(firstNotionIcon).toHaveCSS("width", "32px");
    await expect(firstNotionIcon.locator("svg")).toHaveCSS("width", "24px");
    const firstIconBox = await firstNotionIcon.boundingBox();
    const thirteenthIconBox = await page
      .getByRole("button", { name: "apron", exact: true })
      .boundingBox();
    expect(thirteenthIconBox?.x).toBe(firstIconBox?.x);
    expect(thirteenthIconBox?.y).toBe((firstIconBox?.y ?? 0) + 32);

    await iconGrid.hover();
    await page.mouse.wheel(0, 500);
    await expect(picker).toBeVisible();
    await expect(menu).toBeVisible();
    await expect
      .poll(() => iconGrid.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  });

  test("keeps wide columns inside the table scroller on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const dimensions = await page.getByRole("grid").evaluate((grid) => ({
      bodyWidth: document.body.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      clientWidth: grid.clientWidth,
      scrollWidth: grid.scrollWidth,
    }));

    expect(dimensions.bodyWidth).toBe(dimensions.viewportWidth);
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  });
});
