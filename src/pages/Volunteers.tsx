import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Users, Trophy } from "lucide-react";

interface VolunteerRow {
  id: string;
  full_name: string;
  volunteer_level: number;
  avatar_url: string | null;
}

const Volunteers = () => {
  const [list, setList] = useState<VolunteerRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, volunteer_level, avatar_url")
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        if (data) setList(data as VolunteerRow[]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-hero px-5 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary-foreground" />
          <h1 className="text-xl font-bold font-heading text-primary-foreground">Voluntários</h1>
        </div>
        <p className="text-sm text-primary-foreground/80 mt-1">Conheça quem faz parte da rede.</p>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum voluntário encontrado.</p>
        ) : (
          list.map((v) => {
            const isOpen = openId === v.id;
            const initials = v.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <button
                key={v.id}
                onClick={() => setOpenId(isOpen ? null : v.id)}
                className="w-full text-left glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-accent/30 transition"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0 overflow-hidden">
                  {v.avatar_url ? (
                    <img src={v.avatar_url} alt={v.full_name} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{v.full_name}</p>
                  {isOpen && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-primary font-semibold">
                      <Trophy className="h-3.5 w-3.5" />
                      Nível {v.volunteer_level === 2 ? 2 : 1}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{isOpen ? "Ocultar" : "Ver"}</span>
              </button>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Volunteers;
