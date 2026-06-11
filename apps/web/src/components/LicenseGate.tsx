import { Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LicenseLockedScreen } from "@/components/LicenseLockedScreen";

export function LicenseGate() {
  const { user, license, licenseUsable, refreshLicense, logout } = useAuth();

  if (!licenseUsable) {
    return (
      <LicenseLockedScreen
        companyName={user?.companyName}
        lockReason={license?.lockReason}
        onRetry={refreshLicense}
        onLogout={logout}
      />
    );
  }

  return <Outlet />;
}
