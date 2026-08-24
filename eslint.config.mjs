import coreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [".next/**", "node_modules/**", "convex/_generated/**", ".claude/**"],
  },
  ...coreWebVitals,
];
