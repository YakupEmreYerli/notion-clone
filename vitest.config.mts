import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// `@/` alias'ı tsconfig.json'daki paths ile aynı: depo kökü.
const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": rootDir },
  },
  test: {
    // Sadece unit katmanı. tests/e2e Playwright'a ait, Vitest oraya bakmaz.
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "components/database/**/*.ts",
        "convex/lib/**/*.ts",
        "lib/**/*.ts",
      ],
    },
  },
});
