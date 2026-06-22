import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MapPin, Users, Phone, Calendar as CalendarIcon, LogOut, Plus, Trash2, ChevronLeft, ChevronRight, Building2, Shield,
} from "lucide-react";

interface Group { id: string; unit_name: string; cities: string[]; unit_actions: string[]; }
interface Member { id: string; name: string; phone: string | null; role: string | null; }
interface Volunteer { cpf: string; full_name: string; phone: string | null; profession: string | null; credencial: string | null; effective_name: string | null; effective_phone: string | null; }
interface CalEvent { id: string; event_date: string; unit_name: string | null; title: string; description: string | null; }

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const GglAdminHome = () => {
  const { gglAdminGroupId, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear] = useState(new Date().getFullYear());
  const [newEvent, setNewEvent] = useState({ date: "", unit: "", title: "", description: "" });

  const load = async (gid: string) => {
    const [{ data: g }, { data: m }, { data: v }, { data: ev }] = await Promise.all([
      supabase.from("ggl_groups").select("id, unit_name, cities, unit_actions").eq("id", gid).maybeSingle(),
      supabase.from("ggl_members").select("id, name, phone, role").eq("ggl_id", gid).order("name"),
      supabase.from("ggl_volunteers_view" as any).select("*").eq("ggl_id", gid).order("effective_name"),
      supabase.from("ggl_calendar_events").select("*").eq("ggl_id", gid).order("event_date"),
    ]);
    setGroup(g as Group);
    setMembers((m as Member[]) ?? []);
    setVolunteers((v as unknown as Volunteer[]) ?? []);
    setEvents((ev as CalEvent[]) ?? []);
  };

  useEffect(() => {
    if (gglAdminGroupId) load(gglAdminGroupId);
  }, [gglAdminGroupId]);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const addEvent = async () => {
    if (!gglAdminGroupId || !newEvent.date || !newEvent.title.trim()) {
      return toast.error("Data e título são obrigatórios");
    }
    const { error } = await supabase.from("ggl_calendar_events").insert({
      ggl_id: gglAdminGroupId,
      event_date: newEvent.date,
      unit_name: newEvent.unit.trim() || null,
      title: newEvent.title.trim(),
      description: newEvent.description.trim() || null,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setNewEvent({ date: "", unit: "", title: "", description: "" });
    toast.success("Evento cadastrado");
    load(gglAdminGroupId);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Excluir este evento?")) return;
    const { error } = await supabase.from("ggl_calendar_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (gglAdminGroupId) load(gglAdminGroupId);
  };

  const eventsThisMonth = events.filter((e) => {
    const d = new Date(e.event_date + "T00:00:00");
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  });

  if (!gglAdminGroupId) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Sem GGL vinculado.</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="gradient-hero px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-lg font-bold font-heading text-primary-foreground">Admin GGL</h1>
          </div>
          <Button variant="outline" size="icon" onClick={handleLogout} className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-primary-foreground text-xl font-bold font-heading">{group?.unit_name ?? "Carregando..."}</p>
        {!!group?.cities?.length && (
          <p className="text-primary-foreground/80 text-xs mt-1">{group.cities.join(" · ")}</p>
        )}
      </div>

      <div className="px-5 mt-4">
        <Tabs defaultValue="info">
          <TabsList className="w-full grid grid-cols-3 h-11">
            <TabsTrigger value="info" className="text-xs"><Building2 className="h-3.5 w-3.5 mr-1" />Informações</TabsTrigger>
            <TabsTrigger value="cal" className="text-xs"><CalendarIcon className="h-3.5 w-3.5 mr-1" />Calendário</TabsTrigger>
            <TabsTrigger value="vols" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" />Voluntários</TabsTrigger>
          </TabsList>

          {/* INFO */}
          <TabsContent value="info" className="mt-4 space-y-3">
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />Unidades sob gestão</h3>
              {(group?.cities ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma unidade cadastrada.</p>
              ) : (
                <ul className="space-y-1">
                  {group!.cities.map((c) => <li key={c} className="text-sm">• {c}</li>)}
                </ul>
              )}
            </div>

            <div className="glass-card rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />Integrantes</h3>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum integrante cadastrado.</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.role || "—"}</p>
                      </div>
                      {m.phone && (
                        <a href={`https://wa.me/${m.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-xs text-primary font-semibold flex items-center gap-1">
                          <Phone className="h-3 w-3" />{m.phone}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* CALENDÁRIO */}
          <TabsContent value="cal" className="mt-4 space-y-3">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCalMonth((m) => (m + 11) % 12)}><ChevronLeft className="h-5 w-5" /></button>
                <h3 className="font-semibold text-sm">{MONTHS[calMonth]} / {calYear}</h3>
                <button onClick={() => setCalMonth((m) => (m + 1) % 12)}><ChevronRight className="h-5 w-5" /></button>
              </div>
              {eventsThisMonth.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma ação planejada neste mês.</p>
              ) : (
                <ul className="space-y-2">
                  {eventsThisMonth.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                      <div className="text-center min-w-[40px]">
                        <p className="text-lg font-bold text-primary leading-none">{new Date(e.event_date + "T00:00:00").getDate()}</p>
                        <p className="text-[9px] uppercase">{MONTHS[calMonth].slice(0, 3)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{e.title}</p>
                        {e.unit_name && <p className="text-[11px] text-muted-foreground">{e.unit_name}</p>}
                        {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                      </div>
                      <button onClick={() => deleteEvent(e.id)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass-card rounded-xl p-4 space-y-2 border-2 border-primary/20">
              <h3 className="text-sm font-semibold flex items-center gap-1.5"><Plus className="h-4 w-4 text-primary" />Nova ação planejada</h3>
              <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} className="h-9 text-sm" />
              <Input placeholder="Unidade (opcional)" value={newEvent.unit} onChange={(e) => setNewEvent((p) => ({ ...p, unit: e.target.value }))} className="h-9 text-sm" />
              <Input placeholder="Título da ação" value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} className="h-9 text-sm" />
              <Textarea placeholder="Descrição" rows={2} value={newEvent.description} onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} className="text-sm" />
              <Button onClick={addEvent} size="sm" className="w-full">Cadastrar</Button>
            </div>
          </TabsContent>

          {/* VOLUNTÁRIOS */}
          <TabsContent value="vols" className="mt-4 space-y-2">
            {volunteers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum voluntário vinculado a este GGL ainda.</p>
            ) : (
              volunteers.map((v) => (
                <div key={v.cpf} className="glass-card rounded-xl p-3">
                  <p className="text-sm font-medium">{v.effective_name || v.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.profession || "Profissão não informada"}
                    {v.credencial && <span className="ml-2 text-primary">· {v.credencial}</span>}
                  </p>
                  {(v.effective_phone || v.phone) && (
                    <a
                      href={`https://wa.me/${(v.effective_phone || v.phone || "").replace(/\D/g, "")}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-primary font-semibold flex items-center gap-1 mt-1"
                    >
                      <Phone className="h-3 w-3" />{v.effective_phone || v.phone}
                    </a>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GglAdminHome;
