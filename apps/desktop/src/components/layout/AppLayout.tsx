import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  Settings,
  ShoppingCart,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { UpdateChecker } from "@/components/updater/UpdateChecker";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: ShoppingCart, label: "Sipariş (POS)" },
  { to: "/orders", icon: ClipboardList, label: "Sipariş Takibi" },
  { to: "/customers", icon: Users, label: "Müşteriler" },
  { to: "/settings", icon: Settings, label: "Ayarlar" },
];

function formatWelcome(adminName: string, companyName: string): string {
  const name = adminName.trim();
  const titled =
    name.endsWith(" Bey") || name.endsWith(" Hanım") ? name : `${name} Bey`;
  return `Hoş Geldiniz, ${titled} — ${companyName}`;
}

export function AppLayout() {
  const { organization, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border/60 bg-card/90">
        <div className="border-b border-border/60 p-4">
          <Logo size="md" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-mint-light text-[#0f3d3a] shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-border/60 p-4">
          <div className="flex items-center gap-2 rounded-xl bg-trust-light/50 px-3 py-2 text-xs text-trust">
            <LayoutGrid className="size-4" />
            <span>Offline-first POS</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-4" />
            Çıkış Yap
          </Button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {organization?.companyName && organization?.adminName && (
          <div className="border-b border-border/60 bg-card/60 px-6 py-2.5 backdrop-blur-sm">
            <p className="truncate text-sm font-medium text-foreground/90">
              {formatWelcome(organization.adminName, organization.companyName)}
            </p>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
      <UpdateChecker />
    </div>
  );
}
