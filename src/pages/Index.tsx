import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import logoVoluntariado from "@/assets/logo-voluntariado.png";
import InstallAppButton from "@/components/InstallAppButton";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) navigate("/volunteers", { replace: true, state: { fromWelcome: true } });
    else navigate("/cpf-gate", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary-foreground animate-pulse" />
        <div className="absolute bottom-32 right-8 w-24 h-24 rounded-full bg-primary-foreground animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-primary-foreground animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 text-center max-w-sm animate-fade-up">
        <img src={logoVoluntariado} alt="Logo Voluntariado CEJAM" className="mx-auto mb-6 w-44 h-44 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.25)] brightness-0 invert" />

        <h1 className="text-3xl font-bold font-heading text-primary-foreground mb-2 leading-tight">
          VOLUNTAGRAM
        </h1>
        <p className="text-sm font-medium text-primary-foreground/80 mb-1">CEJAM</p>

        <div className="my-8 px-4">
          <p className="text-xl font-heading font-semibold text-primary-foreground italic">
            "Onde há voluntário, há Amor!"
          </p>
        </div>

        <div className="space-y-3">
          <Button variant="warm" size="xl" className="w-full" onClick={() => navigate("/login")}>
            Entrar
          </Button>
          <Button variant="outline" size="lg" className="w-full bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => navigate("/signup")}>
            Criar Conta
          </Button>
          <InstallAppButton />
        </div>

        <p className="mt-8 text-xs text-primary-foreground/60">
          Transformando vidas através do voluntariado
        </p>
      </div>
    </div>
  );
};

export default Index;
