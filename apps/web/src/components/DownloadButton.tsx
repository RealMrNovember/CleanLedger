import { useEffect, useState } from "react";
import { Download, ArrowRight, Loader2 } from "lucide-react";

const GITHUB_LATEST_API =
  "https://api.github.com/repos/RealMrNovember/CleanLedger/releases/latest";

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
}

async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const res = await fetch(GITHUB_LATEST_API);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    tag_name?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  };
  const version = (data.tag_name ?? "latest").replace(/^v/i, "");
  const exe =
    data.assets?.find(
      (a) =>
        a.name?.endsWith(".exe") &&
        !a.name?.includes("setup") &&
        !a.name?.includes("Setup")
    ) ?? data.assets?.find((a) => a.name?.endsWith(".exe"));
  const downloadUrl = exe?.browser_download_url ?? "";
  if (!downloadUrl) return null;
  return { version, downloadUrl };
}

interface DownloadButtonProps {
  variant?: "primary" | "secondary";
  className?: string;
}

export function DownloadButton({
  variant = "primary",
  className = "",
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(true);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLatestRelease()
      .then((info) => {
        if (!cancelled) setRelease(info);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = release
    ? `Windows İçin İndir — v${release.version}`
    : "Windows İçin İndir";

  if (variant === "secondary") {
    return (
      <a
        href={release?.downloadUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={loading || !release}
        className={`inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 font-semibold text-[#0f3d3a] transition hover:bg-mint-light disabled:pointer-events-none disabled:opacity-60 ${className}`}
        onClick={(e) => {
          if (loading || !release) e.preventDefault();
        }}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Download className="size-5" />
        )}
        {loading ? "Sürüm kontrol ediliyor..." : "Hemen İndir"}
      </a>
    );
  }

  return (
    <a
      href={release?.downloadUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={loading || !release}
      className={`group inline-flex h-16 items-center gap-3 rounded-2xl bg-gradient-to-r from-mint to-trust px-10 text-lg font-semibold text-white shadow-lg shadow-mint/25 transition hover:shadow-xl hover:shadow-mint/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70 ${className}`}
      onClick={(e) => {
        if (loading || !release) e.preventDefault();
      }}
    >
      {loading ? (
        <Loader2 className="size-6 animate-spin" />
      ) : (
        <Download className="size-6" />
      )}
      <span>{loading ? "Sürüm kontrol ediliyor..." : label}</span>
      {!loading && release && (
        <ArrowRight className="size-5 transition group-hover:translate-x-0.5" />
      )}
    </a>
  );
}
