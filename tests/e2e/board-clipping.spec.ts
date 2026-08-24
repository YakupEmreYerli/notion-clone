import { expect, test } from "@playwright/test";

import { assertNoUnexpectedClipping } from "@/tests/support/assertions/clipping";
import { BoardPage } from "@/tests/support/pages/board-page";

test.describe("Board surface clipping", () => {
  let board: BoardPage;

  test.beforeEach(async ({ page }) => {
    board = new BoardPage(page);
    await board.goto();
  });

  test("first, last and add-card surfaces are fully visible", async () => {
    await expect(board.cards).toHaveCount(BoardPage.seededPath ? 3 : 4);

    await assertNoUnexpectedClipping(board.cards.first(), {
      includeShadow: true,
    });
    await assertNoUnexpectedClipping(board.cards.last(), {
      includeShadow: true,
    });
    await assertNoUnexpectedClipping(board.addCard, { includeShadow: true });
    await expect(board.addCard).toHaveCSS("color", "rgb(142, 139, 134)");
  });

  test("first column starts at the board viewport edge", async () => {
    const viewport = await board.viewport.boundingBox();
    const firstColumn = await board.columns.first().boundingBox();

    expect(viewport).not.toBeNull();
    expect(firstColumn).not.toBeNull();
    expect(firstColumn!.x).toBeCloseTo(viewport!.x, 0);
  });

  test("column owns the rounded surface without a separate header block", async () => {
    const column = board.columns.first();
    const header = board.columnHeaders.first();

    await expect(column).toHaveCSS("border-radius", "10px");
    await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(header).toHaveCSS("border-radius", "0px");
    await assertNoUnexpectedClipping(header);
  });

  test("hover and focus controls remain inside the card surface", async () => {
    const card = board.cards.first();
    const actions = await board.revealCardActions(card);
    const title = board.cardTitle(card);

    for (const name of ["Drag card", "Card actions"]) {
      const action = card.getByRole("button", { name });
      await expect(action).not.toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await expect(action).not.toHaveCSS("box-shadow", "none");
    }
    await assertNoUnexpectedClipping(actions);

    // Aksiyon şeridi başlığın üstüne binmemeli: kesişim alanı sıfır olmalı.
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
      !(await board.isFixture()),
      "Uses the deterministic drag toggle fixture",
    );
    const title = page.getByTestId("board-card-title").last();
    const before = await title.boundingBox();

    await board.disableDrag();

    await expect(title).toBeVisible();
    const after = await title.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
  });

  test("card actions button opens the row actions menu", async ({ page }) => {
    await board.openCardActionsMenu(board.cards.first());

    await expect(page.getByRole("menuitem", { name: "Open" })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Duplicate" }),
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  });

  test("dropdown and context menu escape board overflow", async ({ page }) => {
    const dropdown = await board.openOverflowDropdown();
    await expect(dropdown).toBeVisible();
    await assertNoUnexpectedClipping(dropdown, { includeShadow: true });
    await page.keyboard.press("Escape");

    const contextMenu = await board.openContextMenu();
    await expect(contextMenu).toBeVisible();
    await assertNoUnexpectedClipping(contextMenu, { includeShadow: true });
  });

  test("1440x900 board screenshot", async ({ page }) => {
    await board.cards.first().hover();
    await expect(page).toHaveScreenshot("board-surfaces.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("shared database toolbar remains available across views", async () => {
    test.skip(
      await board.isFixture(),
      "Requires an authenticated database path",
    );

    for (const name of ["Filter", "Sort", "Search", "Settings"]) {
      await expect(board.toolbarButton(name)).toBeVisible();
    }

    test.skip((await board.tableTab.count()) === 0, "Database has no Table view");
    await board.tableTab.click();

    for (const name of ["Filter", "Sort", "Search", "Settings"]) {
      await expect(board.toolbarButton(name)).toBeVisible();
    }
  });
});
