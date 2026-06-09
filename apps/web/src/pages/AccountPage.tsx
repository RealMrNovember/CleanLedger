import { useNavigate } from "react-router-dom";
import { LogOut, Sparkles, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DownloadButton } from "@/components/DownloadButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

  const trialEnd = new Date(user.trialEndsAt).toLocaleDateString("tr-TR");

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hesabım</h1>
          <p className="text-sm text-muted-foreground">
            Lisans bilgileri ve masaüstü uygulaması indirme
          </p>
        </div>

        <Card>
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
              <div className="rounded-xl bg-mint-light/50 p-4">
                <p className="text-xs font-medium text-[#0f5f57]">Deneme Süresi</p>
                <p className="mt-1 flex items-center gap-2 font-semibold">
                  <Calendar className="size-4 text-mint" />
                  {trialEnd} tarihine kadar
                </p>
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
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
