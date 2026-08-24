import { expect, test } from "@playwright/test";

import { TablePage } from "@/tests/support/pages/table-page";

test.describe("Notion-style database table", () => {
  let table: TablePage;

  test.beforeEach(async ({ page }) => {
    table = new TablePage(page);
    await table.goto();
    await expect(table.root).toBeVisible();
  });

  test("fills the available width and uses the Notion add-page footer", async ({
    page,
  }) => {
    const fixtureBox = await table.root.boundingBox();
    const headerBox = await table.header.boundingBox();

    expect(headerBox?.width).toBe(fixtureBox?.width);
    await expect(page.getByRole("button", { name: "New page" })).toBeVisible();
    await expect(page.getByText("New row", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/\d+ rows?/)).toHaveCount(0);
  });

  test("keeps the property icon on the eight-pixel header baseline", async () => {
    const authorHeader = table.columnHeader(1);
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
    const menu = await table.openPropertyMenu("Author");

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
      await expect(table.menuItem(name)).toBeVisible();
    }
    await expect(page.getByText("AI Autofill", { exact: true })).toHaveCount(0);

    await expect(
      menu.locator('[data-slot="dropdown-menu-separator"]'),
    ).toHaveCount(3);
    // Notion'da "Delete property" kırmızı değil; iki maddenin rengi aynı olmalı.
    const duplicateColor = await table
      .menuItem("Duplicate property")
      .evaluate((element) => getComputedStyle(element).color);
    await expect(table.menuItem("Delete property")).toHaveCSS(
      "color",
      duplicateColor,
    );

    const picker = await table.openIconPicker();
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
    await expect(table.icon("camera")).toBeVisible();

    const firstNotionIcon = table.icon("123");
    await expect(firstNotionIcon).toHaveCSS("width", "32px");
    await expect(firstNotionIcon.locator("svg")).toHaveCSS("width", "24px");
    const firstIconBox = await firstNotionIcon.boundingBox();
    const thirteenthIconBox = await table.icon("apron").boundingBox();
    expect(thirteenthIconBox?.x).toBe(firstIconBox?.x);
    expect(thirteenthIconBox?.y).toBe((firstIconBox?.y ?? 0) + 32);

    await table.scrollIconGrid(500);
    await expect(picker).toBeVisible();
    await expect(menu).toBeVisible();
    await expect
      .poll(() => table.iconGrid.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  });

  test("keeps wide columns inside the table scroller on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const dimensions = await table.grid.evaluate((grid) => ({
      bodyWidth: document.body.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      clientWidth: grid.clientWidth,
      scrollWidth: grid.scrollWidth,
    }));

    expect(dimensions.bodyWidth).toBe(dimensions.viewportWidth);
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  });
});
