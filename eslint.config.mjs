import coreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  {
    // `coverage/**` Vitest'in ürettiği HTML raporu — kaynak değil, lint'lenmez.
    ignores: [
      ".next/**",
      "node_modules/**",
      "convex/_generated/**",
      ".claude/**",
      "coverage/**",
    ],
  },
  ...coreWebVitals,
];
