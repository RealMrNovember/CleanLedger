import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { AccountPage } from "@/pages/AccountPage";
import { ProtectedRoute, GuestRoute } from "@/components/ProtectedRoute";
import { WebAppLayout } from "@/components/layout/WebAppLayout";
import { CatalogProvider } from "@/hooks/useCatalog";
import { SyncProvider } from "@/context/SyncContext";
import { PosScreen } from "@/screens/PosScreen";
import { OrdersTrackingScreen } from "@/screens/OrdersTrackingScreen";
import { CustomersScreen } from "@/screens/CustomersScreen";
import { CustomerDetailScreen } from "@/screens/CustomerDetailScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <SyncProvider>
              <CatalogProvider>
                <WebAppLayout />
              </CatalogProvider>
            </SyncProvider>
          }
        >
          <Route path="/dashboard" element={<Navigate to="/dashboard/pos" replace />} />
          <Route path="/dashboard/pos" element={<PosScreen />} />
          <Route path="/dashboard/orders" element={<OrdersTrackingScreen />} />
          <Route path="/dashboard/customers" element={<CustomersScreen />} />
          <Route path="/dashboard/customers/:id" element={<CustomerDetailScreen />} />
          <Route path="/dashboard/settings" element={<SettingsScreen />} />
          <Route path="/dashboard/account" element={<AccountPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
