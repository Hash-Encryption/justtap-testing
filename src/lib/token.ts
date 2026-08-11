export const TAG_TOKEN_REGEX = /^[A-Za-z0-9_-]{32}$/;

export function generateTagToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // base64url encoding without padding
  const base64 = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function validateTagToken(token: unknown): token is string {
  return typeof token === "string" && TAG_TOKEN_REGEX.test(token);
}
