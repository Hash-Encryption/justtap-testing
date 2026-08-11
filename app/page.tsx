import React from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Zap,
  QrCode,
  Globe2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Download,
  Users,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-violet-500 selection:text-white flex flex-col justify-between">
      {/* NAVBAR */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-violet-600/30">
              J
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">JustTap</span>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href="/auth"
              className="py-2.5 px-4 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>

            <Link
              href="/dashboard"
              className="py-2.5 px-5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-violet-600/25 flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-400">
            <Sparkles className="w-4 h-4" />
            <span>Multi-Tenant NFC & Digital Business Card SaaS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15]">
            One Tap to Share Your Entire Professional Identity
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Optimized for physical NFC business cards and digital sharing. Stream dynamic vCards, Apple Wallet passes, collect visitor leads, and track analytics seamlessly.
          </p>

          {/* CTA BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/auth"
              className="w-full sm:w-auto py-4 px-8 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-violet-600/30 flex items-center justify-center space-x-2 transition-all hover:scale-[1.03]"
            >
              <span>Create Your Card Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/builder"
              className="w-full sm:w-auto py-4 px-8 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-2xl border border-slate-800 flex items-center justify-center space-x-2 transition-all"
            >
              <Smartphone className="w-4 h-4 text-violet-400" />
              <span>Instant Guest Sandbox</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Everything You Need in One Tap</h2>
          <p className="text-xs sm:text-sm text-slate-400">Built for physical NFC cards, QR codes, and digital networking</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-violet-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Dynamic vCard & Apple Wallet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant contact downloading via dynamic <code className="text-violet-300">.vcf</code> generation and signed Apple Wallet <code className="text-violet-300">.pkpass</code> passes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-violet-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Bilingual Arabic & English</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Native RTL layout support and custom Arabic translations for full name, job title, and bio fields.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-violet-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Offline QR & Lockscreen Wallpaper</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate offline scannable QR codes and custom 1080x1920px smartphone lockscreen wallpapers.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; {new Date().getFullYear()} JustTap. All rights reserved.</span>
          <div className="flex items-center space-x-4">
            <Link href="/builder" className="hover:text-slate-300">Guest Sandbox</Link>
            <Link href="/dashboard" className="hover:text-slate-300">Client Portal</Link>
            <Link href="/admin" className="hover:text-slate-300">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
