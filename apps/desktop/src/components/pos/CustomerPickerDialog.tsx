import { useEffect, useMemo, useState } from "react";
import { Search, User } from "lucide-react";
import type { Customer } from "@/db/schema";
import { getCustomers } from "@/db/client";
import { formatCustomerName } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CustomerPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
}

export function CustomerPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: CustomerPickerDialogProps) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    setLoading(true);
    void getCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const full = formatCustomerName(c).toLowerCase();
      return full.includes(q) || c.phone.includes(q);
    });
  }, [customers, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Müşteri Ara / Seç</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-5 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ad, soyad veya telefon..."
              className="h-11 pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border/60">
            {loading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Yükleniyor...
              </p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Müşteri bulunamadı.
              </p>
            ) : (
              <ul>
                {filtered.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(customer);
                        onOpenChange(false);
                      }}
                      className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-mint-light/40 last:border-0"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-trust-light text-trust">
                        <User className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {formatCustomerName(customer)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phone}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
