import { defineConfig, devices } from "@playwright/test";

/**
 * Separate config for the README gallery: same browser as the E2E suite, but
 * rooted at `scripts/screenshots` so `npm run test:e2e` never regenerates PNGs.
 */
export default defineConfig({
  testDir: "./scripts/screenshots",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    // Viewport and deviceScaleFactor are NOT set here: the spec builds its own
    // context per shot (each locale has its own signed-in storage state), and
    // `use` does not reach a context created with `browser.newContext()`.
    // `scripts/screenshots/shots.ts` owns both values.
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
