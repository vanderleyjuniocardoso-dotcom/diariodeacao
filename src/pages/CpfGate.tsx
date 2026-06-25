import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, IdCard } from "lucide-react";
import { formatCPF, isValidCPF, onlyDigits } from "@/lib/cpf";
import { useAuth } from "@/contexts/AuthContext";
import logoVoluntariado from "@/assets/logo-voluntariado.png";
import InstallAppButton from "@/components/InstallAppButton";

const CpfGate = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/volunteers", { replace: true, state: { fromWelcome: true } });
  }, [user, authLoading, navigate]);

  // Auto-trigger native install prompt + request notification permission on first visit
  useEffect(() => {
    const tryInstall = async () => {
      try {
        // @ts-ignore
        const ev = window.__deferredInstallPrompt as any;
        if (ev && typeof ev.prompt === "function" && !localStorage.getItem("install_prompted")) {
          localStorage.setItem("install_prompted", "1");
          await ev.prompt();
          await ev.userChoice?.catch(() => {});
        }
      } catch {}
      try {
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if ("serviceWorker" in navigator) {
          const { subscribeToPush, isInIframe } = await import("@/lib/push");
          if (!isInIframe) await subscribeToPush().catch(() => {});
        }
      } catch {}
    };
    const handler = () => tryInstall();
    window.addEventListener("pwa-install-available", handler);
    tryInstall();
    return () => window.removeEventListener("pwa-install-available", handler);
  }, []);

  const rememberCpf = (digits: string) => {
    try { localStorage.setItem("known_user_cpf", digits); } catch {}
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = onlyDigits(cpf);
    if (!isValidCPF(digits)) {
      toast.error("CPF inválido");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("check_cpf", { _cpf: digits });
    setLoading(false);
    if (error) {
      toast.error("Erro ao validar CPF");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.has_account) {
      rememberCpf(digits);
      navigate("/login");
    } else if (row?.found) {
      rememberCpf(digits);
      navigate("/signup", { state: { cpf: digits, fullName: row.full_name } });
    } else if (row?.has_registration_pending) {
      rememberCpf(digits);
      navigate("/minha-jornada", { state: { cpf: digits } });
    } else {
      navigate("/cadastro-completo", { state: { cpf: digits } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 gradient-hero">
      <div className="max-w-sm mx-auto w-full animate-fade-up">
        <div className="text-center mb-8">
          <img src={logoVoluntariado} alt="Voluntariado CEJAM" className="mx-auto mb-4 w-24 h-24 object-contain brightness-0 invert" />
          <h1 className="text-2xl font-bold font-heading text-primary-foreground">Bem-vindo!</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Informe seu CPF para começar</p>
        </div>

        <form onSubmit={submit} className="space-y-4 bg-card rounded-2xl p-5 shadow-xl">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                className="pl-10"
                maxLength={14}
                required
              />
            </div>
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Se seu CPF estiver cadastrado, liberamos o acesso. Caso contrário, você poderá se inscrever.
          </p>
        </form>

        <div className="mt-4">
          <InstallAppButton />
        </div>

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate("/cadastro-ggl")}
          >
            Sou Gestor Local
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CpfGate;
