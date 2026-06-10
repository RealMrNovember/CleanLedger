import { Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LicenseLockedScreen } from "@/components/LicenseLockedScreen";

export function LicenseGate() {
  const { user, licenseUsable, refreshLicense, logout } = useAuth();

  if (!licenseUsable) {
    return (
      <LicenseLockedScreen
        companyName={user?.companyName}
        onRetry={refreshLicense}
        onLogout={logout}
      />
    );
  }

  return <Outlet />;
}
