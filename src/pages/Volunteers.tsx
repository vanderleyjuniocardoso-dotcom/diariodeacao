import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Users, Trophy, Clock, BadgeCheck } from "lucide-react";

interface VolunteerRow {
  id: string;
  full_name: string;
  volunteer_level: number;
  avatar_url: string | null;
  volunteer_credential: string | null;
  donated_hours: number;
}

const Volunteers = () => {
  const [list, setList] = useState<VolunteerRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, volunteer_level, avatar_url, volunteer_credential")
        .order("full_name", { ascending: true });

      const { data: actions } = await supabase
        .from("volunteer_actions")
        .select("user_id, donated_hours");

      const hoursByUser = new Map<string, number>();
      (actions ?? []).forEach((a: any) => {
        hoursByUser.set(a.user_id, (hoursByUser.get(a.user_id) ?? 0) + Number(a.donated_hours ?? 0));
      });

      setList(
        (profiles ?? []).map((p: any) => ({
          ...p,
          donated_hours: hoursByUser.get(p.id) ?? 0,
        })),
      );
    })();
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
            const initials = v.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div
                key={v.id}
                className="w-full text-left glass-card rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0 overflow-hidden">
                  {v.avatar_url ? (
                    <img src={v.avatar_url} alt={v.full_name} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium text-sm text-foreground truncate">{v.full_name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{v.volunteer_credential || "Sem credencial"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <Trophy className="h-3.5 w-3.5" />
                      Nível {v.volunteer_level === 2 ? 2 : 1}
                    </span>
                    <span className="flex items-center gap-1 text-foreground font-semibold">
                      <Clock className="h-3.5 w-3.5" />
                      {v.donated_hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Volunteers;
