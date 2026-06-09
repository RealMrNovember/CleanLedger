import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "sm" : "icon"}
      onClick={toggleTheme}
      className={cn("shrink-0", className)}
      title={isDark ? "Açık mod" : "Koyu mod"}
      aria-label={isDark ? "Açık moda geç" : "Koyu moda geç"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {showLabel && (
        <span className="ml-2">{isDark ? "Açık Mod" : "Koyu Mod"}</span>
      )}
    </Button>
  );
}
