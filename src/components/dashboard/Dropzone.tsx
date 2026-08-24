import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

function compressImageToDataUrl(file: File, maxDim = 1000, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = (err) => reject(err);
  });
}

export function Dropzone({
  label,
  value,
  userId,
  onChange,
  round,
}: {
  label: string;
  value: string | null;
  userId: string;
  onChange: (url: string | null) => void;
  round?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setBusy(true);

    try {
      // Check active client auth session
      const { data } = await supabase.auth.getSession();
      const authUser = data.session?.user;

      if (!authUser || userId === "guest") {
        const dataUrl = await compressImageToDataUrl(file);
        onChange(dataUrl);
        toast.success(`${label} attached`);
        return;
      }

      // Authenticated upload to authUser.id folder
      const ext = file.name.split(".").pop() || "png";
      const path = `${authUser.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (error) {
        console.warn("Storage upload failed, falling back to local data URL:", error);
        const dataUrl = await compressImageToDataUrl(file);
        onChange(dataUrl);
        toast.success(`${label} saved locally`);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      onChange(publicUrlData.publicUrl);
      toast.success(`${label} uploaded`);
    } catch (err) {
      console.error("Upload error:", err);
      try {
        const dataUrl = await compressImageToDataUrl(file);
        onChange(dataUrl);
        toast.success(`${label} saved locally`);
      } catch {
        toast.error("Failed to process image.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex h-28 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed px-4 text-center transition ${
          over ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
        }`}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : value ? (
          <>
            <img
              src={value}
              alt={label}
              className={`h-16 w-16 object-cover ${round ? "rounded-full" : "rounded-xl"}`}
            />
            <span className="text-xs text-muted-foreground">{t("dropzoneReplace")}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${label}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
            <ImagePlus className="h-5 w-5 text-primary" />
            {t("dropzoneUpload")}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
