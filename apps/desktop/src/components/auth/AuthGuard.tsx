import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-mint/30 border-t-mint" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-mint/30 border-t-mint" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
