import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Download, Search, Users, Clock, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const Admin = () => {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<VolunteerSummary[]>([]);
  const [actions, setActions] = useState<ActionDetail[]>([]);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"volunteers" | "actions">("volunteers");
  const [loading, setLoading] = useState(true);

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
        // Seed with all profiles so admin can set level even before any action is registered
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
    if (error) {
      toast.error("Erro ao atualizar nível");
      return;
    }
    setVolunteers((prev) => prev.map((v) => (v.id === userId ? { ...v, volunteer_level: level } : v)));
    toast.success(`Nível atualizado para ${level}`);
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

  const filteredActions = actions.filter((a) =>
    a.action_name.toLowerCase().includes(filter.toLowerCase()) ||
    a.location.toLowerCase().includes(filter.toLowerCase()) ||
    a.profiles?.full_name?.toLowerCase().includes(filter.toLowerCase())
  );

  const filteredVolunteers = volunteers.filter((v) =>
    v.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    v.email.toLowerCase().includes(filter.toLowerCase())
  );

  const totalHours = volunteers.reduce((s, v) => s + v.totalHours, 0);

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
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

      <div className="px-5 mt-5 space-y-4">
        {/* Export */}
        <Button variant="warm" size="lg" className="w-full" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" /> EXPORTAR DADOS
        </Button>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={tab === "volunteers" ? "default" : "outline"} size="sm" onClick={() => setTab("volunteers")} className="flex-1">
            <Users className="h-4 w-4 mr-1" /> Voluntários
          </Button>
          <Button variant={tab === "actions" ? "default" : "outline"} size="sm" onClick={() => setTab("actions")} className="flex-1">
            <Heart className="h-4 w-4 mr-1" /> Ações
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Carregando...</div>
        ) : tab === "volunteers" ? (
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
                  <Button
                    size="sm"
                    variant={v.volunteer_level === 1 ? "default" : "outline"}
                    onClick={() => updateLevel(v.id, 1)}
                    className="h-7 px-3 text-xs"
                  >
                    Nível 1
                  </Button>
                  <Button
                    size="sm"
                    variant={v.volunteer_level === 2 ? "default" : "outline"}
                    onClick={() => updateLevel(v.id, 2)}
                    className="h-7 px-3 text-xs"
                  >
                    Nível 2
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActions.map((a) => (
              <div key={a.id} className="glass-card rounded-xl overflow-hidden">
                {a.photo_url && <img src={a.photo_url} alt="" className="w-full h-32 object-cover" />}
                <div className="p-4">
                  <p className="font-semibold text-foreground">{a.action_name}</p>
                  <p className="text-xs text-primary font-medium">{a.profiles?.full_name}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{new Date(a.action_date).toLocaleDateString("pt-BR")}</span>
                    <span>{a.location}</span>
                    <span>{a.donated_hours}h</span>
                  </div>
                  {a.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
