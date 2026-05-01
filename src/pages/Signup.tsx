import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Heart, Loader2, Mail, Lock, User, Phone, Building } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", unit: "" });
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, unit: form.unit },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      navigate("/login");
    }
  };

  const fields = [
    { key: "full_name", label: "Nome completo", icon: User, type: "text", required: true },
    { key: "email", label: "E-mail", icon: Mail, type: "email", required: true },
    { key: "password", label: "Senha", icon: Lock, type: "password", required: true },
    { key: "phone", label: "Telefone", icon: Phone, type: "tel", required: false },
    { key: "unit", label: "Unidade / Departamento", icon: Building, type: "text", required: false },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-background">
      <div className="max-w-sm mx-auto w-full animate-fade-up">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-14 h-14 rounded-xl gradient-hero flex items-center justify-center">
            <Heart className="h-7 w-7 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Criar sua conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Junte-se à nossa comunidade de voluntários</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          {fields.map(({ key, label, icon: Icon, type, required }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}{!required && <span className="text-muted-foreground ml-1">(opcional)</span>}</Label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={key}
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => update(key, e.target.value)}
                  className="pl-10"
                  required={required}
                  minLength={key === "password" ? 8 : undefined}
                />
              </div>
            </div>
          ))}

          <Button type="submit" variant="hero" size="lg" className="w-full mt-4" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
