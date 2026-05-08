import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Clock, MapPin, Trash2, Calendar, Heart, Search, ImageIcon } from "lucide-react";

interface Action {
  id: string;
  action_name: string;
  action_date: string;
  location: string;
  donated_hours: number;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  volunteer_credential: string | null;
}

const History = () => {
  const { user } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("volunteer_actions")
      .select("*")
      .eq("user_id", user.id)
      .order("action_date", { ascending: false });
    setActions(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta ação?")) return;
    const action = actions.find((a) => a.id === id);
    const { error } = await supabase.from("volunteer_actions").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Ação excluída");
    setActions((p) => p.filter((a) => a.id !== id));

    // Subtrai as horas da planilha (coluna AH)
    const credential = action?.volunteer_credential?.trim();
    const hours = Number(action?.donated_hours || 0);
    if (credential && hours > 0) {
      try {
        await supabase.functions.invoke("sheet-add-hours", {
          body: { credential, hours: -hours },
        });
      } catch (err) {
        console.warn("Erro ao sincronizar exclusão com a planilha:", err);
      }
    }
  };

  const filtered = actions.filter((a) =>
    a.action_name.toLowerCase().includes(filter.toLowerCase()) ||
    a.location.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold font-heading text-foreground">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-1">{actions.length} ações registradas</p>
      </div>

      <div className="px-5 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou local..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="px-5 space-y-3 animate-fade-up">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma ação encontrada.</p>
          </div>
        ) : (
          filtered.map((action) => (
            <div key={action.id} className="glass-card rounded-2xl overflow-hidden">
              {action.photo_url && (
                <div className="relative h-40 bg-muted">
                  <img src={action.photo_url} alt={action.action_name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">{action.action_name}</h3>
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(action.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(action.action_date).toLocaleDateString("pt-BR")}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{action.location}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{action.donated_hours}h</span>
                  {action.photo_url && <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />Foto</span>}
                </div>
                {action.description && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">{action.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default History;
