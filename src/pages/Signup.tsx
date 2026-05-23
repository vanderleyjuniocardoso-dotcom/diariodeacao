import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Heart, Loader2, Mail, Lock, User, Phone, Building, Camera, IdCard } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", unit: "", volunteer_credential: "" });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const onAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password || !form.phone.trim() || !form.unit.trim() || !form.volunteer_credential.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (!avatarFile) { toast.error("Selecione uma foto de perfil"); return; }
    if (form.password.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, unit: form.unit },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const userId = data.user?.id;
    if (userId) {
      // Save credential on profile
      if (form.volunteer_credential.trim()) {
        await supabase.from("profiles").update({ volunteer_credential: form.volunteer_credential.trim() }).eq("id", userId);
      }
      if (avatarFile) {
        try {
          const ext = avatarFile.name.split(".").pop();
          const path = `${userId}/avatar-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
          if (!upErr) {
            const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
            await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", userId);
          }
        } catch {}
      }
    }
    setLoading(false);
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    navigate("/login");
  };

  const fields = [
    { key: "full_name", label: "Nome completo", icon: User, type: "text", required: true },
    { key: "email", label: "E-mail", icon: Mail, type: "email", required: true },
    { key: "password", label: "Senha", icon: Lock, type: "password", required: true },
    { key: "volunteer_credential", label: "Credencial do voluntário (Entre em contato com a equipe para pedir sua credencial)", icon: IdCard, type: "text", required: true },
    { key: "phone", label: "Telefone", icon: Phone, type: "tel", required: true },
    { key: "unit", label: "Unidade / Departamento", icon: Building, type: "text", required: true },
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
          {/* Avatar upload */}
          <div className="flex flex-col items-center mb-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Camera className="h-3 w-3" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelect} />
            <p className="text-xs text-muted-foreground mt-2">Foto de perfil</p>
          </div>

          {fields.map(({ key, label, icon: Icon, type, required }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
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
