export function validateRedirectUrl(target: string | undefined | null): string {
  if (!target) return "/dashboard";
  const trimmed = target.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("\\") &&
    !trimmed.includes("://")
  ) {
    return trimmed;
  }
  return "/dashboard";
}

export function formatAuthErrorMessage(error: unknown): string {
  if (!error) return "An unexpected authentication error occurred.";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("Invalid login credentials")) return "Invalid email or password.";
    if (msg.includes("User already registered"))
      return "An account with this email already exists.";
    if (msg.includes("Password should be at least"))
      return "Password must be at least 6 characters.";
    if (msg.includes("Email not confirmed"))
      return "Please verify your email address before signing in.";
    return msg;
  }
  return "Authentication failed. Please try again.";
}
