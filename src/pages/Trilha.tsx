import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Heart, Trophy, Circle } from "lucide-react";
import TrilhaIntro from "@/components/TrilhaIntro";

const LEVEL_GOALS: Record<number, { hours: number; workshops: number; months: number }> = {
  1: { hours: 20, workshops: 3, months: 3 },
  2: { hours: 40, workshops: 4, months: 4 },
  3: { hours: 60, workshops: 5, months: 5 },
};

const Trilha = () => {
  const { user, profile, refreshProfile } = useAuth() as any;
  const [stats, setStats] = useState({ totalHours: 0, workshops: 0, engagementMonths: 0 });
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("volunteer_actions")
        .select("action_date, donated_hours, category")
        .eq("user_id", user.id);

      let sheetHours = 0;
      const credential = profile?.volunteer_credential?.trim();
      if (credential) {
        try {
          const { data: sh } = await supabase.functions.invoke("sheet-hours", { body: { credential } });
          if (sh && typeof sh.hours === "number") sheetHours = sh.hours;
        } catch (e) {
          console.error("sheet-hours invoke failed", e);
        }
      }

      if (data) {
        const actionsHours = data.reduce((sum, a) => sum + Number(a.donated_hours), 0);
        const workshops = data.filter((a) => (a.category || "").toLowerCase().includes("workshop mensal")).length;
        const months = new Set(data.map((a) => (a.action_date || "").slice(0, 7)).filter(Boolean));
        setStats({ totalHours: actionsHours + sheetHours, workshops, engagementMonths: months.size });
      }
    };
    load();
  }, [user, profile?.volunteer_credential]);

  const level = Math.min(Math.max(profile?.volunteer_level ?? 1, 1), 3);
  const goal = LEVEL_GOALS[level] ?? LEVEL_GOALS[1];
  const pHours = Math.min(stats.totalHours / goal.hours, 1);
  const pWork = Math.min(stats.workshops / goal.workshops, 1);
  const pMonths = Math.min(stats.engagementMonths / goal.months, 1);
  const progress = Math.round(((pHours + pWork + pMonths) / 3) * 100);

  useEffect(() => {
    if (!user || !profile) return;
    if (progress < 100) return;
    if (level >= 3) return;
    const nextLevel = level + 1;
    (async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ volunteer_level: nextLevel })
        .eq("id", user.id);
      if (!error) {
        toast.success(`Parabéns! Você avançou para o Nível ${nextLevel}! 🎉`);
        if (typeof refreshProfile === "function") await refreshProfile();
      }
    })();
  }, [progress, level, user, profile, refreshProfile]);

  const levels = [
    { name: "Nível 1", criteria: ["20 horas anuais", "3 workshops", "3 meses de engajamento"] },
    { name: "Nível 2", criteria: ["40 horas anuais", "4 workshops", "4 meses de engajamento"] },
    { name: "Nível 3", criteria: ["60 horas anuais", "5 workshops", "5 meses de engajamento"] },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {showIntro && (
        <TrilhaIntro
          avatarUrl={profile?.avatar_url}
          fullName={profile?.full_name}
          requirements={goal ? [`${goal.hours}h anuais`, `${goal.workshops} workshops`, `${goal.months} meses de engajamento`] : []}
          onDone={() => setShowIntro(false)}
        />
      )}
      <div className="gradient-hero px-5 pt-12 pb-8 rounded-b-3xl">
        <h1 className="text-xl font-bold font-heading text-primary-foreground">Trilha de Desenvolvimento</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">Acompanhe seu progresso e os critérios de cada nível.</p>
      </div>

      <div className="px-5 -mt-2 space-y-5 animate-fade-up">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Seu desempenho — Nível {level}</p>
            <p className="text-sm font-bold text-primary">{progress}%</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <Heart className="h-5 w-5 text-primary fill-primary flex-shrink-0" />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{stats.totalHours}h / {goal.hours}h</span>
            <span>{stats.workshops}/{goal.workshops} workshops</span>
            <span>{stats.engagementMonths}/{goal.months} meses</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-warm" />
            <h2 className="text-base font-semibold font-heading text-foreground">Critérios dos Níveis</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {levels.map((lvl, i) => (
              <div key={lvl.name} className="rounded-xl border border-border/60 p-3 bg-background/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {i + 1}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{lvl.name}</p>
                </div>
                <ul className="space-y-1.5 pl-1">
                  {lvl.criteria.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Circle className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Trilha;
