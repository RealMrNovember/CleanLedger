import type { ItemStatus } from "@/db/schema";
import { ITEM_STATUS_WORKFLOW } from "@cleanledger/shared";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";

const ALL_STATUSES: ItemStatus[] = [
  ...ITEM_STATUS_WORKFLOW,
  "cancelled",
];

interface OrderItemStatusSelectProps {
  value: ItemStatus;
  onChange: (status: ItemStatus) => void;
  disabled?: boolean;
  className?: string;
}

export function OrderItemStatusSelect({
  value,
  onChange,
  disabled,
  className,
}: OrderItemStatusSelectProps) {
  const { labels } = useI18n();

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ItemStatus)}
      className={cn(
        "h-8 max-w-[9.5rem] rounded-lg border border-border/60 bg-background px-2 text-xs font-medium",
        className
      )}
      aria-label="Item status"
    >
      {ALL_STATUSES.map((status) => (
        <option key={status} value={status}>
          {labels.itemStatus[status]}
        </option>
      ))}
    </select>
  );
}
