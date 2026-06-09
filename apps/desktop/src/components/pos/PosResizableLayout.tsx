import type { ReactNode } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { GripHorizontal, GripVertical } from "lucide-react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { cn } from "@/lib/utils";

type PosResizableLayoutProps = {
  customer: ReactNode;
  catalog: ReactNode;
  cart: ReactNode;
  className?: string;
};

function PosResizeHandle({
  direction,
}: {
  direction: "horizontal" | "vertical";
}) {
  const isHorizontal = direction === "horizontal";
  const Icon = isHorizontal ? GripVertical : GripHorizontal;

  return (
    <PanelResizeHandle
      className={cn(
        "group relative z-10 flex shrink-0 items-center justify-center bg-border/40 transition-colors hover:bg-primary/20 active:bg-primary/30 dark:bg-slate-700/50 dark:hover:bg-primary/25",
        isHorizontal
          ? "w-2 cursor-col-resize sm:w-2.5"
          : "h-2.5 cursor-row-resize sm:h-3",
      )}
      title="Boyutu ayarlamak için sürükleyin"
    >
      <span
        className={cn(
          "pointer-events-none flex items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/60 group-hover:text-primary dark:bg-slate-800 dark:ring-slate-600",
          isHorizontal ? "h-10 w-4 sm:h-12" : "h-4 w-10 sm:w-12",
        )}
      >
        <Icon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
      </span>
    </PanelResizeHandle>
  );
}

function PanelShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

function DesktopPosLayout({
  customer,
  catalog,
  cart,
  className,
}: PosResizableLayoutProps) {
  return (
    <PanelGroup
      autoSaveId="cleanledger-pos-desktop"
      direction="horizontal"
      className={cn("min-h-0 flex-1", className)}
    >
      <Panel defaultSize={28} minSize={18} maxSize={45} className="min-w-0">
        <PanelShell className="overflow-y-auto">{customer}</PanelShell>
      </Panel>

      <PosResizeHandle direction="horizontal" />

      <Panel defaultSize={72} minSize={45} className="min-w-0">
        <PanelGroup
          autoSaveId="cleanledger-pos-desktop-inner"
          direction="horizontal"
          className="h-full min-h-0"
        >
          <Panel defaultSize={68} minSize={35} className="min-w-0">
            <PanelShell>{catalog}</PanelShell>
          </Panel>

          <PosResizeHandle direction="horizontal" />

          <Panel defaultSize={32} minSize={22} maxSize={50} className="min-w-0">
            <PanelShell>{cart}</PanelShell>
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}

function MobilePosLayout({
  customer,
  catalog,
  cart,
  className,
}: PosResizableLayoutProps) {
  return (
    <PanelGroup
      autoSaveId="cleanledger-pos-mobile"
      direction="vertical"
      className={cn("min-h-0 flex-1", className)}
    >
      <Panel defaultSize={28} minSize={15} maxSize={50} className="min-h-0">
        <PanelShell className="overflow-y-auto">{customer}</PanelShell>
      </Panel>

      <PosResizeHandle direction="vertical" />

      <Panel defaultSize={38} minSize={20} maxSize={65} className="min-h-0">
        <PanelShell>{catalog}</PanelShell>
      </Panel>

      <PosResizeHandle direction="vertical" />

      <Panel defaultSize={34} minSize={18} maxSize={55} className="min-h-0">
        <PanelShell>{cart}</PanelShell>
      </Panel>
    </PanelGroup>
  );
}

export function PosResizableLayout(props: PosResizableLayoutProps) {
  const isDesktop = useBreakpoint("lg");

  if (isDesktop) {
    return <DesktopPosLayout {...props} />;
  }

  return <MobilePosLayout {...props} />;
}
