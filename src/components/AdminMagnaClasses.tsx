import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { PlayCircle, Loader2 } from "lucide-react";

const CLASSES = Array.from({ length: 12 }, (_, i) => `T${String(i + 1).padStart(2, "0")}26`);

interface Enrollment {
  id: string; class_code: string; volunteer_name: string; volunteer_phone: string | null;
  started: boolean; progress: number; video_watched: boolean;
}

const AdminMagnaClasses = () => {
  const [list, setList] = useState<Enrollment[]>([]);
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("magna_enrollments").select("*").order("created_at");
    setList((data as Enrollment[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      <p className="text-xs text-muted-foreground">Voluntários organizados por turma. A turma é definida automaticamente pelo mês da reunião de boas vindas.</p>
      {CLASSES.map((code) => {
        const members = list.filter((e) => e.class_code === code);
        const open = openClass === code;
        return (
          <div key={code} className="glass-card rounded-xl overflow-hidden">
            <button onClick={() => setOpenClass(open ? null : code)} className="w-full p-3 text-left flex justify-between items-center">
              <span className="font-mono font-semibold text-sm text-primary">{code}</span>
              <span className="text-xs text-muted-foreground">{members.length} voluntários</span>
            </button>
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
