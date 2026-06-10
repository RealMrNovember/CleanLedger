const REPO = "RealMrNovember/CleanLedger";
const RELEASES_PAGE = `https://github.com/${REPO}/releases`;

export interface RemoteRelease {
  version: string;
  downloadUrl: string;
  releasePageUrl: string;
  tag: string;
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name?: string;
  html_url?: string;
  assets?: GitHubReleaseAsset[];
}

function parseVersionFromAsset(name: string): string | null {
  const match = name.match(/CleanLedger_(\d+\.\d+\.\d+)_/i);
  return match?.[1] ?? null;
}

function parseVersionFromTag(tag: string): string | null {
  const match = tag.match(/^v?(\d+\.\d+\.\d+)$/i);
  return match?.[1] ?? null;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function pickSetupAsset(
  assets: GitHubReleaseAsset[]
): GitHubReleaseAsset | undefined {
  return (
    assets.find(
      (a) =>
        a.name.endsWith("-setup.exe") &&
        !a.name.toLowerCase().includes("portable")
    ) ?? assets.find((a) => a.name.endsWith(".exe"))
  );
}

function mapRelease(release: GitHubRelease): RemoteRelease | null {
  const asset = pickSetupAsset(release.assets ?? []);
  if (!asset?.browser_download_url) return null;

  const tag = release.tag_name ?? "";
  const version =
    parseVersionFromAsset(asset.name) ??
    parseVersionFromTag(tag) ??
    tag.replace(/^v/i, "");

  if (!version) return null;

  return {
    version,
    downloadUrl: asset.browser_download_url,
    releasePageUrl: release.html_url ?? RELEASES_PAGE,
    tag,
  };
}

/** GitHub Releases listesinden en yeni sürümü döndürür. */
export async function fetchLatestGitHubRelease(): Promise<RemoteRelease | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;

  const releases = (await res.json()) as GitHubRelease[];
  let best: RemoteRelease | null = null;

  for (const release of releases) {
    const mapped = mapRelease(release);
    if (!mapped) continue;
    if (!best || compareVersions(mapped.version, best.version) > 0) {
      best = mapped;
    }
  }

  return best;
}

export async function findNewerGitHubRelease(
  currentVersion: string
): Promise<RemoteRelease | null> {
  const latest = await fetchLatestGitHubRelease();
  if (!latest) return null;
  if (compareVersions(latest.version, currentVersion) <= 0) return null;
  return latest;
}

export { RELEASES_PAGE };
