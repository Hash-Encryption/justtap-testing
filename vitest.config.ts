import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const prodEnv = loadEnv("production", process.cwd(), "");

  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      env: {
        ...prodEnv,
        ...env,
      },
      exclude: ["**/node_modules/**", "**/.git/**", "src/**/*.browser.test.tsx"],
      testTimeout: 20000,
      fileParallelism: false,
    },
  };
});
