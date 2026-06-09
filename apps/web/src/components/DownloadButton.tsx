import { useEffect, useState } from "react";
import { Download, ArrowRight, Loader2 } from "lucide-react";

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/RealMrNovember/CleanLedger/releases";

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
}

function pickExeAsset(
  assets?: Array<{ name?: string; browser_download_url?: string }>
) {
  return (
    assets?.find(
      (a) =>
        a.name?.endsWith(".exe") &&
        !a.name?.includes("setup") &&
        !a.name?.includes("Setup")
    ) ?? assets?.find((a) => a.name?.endsWith(".exe"))
  );
}

async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const listRes = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (listRes.ok) {
      const releases = (await listRes.json()) as Array<{
        tag_name?: string;
        prerelease?: boolean;
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      }>;

      const semverRelease = releases.find(
        (r) =>
          /^v?\d+\.\d+\.\d+$/.test(r.tag_name ?? "") &&
          pickExeAsset(r.assets)?.browser_download_url
      );
      const picked = semverRelease ?? releases[0];
      if (picked) {
        const exe = pickExeAsset(picked.assets);
        if (exe?.browser_download_url) {
          return {
            version: (picked.tag_name ?? "latest").replace(/^v/i, ""),
            downloadUrl: exe.browser_download_url,
          };
        }
      }
    }
  } catch {
    /* fallback below */
  }

  const latestRes = await fetch(`${GITHUB_RELEASES_API}/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!latestRes.ok) return null;
  const data = (await latestRes.json()) as {
    tag_name?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  };
  const exe = pickExeAsset(data.assets);
  if (!exe?.browser_download_url) return null;
  return {
    version: (data.tag_name ?? "latest").replace(/^v/i, ""),
    downloadUrl: exe.browser_download_url,
  };
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
        className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint to-trust font-semibold text-white shadow-md transition hover:opacity-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto sm:px-8 ${className}`}
        onClick={(e) => {
          if (loading || !release) e.preventDefault();
        }}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Download className="size-5" />
        )}
        {loading
          ? "Sürüm kontrol ediliyor..."
          : release
            ? `Windows Uygulamasını İndir — v${release.version}`
            : "İndirme linki alınamadı"}
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
