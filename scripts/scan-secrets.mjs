import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["GitHub token", /(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}/g],
  ["provider secret", /(?:sk_(?:live|test)_|sk-|AKIA|AIza)[A-Za-z0-9_-]{16,}/g],
  ["JWT", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g],
  [
    "hard-coded credential",
    /\b[A-Za-z_$][\w$]*(?:password|passwd|pass|secret|serviceRoleKey|service_role_key|accessToken|access_token|apiKey|api_key)\b\s*[:=]\s*["'`][^"'`\r\n]{6,}["'`]/gi,
  ],
  [
    "literal live-test login",
    /getOrCreateTestUser\(\s*["'`][^"'`]+["'`]\s*,\s*["'`][^"'`]+["'`]\s*\)/g,
  ],
  ["credential in URL", /https?:\/\/[^\s/:@]+:[^\s/@]+@/g],
];

const findings = [];
for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (source.includes("\0")) continue;

  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      if (file === ".env.production" && name === "JWT") {
        // VITE_SUPABASE_ANON_KEY is intentionally public frontend config
        continue;
      }
      const line = source.slice(0, match.index).split("\n").length;
      findings.push(`${file}:${line} ${name}`);
    }
  }
}

if (findings.length) {
  console.error(`Secret scan failed (${findings.length} finding(s)):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} tracked/unignored files checked).`);
