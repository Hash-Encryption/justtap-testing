import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitization";

export const Route = createFileRoute("/api/admin-auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { getAdminEnvironment } = await import("@/lib/server-env");
          const adminEnv = getAdminEnvironment();

          if (!adminEnv) {
            return new Response(JSON.stringify({ error: "Admin authentication is unavailable" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          }

          const clientIp =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            request.headers.get("cf-connecting-ip") ||
            "anonymous";

          // Rate limit admin authentication attempts (max 5 per 15 mins)
          const rateCheck = checkRateLimit(`admin_login:${clientIp}`, 5, 15 * 60_000);
          if (!rateCheck.allowed) {
            return new Response(
              JSON.stringify({
                error: `Too many failed admin login attempts. Locked for ${Math.ceil(rateCheck.resetMs / 60_000)} minutes.`,
              }),
              {
                status: 429,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const body = await request.json();
          const { username, password, token, action } = body;

          // Action 1: Verify Token
          if (action === "verify") {
            const expectedToken = btoa(`${adminEnv.ADMIN_USERNAME}:${adminEnv.ADMIN_SECRET_KEY}`);
            const isValid = token === expectedToken;
            return new Response(JSON.stringify({ authenticated: isValid }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Action 2: Login Credentials Verification
          const cleanUser = sanitizeText(username || "", 100).trim();
          const cleanPass = String(password || "").trim();

          const isUserMatch = cleanUser.toLowerCase() === adminEnv.ADMIN_USERNAME.toLowerCase();
          const isPassMatch = cleanPass === adminEnv.ADMIN_PASSWORD;

          if (isUserMatch && isPassMatch) {
            const sessionToken = btoa(`${adminEnv.ADMIN_USERNAME}:${adminEnv.ADMIN_SECRET_KEY}`);
            return new Response(
              JSON.stringify({
                success: true,
                token: sessionToken,
                username: adminEnv.ADMIN_USERNAME,
                message: "Admin authentication successful",
              }),
              {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "X-Content-Type-Options": "nosniff",
                },
              },
            );
          }

          return new Response(JSON.stringify({ error: "Invalid admin credentials" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ error: "Admin authentication request failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
