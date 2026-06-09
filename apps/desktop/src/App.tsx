import { HashRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SyncProvider } from "@/context/SyncContext";
import { CatalogProvider } from "@/hooks/useCatalog";
import { ProtectedRoute, GuestRoute } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginScreen } from "@/screens/LoginScreen";
import { PosScreen } from "@/screens/PosScreen";
import { OrdersTrackingScreen } from "@/screens/OrdersTrackingScreen";
import { CustomersScreen } from "@/screens/CustomersScreen";
import { CustomerDetailScreen } from "@/screens/CustomerDetailScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <CatalogProvider>
          <HashRouter>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginScreen />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<PosScreen />} />
                  <Route path="/orders" element={<OrdersTrackingScreen />} />
                  <Route path="/customers" element={<CustomersScreen />} />
                  <Route path="/customers/:id" element={<CustomerDetailScreen />} />
                  <Route path="/settings" element={<SettingsScreen />} />
                </Route>
              </Route>
            </Routes>
          </HashRouter>
        </CatalogProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
