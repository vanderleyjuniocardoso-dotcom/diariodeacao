import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const AguardandoAprovacao = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-hero text-center">
      <div className="max-w-sm w-full bg-card rounded-2xl p-6 shadow-xl animate-fade-up">
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold font-heading text-foreground mb-2">Cadastro enviado!</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Recebemos seus dados. Em breve a equipe do CEJAM vai analisar e liberar seu acesso. Você poderá entrar usando seu CPF assim que for aprovado.
        </p>
        <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/")}>
          Voltar ao início
        </Button>
      </div>
    </div>
  );
};

export default AguardandoAprovacao;
