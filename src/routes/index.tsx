import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone, Zap, QrCode, Globe2, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JustTap — Multi-Tenant NFC & Digital Business Cards" },
      {
        name: "description",
        content:
          "One tap to share your entire professional identity. Optimized for physical NFC business cards and digital sharing.",
      },
      { property: "og:title", content: "JustTap — Multi-Tenant NFC Digital Cards" },
      {
        property: "og:description",
        content: "One tap. Contact saved. Digital business cards for NFC.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground flex flex-col justify-between">
      {/* NAVBAR */}
      <header className="w-full border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex min-h-11 items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary border border-[#E6D5AC]/20 flex items-center justify-center font-extrabold text-primary-foreground text-xl shadow-lg shadow-[rgba(107,33,168,0.25)]">
              J
            </div>
            <span className="font-display font-extrabold text-xl text-foreground tracking-tight">
              JustTap
            </span>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              to="/auth"
              className="inline-flex min-h-11 items-center py-2.5 px-4 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>

            <Link
              to="/dashboard"
              className="min-h-11 py-2.5 px-5 bg-primary hover:bg-[#7E22CE] text-primary-foreground font-bold text-xs rounded-2xl shadow-lg shadow-[rgba(107,33,168,0.25)] flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
            >
              <span>Client Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background glow circle */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(107,33,168,0.18)] blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-bold text-[#E6D5AC]">
            <Sparkles className="w-4 h-4" />
            <span>Multi-Tenant NFC & Digital Business Card SaaS</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-black text-foreground tracking-tight leading-[1.15]">
            One Tap to Share Your Entire Professional Identity
          </h1>

          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Optimized for physical NFC business cards and digital sharing. Stream dynamic vCards,
            Apple Wallet passes, collect visitor leads, and track analytics seamlessly.
          </p>

          {/* CTA BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/auth"
              className="w-full sm:w-auto py-4 px-8 bg-primary hover:bg-[#7E22CE] text-primary-foreground font-extrabold text-sm rounded-2xl shadow-xl shadow-[rgba(107,33,168,0.25)] flex items-center justify-center space-x-2 transition-all hover:scale-[1.03]"
            >
              <span>Create Your Card Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/builder"
              className="w-full sm:w-auto py-4 px-8 bg-card hover:bg-secondary text-foreground font-bold text-sm rounded-2xl border border-border flex items-center justify-center space-x-2 transition-all"
            >
              <Smartphone className="w-4 h-4 text-[#E6D5AC]" />
              <span>Instant Guest Sandbox</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
            Everything You Need in One Tap
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Built for physical NFC cards, QR codes, and digital networking
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="justtap-glass-card rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 text-[#E6D5AC] flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Dynamic vCard & Apple Wallet
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Instant contact downloading via dynamic <code className="text-[#E6D5AC]">.vcf</code>{" "}
              generation and signed Apple Wallet <code className="text-[#E6D5AC]">.pkpass</code>{" "}
              passes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="justtap-glass-card rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E6D5AC]/10 border border-[#E6D5AC]/30 text-[#E6D5AC] flex items-center justify-center">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Bilingual Arabic & English
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Native RTL layout support and custom Arabic translations for full name, job title, and
              bio fields.
            </p>
          </div>

          {/* Card 3 */}
          <div className="justtap-glass-card rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 text-[#E6D5AC] flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Offline QR & Lockscreen Wallpaper
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate offline scannable QR codes and custom 1080x1920px smartphone lockscreen
              wallpapers.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-8 px-4 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; {new Date().getFullYear()} JustTap. All rights reserved.</span>
          <div className="flex items-center space-x-4">
            <Link to="/builder" className="hover:text-foreground">
              Guest Sandbox
            </Link>
            <Link to="/dashboard" className="hover:text-foreground">
              Client Portal
            </Link>
            <Link to="/admin" className="hover:text-foreground">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
