import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Download, Search, Users, Clock, Heart, BarChart3, Megaphone, IdCard, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminBroadcastComposer from "@/components/AdminBroadcastComposer";
import AdminGglManager from "@/components/AdminGglManager";
import AdminAuthorizedBase from "@/components/AdminAuthorizedBase";
import AdminPendingRegistrations from "@/components/AdminPendingRegistrations";

interface VolunteerSummary {
  id: string;
  full_name: string;
  email: string;
  totalHours: number;
  totalActions: number;
  volunteer_level: number;
  volunteer_credential: string | null;
}

interface ActionDetail {
  id: string;
  action_name: string;
  action_date: string;
  location: string;
  donated_hours: number;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  user_id: string;
  profiles: { full_name: string; email: string } | null;
}

const CredentialEditor = ({ initial, onSave }: { initial: string; onSave: (v: string) => Promise<void> | void }) => {
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(initial); }, [initial]);
  const dirty = value.trim() !== initial.trim();
  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-xs font-medium text-foreground whitespace-nowrap">Credencial:</span>
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="—" className="h-7 text-xs" />
      <Button size="sm" variant="outline" disabled={!dirty} onClick={() => onSave(value)} className="h-7 px-3 text-xs">Salvar</Button>
    </div>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<VolunteerSummary[]>([]);
  const [actions, setActions] = useState<ActionDetail[]>([]);
  const [volunteerFilter, setVolunteerFilter] = useState("");
  const [photoFilter, setPhotoFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState<{ url: string; volunteer: string; action: string; location: string } | null>(null);

  const downloadPhoto = async () => {
    if (!photoModal) return;
    try {
      const res = await fetch(photoModal.url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const safe = (s: string) => s.replace(/[^\w\-]+/g, "_");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safe(photoModal.volunteer)}_${safe(photoModal.action)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar a foto");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: actionsData } = await supabase
        .from("volunteer_actions")
        .select("*")
        .order("action_date", { ascending: false });

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, volunteer_level, volunteer_credential");

      const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

      if (actionsData) {
        const enriched: ActionDetail[] = actionsData.map((a) => ({
          ...a,
          profiles: profileMap.get(a.user_id) ? { full_name: profileMap.get(a.user_id)!.full_name, email: profileMap.get(a.user_id)!.email } : null,
        }));
        setActions(enriched);

        const map = new Map<string, VolunteerSummary>();
        for (const p of profilesData || []) {
          map.set(p.id, {
            id: p.id,
            full_name: p.full_name || "—",
            email: p.email || "—",
            totalHours: 0,
            totalActions: 0,
            volunteer_level: (p as any).volunteer_level ?? 1,
            volunteer_credential: (p as any).volunteer_credential ?? null,
          });
        }
        for (const a of enriched) {
          const existing = map.get(a.user_id);
          if (existing) {
            existing.totalHours += Number(a.donated_hours);
            existing.totalActions += 1;
          }
        }
        setVolunteers(Array.from(map.values()));
      }
      setLoading(false);
    };
    load();
  }, []);

  const updateLevel = async (userId: string, level: number) => {
    const { error } = await supabase.from("profiles").update({ volunteer_level: level }).eq("id", userId);
    if (error) { toast.error("Erro ao atualizar nível"); return; }
    setVolunteers((prev) => prev.map((v) => (v.id === userId ? { ...v, volunteer_level: level } : v)));
    toast.success(`Nível atualizado para ${level}`);
  };

  const updateCredential = async (userId: string, credential: string) => {
    const value = credential.trim() || null;
    const { error } = await supabase.from("profiles").update({ volunteer_credential: value }).eq("id", userId);
    if (error) { toast.error("Erro ao salvar credencial"); return; }
    setVolunteers((prev) => prev.map((v) => (v.id === userId ? { ...v, volunteer_credential: value } : v)));
    toast.success("Credencial salva");
  };

  const exportToExcel = () => {
    const rows = actions.map((a) => ({
      "Nome do Voluntário": a.profiles?.full_name || "—",
      "E-mail": a.profiles?.email || "—",
      "Nome da Ação": a.action_name,
      "Data da Ação": new Date(a.action_date).toLocaleDateString("pt-BR"),
      "Local": a.location,
      "Horas Doadas": a.donated_hours,
      "Relato da Experiência": a.description || "",
      "URL da Foto": a.photo_url || "",
      "Data de Envio": new Date(a.created_at).toLocaleDateString("pt-BR"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ações");
    XLSX.writeFile(workbook, `voluntariado_cejam_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Dados exportados com sucesso!");
  };

  const filteredVolunteers = volunteers.filter((v) =>
    v.full_name.toLowerCase().includes(volunteerFilter.toLowerCase()) ||
    v.email.toLowerCase().includes(volunteerFilter.toLowerCase())
  );

  const actionsWithPhotos = actions.filter((a) => !!a.photo_url);
  const filteredPhotos = actionsWithPhotos.filter((a) =>
    a.action_name.toLowerCase().includes(photoFilter.toLowerCase()) ||
    a.location.toLowerCase().includes(photoFilter.toLowerCase()) ||
    a.profiles?.full_name?.toLowerCase().includes(photoFilter.toLowerCase())
  );

  const totalHours = volunteers.reduce((s, v) => s + v.totalHours, 0);

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="gradient-hero px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold font-heading text-primary-foreground">Painel Admin</h1>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary-foreground/10 rounded-xl p-3 text-center">
            <Users className="h-5 w-5 text-primary-foreground mx-auto mb-1" />
            <p className="text-lg font-bold text-primary-foreground">{volunteers.length}</p>
            <p className="text-[10px] text-primary-foreground/70">Voluntários</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-xl p-3 text-center">
            <Heart className="h-5 w-5 text-primary-foreground mx-auto mb-1" />
            <p className="text-lg font-bold text-primary-foreground">{actions.length}</p>
            <p className="text-[10px] text-primary-foreground/70">Ações</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-xl p-3 text-center">
            <Clock className="h-5 w-5 text-primary-foreground mx-auto mb-1" />
            <p className="text-lg font-bold text-primary-foreground">{totalHours}</p>
            <p className="text-[10px] text-primary-foreground/70">Horas</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5">
        <Tabs defaultValue="volunteers" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="volunteers" className="text-[10px] px-1"><Users className="h-3 w-3 mr-0.5" />Cadastrados</TabsTrigger>
            <TabsTrigger value="base" className="text-[10px] px-1"><IdCard className="h-3 w-3 mr-0.5" />Base CPF</TabsTrigger>
            <TabsTrigger value="pending" className="text-[10px] px-1"><Inbox className="h-3 w-3 mr-0.5" />Pendentes</TabsTrigger>
            <TabsTrigger value="engagement" className="text-[10px] px-1"><Megaphone className="h-3 w-3 mr-0.5" />Engaj.</TabsTrigger>
            <TabsTrigger value="data" className="text-[10px] px-1"><BarChart3 className="h-3 w-3 mr-0.5" />Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="space-y-4 mt-4">
            <AdminAuthorizedBase />
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-4">
            <AdminPendingRegistrations />
          </TabsContent>

          {/* VOLUNTÁRIOS */}
          <TabsContent value="volunteers" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar voluntário..." value={volunteerFilter} onChange={(e) => setVolunteerFilter(e.target.value)} className="pl-10" />
            </div>
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {filteredVolunteers.map((v) => (
                  <div key={v.id} className="glass-card rounded-xl p-4">
                    <p className="font-semibold text-foreground">{v.full_name}</p>
                    <p className="text-xs text-muted-foreground">{v.email}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{v.totalHours}h</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{v.totalActions} ações</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs font-medium text-foreground">Nível:</span>
                      {[1, 2, 3].map((lvl) => (
                        <Button key={lvl} size="sm" variant={v.volunteer_level === lvl ? "default" : "outline"} onClick={() => updateLevel(v.id, lvl)} className="h-7 px-3 text-xs">
                          Nível {lvl}
                        </Button>
                      ))}
                    </div>
                    <CredentialEditor initial={v.volunteer_credential ?? ""} onSave={(value) => updateCredential(v.id, value)} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ENGAJAMENTO */}
          <TabsContent value="engagement" className="space-y-4 mt-4">
            <AdminBroadcastComposer />
            <AdminGglManager />
          </TabsContent>

          {/* DADOS */}
          <TabsContent value="data" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="glass-card rounded-xl p-3 text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{volunteers.length}</p>
                <p className="text-[10px] text-muted-foreground">Voluntários cadastrados</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{totalHours}</p>
                <p className="text-[10px] text-muted-foreground">Horas registradas</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <Heart className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{actions.length}</p>
                <p className="text-[10px] text-muted-foreground">Ações totais</p>
              </div>
            </div>

            <Button variant="warm" size="lg" className="w-full" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" /> EXPORTAR PLANILHA
            </Button>

            <div className="glass-card rounded-xl p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Fotos das ações</h3>
                <p className="text-xs text-muted-foreground">Toque em uma foto para ver detalhes e baixar.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por voluntário, ação ou local..." value={photoFilter} onChange={(e) => setPhotoFilter(e.target.value)} className="pl-10 h-9 text-sm" />
              </div>
              {filteredPhotos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma foto encontrada.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredPhotos.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setPhotoModal({ url: a.photo_url!, volunteer: a.profiles?.full_name || "—", action: a.action_name, location: a.location })}
                      className="aspect-square rounded-lg overflow-hidden bg-muted relative group"
                    >
                      <img src={a.photo_url!} alt={a.action_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {photoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="max-w-lg w-full bg-card rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img src={photoModal.url} alt="" className="w-full max-h-[60vh] object-contain bg-black" />
            <div className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Voluntário</p>
              <p className="font-semibold text-foreground">{photoModal.volunteer}</p>
              <p className="text-xs text-muted-foreground mt-2">Ação</p>
              <p className="font-semibold text-foreground">{photoModal.action}</p>
              <p className="text-xs text-muted-foreground mt-2">Local</p>
              <p className="font-semibold text-foreground">{photoModal.location}</p>
            </div>
            <div className="flex gap-2 p-4 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setPhotoModal(null)}>Fechar</Button>
              <Button variant="default" className="flex-1" onClick={downloadPhoto}>
                <Download className="h-4 w-4 mr-2" /> Baixar foto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
