import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, ChevronDown, ChevronUp, UserPlus, Mail, Calendar as CalendarIcon } from "lucide-react";

interface Group {
  id: string;
  unit_name: string;
  cities: string[];
  unit_actions: string[];
}
interface Member {
  id: string;
  ggl_id: string;
  name: string;
  phone: string | null;
  role: string | null;
}
interface Profile {
  id: string;
  full_name: string;
  ggl_id: string | null;
}
interface AdminEmail { id: string; ggl_id: string; email: string; }
interface CalEvent { id: string; ggl_id: string; event_date: string; unit_name: string | null; title: string; description: string | null; }

export default function AdminGglManager() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({ unit: "", cities: "", actions: "" });
  const [newMember, setNewMember] = useState<Record<string, { name: string; phone: string; role: string }>>({});
  const [newEmail, setNewEmail] = useState<Record<string, string>>({});
  const [newEvent, setNewEvent] = useState<Record<string, { date: string; unit: string; title: string; description: string }>>({});
  const [assignSearch, setAssignSearch] = useState<Record<string, string>>({});
  const [actionsDraft, setActionsDraft] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: g }, { data: m }, { data: p }, { data: em }, { data: ev }] = await Promise.all([
      supabase.from("ggl_groups").select("*").order("unit_name"),
      supabase.from("ggl_members").select("*").order("name"),
      supabase.from("profiles").select("id, full_name, ggl_id").order("full_name"),
      supabase.from("ggl_admin_emails").select("*"),
      supabase.from("ggl_calendar_events").select("*").order("event_date"),
    ]);
    setGroups((g as Group[]) ?? []);
    setMembers((m as Member[]) ?? []);
    setProfiles((p as Profile[]) ?? []);
    setEmails((em as AdminEmail[]) ?? []);
    setEvents((ev as CalEvent[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const addGroup = async () => {
    const unit = newGroup.unit.trim();
    if (!unit) return;
    const cities = newGroup.cities.split(",").map((c) => c.trim()).filter(Boolean);
    const unit_actions = newGroup.actions.split(",").map((c) => c.trim()).filter(Boolean);
    const { error } = await supabase.from("ggl_groups").insert({ unit_name: unit, cities, unit_actions });
    if (error) return toast.error(error.message);
    toast.success("GGL criado");
    setNewGroup({ unit: "", cities: "", actions: "" });
    load();
  };

  const saveActions = async (groupId: string) => {
    const raw = actionsDraft[groupId] ?? "";
    const unit_actions = raw.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("ggl_groups").update({ unit_actions }).eq("id", groupId);
    if (error) return toast.error(error.message);
    toast.success("Ações atualizadas");
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
      ggl_id: gglId,
      name: m.name.trim(),
      phone: m.phone?.trim() || null,
      role: m.role?.trim() || null,
    } as any);
    if (error) return toast.error(error.message);
    setNewMember((p) => ({ ...p, [gglId]: { name: "", phone: "", role: "" } }));
    load();
  };

  const addEmail = async (gglId: string) => {
    const e = newEmail[gglId]?.trim();
    if (!e) return;
    const count = emails.filter((x) => x.ggl_id === gglId).length;
    if (count >= 2) return toast.error("Máximo de 2 e-mails por GGL");
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

  const addEvent = async (gglId: string) => {
    const ev = newEvent[gglId];
    if (!ev?.date || !ev?.title?.trim()) return toast.error("Data e título obrigatórios");
    const { error } = await supabase.from("ggl_calendar_events").insert({
      ggl_id: gglId,
      event_date: ev.date,
      unit_name: ev.unit?.trim() || null,
      title: ev.title.trim(),
      description: ev.description?.trim() || null,
    });
    if (error) return toast.error(error.message);
    setNewEvent((p) => ({ ...p, [gglId]: { date: "", unit: "", title: "", description: "" } }));
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
        <Input
          placeholder="Nome da unidade"
          value={newGroup.unit}
          onChange={(e) => setNewGroup((p) => ({ ...p, unit: e.target.value }))}
          className="h-8 text-xs"
        />
        <Input
          placeholder="Cidades atendidas (separadas por vírgula)"
          value={newGroup.cities}
          onChange={(e) => setNewGroup((p) => ({ ...p, cities: e.target.value }))}
          className="h-8 text-xs"
        />
        <Input
          placeholder="Ações realizadas na unidade (separadas por vírgula)"
          value={newGroup.actions}
          onChange={(e) => setNewGroup((p) => ({ ...p, actions: e.target.value }))}
          className="h-8 text-xs"
        />
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
              ? profiles.filter(
                  (p) => p.ggl_id !== g.id && (p.full_name || "").toLowerCase().includes(search),
                ).slice(0, 6)
              : [];
            return (
              <div key={g.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : g.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{g.unit_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {g.cities.join(", ") || "Sem cidades"} · {gMembers.length} integrantes · {gVolunteers.length} voluntários
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isOpen && (
                  <div className="p-3 pt-0 space-y-3 border-t border-border">
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5">Gestores do GGL (nome e WhatsApp)</p>
                      {gMembers.length === 0 && (
                        <p className="text-[11px] text-muted-foreground mb-1">Nenhum gestor cadastrado.</p>
                      )}
                      <ul className="space-y-1 mb-2">
                        {gMembers.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <span className="font-medium">{m.name}</span>
                              {m.phone && <span className="text-muted-foreground"> · {m.phone}</span>}
                            </div>
                            <button
                              onClick={() => removeMember(m.id)}
                              className="text-destructive p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="Nome"
                          value={newMember[g.id]?.name ?? ""}
                          onChange={(e) =>
                            setNewMember((p) => ({
                              ...p,
                              [g.id]: { ...(p[g.id] ?? { name: "", phone: "" }), name: e.target.value },
                            }))
                          }
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder="WhatsApp"
                          value={newMember[g.id]?.phone ?? ""}
                          onChange={(e) =>
                            setNewMember((p) => ({
                              ...p,
                              [g.id]: { ...(p[g.id] ?? { name: "", phone: "" }), phone: e.target.value },
                            }))
                          }
                          className="h-7 text-xs"
                        />
                        <Button size="sm" onClick={() => addMember(g.id)} className="h-7 px-2">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                        <UserPlus className="h-3 w-3" /> Voluntários vinculados
                      </p>
                      {gVolunteers.length === 0 && (
                        <p className="text-[11px] text-muted-foreground mb-1">Nenhum voluntário vinculado.</p>
                      )}
                      <ul className="space-y-1 mb-2">
                        {gVolunteers.map((v) => (
                          <li key={v.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">{v.full_name}</span>
                            <button
                              onClick={() => assignVolunteer(v.id, null)}
                              className="text-destructive text-[10px] underline"
                            >
                              remover
                            </button>
                          </li>
                        ))}
                      </ul>
                      <Input
                        placeholder="Buscar voluntário para vincular..."
                        value={assignSearch[g.id] ?? ""}
                        onChange={(e) => setAssignSearch((p) => ({ ...p, [g.id]: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      {candidates.length > 0 && (
                        <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                          {candidates.map((c) => (
                            <li key={c.id}>
                              <button
                                onClick={() => {
                                  assignVolunteer(c.id, g.id);
                                  setAssignSearch((p) => ({ ...p, [g.id]: "" }));
                                }}
                                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted"
                              >
                                + {c.full_name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5">Ações realizadas na unidade</p>
                      <p className="text-[11px] text-muted-foreground mb-1">
                        Uma ação por linha (ou separadas por vírgula). Esta lista aparece para o voluntário em "Seu GGL".
                      </p>
                      <textarea
                        value={actionsDraft[g.id] ?? (g.unit_actions ?? []).join("\n")}
                        onChange={(e) => setActionsDraft((p) => ({ ...p, [g.id]: e.target.value }))}
                        rows={4}
                        className="w-full text-xs rounded-md border border-input bg-background p-2"
                        placeholder="Ex: Acolhimento à gestantes&#10;Distribuição de cestas básicas"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => saveActions(g.id)}
                        className="mt-1.5 h-7 text-xs w-full"
                      >
                        Salvar ações
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGroup(g.id)}
                      className="w-full h-7 text-xs text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir GGL
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
