import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Sparkles,
  Calendar,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLicenseStatus } from "@/hooks/useLicenseStatus";
import {
  formatLicenseDetail,
  isLifetimeLicense,
} from "@/lib/license-display";
import { cn } from "@/lib/utils";

export function AccountScreen() {
  const navigate = useNavigate();
  const { user, organization, logout, changePassword } = useAuth();
  const { license, loading: licenseLoading, label: licenseLabel } =
    useLicenseStatus(user?.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  if (!user) return null;

  const trialEnd = user.trialEndsAt
    ? new Date(user.trialEndsAt).toLocaleDateString("tr-TR")
    : "—";
  const lifetime = license ? isLifetimeLicense(license) : false;
  const trialLicense =
    license?.status === "trial" || license?.type?.toLowerCase() === "trial";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword.trim()) {
      setPasswordError("Mevcut şifrenizi girin.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Şifreniz güncellendi.");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Şifre güncellenemedi."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white p-4 text-gray-900 dark:bg-slate-900 dark:text-gray-100 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hesabım</h1>
          <p className="text-sm text-muted-foreground">
            Profil, lisans ve güvenlik
          </p>
        </div>

        <Card className="bg-white dark:bg-slate-900">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-trust text-white">
              <Sparkles className="size-7" />
            </div>
            <CardTitle>{organization?.companyName ?? user.companyName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Masaüstü uygulaması — offline çalışır, bulut ile senkronize olur
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Firma" value={user.companyName} />
              <Info label="Yetkili" value={user.ownerName} />
              <Info label="E-posta" value={user.email} />
              <Info label="Telefon" value={user.phone || "—"} />
              <Info label="Şehir" value={user.city || "—"} />
              <div
                className={cn(
                  "rounded-xl p-4 sm:col-span-2",
                  lifetime
                    ? "bg-mint-light/50 dark:bg-teal-950/40"
                    : trialLicense
                      ? "bg-amber-50 dark:bg-amber-950/40"
                      : "bg-muted/40 dark:bg-slate-800/50"
                )}
              >
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="size-4" />
                  Lisans Durumu
                </p>
                <p className="mt-1 font-semibold">
                  {licenseLoading ? "Kontrol ediliyor…" : licenseLabel}
                </p>
                {!licenseLoading && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatLicenseDetail(license)}
                  </p>
                )}
              </div>
              {!lifetime && user.trialEndsAt && (
                <div className="rounded-xl bg-mint-light/50 p-4 dark:bg-teal-950/40 sm:col-span-2">
                  <p className="text-xs font-medium text-[#0f5f57] dark:text-teal-200">
                    Hesap Deneme Süresi
                  </p>
                  <p className="mt-1 flex items-center gap-2 font-semibold">
                    <Calendar className="size-4 text-mint" />
                    {trialEnd} tarihine kadar
                  </p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-4" />
              Çıkış Yap
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <KeyRound className="size-5 text-trust" />
              Şifre Yönetimi
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Şifrenizi buradan güncelleyebilirsiniz. Web panelinde de aynı şifre
              geçerlidir.
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void handleChangePassword(e)}
              className="space-y-4"
            >
              <PasswordField
                label="Mevcut Şifre"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
              />
              <PasswordField
                label="Yeni Şifre"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                autoComplete="new-password"
                hint="En az 6 karakter"
              />
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Yeni Şifre (Tekrar)
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Yeni şifreyi tekrar girin"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm font-medium text-mint">{passwordSuccess}</p>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? "Kaydediliyor..." : "Şifreyi Güncelle"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4 dark:bg-slate-800/50">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
