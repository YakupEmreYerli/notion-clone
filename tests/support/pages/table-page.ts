import { type Page } from "@playwright/test";

/** `/test-fixtures/table` üzerindeki Notion-benzeri tablo görünümü. */
export class TablePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/test-fixtures/table");
  }

  get root() {
    return this.page.locator("[data-table-fixture]");
  }

  get header() {
    return this.page.getByTestId("database-header");
  }

  get grid() {
    return this.page.getByRole("grid");
  }

  columnHeader(index: number) {
    return this.page.getByTestId("database-column-header").nth(index);
  }

  /** Sütun başlığına tıklayıp özellik menüsünü açar. */
  async openPropertyMenu(name: string) {
    await this.page.getByText(name, { exact: true }).click();
    return this.propertyMenu;
  }

  get propertyMenu() {
    return this.page.locator('[data-slot="dropdown-menu-content"]');
  }

  menuItem(name: string) {
    return this.page.getByRole("menuitem", { name });
  }

  /** Özellik menüsünden ikon kataloğunu açar. */
  async openIconPicker() {
    await this.page.getByRole("button", { name: "Change icon" }).click();
    return this.iconPicker;
  }

  get iconPicker() {
    return this.page.getByLabel("Icon", { exact: true });
  }

  get iconGrid() {
    return this.iconPicker.locator("[data-property-icon-grid]");
  }

  icon(name: string) {
    return this.page.getByRole("button", { name, exact: true });
  }

  /** İkon kataloğunu fare tekerleğiyle aşağı sürer. */
  async scrollIconGrid(delta: number) {
    await this.iconGrid.hover();
    await this.page.mouse.wheel(0, delta);
  }
}
