import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Rapport de couverture généré (ITEM-057, `pnpm test:coverage`) — jamais commité.
    "coverage/**",
    // Rapports Playwright générés (ITEM-058, `pnpm test:e2e`) — jamais commités.
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
