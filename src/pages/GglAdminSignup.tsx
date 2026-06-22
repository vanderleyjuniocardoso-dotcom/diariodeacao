import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, Building2, Loader2, MapPin } from "lucide-react";
import logoVoluntariado from "@/assets/logo-voluntariado.png";

const GglAdminSignup = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [unit, setUnit] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Informe o e-mail");

    setLoading(true);

    // Verifica se o e-mail está autorizado como ggl_admin
    const { data: gglId, error: rpcErr } = await (supabase.rpc as any)(
      "is_ggl_admin_email",
      { _email: email.trim() },
    );
    if (rpcErr) {
      setLoading(false);
      return toast.error("Erro ao validar e-mail");
    }
    if (!gglId) {
      setLoading(false);
      return toast.error("Este e-mail não está autorizado como administrador de GGL.");
    }

    if (mode === "signup") {
      if (!unit.trim()) { setLoading(false); return toast.error("Informe a unidade"); }
      if (password.length < 6) { setLoading(false); return toast.error("Senha mínima de 6 caracteres"); }
      if (password !== confirm) { setLoading(false); return toast.error("As senhas não conferem"); }

      const redirect = `${window.location.origin}/ggl-admin`;
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirect,
          data: { full_name: email.split("@")[0], unit: unit.trim(), is_ggl_admin: true },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Conta criada! Faça login.");
      setMode("login");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      navigate("/ggl-admin", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 gradient-hero">
      <div className="max-w-sm mx-auto w-full animate-fade-up">
        <div className="text-center mb-6">
          <img src={logoVoluntariado} alt="" className="mx-auto mb-3 w-20 h-20 object-contain brightness-0 invert" />
          <h1 className="text-2xl font-bold font-heading text-primary-foreground">Acesso GGL</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">
            Administradores de Grupo de Gestão Local
          </p>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 text-sm py-2 rounded-md ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
            >
              Criar conta
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 text-sm py-2 rounded-md ${mode === "login" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
            >
              Entrar
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail autorizado</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unidade</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="pl-10" required />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10" required />
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <MapPin className="h-3 w-3" />
            Apenas e-mails autorizados pelo ADM têm acesso.
          </div>
        </div>

        <p className="text-center mt-4 text-xs text-primary-foreground/80">
          Sou voluntário comum,{" "}
          <Link to="/cpf-gate" className="underline font-medium">entrar com CPF</Link>
        </p>
      </div>
    </div>
  );
};

export default GglAdminSignup;
