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

  async cell(row: number, column: number) {
    // Gridcell'ler yalnızca veri satırlarında bulunur (header columnheader
    // kullanır). Sütun sayısını header'dan alıp düz index hesaplarız.
    const columns = await this.grid
      .locator('[role="row"]')
      .first()
      .locator('[role="columnheader"]')
      .count();
    return this.grid
      .locator('[role="gridcell"]')
      .nth(row * columns + column);
  }

  get fillHandle() {
    return this.page.getByLabel("Fill cell value down");
  }

  /**
   * Klavye girdisini grid'e yönlendirir. Escape'ten sonra odak `body`'ye
   * düşüyor; grid'in `onKeyDown`'ı çalışsın diye açıkça odaklamak gerekiyor.
   */
  focusGrid() {
    return this.grid.focus();
  }

  /** Bir hücreyi seçili (idle) hale getirir: tıkla → düzenle → Esc. */
  async selectCell(row: number, column: number) {
    const cell = await this.cell(row, column);
    await cell.click();
    await this.page.keyboard.press("Escape");
    return cell;
  }

  /**
   * Fill tutamacını `dy` piksel dikey sürükler ve sürükleme SIRASINDA
   * vurgulanan hücre sayısını döndürür — bırakma sonrası vurgu takılı kalırsa
   * ikinci değer bunu yakalar.
   */
  async dragFillHandle(dy: number) {
    const box = await this.fillHandle.boundingBox();
    if (!box) throw new Error("Fill handle is not visible");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y + dy, { steps: 8 });
    const duringDrag = await this.highlightedCellCount();
    await this.page.mouse.up();
    return { duringDrag, afterRelease: await this.highlightedCellCount() };
  }

  /** Fill sürüklemesinin hedef aralığındaki hücre sayısı. */
  highlightedCellCount() {
    return this.grid
      .locator('[role="row"][data-row-id] [role="gridcell"][data-fill-range]')
      .count();
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
