import { useEffect, useState } from "react";
import {
  checkLicenseByEmail,
  type LicenseSnapshot,
} from "@/lib/license-client";
import { getInstallationId } from "@/lib/installation";
import { formatLicenseBadge } from "@/lib/license-display";

export function useLicenseStatus(email: string | undefined) {
  const [license, setLicense] = useState<LicenseSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(email?.trim()));

  useEffect(() => {
    const trimmed = email?.trim();
    if (!trimmed) {
      setLicense(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void checkLicenseByEmail(trimmed, getInstallationId())
      .then((snapshot) => {
        if (!cancelled) setLicense(snapshot);
      })
      .catch(() => {
        if (!cancelled) setLicense(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email]);

  return {
    license,
    loading,
    label: loading ? "Lisans: Kontrol ediliyor…" : formatLicenseBadge(license),
  };
}
