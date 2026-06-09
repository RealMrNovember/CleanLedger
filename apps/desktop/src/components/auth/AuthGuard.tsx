import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function AuthLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0f14]">
      <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-mint" />
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  return <Navigate to={isAuthenticated ? "/" : "/login"} replace />;
}
