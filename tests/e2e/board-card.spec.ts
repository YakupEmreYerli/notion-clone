import { expect, test } from "@playwright/test";

import { BoardPage } from "@/tests/support/pages/board-page";

/**
 * Kart hover aksiyonları — Notion ölçümüne göre (bkz.
 * docs/notion-research/board-parity.md): sürükleme butonu YOK, tek çip içinde
 * "Edit title" ve "Card actions". Edit'e basınca başlık yerinde düzenlenir ve
 * buton side-peek'e dönüşür; ikinci tık peek'i açar.
 */
test.describe("Board card actions", () => {
  let board: BoardPage;

  test.beforeEach(async ({ page }) => {
    board = new BoardPage(page);
    await board.goto();
  });

  test("has no drag button — the card itself is the drag surface", async () => {
    const card = board.cards.first();
    await board.revealCardActions(card);

    await expect(card.getByRole("button", { name: "Drag card" })).toHaveCount(0);
    await expect(board.cardEditButton(card)).toBeVisible();
  });

  test("edit button opens inline title editing, then opens the side peek", async () => {
    test.skip(
      !(await board.isFixture()),
      "Açılan satırı yalnızca fixture gözlemlenebilir kılıyor.",
    );

    const card = board.cards.first();
    await board.revealCardActions(card);

    // 1. tık: başlık yerinde düzenlemeye açılır, buton side-peek'e döner.
    await board.cardEditButton(card).click();
    await expect(board.cardTitleInput(card)).toBeFocused();
    await expect(board.cardPeekButton(card)).toBeVisible();
    expect(await board.openedRowId()).toBeNull();

    // 2. tık: peek açılır. Regresyon — iki ayrı hata bunu engelliyordu:
    // düzenleme katmanı çipin üstünü kaplıyordu (buton tıklanamıyordu) ve
    // input'un blur'ü tıklamadan önce çalışıp butonu pencil'a geri
    // döndürüyordu.
    await board.cardPeekButton(card).click();
    expect(await board.openedRowId()).not.toBeNull();
    await expect(board.cardTitleInput(card)).toHaveCount(0);
  });

  test("keeps the actions visible while the menu is open and clears them after", async ({
    page,
  }) => {
    const card = board.cards.first();
    const actions = await board.revealCardActions(card);

    await card.getByRole("button", { name: "Card actions" }).click();
    await expect(actions).toHaveCSS("opacity", "1");

    await page.keyboard.press("Escape");
    await page.mouse.move(5, 5);
    // Regresyon: menü portal'a taşındığı için kart mouseleave alıyor, eskiden
    // aksiyonlar "takılı" kalıyordu.
    await expect(actions).toHaveCSS("opacity", "0");
  });
});
