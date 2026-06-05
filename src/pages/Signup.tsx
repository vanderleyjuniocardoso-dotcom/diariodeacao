import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Heart, Loader2, Mail, Lock, IdCard } from "lucide-react";
import { formatCPF } from "@/lib/cpf";

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { cpf?: string; fullName?: string } | null) || {};
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const cpf = prefill.cpf || "";

  if (!cpf) {
    navigate("/cpf-gate", { replace: true });
    return null;
  }

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password || !form.confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (form.password.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres"); return; }
    if (form.password !== form.confirmPassword) { toast.error("As senhas não coincidem"); return; }

    setLoading(true);

    // Lookup credential and registration data by CPF
    const [{ data: adminVol }, { data: registration }] = await Promise.all([
      supabase.from("admin_volunteers").select("credencial, full_name").eq("cpf", cpf).maybeSingle(),
      (supabase.from as any)("volunteer_registrations").select("*").eq("cpf", cpf).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const fullName = prefill.fullName || adminVol?.full_name || registration?.full_name || "";
    const phone = registration?.whatsapp || "";
    const unit = registration?.kit_unit || "";

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: fullName, phone, unit },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) { setLoading(false); toast.error(error.message); return; }

    const userId = data.user?.id;
    if (userId) {
      const update: any = { cpf };
      if (adminVol?.credencial) update.volunteer_credential = adminVol.credencial;
      if (fullName) update.full_name = fullName;
      if (phone) update.phone = phone;
      if (unit) update.unit = unit;
      if (registration?.photo_url) update.avatar_url = registration.photo_url;
      await supabase.from("profiles").update(update).eq("id", userId);
    }
    setLoading(false);
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    navigate("/login");
  };

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
          <div className="space-y-1.5">
            <Label>CPF</Label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={formatCPF(cpf)} readOnly className="pl-10 bg-muted" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Criar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="pl-10" required minLength={8} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="pl-10" required minLength={8} />
            </div>
          </div>

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
