import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Phone, MapPin, ChevronRight } from "lucide-react";
import type { Customer } from "@/db/schema";
import type { CustomerListMeta } from "@/db/schema";
import {
  getCustomers,
  createCustomer,
  deleteCustomer,
  getCustomerListMeta,
  initDatabase,
} from "@/db/client";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metaMap, setMetaMap] = useState<Record<number, CustomerListMeta>>({});
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    notes: "",
    address: "",
  });

  const load = useCallback(async () => {
    await initDatabase();
    const list = await getCustomers();
    setCustomers(list);
    const metaEntries = await Promise.all(
      list.map(async (c) => [
        c.id,
        await getCustomerListMeta(c.id, c.phone),
      ] as const)
    );
    setMetaMap(Object.fromEntries(metaEntries));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    await createCustomer(form);
    setDialogOpen(false);
    setForm({ name: "", phone: "", notes: "", address: "" });
    await load();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`${name} müşterisini silmek istediğinize emin misiniz?`)) return;
    await deleteCustomer(id);
    await load();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Müşteriler</h1>
          <p className="text-sm text-muted-foreground">
            CRM — müşteri kayıtları ve sipariş geçmişi
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Yeni Müşteri
        </Button>
      </div>

      <div className="border-b border-border/60 px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="İsim veya telefon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <Card className="mx-auto max-w-md border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              Henüz müşteri yok. Yeni müşteri ekleyin.
            </CardContent>
          </Card>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-3">
            {filtered.map((c) => {
              const meta = metaMap[c.id];
              return (
              <Card key={c.id} className="transition hover:border-mint/40">
                <CardContent className="flex items-center gap-4 p-4">
                  <Link
                    to={`/customers/${c.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mint-light text-mint">
                      <Phone className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-semibold">{c.name}</p>
                        {meta?.hasActiveOrders && (
                          <span className="rounded-lg bg-[#fff4e6] px-2 py-0.5 text-xs font-semibold text-[#c2410c]">
                            İçeride Ürünü Var
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.phone}</p>
                      {meta && meta.pendingAmount > 0 && (
                        <p className="mt-1 text-xs font-semibold text-[#b45309]">
                          Bekleyen Tahsilat: {formatCurrency(meta.pendingAmount)}
                        </p>
                      )}
                      {c.address && (
                        <p className="mt-1 flex items-start gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="mt-0.5 size-3 shrink-0" />
                          {c.address}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void handleDelete(c.id, c.name)}
                  >
                    Sil
                  </Button>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
            <Field label="Müşteri Adı" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ad Soyad"
                required
              />
            </Field>
            <Field label="Telefon" required>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
                required
              />
            </Field>
            <Field label="Açık Adres (Evden al / Eve teslim)">
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Mahalle, sokak, bina no, daire..."
                className="min-h-[80px] w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </Field>
            <Field label="Notlar">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Özel talimatlar, alerji vb."
                className="min-h-[60px] w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </Field>
            <Button type="submit" className="w-full" size="lg">
              Kaydet
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}
