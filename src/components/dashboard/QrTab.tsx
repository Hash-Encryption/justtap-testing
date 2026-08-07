import { useEffect, useState } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

export function QrTab({ slug, accent }: { slug: string; accent: string }) {
  const [png, setPng] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const target = `${window.location.origin}/c/${slug}`;
    setUrl(target);
    void (async () => {
      const QRCode = (await import("qrcode")).default;
      const opts = {
        width: 1200,
        margin: 2,
        color: { dark: "#111827", light: "#ffffff" },
      } as const;
      setPng(await QRCode.toDataURL(target, opts));
      setSvg(await QRCode.toString(target, { ...opts, type: "svg" }));
    })();
  }, [slug]);

  function download(kind: "png" | "svg") {
    const a = document.createElement("a");
    if (kind === "png" && png) {
      a.href = png;
    } else if (kind === "svg" && svg) {
      a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    } else return;
    a.download = `${slug}-qr.${kind}`;
    a.click();
  }

  return (
    <div className="glass rounded-2xl p-6 text-center">
      <h3 className="font-display text-sm font-semibold">QR code</h3>
      <p className="mt-1 text-xs text-muted-foreground">Points at your public card link.</p>

      <div
        className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3"
        style={{ boxShadow: `0 10px 40px -12px ${accent}` }}
      >
        {png ? (
          <img src={png} alt="QR code" className="h-48 w-48" />
        ) : (
          <div className="h-48 w-48" />
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(url);
          toast.success("Link copied");
        }}
        className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Copy className="h-3.5 w-3.5" /> {url}
      </button>

      <div className="mt-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => download("png")}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Download className="h-3.5 w-3.5" /> PNG (1200px)
        </button>
        <button
          type="button"
          onClick={() => download("svg")}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" /> SVG
        </button>
      </div>
    </div>
  );
}
