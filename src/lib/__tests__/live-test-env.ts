import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type LiveTestAccount = { email: string; password: string };

function loadLocalEnvFiles() {
  const envFiles = [".env.local", ".env.test", ".env"];
  for (const file of envFiles) {
    const fullPath = resolve(process.cwd(), file);
    if (!existsSync(fullPath)) continue;
    try {
      const content = readFileSync(fullPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["'](.*)["']$/, "$1");
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
}

loadLocalEnvFiles();

function readAccount(prefix: "ADMIN" | "USER_A" | "USER_B"): LiveTestAccount | null {
  const email = process.env[`JUSTTAP_TEST_${prefix}_EMAIL`]?.trim();
  const password = process.env[`JUSTTAP_TEST_${prefix}_PASSWORD`]?.trim();
  return email && password ? { email, password } : null;
}

export const liveTestAdmin = readAccount("ADMIN");
export const liveTestUserA = readAccount("USER_A");
export const liveTestUserB = readAccount("USER_B");
