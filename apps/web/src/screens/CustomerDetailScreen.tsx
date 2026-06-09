import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
  FileText,
  Pencil,
  History,
  Shield,
} from "lucide-react";
import type { Customer, CustomerTag, OrderStatus, PaymentStatus } from "@/db/schema";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SERVICE_LABELS,
  type PaymentMethod,
  type ServiceType,
} from "@/db/schema";
import {
  getCustomerById,
  getCustomerHistoryDetails,
  getCustomerTags,
  updateCustomer,
  initDatabase,
  type CustomerHistoryEntry,
} from "@/db/client";
import { CustomerTagBadge } from "@/components/CustomerTagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCustomerName, formatDateTime } from "@/lib/utils";
import { parseDateKey } from "@/lib/dates";

export function CustomerDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customerId = Number(id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [history, setHistory] = useState<CustomerHistoryEntry[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    phone: "",
    notes: "",
    address: "",
    tagId: 1,
  });

  const load = useCallback(async () => {
    await initDatabase();
    const [c, tagList, entries] = await Promise.all([
      getCustomerById(customerId),
      getCustomerTags(),
      getCustomerHistoryDetails(customerId),
    ]);
    if (!c) {
      navigate("/dashboard/customers");
      return;
    }
    setCustomer(c);
    setTags(tagList);
    setHistory(entries);
    setTotalSpent(entries.reduce((s, e) => s + e.order.totalAmount, 0));
    setForm({
      name: c.name,
      lastName: c.lastName ?? "",
      phone: c.phone,
      notes: c.notes ?? "",
      address: c.address ?? "",
      tagId: c.tagId ?? 1,
    });
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100">
      <div className="shrink-0 flex items-center gap-4 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/customers">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{formatCustomerName(customer)}</h1>
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

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-4 sm:gap-6 sm:p-6 lg:grid-cols-2">
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
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Soyad"
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
                <InfoRow icon={Phone} label="Ad Soyad" value={formatCustomerName(customer)} />
                <InfoRow icon={Phone} label="Telefon" value={customer.phone} />
                <InfoRow icon={MapPin} label="Adres" value={customer.address || "—"} />
                <InfoRow icon={FileText} label="Notlar" value={customer.notes || "—"} />
                <InfoRow icon={FileText} label="Etiket" value={tag?.label ?? "Normal"} />
                <InfoRow
                  icon={History}
                  label="Kayıt Tarihi"
                  value={formatDateTime(customer.createdAt)}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Özet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Toplam harcama</p>
            <p className="text-3xl font-bold text-trust">{formatCurrency(totalSpent)}</p>
            <p className="text-sm text-muted-foreground">
              {history.length} ziyaret / sipariş
            </p>
            <div className="flex items-start gap-2 rounded-xl border border-mint/30 bg-mint-light/30 p-3 text-xs text-[#0f3d3a]">
              <Shield className="mt-0.5 size-4 shrink-0" />
              <p>
                Tüm ziyaret ve işlem kayıtları kalıcıdır; tarih ve saat bilgisiyle
                saklanır, asla silinmez.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-trust" />
              Ziyaret & İşlem Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-muted-foreground">Henüz sipariş yok.</p>
            ) : (
              <div className="relative space-y-4 border-l-2 border-mint/30 pl-6">
                {history.map(({ order, items, payments }) => (
                  <div key={order.id} className="relative">
                    <span className="absolute -left-[1.65rem] top-2 size-3 rounded-full bg-mint ring-4 ring-white dark:ring-slate-900" />
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{order.orderNumber}</p>
                          <p className="text-sm font-medium text-trust">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <p className="text-lg font-bold">{formatCurrency(order.totalAmount)}</p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge>{ORDER_STATUS_LABELS[order.orderStatus as OrderStatus]}</Badge>
                        <Badge>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}
                        </Badge>
                        {order.priority === "urgent" && (
                          <Badge variant="urgent">ACİL</Badge>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Teslim:{" "}
                        {parseDateKey(order.deliveryDate).toLocaleDateString("tr-TR")}
                        {order.balanceDue > 0 &&
                          ` · Kalan: ${formatCurrency(order.balanceDue)}`}
                      </p>

                      <ul className="mt-3 space-y-1 border-t border-border/40 pt-3 text-sm">
                        {items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-2">
                            <span>
                              {item.productName} —{" "}
                              {SERVICE_LABELS[item.serviceType as ServiceType]}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {payments.length > 0 && (
                        <div className="mt-3 border-t border-border/40 pt-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Ödemeler
                          </p>
                          <ul className="space-y-1 text-xs">
                            {payments.map((p) => (
                              <li key={p.id} className="flex justify-between gap-2">
                                <span>
                                  {formatDateTime(p.createdAt)} ·{" "}
                                  {PAYMENT_METHOD_LABELS[p.paymentMethod as PaymentMethod]}
                                  {p.refunded ? " (iade)" : ""}
                                </span>
                                <span>{formatCurrency(p.amount)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
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

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "urgent";
}) {
  return (
    <span
      className={
        variant === "urgent"
          ? "rounded-lg bg-[#fff4e6] px-2 py-0.5 font-semibold text-[#c2410c]"
          : "rounded-lg bg-muted px-2 py-0.5 font-medium text-foreground"
      }
    >
      {children}
    </span>
  );
}
