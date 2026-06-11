import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  Settings,
  ShoppingCart,
  ClipboardList,
  LogOut,
  UserCircle,
  Users,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Search,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { LicenseBadge } from "@/components/license/LicenseBadge";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { LanguageSelector } from "@cleanledger/shared/i18n/LanguageSelector";
import { Button } from "@/components/ui/button";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";

const navKeys = [
  { to: "/dashboard/pos", icon: ShoppingCart, key: "nav.pos" },
  { to: "/dashboard/orders", icon: ClipboardList, key: "nav.orders" },
  { to: "/dashboard/customers", icon: Users, key: "nav.customers" },
  { to: "/dashboard/reports", icon: BarChart3, key: "nav.reports" },
  { to: "/dashboard/settings", icon: Settings, key: "nav.settings" },
  { to: "/dashboard/account", icon: UserCircle, key: "nav.account" },
] as const;

function formatWelcomeTitle(
  ownerName: string,
  companyName: string,
  t: (key: string, params?: Record<string, string>) => string
): string {
  const name = ownerName.trim();
  const titled =
    name.endsWith(" Bey") || name.endsWith(" Hanım") ? name : `${name} Bey`;
  return t("common.welcome", { name: titled, company: companyName });
}

function SidebarContent({
  collapsed,
  onNavigate,
  onLogout,
  t,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const navItems = navKeys.map((item) => ({
    to: item.to,
    icon: item.icon,
    label: t(item.key),
  }));

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
        <LicenseBadge collapsed={collapsed} />
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-muted-foreground",
            collapsed ? "w-full justify-center px-2" : "w-full justify-start gap-2"
          )}
          onClick={onLogout}
          title={t("common.logout")}
        >
          <LogOut className="size-4" />
          {!collapsed && t("common.logout")}
        </Button>
      </div>
    </>
  );
}

export function WebAppLayout() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100 md:flex-row">
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border/60 bg-white/90 transition-[width] duration-200 dark:bg-slate-900/90 md:flex",
          collapsed ? "w-[4.5rem]" : "w-56"
        )}
      >
        <SidebarContent collapsed={collapsed} onLogout={handleLogout} t={t} />
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center gap-2 border-t border-border/60 py-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title={collapsed ? t("layout.expandSidebar") : t("layout.collapseSidebar")}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span>{t("common.collapse")}</span>
            </>
          )}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("common.closeMenu")}
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
              t={t}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border/60 bg-white/80 px-3 py-2 backdrop-blur-sm dark:bg-slate-900/80 md:px-6">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-border/60 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t("common.openMenu")}
          >
            <Menu className="size-5" />
          </button>
          {user?.companyName && user?.ownerName && (
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/90">
              {formatWelcomeTitle(user.ownerName, user.companyName, t)}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden shrink-0 gap-2 sm:inline-flex"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
            <span className="text-muted-foreground">{t("common.search")}</span>
            <kbd className="hidden rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline">
              Ctrl+K
            </kbd>
          </Button>
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 sm:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label={t("common.search")}
          >
            <Search className="size-5" />
          </button>
          <LanguageSelector
            locale={locale}
            onLocaleChange={setLocale}
            variant="compact"
          />
          <ThemeToggle />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
