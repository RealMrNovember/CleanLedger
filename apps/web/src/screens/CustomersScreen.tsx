import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Phone, MapPin, ChevronRight } from "lucide-react";
import type { Customer, CustomerTag } from "@/db/schema";
import type { CustomerListMeta } from "@/db/schema";
import {
  getCustomers,
  createCustomer,
  getCustomerListMeta,
  getCustomerTags,
  initDatabase,
} from "@/db/client";
import { CustomerTagBadge } from "@/components/CustomerTagBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { formatCurrency, formatCustomerName } from "@/lib/utils";
import {
  buildDebtMessage,
  buildOrderReadyMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/context/I18nContext";

export function CustomersScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const shopName = user?.companyName ?? "Cicibyte CleanLedger";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [metaMap, setMetaMap] = useState<Record<number, CustomerListMeta>>({});
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    phone: "",
    notes: "",
    address: "",
    tagId: 1,
  });

  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));

  const load = useCallback(async () => {
    await initDatabase();
    const [list, tagList] = await Promise.all([
      getCustomers(),
      getCustomerTags(),
    ]);
    setCustomers(list);
    setTags(tagList);
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

  const filtered = customers.filter((c) => {
    const full = formatCustomerName(c).toLowerCase();
    return full.includes(search.toLowerCase()) || c.phone.includes(search);
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    await createCustomer(form);
    setDialogOpen(false);
    setForm({ name: "", lastName: "", phone: "", notes: "", address: "", tagId: 1 });
    await load();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">{t("customers.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("customers.subtitle")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          {t("customers.add")}
        </Button>
      </div>

      <div className="border-b border-border/60 px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("customers.searchPlaceholder")}
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
              {t("customers.empty")}
            </CardContent>
          </Card>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-3">
            {filtered.map((c) => {
              const meta = metaMap[c.id];
              const tag = tagMap[c.tagId];
              return (
              <Card key={c.id} className="transition hover:border-mint/40">
                <CardContent className="flex items-center gap-4 p-4">
                  <Link
                    to={`/dashboard/customers/${c.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mint-light text-mint">
                      <Phone className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-semibold">
                          {formatCustomerName(c)}
                        </p>
                        <CustomerTagBadge tag={tag} />
                        <WhatsAppButton
                          href={buildWhatsAppUrl(
                            c.phone,
                            (meta?.creditDebt ?? c.creditBalance ?? 0) > 0
                              ? buildDebtMessage(
                                  formatCustomerName(c),
                                  meta?.creditDebt ?? c.creditBalance ?? 0,
                                  shopName
                                )
                              : buildOrderReadyMessage(formatCustomerName(c), shopName)
                          )}
                          title={t("orders.whatsappSend")}
                        />
                        {meta?.hasActiveOrders && (
                          <span className="rounded-lg bg-[#fff4e6] px-2 py-0.5 text-xs font-semibold text-[#c2410c]">
                            {t("customers.badgeInShop")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.phone}</p>
                      {meta && meta.pendingAmount > 0 && (
                        <p className="mt-1 text-xs font-semibold text-[#b45309]">
                          {t("customers.badgePending")} {formatCurrency(meta.pendingAmount)}
                        </p>
                      )}
                      {meta && meta.creditDebt > 0 && (
                        <p className="mt-1 text-xs font-semibold text-red-600">
                          {t("customers.badgeCredit")} {formatCurrency(meta.creditDebt)}
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
            <DialogTitle>{t("customers.addTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
            <Field label={t("common.firstName")} required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("common.firstName")}
                required
              />
            </Field>
            <Field label={t("common.lastName")}>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder={t("pos.customerLastNameOptional")}
              />
            </Field>
            <Field label={t("common.phone")} required>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t("common.phonePlaceholder")}
                required
              />
            </Field>
            <Field label={t("customers.formTag")}>
              <select
                value={form.tagId}
                onChange={(e) =>
                  setForm({ ...form, tagId: Number(e.target.value) })
                }
                className="h-11 w-full rounded-xl border-2 border-input bg-card px-3 text-sm"
              >
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("common.address")}>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t("customers.formAddressPlaceholder")}
                className="min-h-[80px] w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </Field>
            <Field label={t("common.notes")}>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("common.notes")}
                className="min-h-[60px] w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </Field>
            <Button type="submit" className="w-full" size="lg">
              {t("common.save")}
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
