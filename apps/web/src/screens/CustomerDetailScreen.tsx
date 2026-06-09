import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, MapPin, FileText, Pencil } from "lucide-react";
import type { Customer, CustomerTag, Order, OrderStatus, PaymentStatus } from "@/db/schema";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/db/schema";
import {
  getCustomerById,
  getCustomerOrders,
  getCustomerTags,
  updateCustomer,
  initDatabase,
} from "@/db/client";
import { CustomerTagBadge } from "@/components/CustomerTagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function CustomerDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customerId = Number(id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    notes: "",
    address: "",
    tagId: 1,
  });

  const load = useCallback(async () => {
    await initDatabase();
    const [c, tagList] = await Promise.all([
      getCustomerById(customerId),
      getCustomerTags(),
    ]);
    if (!c) {
      navigate("/dashboard/customers");
      return;
    }
    setCustomer(c);
    setTags(tagList);
    setForm({
      name: c.name,
      phone: c.phone,
      notes: c.notes ?? "",
      address: c.address ?? "",
      tagId: c.tagId ?? 1,
    });
    const summary = await getCustomerOrders(customerId);
    setOrders(summary.orders);
    setTotalSpent(summary.totalSpent);
  }, [customerId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!customer) return;
    const updated = await updateCustomer(customer.id, form);
    setCustomer(updated);
    setEditing(false);
  };

  const tag = tags.find((t) => t.id === customer?.tagId);

  if (!customer) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border/60 px-6 py-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/customers">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <CustomerTagBadge tag={tag} />
          </div>
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
          {customer.creditBalance > 0 && (
            <p className="mt-1 text-sm font-semibold text-red-600">
              Cari Borç: {formatCurrency(customer.creditBalance)}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => setEditing(!editing)} className="gap-2">
          <Pencil className="size-4" />
          {editing ? "İptal" : "Düzenle"}
        </Button>
      </div>

      <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Müşteri Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ad"
                />
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Telefon"
                />
                <select
                  value={form.tagId}
                  onChange={(e) =>
                    setForm({ ...form, tagId: Number(e.target.value) })
                  }
                  className="h-11 w-full rounded-xl border-2 border-input px-3 text-sm"
                >
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Adres"
                  className="min-h-[80px] w-full rounded-xl border-2 border-input px-4 py-3 text-sm"
                />
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notlar"
                  className="min-h-[60px] w-full rounded-xl border-2 border-input px-4 py-3 text-sm"
                />
                <Button onClick={() => void handleSave()}>Kaydet</Button>
              </>
            ) : (
              <>
                <InfoRow icon={Phone} label="Telefon" value={customer.phone} />
                <InfoRow
                  icon={MapPin}
                  label="Adres"
                  value={customer.address || "—"}
                />
                <InfoRow
                  icon={FileText}
                  label="Notlar"
                  value={customer.notes || "—"}
                />
                <InfoRow
                  icon={FileText}
                  label="Etiket"
                  value={tag?.label ?? "Normal"}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Özet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Toplam harcama</p>
            <p className="text-3xl font-bold text-trust">
              {formatCurrency(totalSpent)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {orders.length} sipariş
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sipariş Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-muted-foreground">Henüz sipariş yok.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("tr-TR")} ·{" "}
                        {ORDER_STATUS_LABELS[o.orderStatus as OrderStatus]} ·{" "}
                        {PAYMENT_STATUS_LABELS[o.paymentStatus as PaymentStatus]}
                        {o.balanceDue > 0 &&
                          ` · Cari: ${formatCurrency(o.balanceDue)}`}
                      </p>
                    </div>
                    <p className="font-bold">{formatCurrency(o.totalAmount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-mint" />
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
