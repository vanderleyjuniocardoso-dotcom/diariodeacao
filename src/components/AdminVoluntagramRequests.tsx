import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

interface Req {
  id: string; registration_id: string; status: string; created_at: string;
  reg?: { full_name: string; cpf: string; whatsapp: string };
}

const AdminVoluntagramRequests = () => {
  const [list, setList] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("voluntagram_access_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const items: Req[] = (data as any) || [];
    const regIds = items.map((r) => r.registration_id).filter(Boolean);
    if (regIds.length) {
      const { data: regs } = await supabase.from("volunteer_registrations").select("id, full_name, cpf, whatsapp").in("id", regIds);
      const map = new Map((regs || []).map((r: any) => [r.id, r]));
      items.forEach((r) => { r.reg = map.get(r.registration_id) as any; });
    }
    setList(items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (r: Req) => {
    if (!r.registration_id) { toast.error("Cadastro não vinculado"); return; }
    const { error: e1 } = await supabase.rpc("approve_registration", { _id: r.registration_id });
    if (e1) { toast.error(e1.message); return; }
    const { error: e2 } = await supabase.from("voluntagram_access_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Acesso liberado e credencial gerada");
    load();
  };

  const reject = async (r: Req) => {
    const { error } = await supabase.from("voluntagram_access_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  if (loading) return <p className="text-center text-muted-foreground text-sm py-6">Carregando...</p>;
  if (list.length === 0) return <p className="text-center text-muted-foreground text-sm py-6">Nenhuma solicitação pendente.</p>;

  return (
    <div className="space-y-2">
      {list.map((r) => (
        <div key={r.id} className="glass-card rounded-xl p-3 space-y-2">
          <div>
            <p className="font-medium text-sm">{r.reg?.full_name || "—"}</p>
            <p className="text-xs text-muted-foreground font-mono">{r.reg?.cpf || "—"}</p>
            <p className="text-xs text-muted-foreground">{r.reg?.whatsapp || "—"}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="hero" className="flex-1" onClick={() => approve(r)}><Check className="h-3.5 w-3.5 mr-1" />Liberar VOLUNTAGRAM</Button>
            <Button size="sm" variant="outline" onClick={() => reject(r)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminVoluntagramRequests;
