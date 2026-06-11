import { HashRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import { SyncProvider } from "@/context/SyncContext";
import { CatalogProvider } from "@/hooks/useCatalog";
import { PosDraftProvider } from "@/context/PosDraftContext";
import {
  ProtectedRoute,
  GuestRoute,
  RootRedirect,
} from "@/components/auth/AuthGuard";
import { LicenseGate } from "@/components/LicenseGate";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginScreen } from "@/screens/LoginScreen";
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/screens/ResetPasswordScreen";
import { PosScreen } from "@/screens/PosScreen";
import { OrdersTrackingScreen } from "@/screens/OrdersTrackingScreen";
import { CustomersScreen } from "@/screens/CustomersScreen";
import { CustomerDetailScreen } from "@/screens/CustomerDetailScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { ReportsScreen } from "@/screens/ReportsScreen";
import { AccountScreen } from "@/screens/AccountScreen";

export default function App() {
  return (
    <I18nProvider>
    <AuthProvider>
      <SyncProvider>
        <CatalogProvider>
          <PosDraftProvider>
          <HashRouter>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
                <Route path="/reset-password" element={<ResetPasswordScreen />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<LicenseGate />}>
                  <Route element={<AppLayout />}>
                  <Route path="/" element={<PosScreen />} />
                  <Route path="/orders" element={<OrdersTrackingScreen />} />
                  <Route path="/reports" element={<ReportsScreen />} />
                  <Route path="/customers" element={<CustomersScreen />} />
                  <Route
                    path="/customers/:id"
                    element={<CustomerDetailScreen />}
                  />
                  <Route path="/settings" element={<SettingsScreen />} />
                  <Route path="/account" element={<AccountScreen />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </HashRouter>
          </PosDraftProvider>
        </CatalogProvider>
      </SyncProvider>
    </AuthProvider>
    </I18nProvider>
  );
}
