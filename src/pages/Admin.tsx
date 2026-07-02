import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Download, Search, Users, Clock, Heart, BarChart3, Megaphone, IdCard, Inbox, Settings, Trophy, MapPin, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminBroadcastComposer from "@/components/AdminBroadcastComposer";
import AdminGglManager from "@/components/AdminGglManager";
import AdminAuthorizedBase from "@/components/AdminAuthorizedBase";
import AdminPendingRegistrations from "@/components/AdminPendingRegistrations";
import AdminWelcomeMeetings from "@/components/AdminWelcomeMeetings";
import AdminMagnaClasses from "@/components/AdminMagnaClasses";
import AdminIntegrationVideo from "@/components/AdminIntegrationVideo";

interface VolunteerSummary {
  id: string;
  full_name: string;
  email: string;
  cpf: string | null;
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

const INDICATORS: { key: string; label: string; color: string }[] = [
  { key: "ativos", label: "Voluntários Ativos", color: "#3B82F6" },
  { key: "horas", label: "Horas de Voluntariado", color: "#10B981" },
  { key: "capacitados", label: "Voluntários Capacitados", color: "#8B5CF6" },
  { key: "saude", label: "Voluntários da Saúde", color: "#EF4444" },
  { key: "unidSaude", label: "Unidades dos Voluntários da Saúde", color: "#F59E0B" },
  { key: "unidDemais", label: "Unidades dos Demais Serviços", color: "#EC4899" },
  { key: "trilha", label: "Engajamento na Trilha", color: "#14B8A6" },
  { key: "colab", label: "Colaboradores Engajados", color: "#6366F1" },
  { key: "mutiroes", label: "Mutirões Realizados", color: "#F97316" },
];

const IndicatorCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
      <div className="relative h-16 w-16 flex-shrink-0">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={r} stroke={`${color}33`} strokeWidth="7" fill="none" />
          <circle
            cx="32" cy="32" r={r}
            stroke={color}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c}
            className="indicator-ring-fill"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{value}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </div>
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
  const [authorizedCount, setAuthorizedCount] = useState(0);
  const [showReport, setShowReport] = useState(false);

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
        .select("id, full_name, email, cpf, volunteer_level, volunteer_credential");

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
            cpf: (p as any).cpf ?? null,
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
      const { count: baseCount } = await supabase
        .from("admin_volunteers")
        .select("*", { count: "exact", head: true });
      setAuthorizedCount(baseCount || 0);

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

  const deleteVolunteer = async (v: VolunteerSummary) => {
    if (!v.cpf) { toast.error("Voluntário sem CPF vinculado"); return; }
    if (!confirm(`Excluir DEFINITIVAMENTE ${v.full_name}? Isso apaga conta, e-mail, cadastro e todo o histórico.`)) return;
    const { error } = await supabase.rpc("delete_authorized_volunteer" as any, { _cpf: v.cpf });
    if (error) { toast.error(error.message); return; }
    toast.success("Voluntário excluído completamente");
    setVolunteers((prev) => prev.filter((x) => x.id !== v.id));
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

  const rankedVolunteers = [...volunteers]
    .sort((a, b) => b.totalHours - a.totalHours || b.totalActions - a.totalActions)
    .map((v, i) => ({ ...v, rank: i + 1 }));
  const filteredVolunteers = rankedVolunteers.filter((v) =>
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
          <TabsList className="w-full grid grid-cols-6 h-auto">
            <TabsTrigger value="volunteers" className="text-[9px] px-0.5"><Trophy className="h-3 w-3 mr-0.5" />Ranking</TabsTrigger>
            <TabsTrigger value="base" className="text-[9px] px-0.5"><IdCard className="h-3 w-3 mr-0.5" />Base</TabsTrigger>
            <TabsTrigger value="pending" className="text-[9px] px-0.5"><Inbox className="h-3 w-3 mr-0.5" />Pend.</TabsTrigger>
            <TabsTrigger value="gestao" className="text-[9px] px-0.5"><Settings className="h-3 w-3 mr-0.5" />Gestão</TabsTrigger>
            <TabsTrigger value="engagement" className="text-[9px] px-0.5"><MapPin className="h-3 w-3 mr-0.5" />GGL</TabsTrigger>
            <TabsTrigger value="data" className="text-[9px] px-0.5"><BarChart3 className="h-3 w-3 mr-0.5" />Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="gestao" className="space-y-5 mt-4">
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Settings className="h-3.5 w-3.5 text-primary" />Reunião de Boas Vindas</h3>
              <AdminWelcomeMeetings />
            </section>
            <section>
              <h3 className="font-semibold text-sm mb-2">Capacitação Magna</h3>
              <AdminMagnaClasses />
            </section>
            <section>
              <AdminIntegrationVideo />
            </section>
          </TabsContent>

          <TabsContent value="base" className="space-y-4 mt-4">
            <AdminBroadcastComposer />
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
                {filteredVolunteers.map((v) => {
                  const medal = v.rank === 1 ? "#FFD700" : v.rank === 2 ? "#C0C0C0" : v.rank === 3 ? "#CD7F32" : null;
                  return (
                    <div key={v.id} className="glass-card rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-muted-foreground w-6">{v.rank}º</span>
                        {medal && <Trophy className="h-4 w-4 flex-shrink-0" style={{ color: medal, fill: medal }} />}
                        <p className="font-semibold text-foreground flex-1">{v.full_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-8">Nível {v.volunteer_level}</p>
                      <div className="flex gap-4 mt-2 ml-8 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{v.totalHours}h</span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{v.totalActions} ações</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 ml-8">
                        <span className="text-xs font-medium text-foreground">Nível:</span>
                        {[1, 2, 3].map((lvl) => (
                          <Button key={lvl} size="sm" variant={v.volunteer_level === lvl ? "default" : "outline"} onClick={() => updateLevel(v.id, lvl)} className="h-7 px-3 text-xs">
                            {lvl}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* GGL */}
          <TabsContent value="engagement" className="space-y-4 mt-4">
            <AdminGglManager />
          </TabsContent>

          {/* INDICADORES */}
          <TabsContent value="data" className="space-y-4 mt-4">
            <div className="grid grid-cols-5 gap-3">
              {INDICATORS.slice(0, 5).map((ind) => {
                const value =
                  ind.key === "ativos" ? authorizedCount :
                  ind.key === "horas" ? totalHours :
                  "—";
                return <IndicatorCard key={ind.key} label={ind.label} value={value} color={ind.color} />;
              })}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {INDICATORS.slice(5).map((ind) => {
                const value =
                  ind.key === "ativos" ? authorizedCount :
                  ind.key === "horas" ? totalHours :
                  "—";
                return <IndicatorCard key={ind.key} label={ind.label} value={value} color={ind.color} />;
              })}
            </div>

            <Button
              variant="warm"
              size="lg"
              className="w-full"
              onClick={() => setShowReport((s) => !s)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showReport ? "Fechar Relatório de Ações" : "Relatório de Ações"}
            </Button>

            <Button
              asChild
              variant="default"
              size="lg"
              className="w-full"
            >
              <a
                href="https://fluxogramaoperacional.lovable.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                GESTÃO DOCUMENTAL
              </a>
            </Button>

            {showReport && (
              <div className="glass-card rounded-xl p-4 space-y-3 animate-fade-in">
                <div>
                  <h3 className="font-semibold text-foreground">Relatório de Ações</h3>
                  <p className="text-xs text-muted-foreground">Fotos das ações e exportação da planilha.</p>
                </div>

                <Button variant="default" size="lg" className="w-full" onClick={exportToExcel}>
                  <Download className="h-4 w-4 mr-2" /> EXPORTAR PLANILHA
                </Button>

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
            )}
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
