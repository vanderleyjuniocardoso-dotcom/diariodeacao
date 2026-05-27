import { useState, useRef, useEffect } from "react";
import RegisterIntro from "@/components/RegisterIntro";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, Image, Loader2, MapPin, Clock, FileText, Calendar, Heart, CheckCircle, Tag, User, IdCard, X, Users, Star, Smile } from "lucide-react";
import confetti from "canvas-confetti";

const fireConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;
  const colors = ["#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#bfdbfe"];
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 }, colors });
    confetti({ particleCount: 4, spread: 100, origin: { x: 0.5, y: 0.3 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

const CATEGORIES = [
  "Voluntariado Protagonista",
  "Ações com Parceiros",
  "Nota Fiscal Paulista",
  "Workshop mensal",
  "Encontros de comemoração",
  "Voluntariado Ambiental",
  "Cejam Solidário",
  "Embaixador Conecta",
  "Acompanhamento Psicológico",
  "Voluntariado Corporativo",
];

const RegisterAction = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const [form, setForm] = useState({
    volunteer_name: "",
    volunteer_credential: "",
    action_name: "",
    category: "",
    action_date: new Date().toISOString().split("T")[0],
    location: "",
    donated_hours: "",
    people_impacted: "",
    description: "",
    satisfaction_action: "",
    satisfaction_support: "",
  });

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validação: todos os campos são obrigatórios
    if (!form.volunteer_name.trim()) { toast.error("Informe seu nome"); return; }
    if (!form.volunteer_credential.trim()) { toast.error("Informe sua credencial"); return; }
    if (!form.action_name.trim()) { toast.error("Informe o nome da ação"); return; }
    if (!form.category) { toast.error("Selecione uma categoria"); return; }
    if (!form.action_date) { toast.error("Informe a data da ação"); return; }
    if (!form.donated_hours || parseFloat(form.donated_hours) <= 0) { toast.error("Informe as horas doadas"); return; }
    if (!form.location.trim()) { toast.error("Informe o local da ação"); return; }
    if (!form.people_impacted || parseInt(form.people_impacted) < 0) { toast.error("Informe o número de pessoas impactadas"); return; }
    if (!form.description.trim()) { toast.error("Conte como foi a experiência"); return; }
    if (form.satisfaction_action === "") { toast.error("Informe sua satisfação com a ação"); return; }
    if (form.satisfaction_support === "") { toast.error("Informe sua satisfação com a assistência recebida"); return; }
    if (!photoFile) { toast.error("Adicione uma foto da ação"); return; }

    setLoading(true);

    let photo_url: string | null = null;

    const ext = photoFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("action-photos").upload(path, photoFile);
    if (uploadError) { toast.error("Erro ao enviar foto"); setLoading(false); return; }
    const { data: urlData } = supabase.storage.from("action-photos").getPublicUrl(path);
    photo_url = urlData.publicUrl;

    const { error } = await supabase.from("volunteer_actions").insert({
      user_id: user.id,
      volunteer_name: form.volunteer_name.trim(),
      volunteer_credential: form.volunteer_credential.trim(),
      action_name: form.action_name.trim(),
      category: form.category,
      action_date: form.action_date,
      location: form.location.trim(),
      donated_hours: parseFloat(form.donated_hours),
      people_impacted: parseInt(form.people_impacted),
      description: form.description.trim(),
      photo_url,
      satisfaction_action: parseInt(form.satisfaction_action),
      satisfaction_support: parseInt(form.satisfaction_support),
    } as any);

    setLoading(false);
    if (error) { toast.error("Erro ao registrar ação"); return; }

    // Sincroniza horas na planilha (coluna AG)
    try {
      const { data: syncData, error: syncError } = await supabase.functions.invoke("sheet-add-hours", {
        body: { credential: form.volunteer_credential.trim(), hours: parseFloat(form.donated_hours) },
      });
      if (syncError || (syncData && syncData.ok === false)) {
        console.warn("Falha ao sincronizar com a planilha:", syncError || syncData?.error);
        toast.warning("Ação registrada, mas não foi possível atualizar a planilha.");
      }
    } catch (err) {
      console.warn("Erro ao chamar sheet-add-hours:", err);
    }

    fireConfetti();
    setSuccess(true);
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      navigate("/dashboard");
    }, 2800);
  };

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => handleCloseSuccess(), 4000);
    return () => clearTimeout(t);
  }, [success]);

  if (success) {
    return (
      <div
        onClick={handleCloseSuccess}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 bg-background/95 backdrop-blur-sm animate-scale-in cursor-pointer"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Heart className="h-10 w-10 text-primary fill-primary" />
        </div>
        <h2 className="text-2xl font-bold font-heading text-foreground text-center">Parabéns!</h2>
        <p className="text-base text-foreground mt-2 text-center font-medium max-w-xs">
          Você está fazendo do mundo um lugar melhor. Continue levando amor ❤️
        </p>
      </div>
    );
  }

  if (animating) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 bg-background animate-fade-in">
        <p className="text-base font-semibold text-foreground mb-6 text-center">Você está progredindo na sua trilha! 💙</p>
        <div className="w-full max-w-sm">
          <div className="relative h-4 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              style={{ width: "100%", animation: "progressFill 2.4s ease-out forwards", transformOrigin: "left" }}
            />
          </div>
          <div className="relative h-16 mt-[-44px] pointer-events-none">
            <div
              className="absolute top-1 w-12 h-12 rounded-full bg-background border-4 border-primary overflow-hidden shadow-lg flex items-center justify-center"
              style={{ animation: "avatarMove 2.4s ease-out forwards", left: 0 }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <Heart className="h-6 w-6 text-primary fill-primary" />
          </div>
        </div>
        <style>{`
          @keyframes progressFill {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
          @keyframes avatarMove {
            from { left: 0%; transform: translateX(0); }
            to { left: 100%; transform: translateX(-100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {showIntro && <RegisterIntro onDone={() => setShowIntro(false)} />}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">Registrar Ação</h1>
        <p className="text-sm text-muted-foreground mt-1">Compartilhe sua experiência voluntária</p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 space-y-4 animate-fade-up">
        <div className="space-y-1.5">
          <Label htmlFor="vname"><User className="inline h-4 w-4 mr-1 text-muted-foreground" />Seu nome</Label>
          <Input id="vname" value={form.volunteer_name} onChange={(e) => update("volunteer_name", e.target.value)} placeholder="Nome completo do voluntário" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vcred"><IdCard className="inline h-4 w-4 mr-1 text-muted-foreground" />Credencial</Label>
          <Input id="vcred" value={form.volunteer_credential} onChange={(e) => update("volunteer_credential", e.target.value)} placeholder="Sua credencial" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name"><FileText className="inline h-4 w-4 mr-1 text-muted-foreground" />Nome da ação</Label>
          <Input id="name" value={form.action_name} onChange={(e) => update("action_name", e.target.value)} placeholder="Ex: Distribuição de alimentos" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category"><Tag className="inline h-4 w-4 mr-1 text-muted-foreground" />Categoria</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)} required>
            <SelectTrigger id="category">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="date"><Calendar className="inline h-4 w-4 mr-1 text-muted-foreground" />Data</Label>
            <Input id="date" type="date" value={form.action_date} onChange={(e) => update("action_date", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours"><Clock className="inline h-4 w-4 mr-1 text-muted-foreground" />Horas doadas</Label>
            <Input id="hours" type="number" step="0.5" min="0.5" value={form.donated_hours} onChange={(e) => update("donated_hours", e.target.value)} placeholder="Ex: 4" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location"><MapPin className="inline h-4 w-4 mr-1 text-muted-foreground" />Local</Label>
          <Input id="location" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Ex: Centro Comunitário São Paulo" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="impacted"><Users className="inline h-4 w-4 mr-1 text-muted-foreground" />Pessoas impactadas</Label>
          <Input id="impacted" type="number" min="0" step="1" value={form.people_impacted} onChange={(e) => update("people_impacted", e.target.value)} placeholder="Ex: 50" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc"><Heart className="inline h-4 w-4 mr-1 text-muted-foreground" />Como foi a experiência?</Label>
          <Textarea
            id="desc"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Descreva como se sentiu, o que aprendeu, o impacto emocional..."
            className="min-h-[120px] resize-none"
            required
          />
        </div>

        {/* Satisfação */}
        {[
          { key: "satisfaction_action", label: "Sua satisfação com a ação", icon: Star },
          { key: "satisfaction_support", label: "Sua satisfação com a assistência recebida", icon: Smile },
        ].map(({ key, label, icon: Icon }) => {
          const value = form[key as "satisfaction_action" | "satisfaction_support"];
          return (
            <div key={key} className="space-y-2">
              <Label><Icon className="inline h-4 w-4 mr-1 text-muted-foreground" />{label} <span className="text-destructive">*</span></Label>
              <div className="flex items-center justify-between gap-2">
                {[0, 1, 2, 3, 4, 5].map((n) => {
                  const selected = value === String(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => update(key, String(n))}
                      className={`flex-1 h-10 rounded-lg text-sm font-bold border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-muted"
                      }`}
                      aria-label={`Nota ${n}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">0 = muito ruim · 5 = excelente</p>
            </div>
          );
        })}

        {/* Photo upload */}
        <div className="space-y-2">
          <Label>Foto da ação</Label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          {photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
              >
                Remover
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { if (fileRef.current) { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); } }}>
                <Camera className="h-4 w-4 mr-1" /> Câmera
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); } }}>
                <Image className="h-4 w-4 mr-1" /> Galeria
              </Button>
            </div>
          )}
        </div>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar Ação"}
        </Button>
      </form>

      <BottomNav />
    </div>
  );
};

export default RegisterAction;
