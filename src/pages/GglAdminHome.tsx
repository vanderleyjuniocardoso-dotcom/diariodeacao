import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import {
  MapPin, Users, Phone, Calendar as CalendarIcon, LogOut, Plus, Trash2,
  ChevronLeft, ChevronRight, Building2, Shield, ClipboardList,
} from "lucide-react";

interface Group { id: string; unit_name: string; cities: string[]; unit_actions: string[]; }
interface Member { id: string; name: string; phone: string | null; role: string | null; }
interface Volunteer { cpf: string | null; full_name: string | null; phone: string | null; profession: string | null; credencial: string | null; ggl_id?: string | null; profile_id?: string | null; effective_name: string | null; effective_phone: string | null; }
interface CalEvent { id: string; event_date: string; unit_name: string | null; title: string; description: string | null; }
interface Report {
  id: string; action_date: string; volunteer_name: string; volunteer_cpf: string | null;
  volunteer_credential: string | null; is_cejam_collaborator: boolean; beneficiaries_count: number;
  hours: number; action_type: string; action_name: string;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ACTION_TYPES = ["Capelania", "Palhaçaria", "Apoio"];

const emptyReport = {
  action_date: "",
  volunteer_name: "",
  volunteer_cpf: "",
  volunteer_credential: "",
  is_cejam_collaborator: false,
  beneficiaries_count: 0,
  hours: 0,
  action_type: "",
  action_name: "",
};

const GglAdminHome = () => {
  const { gglAdminGroupId, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear] = useState(new Date().getFullYear());
  const [newEvent, setNewEvent] = useState({ date: "", unit: "", title: "", description: "" });
  const [newReport, setNewReport] = useState({ ...emptyReport });
  const [volSearch, setVolSearch] = useState("");

  const load = async (gid: string) => {
    const [{ data: g }, { data: m }, { data: v }, { data: ev }, { data: rp }] = await Promise.all([
      supabase.from("ggl_groups").select("id, unit_name, cities, unit_actions").eq("id", gid).maybeSingle(),
      supabase.from("ggl_members").select("id, name, phone, role").eq("ggl_id", gid).order("name"),
      (supabase.rpc as any)("get_my_ggl_volunteers"),
      supabase.from("ggl_calendar_events").select("*").eq("ggl_id", gid).order("event_date"),
      supabase.from("ggl_action_reports" as any).select("*").eq("ggl_id", gid).order("action_date", { ascending: false }),
    ]);
    setGroup(g as Group);
    setMembers((m as Member[]) ?? []);
    setVolunteers((v as unknown as Volunteer[]) ?? []);
    setEvents((ev as CalEvent[]) ?? []);
    setReports((rp as unknown as Report[]) ?? []);
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

  // ===== Reporte =====
  const volSuggestions = useMemo(() => {
    const q = volSearch.trim().toLowerCase();
    if (!q) return [];
    return volunteers.filter((v) => {
      const name = (v.effective_name || v.full_name || "").toLowerCase();
      return name.includes(q);
    }).slice(0, 6);
  }, [volSearch, volunteers]);

  const pickVolunteer = (v: Volunteer) => {
    setNewReport((p) => ({
      ...p,
      volunteer_name: v.effective_name || v.full_name || "",
      volunteer_cpf: v.cpf || "",
      volunteer_credential: v.credencial || "",
    }));
    setVolSearch(v.effective_name || v.full_name || "");
  };

  const submitReport = async () => {
    if (!gglAdminGroupId) return;
    if (!newReport.action_date || !newReport.volunteer_name.trim() || !newReport.action_type || !newReport.action_name.trim()) {
      return toast.error("Data, voluntário, tipo e nome da ação são obrigatórios");
    }
    const { error } = await supabase.from("ggl_action_reports" as any).insert({
      ggl_id: gglAdminGroupId,
      action_date: newReport.action_date,
      volunteer_name: newReport.volunteer_name.trim(),
      volunteer_cpf: newReport.volunteer_cpf.trim() || null,
      volunteer_credential: newReport.volunteer_credential.trim() || null,
      is_cejam_collaborator: newReport.is_cejam_collaborator,
      beneficiaries_count: Number(newReport.beneficiaries_count) || 0,
      hours: Number(newReport.hours) || 0,
      action_type: newReport.action_type,
      action_name: newReport.action_name.trim(),
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Reporte salvo");
    setNewReport({ ...emptyReport });
    setVolSearch("");
    load(gglAdminGroupId);
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Excluir este reporte?")) return;
    const { error } = await supabase.from("ggl_action_reports" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (gglAdminGroupId) load(gglAdminGroupId);
  };

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
          <TabsList className="w-full grid grid-cols-4 h-11">
            <TabsTrigger value="info" className="text-[10px] px-1"><Building2 className="h-3 w-3 mr-0.5" />Info</TabsTrigger>
            <TabsTrigger value="cal" className="text-[10px] px-1"><CalendarIcon className="h-3 w-3 mr-0.5" />Calend.</TabsTrigger>
            <TabsTrigger value="vols" className="text-[10px] px-1"><Users className="h-3 w-3 mr-0.5" />Volunt.</TabsTrigger>
            <TabsTrigger value="rep" className="text-[10px] px-1"><ClipboardList className="h-3 w-3 mr-0.5" />Reporte</TabsTrigger>
          </TabsList>

          {/* INFO */}
          <TabsContent value="info" className="mt-4 space-y-3">
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-bold uppercase text-sm mb-2 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />UNIDADES SOB GESTÃO</h3>
              {(group?.cities ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma unidade cadastrada.</p>
              ) : (
                <ul className="space-y-1">
                  {group!.cities.map((c) => <li key={c} className="text-sm">• {c}</li>)}
                </ul>
              )}
            </div>

            <div className="glass-card rounded-xl p-4">
              <h3 className="font-bold uppercase text-sm mb-2 flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />INTEGRANTES</h3>
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
              <h3 className="text-sm font-bold uppercase flex items-center gap-1.5"><Plus className="h-4 w-4 text-primary" />NOVA AÇÃO PLANEJADA</h3>
              <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} className="h-9 text-sm" />
              <Input placeholder="Unidade (opcional)" value={newEvent.unit} onChange={(e) => setNewEvent((p) => ({ ...p, unit: e.target.value }))} className="h-9 text-sm" />
              <Input placeholder="Título da ação" value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} className="h-9 text-sm" />
              <Textarea placeholder="Descrição" rows={2} value={newEvent.description} onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} className="text-sm" />
              <Button onClick={addEvent} size="sm" className="w-full">Cadastrar</Button>
            </div>
          </TabsContent>

          {/* VOLUNTÁRIOS — tabela estilo Excel */}
          <TabsContent value="vols" className="mt-4">
            {volunteers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum voluntário vinculado a este GGL ainda.</p>
            ) : (
              <div className="glass-card rounded-xl overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase font-bold text-foreground">NOME</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-foreground">TELEFONE</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-foreground">PROFISSÃO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volunteers.map((v) => {
                      const phone = v.effective_phone || v.phone || "";
                      return (
                        <TableRow key={v.cpf || v.profile_id || `${v.effective_name}-${idx}`}>
                          <TableCell className="text-xs font-medium py-2">{v.effective_name || v.full_name}</TableCell>
                          <TableCell className="text-xs py-2">
                            {phone ? (
                              <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1">
                                <Phone className="h-3 w-3" />{phone}
                              </a>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs py-2">{v.profession || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* REPORTE */}
          <TabsContent value="rep" className="mt-4 space-y-3">
            <div className="glass-card rounded-xl p-4 space-y-2 border-2 border-primary/20">
              <h3 className="text-sm font-bold uppercase flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-primary" /> NOVO REPORTE DE AÇÃO
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground">Mês</label>
                  <Input value={newReport.action_date ? MONTHS[new Date(newReport.action_date + "T00:00:00").getMonth()] : ""} disabled className="h-8 text-xs" placeholder="Selecione a data" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Data</label>
                  <Input type="date" value={newReport.action_date} onChange={(e) => setNewReport((p) => ({ ...p, action_date: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Horas</label>
                  <Input type="number" step="0.5" min="0" value={newReport.hours} onChange={(e) => setNewReport((p) => ({ ...p, hours: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>

                <div className="col-span-2 relative">
                  <label className="text-[10px] text-muted-foreground">Nome do voluntário (vinculados ao GGL)</label>
                  <Input
                    value={volSearch}
                    onChange={(e) => {
                      setVolSearch(e.target.value);
                      setNewReport((p) => ({ ...p, volunteer_name: e.target.value }));
                    }}
                    placeholder="Comece a digitar o primeiro nome..."
                    className="h-8 text-xs"
                  />
                  {volSuggestions.length > 0 && (
                    <ul className="absolute z-10 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {volSuggestions.map((v) => (
                        <li key={v.cpf}>
                          <button onClick={() => pickVolunteer(v)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted">
                            <span className="font-medium">{v.effective_name || v.full_name}</span>
                            {v.credencial && <span className="text-primary ml-1">· {v.credencial}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground">CPF</label>
                  <Input value={newReport.volunteer_cpf} onChange={(e) => setNewReport((p) => ({ ...p, volunteer_cpf: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Credencial</label>
                  <Input value={newReport.volunteer_credential} readOnly className="h-8 text-xs bg-muted/40" placeholder="Automático" />
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground">Colaborador CEJAM?</label>
                  <Select
                    value={newReport.is_cejam_collaborator ? "sim" : "nao"}
                    onValueChange={(v) => setNewReport((p) => ({ ...p, is_cejam_collaborator: v === "sim" }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">N° de beneficiários</label>
                  <Input type="number" min="0" value={newReport.beneficiaries_count} onChange={(e) => setNewReport((p) => ({ ...p, beneficiaries_count: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground">Tipo de ação</label>
                  <Select value={newReport.action_type} onValueChange={(v) => setNewReport((p) => ({ ...p, action_type: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Nome da ação</label>
                  <Input value={newReport.action_name} onChange={(e) => setNewReport((p) => ({ ...p, action_name: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>

              <Button onClick={submitReport} size="sm" className="w-full mt-2">
                <Plus className="h-3 w-3 mr-1" /> Salvar reporte
              </Button>
            </div>

            <div className="glass-card rounded-xl overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Mês</TableHead>
                    <TableHead className="text-[10px]">Data</TableHead>
                    <TableHead className="text-[10px]">Voluntário</TableHead>
                    <TableHead className="text-[10px]">CPF</TableHead>
                    <TableHead className="text-[10px]">Credencial</TableHead>
                    <TableHead className="text-[10px]">CEJAM</TableHead>
                    <TableHead className="text-[10px]">Benef.</TableHead>
                    <TableHead className="text-[10px]">Horas</TableHead>
                    <TableHead className="text-[10px]">Tipo</TableHead>
                    <TableHead className="text-[10px]">Ação</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-4">Nenhum reporte ainda.</TableCell></TableRow>
                  ) : reports.map((r) => {
                    const d = new Date(r.action_date + "T00:00:00");
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-[10px] py-1.5">{MONTHS[d.getMonth()]}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{d.toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{r.volunteer_name}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{r.volunteer_cpf || "—"}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{r.volunteer_credential || "—"}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{r.is_cejam_collaborator ? "Sim" : "Não"}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{r.beneficiaries_count}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{r.hours}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{r.action_type}</TableCell>
                        <TableCell className="text-[10px] py-1.5">{r.action_name}</TableCell>
                        <TableCell className="py-1.5">
                          <button onClick={() => deleteReport(r.id)} className="text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GglAdminHome;
