import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus, Trash2, MapPin, ChevronDown, ChevronUp, UserPlus, Mail,
  Calendar as CalendarIcon, Upload, Phone, ClipboardList, Download,
} from "lucide-react";
import GglStatsDashboard from "@/components/GglStatsDashboard";

interface Group { id: string; unit_name: string; cities: string[]; unit_actions: string[]; }
interface Member { id: string; ggl_id: string; name: string; phone: string | null; role: string | null; }
interface Profile { id: string; full_name: string; ggl_id: string | null; phone: string | null; cpf: string | null; }
interface AdminVol { cpf: string; phone: string | null; profession: string | null; }
interface AdminEmail { id: string; ggl_id: string; email: string; }
interface CalEvent { id: string; ggl_id: string; event_date: string; unit_name: string | null; title: string; description: string | null; }
interface Report {
  id: string; ggl_id: string; action_date: string; volunteer_name: string; volunteer_cpf: string | null;
  volunteer_credential: string | null; is_cejam_collaborator: boolean; beneficiaries_count: number;
  hours: number; action_type: string; action_name: string;
}

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function AdminGglManager() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminVols, setAdminVols] = useState<AdminVol[]>([]);
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [calendarFor, setCalendarFor] = useState<Group | null>(null);
  const [reportsFor, setReportsFor] = useState<Group | null>(null);
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [reportsMonth, setReportsMonth] = useState<number | null>(null);
  const [newGroup, setNewGroup] = useState({ unit: "", cities: "" });
  const [newMember, setNewMember] = useState<Record<string, { name: string; phone: string; role: string }>>({});
  const [newEmail, setNewEmail] = useState<Record<string, string>>({});
  const [newEvent, setNewEvent] = useState({ date: "", unit: "", title: "", description: "" });
  const [assignSearch, setAssignSearch] = useState<Record<string, string>>({});
  const [showMemberForm, setShowMemberForm] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [{ data: g }, { data: m }, { data: p }, { data: av }, { data: em }, { data: ev }, { data: rp }] = await Promise.all([
      supabase.from("ggl_groups").select("*").order("unit_name"),
      supabase.from("ggl_members").select("*").order("name"),
      supabase.from("profiles").select("id, full_name, ggl_id, phone, cpf").order("full_name"),
      supabase.from("admin_volunteers").select("cpf, phone, profession"),
      supabase.from("ggl_admin_emails").select("*"),
      supabase.from("ggl_calendar_events").select("*").order("event_date"),
      supabase.from("ggl_action_reports" as any).select("*").order("action_date", { ascending: false }),
    ]);
    setGroups((g as Group[]) ?? []);
    setMembers((m as Member[]) ?? []);
    setProfiles((p as Profile[]) ?? []);
    setAdminVols((av as AdminVol[]) ?? []);
    setEmails((em as AdminEmail[]) ?? []);
    setEvents((ev as CalEvent[]) ?? []);
    setReports((rp as unknown as Report[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const avByCpf = useMemo(() => {
    const m = new Map<string, AdminVol>();
    adminVols.forEach((a) => a.cpf && m.set(a.cpf, a));
    return m;
  }, [adminVols]);

  const addGroup = async () => {
    const unit = newGroup.unit.trim();
    if (!unit) return;
    const cities = newGroup.cities.split(",").map((c) => c.trim()).filter(Boolean);
    const { error } = await supabase.from("ggl_groups").insert({ unit_name: unit, cities, unit_actions: [] });
    if (error) return toast.error(error.message);
    toast.success("GGL criado");
    setNewGroup({ unit: "", cities: "" });
    load();
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Excluir este GGL e seus integrantes?")) return;
    const { error } = await supabase.from("ggl_groups").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  const addMember = async (gglId: string) => {
    const m = newMember[gglId];
    if (!m?.name?.trim()) return;
    const { error } = await supabase.from("ggl_members").insert({
      ggl_id: gglId, name: m.name.trim(), phone: m.phone?.trim() || null, role: m.role?.trim() || null,
    } as any);
    if (error) return toast.error(error.message);
    setNewMember((p) => ({ ...p, [gglId]: { name: "", phone: "", role: "" } }));
    setShowMemberForm((p) => ({ ...p, [gglId]: false }));
    load();
  };

  const addEmail = async (gglId: string) => {
    const e = newEmail[gglId]?.trim();
    if (!e) return;
    if (emails.filter((x) => x.ggl_id === gglId).length >= 2) return toast.error("Máximo de 2 e-mails por GGL");
    const { error } = await supabase.from("ggl_admin_emails").insert({ ggl_id: gglId, email: e });
    if (error) return toast.error(error.message);
    setNewEmail((p) => ({ ...p, [gglId]: "" }));
    toast.success("E-mail autorizado");
    load();
  };
  const removeEmail = async (id: string) => {
    const { error } = await supabase.from("ggl_admin_emails").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addEvent = async () => {
    if (!calendarFor || !newEvent.date || !newEvent.title.trim()) return toast.error("Data e título obrigatórios");
    const { error } = await supabase.from("ggl_calendar_events").insert({
      ggl_id: calendarFor.id,
      event_date: newEvent.date,
      unit_name: newEvent.unit.trim() || null,
      title: newEvent.title.trim(),
      description: newEvent.description.trim() || null,
    });
    if (error) return toast.error(error.message);
    setNewEvent({ date: "", unit: "", title: "", description: "" });
    load();
  };
  const removeEvent = async (id: string) => {
    const { error } = await supabase.from("ggl_calendar_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const removeMember = async (id: string) => {
    const { error } = await supabase.from("ggl_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const assignVolunteer = async (volunteerId: string, gglId: string | null) => {
    const { error } = await supabase.from("profiles").update({ ggl_id: gglId }).eq("id", volunteerId);
    if (error) return toast.error(error.message);
    toast.success(gglId ? "Voluntário vinculado" : "Vínculo removido");
    load();
  };

  const parseSheetDate = (v: any): string | null => {
    if (v == null || v === "") return null;
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return null;
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = String(v).trim();
    const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (br) {
      const [, dd, mm, yy] = br;
      const y = yy.length === 2 ? `20${yy}` : yy;
      return `${y}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  };

  const importSpreadsheet = async (file: File) => {
    if (!calendarFor) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      const payload: any[] = [];
      rows.forEach((r) => {
        const get = (...keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(r).find((x) => x.toLowerCase().trim() === k.toLowerCase());
            if (found && r[found] !== "") return r[found];
          }
          return "";
        };
        const dateRaw = get("data", "date", "dia");
        const title = String(get("ação", "acao", "titulo", "title", "atividade")).trim();
        const unit = String(get("unidade", "unit") || "").trim();
        const desc = String(get("descrição", "descricao", "description") || "").trim();
        const date = parseSheetDate(dateRaw);
        if (date && title) {
          payload.push({
            ggl_id: calendarFor.id, event_date: date, title,
            unit_name: unit || null, description: desc || null,
          });
        }
      });
      if (!payload.length) return toast.error("Nenhuma linha válida. Colunas: Data, Ação, Unidade, Descrição");
      const { error } = await supabase.from("ggl_calendar_events").insert(payload);
      if (error) return toast.error(error.message);
      toast.success(`${payload.length} ação(ões) importada(s)`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao ler planilha");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const eventsForCal = calendarFor ? events.filter((e) => e.ggl_id === calendarFor.id) : [];
  const eventsByMonth = (m: number) =>
    eventsForCal
      .filter((e) => {
        const d = new Date(e.event_date + "T00:00:00");
        return d.getMonth() === m && d.getFullYear() === calYear;
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <div className="glass-card rounded-xl p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Grupos de Gestão Local
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Cadastre os GGLs, integrantes e vincule os voluntários ao grupo correspondente.
        </p>
      </div>

      <div className="space-y-2 border border-dashed border-border rounded-lg p-3">
        <p className="text-xs font-semibold text-foreground">Novo GGL</p>
        <Input placeholder="Nome da unidade" value={newGroup.unit}
          onChange={(e) => setNewGroup((p) => ({ ...p, unit: e.target.value }))} className="h-8 text-xs" />
        <Input placeholder="Cidades atendidas (separadas por vírgula)" value={newGroup.cities}
          onChange={(e) => setNewGroup((p) => ({ ...p, cities: e.target.value }))} className="h-8 text-xs" />
        <Button size="sm" onClick={addGroup} className="w-full h-8 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Criar GGL
        </Button>
      </div>

      <div className="space-y-2">
        {groups.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum GGL cadastrado.</p>
        ) : (
          groups.map((g) => {
            const isOpen = expanded === g.id;
            const gMembers = members.filter((m) => m.ggl_id === g.id);
            const gVolunteers = profiles.filter((p) => p.ggl_id === g.id);
            const search = (assignSearch[g.id] || "").toLowerCase();
            const candidates = search
              ? profiles.filter((p) => p.ggl_id !== g.id && (p.full_name || "").toLowerCase().includes(search)).slice(0, 6)
              : [];
            return (
              <div key={g.id} className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : g.id)}
                  className="w-full flex items-center justify-between p-3 text-left bg-primary text-primary-foreground hover:bg-primary/90">
                  <div className="flex-1 min-w-0 text-center">
                    <p className="font-bold text-sm uppercase truncate tracking-wide">{g.unit_name}</p>
                    <p className="text-[11px] text-primary-foreground/80 truncate mt-0.5">
                      {gMembers.length} integrantes · {gVolunteers.length} voluntários
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 ml-2 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="p-3 space-y-3 border-t border-border">
                    <div>
                      <p className="text-xs font-bold uppercase text-foreground mb-1.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> CIDADES SOB GESTÃO
                      </p>
                      {g.cities.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">Nenhuma cidade cadastrada.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {g.cities.map((c) => (
                            <span key={c} className="text-[11px] bg-primary/10 text-primary rounded-full px-2.5 py-1 font-medium uppercase">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-foreground mb-1.5">GESTORES LOCAIS</p>
                      {gMembers.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground mb-2">Nenhum gestor cadastrado.</p>
                      ) : (
                        <div className="overflow-x-auto rounded border border-border mb-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-[10px] h-8 uppercase font-bold text-foreground">NOME</TableHead>
                                <TableHead className="text-[10px] h-8 uppercase font-bold text-foreground">WHATSAPP</TableHead>
                                <TableHead className="text-[10px] h-8 uppercase font-bold text-foreground">FUNÇÃO</TableHead>
                                <TableHead className="text-[10px] h-8 w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {gMembers.map((m) => (
                                <TableRow key={m.id}>
                                  <TableCell className="text-[11px] py-1.5 font-medium">{m.name}</TableCell>
                                  <TableCell className="text-[11px] py-1.5">{m.phone || "—"}</TableCell>
                                  <TableCell className="text-[11px] py-1.5">{m.role || "—"}</TableCell>
                                  <TableCell className="py-1.5">
                                    <button onClick={() => removeMember(m.id)} className="text-destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {!showMemberForm[g.id] ? (
                        <Button size="sm" onClick={() => setShowMemberForm((p) => ({ ...p, [g.id]: true }))}
                          className="w-full h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-bold">
                          <Plus className="h-3 w-3 mr-1" /> ADICIONAR GESTOR
                        </Button>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 border border-dashed border-border rounded-lg p-2">
                          <Input placeholder="Nome" value={newMember[g.id]?.name ?? ""}
                            onChange={(e) => setNewMember((p) => ({ ...p, [g.id]: { ...(p[g.id] ?? { name: "", phone: "", role: "" }), name: e.target.value } }))}
                            className="h-7 text-xs col-span-2" />
                          <Input placeholder="WhatsApp" value={newMember[g.id]?.phone ?? ""}
                            onChange={(e) => setNewMember((p) => ({ ...p, [g.id]: { ...(p[g.id] ?? { name: "", phone: "", role: "" }), phone: e.target.value } }))}
                            className="h-7 text-xs" />
                          <Input placeholder="Função (cargo)" value={newMember[g.id]?.role ?? ""}
                            onChange={(e) => setNewMember((p) => ({ ...p, [g.id]: { ...(p[g.id] ?? { name: "", phone: "", role: "" }), role: e.target.value } }))}
                            className="h-7 text-xs" />
                          <Button size="sm" variant="outline" onClick={() => setShowMemberForm((p) => ({ ...p, [g.id]: false }))} className="h-7 text-xs">
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={() => addMember(g.id)} className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-bold">
                            <Plus className="h-3 w-3 mr-1" /> Salvar
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-foreground mb-1.5 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> E-MAILS ADMINISTRADORES
                      </p>
                      <ul className="space-y-1 mb-2">
                        {emails.filter((e) => e.ggl_id === g.id).map((e) => (
                          <li key={e.id} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1">
                            <span className="truncate">{e.email}</span>
                            <button onClick={() => removeEmail(e.id)} className="text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-1.5">
                        <Input type="email" placeholder="email@exemplo.com" value={newEmail[g.id] ?? ""}
                          onChange={(e) => setNewEmail((p) => ({ ...p, [g.id]: e.target.value }))}
                          className="h-7 text-xs" disabled={emails.filter((e) => e.ggl_id === g.id).length >= 2} />
                        <Button size="sm" onClick={() => addEmail(g.id)} className="h-7 px-2"
                          disabled={emails.filter((e) => e.ggl_id === g.id).length >= 2}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-foreground mb-1.5 flex items-center gap-1">
                        <UserPlus className="h-3 w-3" /> VOLUNTÁRIOS VINCULADOS
                      </p>

                      {gVolunteers.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground mb-1">Nenhum voluntário vinculado.</p>
                      ) : (
                        <div className="overflow-x-auto rounded border border-border mb-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-[10px] h-8 uppercase font-bold text-foreground">NOME</TableHead>
                                <TableHead className="text-[10px] h-8 uppercase font-bold text-foreground">TELEFONE</TableHead>
                                <TableHead className="text-[10px] h-8 uppercase font-bold text-foreground">PROFISSÃO</TableHead>
                                <TableHead className="text-[10px] h-8 w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {gVolunteers.map((v) => {
                                const av = v.cpf ? avByCpf.get(v.cpf) : undefined;
                                const phone = v.phone || av?.phone || "";
                                const profession = av?.profession || "—";
                                return (
                                  <TableRow key={v.id}>
                                    <TableCell className="text-[11px] py-1.5 font-medium">{v.full_name}</TableCell>
                                    <TableCell className="text-[11px] py-1.5">
                                      {phone ? (
                                        <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                                          className="text-primary flex items-center gap-1">
                                          <Phone className="h-2.5 w-2.5" />{phone}
                                        </a>
                                      ) : "—"}
                                    </TableCell>
                                    <TableCell className="text-[11px] py-1.5">{profession}</TableCell>
                                    <TableCell className="py-1.5">
                                      <button onClick={() => assignVolunteer(v.id, null)} className="text-destructive text-[10px] underline">
                                        x
                                      </button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      <Input placeholder="Buscar voluntário para vincular..." value={assignSearch[g.id] ?? ""}
                        onChange={(e) => setAssignSearch((p) => ({ ...p, [g.id]: e.target.value }))} className="h-7 text-xs" />
                      {candidates.length > 0 && (
                        <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                          {candidates.map((c) => (
                            <li key={c.id}>
                              <button onClick={() => { assignVolunteer(c.id, g.id); setAssignSearch((p) => ({ ...p, [g.id]: "" })); }}
                                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted">
                                + {c.full_name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Botões Calendário + Reporte (após voluntários) */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" onClick={() => { setCalendarFor(g); setCalYear(new Date().getFullYear()); }}
                        className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-bold">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" /> CALENDÁRIO DE AÇÕES
                        <span className="ml-1 text-[10px] text-primary-foreground/80">({events.filter((e) => e.ggl_id === g.id).length})</span>
                      </Button>
                      <Button size="sm" onClick={() => { setReportsFor(g); setReportsMonth(null); }}
                        className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-bold">
                        <ClipboardList className="h-3.5 w-3.5 mr-1" /> REPORTE DAS AÇÕES
                        <span className="ml-1 text-[10px] text-primary-foreground/80">({reports.filter((r) => r.ggl_id === g.id).length})</span>
                      </Button>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => deleteGroup(g.id)}
                      className="w-full h-7 text-xs text-destructive">
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir GGL
                    </Button>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Calendário modal */}
      <Dialog open={!!calendarFor} onOpenChange={(o) => !o && setCalendarFor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Calendário de Ações · {calendarFor?.unit_name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setCalYear((y) => y - 1)}>‹</Button>
              <span className="font-semibold text-sm">{calYear}</span>
              <Button size="sm" variant="outline" onClick={() => setCalYear((y) => y + 1)}>›</Button>
            </div>
            <div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && importSpreadsheet(e.target.files[0])} />
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Importar planilha
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-1">
            Planilha (.xlsx/.csv) com colunas: <b>Data</b>, <b>Ação</b>, Unidade (opcional), Descrição (opcional).
          </p>

          {/* Nova ação manual */}
          <div className="border border-dashed border-border rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold">Adicionar ação</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Unidade" value={newEvent.unit} onChange={(e) => setNewEvent((p) => ({ ...p, unit: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Nome da ação" value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} className="h-8 text-xs col-span-2" />
              <Textarea rows={2} placeholder="Descrição (opcional)" value={newEvent.description}
                onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} className="text-xs col-span-2" />
              <Button size="sm" onClick={addEvent} className="h-8 text-xs col-span-2">
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          </div>

          {/* Blocos por mês */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MONTHS.map((name, idx) => {
              const list = eventsByMonth(idx);
              return (
                <div key={name} className="border border-border rounded-lg p-2">
                  <p className="text-xs font-bold text-primary mb-1.5">{name}</p>
                  {list.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">Sem ações.</p>
                  ) : (
                    <ul className="space-y-1">
                      {list.map((e) => (
                        <li key={e.id} className="flex items-start gap-2 text-xs">
                          <span className="font-bold text-primary w-6 text-center">
                            {new Date(e.event_date + "T00:00:00").getDate()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium leading-tight">{e.title}</p>
                            {e.unit_name && <p className="text-[10px] text-muted-foreground">{e.unit_name}</p>}
                          </div>
                          <button onClick={() => removeEvent(e.id)} className="text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reporte de Ações modal */}
      <Dialog open={!!reportsFor} onOpenChange={(o) => { if (!o) { setReportsFor(null); setReportsMonth(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Reporte das Ações · {reportsFor?.unit_name}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            if (!reportsFor) return null;
            const groupReports = reports.filter((r) => r.ggl_id === reportsFor.id);

            const exportAll = (monthIdx: number | null) => {
              const rows = (monthIdx == null ? groupReports : groupReports.filter((r) => new Date(r.action_date + "T00:00:00").getMonth() === monthIdx))
                .map((r) => {
                  const d = new Date(r.action_date + "T00:00:00");
                  return {
                    "Mês": MONTHS[d.getMonth()],
                    "Data": d.toLocaleDateString("pt-BR"),
                    "Nome do Voluntário": r.volunteer_name,
                    "CPF": r.volunteer_cpf || "",
                    "Credencial": r.volunteer_credential || "",
                    "Colaborador CEJAM": r.is_cejam_collaborator ? "Sim" : "Não",
                    "N° de Beneficiários": r.beneficiaries_count,
                    "Horas": r.hours,
                    "Tipo de Ação": r.action_type,
                    "Nome da Ação": r.action_name,
                  };
                });
              if (rows.length === 0) return toast.error("Sem reportes para exportar");
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Reporte");
              const suffix = monthIdx == null ? "todos" : MONTHS[monthIdx];
              XLSX.writeFile(wb, `reporte_${reportsFor.unit_name}_${suffix}.xlsx`);
            };

            if (reportsMonth == null) {
              return (
                <>
                  <div className="flex justify-end">
                    <Button size="sm" variant="default" onClick={() => exportAll(null)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Exportar tudo
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MONTHS.map((name, idx) => {
                      const count = groupReports.filter((r) => new Date(r.action_date + "T00:00:00").getMonth() === idx).length;
                      return (
                        <button key={name} onClick={() => setReportsMonth(idx)}
                          className="border border-border rounded-lg p-3 text-left hover:bg-muted/40 transition-colors">
                          <p className="text-sm font-bold text-primary">{name}</p>
                          <p className="text-[11px] text-muted-foreground">{count} reporte(s)</p>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            }

            const monthReports = groupReports
              .filter((r) => new Date(r.action_date + "T00:00:00").getMonth() === reportsMonth)
              .sort((a, b) => a.action_date.localeCompare(b.action_date));

            return (
              <>
                <div className="flex items-center justify-between">
                  <Button size="sm" variant="ghost" onClick={() => setReportsMonth(null)}>
                    ← Voltar aos meses
                  </Button>
                  <Button size="sm" variant="default" onClick={() => exportAll(reportsMonth)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Exportar {MONTHS[reportsMonth]}
                  </Button>
                </div>
                <h4 className="font-semibold text-sm">{MONTHS[reportsMonth]} · {monthReports.length} reporte(s)</h4>
                <div className="overflow-x-auto rounded border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Data</TableHead>
                        <TableHead className="text-[10px]">Voluntário</TableHead>
                        <TableHead className="text-[10px]">CPF</TableHead>
                        <TableHead className="text-[10px]">Credencial</TableHead>
                        <TableHead className="text-[10px]">CEJAM</TableHead>
                        <TableHead className="text-[10px]">Benef.</TableHead>
                        <TableHead className="text-[10px]">Horas</TableHead>
                        <TableHead className="text-[10px]">Tipo</TableHead>
                        <TableHead className="text-[10px]">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthReports.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-4">Nenhum reporte neste mês.</TableCell></TableRow>
                      ) : monthReports.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-[10px] py-1.5">{new Date(r.action_date + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-[10px] py-1.5">{r.volunteer_name}</TableCell>
                          <TableCell className="text-[10px] py-1.5">{r.volunteer_cpf || "—"}</TableCell>
                          <TableCell className="text-[10px] py-1.5">{r.volunteer_credential || "—"}</TableCell>
                          <TableCell className="text-[10px] py-1.5">{r.is_cejam_collaborator ? "Sim" : "Não"}</TableCell>
                          <TableCell className="text-[10px] py-1.5">{r.beneficiaries_count}</TableCell>
                          <TableCell className="text-[10px] py-1.5">{r.hours}</TableCell>
                          <TableCell className="text-[10px] py-1.5">{r.action_type}</TableCell>
                          <TableCell className="text-[10px] py-1.5">{r.action_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
