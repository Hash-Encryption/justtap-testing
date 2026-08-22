import type { Session } from "@supabase/supabase-js";

export type TrialResult = { ok: true; trialEndsAt: Date } | { ok: false; error: string };

/**
 * Start a 7-day Pro trial for the authenticated user.
 *
 * Calls the trusted /api/trial-start server route, which calls the
 * start_pro_trial() SECURITY DEFINER Postgres RPC. Returns success only
 * after the backend confirms the trial was recorded.
 *
 * The client never sets plan_tier, trial_started_at, or trial_ends_at directly.
 *
 * BILLING EXTENSION POINT: when Stripe payment methods are collected, extend
 * this function to collect and attach a payment method before calling
 * /api/trial-start. The server route body is where Stripe verification connects.
 * The trial-start RPC and this function stay identical; only the server route
 * gains a Stripe step before calling the RPC.
 */
export async function startProTrial(session: Session): Promise<TrialResult> {
  let response: Response;
  try {
    response = await fetch("/api/trial-start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch {
    return { ok: false, error: "Network error — please check your connection and try again." };
  }

  let body: { ok: boolean; trialEndsAt?: string; error?: string };
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: "Unexpected server response." };
  }

  if (!response.ok || !body.ok) {
    return { ok: false, error: body.error ?? "Trial could not be started." };
  }

  if (!body.trialEndsAt) {
    return { ok: false, error: "Server did not return a trial end date." };
  }

  return { ok: true, trialEndsAt: new Date(body.trialEndsAt) };
}
