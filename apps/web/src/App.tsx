import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { AccountPage } from "@/pages/AccountPage";
import { ProtectedRoute, GuestRoute } from "@/components/ProtectedRoute";
import { LicenseGate } from "@/components/LicenseGate";
import { WebAppLayout } from "@/components/layout/WebAppLayout";
import { CatalogProvider } from "@/hooks/useCatalog";
import { SyncProvider } from "@/context/SyncContext";
import { PosDraftProvider } from "@/context/PosDraftContext";
import { PosScreen } from "@/screens/PosScreen";
import { OrdersTrackingScreen } from "@/screens/OrdersTrackingScreen";
import { CustomersScreen } from "@/screens/CustomersScreen";
import { CustomerDetailScreen } from "@/screens/CustomerDetailScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { ReportsScreen } from "@/screens/ReportsScreen";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<LicenseGate />}>
          <Route
            element={
              <SyncProvider>
                <CatalogProvider>
                  <PosDraftProvider>
                    <WebAppLayout />
                  </PosDraftProvider>
                </CatalogProvider>
              </SyncProvider>
            }
          >
          <Route path="/dashboard" element={<Navigate to="/dashboard/pos" replace />} />
          <Route path="/dashboard/pos" element={<PosScreen />} />
          <Route path="/dashboard/orders" element={<OrdersTrackingScreen />} />
          <Route path="/dashboard/customers" element={<CustomersScreen />} />
          <Route path="/dashboard/customers/:id" element={<CustomerDetailScreen />} />
          <Route path="/dashboard/reports" element={<ReportsScreen />} />
          <Route path="/dashboard/settings" element={<SettingsScreen />} />
          <Route path="/dashboard/account" element={<AccountPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
