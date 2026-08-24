import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// `@/` alias'ı tsconfig.json'daki paths ile aynı: depo kökü.
const rootDir = fileURLToPath(new URL(".", import.meta.url));

const alias = { "@": rootDir };

export default defineConfig({
  test: {
    // İki ayrı katman, iki ayrı çalışma ortamı. tests/e2e Playwright'a ait,
    // Vitest oraya hiç bakmaz.
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "convex",
          include: ["tests/convex/**/*.test.ts"],
          // convex-test, Convex backend'ini taklit ederken edge runtime'ın
          // global'lerine (TextEncoder, crypto, ...) ihtiyaç duyar.
          environment: "edge-runtime",
          server: {
            // convex-test, convex/ altındaki fonksiyon modüllerini
            // `import.meta.glob` ile toplar; bunun dönüşmesi için paketin
            // externalize edilmeyip inline edilmesi gerekir.
            deps: { inline: ["convex-test"] },
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "components/database/**/*.ts",
        "convex/**/*.ts",
        "lib/**/*.ts",
      ],
      exclude: ["convex/_generated/**"],
      // Eşik, o an **ölçülen** değerin hemen altına konur ve her adımda yukarı
      // çekilir (karar: docs/memory/decisions.md). Baştan %80 koyup gate'i
      // sürekli kırmızı bırakmak yerine, kapsamın geri gitmesini engeller.
      // 2026-08-25 ölçümü: toplam 31.89/23.47/38.71/32.94,
      // convex/lib 40.59/18.61/68.88/42.38.
      thresholds: {
        statements: 31,
        branches: 23,
        functions: 38,
        lines: 32,
        "convex/lib/**": {
          statements: 40,
          branches: 18,
          functions: 68,
          lines: 42,
        },
      },
    },
  },
});
