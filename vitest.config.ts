import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/.git/**", "src/**/*.browser.test.tsx"],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
