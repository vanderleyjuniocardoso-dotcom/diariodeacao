import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { PlayCircle, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";

const CLASSES = Array.from({ length: 12 }, (_, i) => `T${String(i + 1).padStart(2, "0")}26`);

interface Enrollment {
  id: string; class_code: string; volunteer_name: string; volunteer_phone: string | null;
  started: boolean; progress: number; video_watched: boolean;
  registration_id: string | null;
  credencial?: string | null;
}

const AdminMagnaClasses = () => {
  const [list, setList] = useState<Enrollment[]>([]);
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("magna_enrollments").select("*").order("created_at");
    const rows = (data as Enrollment[]) || [];
    // Join credencial via volunteer_registrations.cpf -> admin_volunteers.credencial
    const regIds = Array.from(new Set(rows.map((r) => r.registration_id).filter(Boolean))) as string[];
    let credByReg: Record<string, string> = {};
    if (regIds.length > 0) {
      const { data: regs } = await supabase.from("volunteer_registrations").select("id, cpf").in("id", regIds);
      const cpfs = Array.from(new Set((regs || []).map((r: any) => r.cpf).filter(Boolean)));
      let avs: any[] = [];
      if (cpfs.length) {
        const { data } = await supabase.from("admin_volunteers").select("cpf, credencial").in("cpf", cpfs);
        avs = data || [];
      }
      const credByCpf: Record<string, string> = {};
      (avs || []).forEach((a: any) => { if (a.credencial) credByCpf[a.cpf] = a.credencial; });
      (regs || []).forEach((r: any) => { if (credByCpf[r.cpf]) credByReg[r.id] = credByCpf[r.cpf]; });
    }
    setList(rows.map((r) => ({ ...r, credencial: r.registration_id ? credByReg[r.registration_id] ?? null : null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const exportClass = (code: string, members: Enrollment[]) => {
    if (members.length === 0) { toast.error("Sem voluntários nesta turma"); return; }
    const rows = members.map((m) => ({
      Nome: m.volunteer_name || "",
      Credencial: m.credencial || "",
      "Conclusão (%)": m.progress ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 36 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, code);
    XLSX.writeFile(wb, `capacitacao-magna-${code}.xlsx`);
  };

  const exportAll = () => {
    const wb = XLSX.utils.book_new();
    let total = 0;
    CLASSES.forEach((code) => {
      const members = list.filter((e) => e.class_code === code);
      if (members.length === 0) return;
      total += members.length;
      const rows = members.map((m) => ({
        Nome: m.volunteer_name || "",
        Credencial: m.credencial || "",
        "Conclusão (%)": m.progress ?? 0,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 36 }, { wch: 16 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, code);
    });
    if (total === 0) { toast.error("Nenhum voluntário em nenhuma turma"); return; }
    XLSX.writeFile(wb, `capacitacao-magna-todas-turmas.xlsx`);
  };


  const startMagna = async (id: string) => {
    const { error } = await supabase.rpc("start_magna", { _enrollment_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Capacitação iniciada");
    load();
  };

  const saveProgress = async (id: string, value: number) => {
    const { error } = await supabase.rpc("set_magna_progress", { _enrollment_id: id, _progress: value });
    if (error) { toast.error(error.message); return; }
    toast.success(`Progresso ${value}%`);
    setDrafts((p) => { const n = { ...p }; delete n[id]; return n; });
    load();
  };

  if (loading) return <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex-1">Voluntários organizados por turma. A turma é definida automaticamente pelo mês da reunião de boas vindas.</p>
        <Button size="sm" variant="outline" className="h-8 text-xs flex-shrink-0" onClick={exportAll}>
          <Download className="h-3.5 w-3.5 mr-1" /> Exportar todas
        </Button>
      </div>
      {CLASSES.map((code) => {
        const members = list.filter((e) => e.class_code === code);
        const open = openClass === code;
        return (
          <div key={code} className="glass-card rounded-xl overflow-hidden">
            <div className="w-full p-3 flex justify-between items-center gap-2">
              <button onClick={() => setOpenClass(open ? null : code)} className="flex-1 text-left flex justify-between items-center">
                <span className="font-mono font-semibold text-sm text-primary">{code}</span>
                <span className="text-xs text-muted-foreground ml-2">{members.length} voluntários</span>
              </button>
              {members.length > 0 && (
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(ev) => { ev.stopPropagation(); exportClass(code, members); }} aria-label={`Exportar ${code}`}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {open && (
              <div className="p-3 pt-0 space-y-2 border-t">
                {members.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground py-2">Sem voluntários nesta turma ainda.</p>
                ) : members.map((e) => {
                  const draft = drafts[e.id] ?? e.progress;
                  return (
                    <div key={e.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div>
                        <p className="text-sm font-medium">{e.volunteer_name}</p>
                        <p className="text-[10px] text-muted-foreground">{e.volunteer_phone || "—"}</p>
                      </div>
                      {!e.started ? (
                        <Button size="sm" variant="hero" className="w-full" onClick={() => startMagna(e.id)}>
                          <PlayCircle className="h-3.5 w-3.5 mr-1" />Iniciar capacitação
                        </Button>
                      ) : (
                        <>
                          <Slider min={0} max={100} step={5} value={[draft]} onValueChange={(v) => setDrafts((p) => ({ ...p, [e.id]: v[0] }))} />
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-primary">{draft}%</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={draft === e.progress} onClick={() => saveProgress(e.id, draft)}>Salvar</Button>
                          </div>
                          {e.video_watched && <p className="text-[10px] text-primary">✓ Assistiu vídeo de integração</p>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminMagnaClasses;
