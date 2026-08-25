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

  test("clicking a text cell makes it editable so clipboard paste works", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    // İlk veri satırı, ilk (Name) sütunu — "A table page" text hücresi.
    const firstCell = await table.cell(0, 0);
    await firstCell.click();

    // Tıklayınca hücre readOnly kalmamalı (idle yerine editing moduna girmeli).
    await expect(firstCell.locator("input")).toBeFocused();
    await expect(firstCell.locator("input")).toBeEditable();

    const payload = `yapıştırılan-${Date.now()}`;
    await page.evaluate((text) => navigator.clipboard.writeText(text), payload);
    await firstCell.locator("input").focus();
    await page.keyboard.press("ControlOrMeta+V");
    await expect(firstCell.locator("input")).toHaveValue(`A table page${payload}`);
  });

  test("selected text cell shows the Notion fill handle when idle", async ({
    page,
  }) => {
    const firstCell = await table.cell(0, 0);
    // Düzenleme moduna girer (tıklayınca), sonra Escape ile idle'a dönülür —
    // idle'da fill tutamacı görünür.
    await firstCell.click();
    await expect(firstCell.locator("input")).toBeFocused();
    await expect(table.fillHandle).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(table.fillHandle).toHaveCount(1);
    await expect(table.fillHandle).toHaveAttribute("aria-label", "Fill cell value down");
  });

  test("centers the fill handle on the cell's bottom-right corner", async () => {
    const cell = await table.selectCell(0, 0);
    const cellBox = await cell.boundingBox();
    const handleBox = await table.fillHandle.boundingBox();

    // Notion: nokta köşenin ÜZERİNDE ortalanır — yarısı hücrenin dışında kalır.
    // Hücre kırpma yaparsa (overflow-hidden) nokta görünmez olur, bu yüzden
    // merkez hizası gerçek bir regresyon testidir.
    // Ölçülen Notion değeri: 9px daire (docs/notion-research/table-parity.md).
    expect(handleBox?.width).toBe(9);
    expect(handleBox?.height).toBe(9);
    const centerX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
    const centerY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
    expect(
      Math.abs(centerX - ((cellBox?.x ?? 0) + (cellBox?.width ?? 0))),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(centerY - ((cellBox?.y ?? 0) + (cellBox?.height ?? 0))),
    ).toBeLessThanOrEqual(1);
  });

  test("extends the fill range while dragging and clears it on release", async () => {
    await table.selectCell(0, 0);
    await expect.poll(() => table.highlightedCellCount()).toBe(0);

    // Regresyon: pointer capture olmadan imleç 7px'lik tutamacın dışına
    // çıkınca move/up olayları kesiliyordu — aralık hiç büyümüyor, bırakıldıktan
    // sonra da mavi vurgu ekranda takılı kalıyordu.
    const { duringDrag, afterRelease } = await table.dragFillHandle(40);

    expect(duringDrag).toBe(2);
    expect(afterRelease).toBe(0);
  });

  test("keeps the typed draft when clicking inside the cell being edited", async ({
    page,
  }) => {
    const cell = await table.selectCell(0, 0);
    await table.focusGrid();

    // İdle hücrede yazmaya başlamak düzenlemeyi tohumlar (editSeed).
    await page.keyboard.press("a");
    await page.keyboard.type("b");
    await expect(cell.locator("input")).toHaveValue("ab");

    // Regresyon: imleci taşımak için hücrenin İÇİNE tıklamak, aynı hücre için
    // beginEditCell'i yeniden çağırıp editSeed'i null'lıyordu; bu da
    // GridTextCell'in key'ini değiştirip input'u remount ediyor ve yazılanı
    // siliyordu.
    await cell.locator("input").click({ position: { x: 20, y: 15 } });
    await expect(cell.locator("input")).toHaveValue("ab");
  });

  test("draws the header without a fill of its own, like Notion", async ({
    page,
  }) => {
    const [headerBg, pageBg] = await Promise.all([
      table.header.evaluate((el) => getComputedStyle(el).backgroundColor),
      page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    ]);

    // Notion'da başlık satırı ayrı bir gri bant değildir; sticky olduğu için
    // sayfa arka planını taşır.
    expect(headerBg).toBe(pageBg);
  });
});
