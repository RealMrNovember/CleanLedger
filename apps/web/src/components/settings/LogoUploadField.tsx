import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { processLogoFile } from "@/lib/logo-image";
import { cn } from "@/lib/utils";

interface LogoUploadFieldProps {
  value?: string;
  onChange: (logoDataUrl: string | undefined) => void;
  className?: string;
  label?: string;
  hint?: string;
}

export function LogoUploadField({
  value,
  onChange,
  className,
  label = "Firma Logosu",
  hint = "Fişlerin üstünde görünür. PNG, JPEG veya WebP — en fazla 5 MB.",
}: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const dataUrl = await processLogoFile(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo yüklenemedi.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>

      {value ? (
        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
          <img
            src={value}
            alt="Firma logosu önizleme"
            className="max-h-20 max-w-[160px] object-contain"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => inputRef.current?.click()}
              className="text-sm font-medium text-trust hover:underline disabled:opacity-60"
            >
              {loading ? "İşleniyor..." : "Değiştir"}
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
              Kaldır
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 px-4 py-8 text-sm transition",
            "hover:border-mint/50 hover:bg-mint-light/30 disabled:opacity-60"
          )}
        >
          <ImagePlus className="size-8 text-muted-foreground" />
          <span className="font-medium">
            {loading ? "Logo işleniyor..." : "Logo yükle (opsiyonel)"}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
