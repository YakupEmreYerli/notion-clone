import { expect, test, type Page } from "@playwright/test";

import { assertNoUnexpectedClipping } from "./helpers/clipping";

async function openSeededBoard(page: Page) {
  await page.goto(
    process.env.PLAYWRIGHT_BOARD_PATH ?? "/test-fixtures/clipping",
  );
  if (await page.locator("[data-board-fixture]").isVisible()) return;

  const boardTab = page.getByRole("button", { name: "Board", exact: true });
  await expect(boardTab).toBeVisible();
  if ((await boardTab.getAttribute("data-state")) !== "active") {
    await boardTab.click();
  }
  await expect(page.locator("[data-board-viewport]")).toBeVisible();
  await expect(page.getByTestId("board-column").first()).toBeVisible();
}

test.describe("Board surface clipping", () => {
  test.beforeEach(async ({ page }) => {
    await openSeededBoard(page);
  });

  test("first, last and add-card surfaces are fully visible", async ({
    page,
  }) => {
    const cards = page.getByTestId("board-card");
    await expect(cards).toHaveCount(process.env.PLAYWRIGHT_BOARD_PATH ? 3 : 4);

    await assertNoUnexpectedClipping(cards.first(), { includeShadow: true });
    await assertNoUnexpectedClipping(cards.last(), { includeShadow: true });
    const addCard = page.getByTestId("board-add-card").first();
    await assertNoUnexpectedClipping(addCard, { includeShadow: true });
    await expect(addCard).toHaveCSS("color", "rgb(142, 139, 134)");
  });

  test("first column starts at the board viewport edge", async ({ page }) => {
    const viewport = await page.locator("[data-board-viewport]").boundingBox();
    const firstColumn = await page
      .getByTestId("board-column")
      .first()
      .boundingBox();

    expect(viewport).not.toBeNull();
    expect(firstColumn).not.toBeNull();
    expect(firstColumn!.x).toBeCloseTo(viewport!.x, 0);
  });

  test("column owns the rounded surface without a separate header block", async ({
    page,
  }) => {
    const column = page.getByTestId("board-column").first();
    const header = page.getByTestId("board-column-header").first();

    await expect(column).toHaveCSS("border-radius", "10px");
    await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(header).toHaveCSS("border-radius", "0px");
    await assertNoUnexpectedClipping(header);
  });

  test("hover and focus controls remain inside the card surface", async ({
    page,
  }) => {
    const card = page.getByTestId("board-card").first();
    await card.hover();
    const actions = card.getByTestId("board-card-actions");
    const title = card.getByTestId("board-card-title");
    await expect(actions).toBeVisible();
    for (const name of ["Drag card", "Card actions"]) {
      const action = card.getByRole("button", { name });
      await expect(action).not.toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await expect(action).not.toHaveCSS("box-shadow", "none");
    }
    await assertNoUnexpectedClipping(actions);
    const intersection = await actions.evaluate(
      (element, titleElement) => {
        const actionRect = element.getBoundingClientRect();
        const titleRect = titleElement.getBoundingClientRect();
        return {
          width: Math.max(
            0,
            Math.min(actionRect.right, titleRect.right) -
              Math.max(actionRect.left, titleRect.left),
          ),
          height: Math.max(
            0,
            Math.min(actionRect.bottom, titleRect.bottom) -
              Math.max(actionRect.top, titleRect.top),
          ),
        };
      },
      await title.elementHandle(),
    );
    expect(intersection.width * intersection.height).toBe(0);

    const openButton = card.locator(":scope > button");
    await openButton.focus();
    await assertNoUnexpectedClipping(openButton);
  });

  test("card title wrapping stays stable when drag is disabled", async ({
    page,
  }) => {
    test.skip(
      !(await page.locator("[data-board-fixture]").isVisible()),
      "Uses the deterministic drag toggle fixture",
    );
    const title = page.getByTestId("board-card-title").last();
    const before = await title.boundingBox();

    await page
      .getByRole("button", { name: "Disable board drag" })
      .evaluate((button: HTMLButtonElement) => button.click());

    await expect(title).toBeVisible();
    const after = await title.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
  });

  test("card actions button opens the row actions menu", async ({ page }) => {
    const card = page.getByTestId("board-card").first();
    await card.hover();
    await card.getByRole("button", { name: "Card actions" }).click();

    await expect(page.getByRole("menuitem", { name: "Open" })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Duplicate" }),
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  });

  test("dropdown and context menu escape board overflow", async ({ page }) => {
    if (await page.locator("[data-board-fixture]").isVisible()) {
      await page.getByRole("button", { name: "Property", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("menuitem", { name: /Property visibility/ }).hover();
    }
    const dropdown = page
      .locator('[data-slot="dropdown-menu-content"]')
      .last();
    await expect(dropdown).toBeVisible();
    await assertNoUnexpectedClipping(dropdown, { includeShadow: true });
    await page.keyboard.press("Escape");

    if (process.env.PLAYWRIGHT_BOARD_PATH) {
      const column = page.getByTestId("board-column").first();
      await column.hover();
      await page
        .getByRole("button", { name: "More group options" })
        .first()
        .click();
    } else {
      await page.getByRole("button", { name: "Open context menu" }).click();
    }
    const contextMenu = page.getByRole("menu");
    await expect(contextMenu).toBeVisible();
    await assertNoUnexpectedClipping(contextMenu, { includeShadow: true });
  });

  test("1440x900 board screenshot", async ({ page }) => {
    await page.getByTestId("board-card").first().hover();
    await expect(page).toHaveScreenshot("board-surfaces.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("shared database toolbar remains available across views", async ({
    page,
  }) => {
    test.skip(
      await page.locator("[data-board-fixture]").isVisible(),
      "Requires an authenticated database path",
    );

    for (const name of ["Filter", "Sort", "Search", "Settings"]) {
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible();
    }

    const tableTab = page.getByRole("button", { name: "Table", exact: true });
    test.skip((await tableTab.count()) === 0, "Database has no Table view");
    await tableTab.click();

    for (const name of ["Filter", "Sort", "Search", "Settings"]) {
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible();
    }
  });
});
