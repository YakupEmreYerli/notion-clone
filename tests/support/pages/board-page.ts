import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Board görünümünün page-object'i.
 *
 * Senaryolar "ne" yaptığını anlatır (`openCardActionsMenu`), "nasıl"ı — seçici,
 * hover sırası, fixture/gerçek-uygulama dallanması — burada durur.
 *
 * İki kaynak destekler: izole fixture route'u (`/test-fixtures/clipping`) ve
 * `PLAYWRIGHT_BOARD_PATH` ile verilen, oturum açılmış gerçek bir veritabanı.
 */
export class BoardPage {
  /** Oturum açılmış gerçek board yolu; verilmezse izole fixture kullanılır. */
  static readonly seededPath = process.env.PLAYWRIGHT_BOARD_PATH;

  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(BoardPage.seededPath ?? "/test-fixtures/clipping");
    if (await this.isFixture()) return;

    const boardTab = this.page.getByRole("button", {
      name: "Board",
      exact: true,
    });
    await expect(boardTab).toBeVisible();
    if ((await boardTab.getAttribute("data-state")) !== "active") {
      await boardTab.click();
    }
    await expect(this.viewport).toBeVisible();
    await expect(this.columns.first()).toBeVisible();
  }

  /** Fixture route'unda mıyız, gerçek uygulamada mı? */
  isFixture() {
    return this.page.locator("[data-board-fixture]").isVisible();
  }

  get viewport() {
    return this.page.locator("[data-board-viewport]");
  }

  get columns() {
    return this.page.getByTestId("board-column");
  }

  get columnHeaders() {
    return this.page.getByTestId("board-column-header");
  }

  get cards() {
    return this.page.getByTestId("board-card");
  }

  get addCard() {
    return this.page.getByTestId("board-add-card").first();
  }

  cardTitle(card: Locator) {
    return card.getByTestId("board-card-title");
  }

  cardActions(card: Locator) {
    return card.getByTestId("board-card-actions");
  }

  /** Kart üstüne gelip aksiyon şeridini görünür kılar. */
  async revealCardActions(card: Locator) {
    await card.hover();
    const actions = this.cardActions(card);
    await expect(actions).toBeVisible();
    return actions;
  }

  async openCardActionsMenu(card: Locator) {
    await card.hover();
    await card.getByRole("button", { name: "Card actions" }).click();
  }

  /** Fixture'da görünmez düğme, gerçek board'da sürükleme zaten kapalı. */
  async disableDrag() {
    await this.page
      .getByRole("button", { name: "Disable board drag" })
      .evaluate((button: HTMLButtonElement) => button.click());
  }

  /** Board taşmasından kaçması gereken bir açılır menü açar. */
  async openOverflowDropdown() {
    if (await this.isFixture()) {
      await this.page
        .getByRole("button", { name: "Property", exact: true })
        .click();
    } else {
      await this.page
        .getByRole("button", { name: "Settings", exact: true })
        .click();
      await this.page
        .getByRole("menuitem", { name: /Property visibility/ })
        .hover();
    }
    return this.page.locator('[data-slot="dropdown-menu-content"]').last();
  }

  async openContextMenu() {
    if (await this.isFixture()) {
      await this.page.getByRole("button", { name: "Open context menu" }).click();
    } else {
      await this.columns.first().hover();
      await this.page
        .getByRole("button", { name: "More group options" })
        .first()
        .click();
    }
    return this.page.getByRole("menu");
  }

  toolbarButton(name: string) {
    return this.page.getByRole("button", { name, exact: true });
  }

  get tableTab() {
    return this.page.getByRole("button", { name: "Table", exact: true });
  }
}
