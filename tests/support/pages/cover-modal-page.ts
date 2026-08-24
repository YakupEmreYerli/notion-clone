import { type Page } from "@playwright/test";

/** `/test-fixtures/cover-modal` üzerindeki kapak görseli modal'ı. */
export class CoverModalPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/test-fixtures/cover-modal");
  }

  get root() {
    return this.page.locator("[data-cover-modal-fixture]");
  }

  get dialog() {
    return this.page.getByRole("dialog", { name: "Page cover" });
  }

  get tablist() {
    return this.dialog.getByRole("tablist");
  }

  tab(name: string) {
    return this.dialog.getByRole("tab", { name });
  }

  button(name: string) {
    return this.dialog.getByRole("button", { name });
  }

  get gallery() {
    return this.dialog.locator("[data-cover-gallery]");
  }

  get galleryCells() {
    return this.gallery.getByRole("button");
  }

  /** Kapak üstündeki "Change cover / Remove" şeridi. */
  get coverControls() {
    return this.page.getByTestId("page-cover-controls");
  }

  get imageLink() {
    return this.dialog.getByRole("textbox", { name: "Image link" });
  }

  async scrollGallery(delta: number) {
    await this.gallery.hover();
    await this.page.mouse.wheel(0, delta);
  }
}
