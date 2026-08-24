import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const prodEnv = loadEnv("production", process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      env: {
        ...prodEnv,
        ...env,
      },
      include: ["src/**/*.browser.test.tsx"],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({ launchOptions: { channel: "chrome" } }),
        instances: [{ browser: "chromium" }],
        viewport: { width: 320, height: 900 },
      },
    },
  };
});
