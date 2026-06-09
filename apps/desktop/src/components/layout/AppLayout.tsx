import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Settings,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Users,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";
import { UpdateChecker } from "@/components/updater/UpdateChecker";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: ShoppingCart, label: "Sipariş (POS)", end: true },
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

function SidebarContent({
  collapsed,
  onNavigate,
  onLogout,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex items-center border-b border-border/60",
          collapsed ? "justify-center p-3" : "p-4"
        )}
      >
        <Logo size={collapsed ? "sm" : "md"} />
      </div>
      <SidebarNav items={navItems} collapsed={collapsed} onNavigate={onNavigate} />
      <div className="space-y-2 border-t border-border/60 p-2">
        {!collapsed && (
          <div className="flex items-center gap-2 rounded-xl bg-trust-light/50 px-3 py-2 text-xs text-trust">
            <LayoutGrid className="size-4 shrink-0" />
            <span>Offline-first POS</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-muted-foreground",
            collapsed ? "w-full justify-center px-2" : "w-full justify-start gap-2"
          )}
          onClick={onLogout}
          title="Çıkış Yap"
        >
          <LogOut className="size-4" />
          {!collapsed && "Çıkış Yap"}
        </Button>
      </div>
    </>
  );
}

export function AppLayout() {
  const { organization, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background md:flex-row">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border/60 bg-card/90 transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.5rem]" : "w-56"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onLogout={() => void handleLogout()}
        />
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center gap-2 border-t border-border/60 py-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span>Daralt</span>
            </>
          )}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Menüyü kapat"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarContent
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              onLogout={() => void handleLogout()}
            />
          </aside>
        </div>
      )}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/60 bg-card/60 px-3 py-2 backdrop-blur-sm md:px-6">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-border/60 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="size-5" />
          </button>
          {organization?.companyName && organization?.adminName && (
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/90">
              {formatWelcome(organization.adminName, organization.companyName)}
            </p>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
      <UpdateChecker />
    </div>
  );
}
