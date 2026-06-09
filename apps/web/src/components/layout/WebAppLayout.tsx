import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  Settings,
  ShoppingCart,
  ClipboardList,
  LogOut,
  UserCircle,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard/pos", icon: ShoppingCart, label: "Sipariş (POS)" },
  { to: "/dashboard/orders", icon: ClipboardList, label: "Sipariş Takibi" },
  { to: "/dashboard/customers", icon: Users, label: "Müşteriler" },
  { to: "/dashboard/settings", icon: Settings, label: "Ayarlar" },
  { to: "/dashboard/account", icon: UserCircle, label: "Hesabım" },
];

function formatWelcome(ownerName: string, companyName: string): string {
  const name = ownerName.trim();
  const titled =
    name.endsWith(" Bey") || name.endsWith(" Hanım") ? name : `${name} Bey`;
  return `Hoş Geldiniz, ${titled} — ${companyName}`;
}

export function WebAppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border/60 bg-card/90 md:flex">
        <div className="border-b border-border/60 p-4">
          <Logo size="md" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
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
            <span>Web POS — tarayıcıda</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Çıkış Yap
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {user?.companyName && user?.ownerName && (
          <div className="border-b border-border/60 bg-card/60 px-4 py-2.5 backdrop-blur-sm md:px-6">
            <p className="truncate text-sm font-medium text-foreground/90">
              {formatWelcome(user.ownerName, user.companyName)}
            </p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden pb-16 md:pb-0">
          <Outlet />
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border/60 bg-card/95 backdrop-blur-md md:hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                isActive ? "text-[#0f3d3a]" : "text-muted-foreground"
              )
            }
          >
            <Icon className="size-5" />
            <span className="max-w-[4.5rem] truncate">{label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
