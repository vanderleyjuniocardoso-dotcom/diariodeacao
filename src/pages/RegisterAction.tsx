import { useState, useRef } from "react";
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
import { Camera, Image, Loader2, MapPin, Clock, FileText, Calendar, Heart, CheckCircle, Tag, User, IdCard } from "lucide-react";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    volunteer_name: "",
    volunteer_credential: "",
    action_name: "",
    category: "",
    action_date: new Date().toISOString().split("T")[0],
    location: "",
    donated_hours: "",
    description: "",
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
    if (!form.description.trim()) { toast.error("Conte como foi a experiência"); return; }
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
      action_name: form.action_name.trim(),
      category: form.category,
      action_date: form.action_date,
      location: form.location.trim(),
      donated_hours: parseFloat(form.donated_hours),
      description: form.description.trim(),
      photo_url,
    });

    setLoading(false);
    if (error) { toast.error("Erro ao registrar ação"); return; }
    setSuccess(true);
    setTimeout(() => navigate("/dashboard"), 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground">Ação registrada!</h2>
        <p className="text-sm text-muted-foreground mt-2 text-center">Obrigado por fazer a diferença. 💙</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">Registrar Ação</h1>
        <p className="text-sm text-muted-foreground mt-1">Compartilhe sua experiência voluntária</p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 space-y-4 animate-fade-up">
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
