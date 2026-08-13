import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { formatAuthErrorMessage, validateRedirectUrl } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    mode: z.enum(["signin", "signup"]).optional(),
    claim_draft: z.boolean().optional(),
    redirect: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — JustTap NFC Digital Business Cards" },
      {
        name: "description",
        content: "Sign in or create an account to manage your NFC digital business card.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [isSignUp, setIsSignUp] = useState(search.mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const redirectTarget = validateRedirectUrl(search.redirect);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        setMessage({
          type: "success",
          text: "Account created! Redirecting...",
        });

        setTimeout(() => void navigate({ to: redirectTarget as "/dashboard" }), 1200);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage({ type: "success", text: "Sign in successful! Redirecting..." });
        setTimeout(() => void navigate({ to: redirectTarget as "/dashboard" }), 800);
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setMessage({
        type: "error",
        text: formatAuthErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-glow min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-sans selection:bg-primary selection:text-primary-foreground">
      {/* BRANDING */}
      <Link to="/" className="mb-8 flex items-center space-x-2 group">
        <div className="w-10 h-10 rounded-2xl bg-primary border border-[#E6D5AC]/20 flex items-center justify-center font-extrabold text-primary-foreground text-xl shadow-lg shadow-[rgba(107,33,168,0.25)] group-hover:scale-105 transition-transform">
          J
        </div>
        <span className="font-display font-extrabold text-2xl text-foreground tracking-tight">
          JustTap
        </span>
      </Link>

      {/* AUTH CARD */}
      <div className="justtap-glass w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-display text-2xl font-extrabold text-foreground">
            {isSignUp ? "Create JustTap Account" : "Welcome Back"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isSignUp
              ? "Start building your physical NFC and digital business card profile"
              : "Sign in to access your card editor, leads, and analytics"}
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Hashim Alnimari"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-primary hover:bg-[#7E22CE] text-primary-foreground font-bold rounded-2xl shadow-xl shadow-[rgba(107,33,168,0.25)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Processing..." : isSignUp ? "Create Free Account" : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center border-t border-border">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(null);
            }}
            className="min-h-11 px-3 text-xs text-muted-foreground hover:text-[#E6D5AC] font-medium transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up free"}
          </button>
        </div>
      </div>
    </div>
  );
}
