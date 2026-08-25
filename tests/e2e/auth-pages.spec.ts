import { expect, test } from "@playwright/test";

test.describe("Auth pages", () => {
  test("shows the split-screen shell and the sign-in form", async ({ page }) => {
    await page.goto("/login");

    // Sol marka paneli geniş ekranda görünür, formun soluna oturur.
    const panel = page.getByText("Zotion", { exact: true });
    await expect(panel).toBeVisible();
    await expect(
      page.getByText(/Your notes, databases and plans/),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Log in to Zotion" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });

  test("hides the brand panel on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    // Panel `lg` altında kaybolur; form tam genişliği alır ve sayfa yatay
    // kaymaz.
    await expect(
      page.getByText(/Your notes, databases and plans/),
    ).toBeHidden();
    const dimensions = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.bodyWidth).toBe(dimensions.viewportWidth);
  });

  test("renders the first-run setup form with every field", async ({ page }) => {
    // Gerçek /register yalnızca hesapsız bir kurulumda açılır; fixture aynı
    // kabuk ve formu veritabanından bağımsız render eder.
    await page.goto("/test-fixtures/register");

    await expect(
      page.getByRole("heading", { name: "Set up Zotion" }),
    ).toBeVisible();
    for (const field of [
      "First Name",
      "Last Name",
      "Email",
      "Confirm Password",
    ]) {
      await expect(page.getByLabel(field, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Register" })).toBeVisible();
  });

  test("refuses to submit when the two passwords differ", async ({ page }) => {
    await page.goto("/test-fixtures/register");

    await page.getByLabel("First Name", { exact: true }).fill("Ada");
    await page.getByLabel("Last Name", { exact: true }).fill("Lovelace");
    await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
    await page.getByLabel("Password", { exact: true }).fill("hunter2hunter2");
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill("hunter2hunter3");
    await page.getByRole("button", { name: "Register" }).click();

    await expect(
      page.locator("form").getByRole("alert"),
    ).toHaveText("Passwords do not match.");
  });
});
