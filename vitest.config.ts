import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    // Seuil de couverture indicatif (ITEM-057) : 15 % sur `lib/**` — volontairement
    // pas de `thresholds` Vitest ici (ça ferait échouer `pnpm test:coverage`, donc
    // bloquant), la suite démarre sur la logique critique (autorisation,
    // facturation) et non sur l'ensemble du code. À faire évoluer en seuil
    // bloquant une fois la couverture élargie.
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.d.ts", "lib/**/*.test.ts"],
    },
  },
})
