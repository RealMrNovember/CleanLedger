import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Sparkles, KeyRound, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LicenseBadge } from "@/components/LicenseBadge";
import { DownloadButton } from "@/components/DownloadButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountPage() {
  const navigate = useNavigate();
  const { user, license, logout, changePassword, refreshLicense } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    void refreshLicense();
  }, [refreshLicense]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
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
      await changePassword({
        currentPassword,
        newPassword,
      });
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
            Profil, güvenlik ve masaüstü uygulaması
          </p>
        </div>

        <Card className="bg-white dark:bg-slate-900">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-trust text-white">
              <Sparkles className="size-7" />
            </div>
            <CardTitle>{user.companyName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Web paneliniz aktif — veriler tarayıcınızda saklanır
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Firma" value={user.companyName} />
              <Info label="Yetkili" value={user.ownerName} />
              <Info label="E-posta" value={user.email} />
              <Info label="Telefon" value={user.phone || "—"} />
              <Info label="Şehir" value={user.city || "—"} />
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Lisans Durumu
                </p>
                <LicenseBadge license={license} />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Offline çalışma ve yazdırma için Windows masaüstü uygulamasını
                indirin. Aynı e-posta ile giriş yapın.
              </p>
              <DownloadButton variant="secondary" />
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleLogout}
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
              Hesabınızın şifresini buradan güncelleyebilirsiniz. Masaüstü
              uygulamasında da aynı şifre geçerlidir.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4">
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
