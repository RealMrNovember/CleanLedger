import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ items, collapsed, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex-1 space-y-1 p-2">
      {items.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          title={collapsed ? label : undefined}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-xl py-3 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2" : "gap-3 px-4",
              isActive
                ? "bg-mint-light text-[#0f3d3a] shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <Icon className="size-5 shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
