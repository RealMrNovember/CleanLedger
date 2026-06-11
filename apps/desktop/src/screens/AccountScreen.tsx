import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Sparkles, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isLifetimeLicense } from "@/lib/license-display";
import {
  formatLocalizedLicenseDetail,
  getLocalizedLicenseDisplay,
} from "@cleanledger/shared/i18n/license-i18n";
import { LicenseManagementCard } from "@/components/license/LicenseManagementCard";
import { cn } from "@/lib/utils";

export function AccountScreen() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const {
    user,
    organization,
    license,
    loading,
    logout,
    changePassword,
    refreshLicense,
    activateLicenseKey,
  } = useAuth();
  const licenseDisplay = getLocalizedLicenseDisplay(t, locale, license);
  const licenseLoading = loading && !license;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  if (!user) return null;

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
      setPasswordError(t("validation.required"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("account.passwordMinHint"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("account.passwordMismatch"));
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(t("account.passwordChanged"));
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : t("auth.loginFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white p-4 text-gray-900 dark:bg-slate-900 dark:text-gray-100 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("account.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("account.subtitle")}</p>
        </div>

        <Card className="bg-white dark:bg-slate-900">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-trust text-white">
              <Sparkles className="size-7" />
            </div>
            <CardTitle>{organization?.companyName ?? user.companyName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("account.desktopPanelActive")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label={t("auth.companyName")} value={user.companyName} />
              <Info label={t("auth.ownerName")} value={user.ownerName} />
              <Info label={t("auth.email")} value={user.email} />
              <Info label={t("auth.phone")} value={user.phone || t("common.dash")} />
              <Info label={t("auth.city")} value={user.city || t("common.dash")} />
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
                  {t("license.recheck")}
                </p>
                <p className="mt-1 font-semibold">
                  {licenseLoading ? t("license.checking") : licenseDisplay.label}
                </p>
                {!licenseLoading && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatLocalizedLicenseDetail(t, locale, license)}
                  </p>
                )}
              </div>
            </div>

            <LicenseManagementCard
              license={license}
              loading={licenseLoading}
              onActivateKey={activateLicenseKey}
              onRefresh={refreshLicense}
            />

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-4" />
              {t("common.logout")}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <KeyRound className="size-5 text-trust" />
              {t("auth.password")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("account.passwordSectionHint")}
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void handleChangePassword(e)}
              className="space-y-4"
            >
              <PasswordField
                label={t("account.currentPassword")}
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
                toggleAriaLabel={
                  showCurrent ? t("account.passwordToggleHide") : t("account.passwordToggleShow")
                }
              />
              <PasswordField
                label={t("account.newPassword")}
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                autoComplete="new-password"
                hint={t("account.passwordMinHint")}
                toggleAriaLabel={
                  showNew ? t("account.passwordToggleHide") : t("account.passwordToggleShow")
                }
              />
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("account.confirmPassword")}
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={t("common.passwordPlaceholder")}
                />
              </div>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm font-medium text-mint">{passwordSuccess}</p>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("account.updatePassword")}
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
  toggleAriaLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  hint?: string;
  toggleAriaLabel: string;
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
          aria-label={toggleAriaLabel}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
