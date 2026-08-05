import { createFileRoute, Link } from "@tanstack/react-router";
import { Nfc, QrCode, BarChart3, Inbox, Languages, Palette } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tapt — White-label NFC Digital Business Cards" },
      {
        name: "description",
        content:
          "Launch a fully white-label digital business card platform for NFC cards: live editor, lead capture, analytics and QR codes.",
      },
      { property: "og:title", content: "Tapt — White-label NFC Digital Business Cards" },
      {
        property: "og:description",
        content: "One tap. Contact saved. Multi-tenant digital business cards for NFC.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { Icon: Palette, title: "Live white-label editor", body: "Colors, header cuts, logo badge — every change renders instantly in a mobile preview." },
  { Icon: Nfc, title: "Built for NFC", body: "Each card maps to a fast public /c/slug page tuned for a 375–430px tap-and-go screen." },
  { Icon: Inbox, title: "Lead capture inbox", body: "Visitors exchange their details in a bottom sheet; you export them as CSV." },
  { Icon: BarChart3, title: "Scan analytics", body: "Track page views versus contact downloads for every card you issue." },
  { Icon: QrCode, title: "QR fallback", body: "Download a high-resolution PNG or SVG QR code pointing at the card." },
  { Icon: Languages, title: "Bilingual EN / AR", body: "Optional Arabic fields with a full right-to-left layout switch." },
];

function Landing() {
  return (
    <main className="min-h-screen grid-glow">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-bold tracking-tight">
          tapt<span className="text-primary">.</span>
        </span>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/auth" className="rounded-full px-4 py-2 text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            Open dashboard
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-10 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Nfc className="h-3.5 w-3.5 text-primary" /> Multi-tenant · 100% white-label
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          One tap and your contact is <span className="text-primary">already saved</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          A complete digital business card platform for physical NFC cards — client portal, live card
          editor, lead inbox, analytics and an admin control panel.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Create your card
          </Link>
          <Link
            to="/admin"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-secondary"
          >
            Admin portal
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ Icon, title, body }) => (
          <article key={title} className="glass rounded-2xl p-5">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-display text-base font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
