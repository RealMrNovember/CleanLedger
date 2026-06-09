import type { ReactNode } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type OrdersResizableStatsLayoutProps = {
  stats: ReactNode;
  children: ReactNode;
};

export function OrdersResizableStatsLayout({
  stats,
  children,
}: OrdersResizableStatsLayoutProps) {
  return (
    <PanelGroup
      autoSaveId="cleanledger-orders-stats"
      direction="vertical"
      className="min-h-0 flex-1"
    >
      <Panel
        collapsible
        defaultSize={13}
        minSize={6}
        maxSize={32}
        className="min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col justify-center overflow-hidden">
          {stats}
        </div>
      </Panel>

      <PanelResizeHandle
        className={cn(
          "group relative z-10 flex h-2 shrink-0 cursor-row-resize items-center justify-center",
          "bg-border/40 transition-colors hover:bg-primary/20 active:bg-primary/30",
          "dark:bg-slate-700/50 dark:hover:bg-primary/25 sm:h-2.5",
        )}
        title="Özet alanını daraltmak veya genişletmek için sürükleyin"
      >
        <span className="pointer-events-none flex h-4 w-10 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/60 group-hover:text-primary dark:bg-slate-800 dark:ring-slate-600 sm:w-12">
          <GripHorizontal className="size-3.5 opacity-70 group-hover:opacity-100" />
        </span>
      </PanelResizeHandle>

      <Panel defaultSize={87} minSize={55} className="min-h-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {children}
        </div>
      </Panel>
    </PanelGroup>
  );
}
