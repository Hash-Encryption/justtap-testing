type LiveTestAccount = { email: string; password: string };

function readAccount(prefix: "ADMIN" | "USER_A" | "USER_B"): LiveTestAccount | null {
  const email = process.env[`JUSTTAP_TEST_${prefix}_EMAIL`]?.trim();
  const password = process.env[`JUSTTAP_TEST_${prefix}_PASSWORD`]?.trim();
  return email && password ? { email, password } : null;
}

export const liveTestAdmin = readAccount("ADMIN");
export const liveTestUserA = readAccount("USER_A");
export const liveTestUserB = readAccount("USER_B");
