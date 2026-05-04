import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import StatCard from "@/components/StatCard";
import { Clock, Heart, MapPin, Sparkles, Shield, Trophy, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

const quotes = [
  "Cada hora doada é um coração transformado.",
  "Voluntariar é deixar um pedaço de amor no mundo.",
  "Juntos, somos mais fortes. Obrigado por estar aqui!",
  "O voluntariado é a linguagem universal do amor.",
];

interface ActionRow {
  id: string;
  action_name: string;
  action_date: string;
  location: string;
  donated_hours: number;
}

const Dashboard = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalHours: 0, totalActions: 0 });
  const [recent, setRecent] = useState<ActionRow[]>([]);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("volunteer_actions")
        .select("id, action_name, action_date, location, donated_hours")
        .eq("user_id", user.id)
        .order("action_date", { ascending: false })
        .limit(5);

      if (data) {
        setRecent(data);
        const totalHours = data.reduce((sum: number, a: ActionRow) => sum + Number(a.donated_hours), 0);
        // Get total count
        const { count } = await supabase
          .from("volunteer_actions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        
        // Get total hours from all actions
        const { data: allActions } = await supabase
          .from("volunteer_actions")
          .select("donated_hours")
          .eq("user_id", user.id);
        
        const allHours = allActions?.reduce((sum: number, a: { donated_hours: number }) => sum + Number(a.donated_hours), 0) ?? totalHours;
        setStats({ totalHours: allHours, totalActions: count ?? data.length });
      }
    };
    load();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "Voluntário";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-hero px-5 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary-foreground/70 text-sm">Olá,</p>
            <h1 className="text-xl font-bold font-heading text-primary-foreground">{firstName} 👋</h1>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => navigate("/admin")}
            >
              <Shield className="h-4 w-4 mr-1" /> Admin
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Clock} label="Horas doadas" value={stats.totalHours} gradient />
          <StatCard icon={Heart} label="Ações realizadas" value={stats.totalActions} />
        </div>
      </div>

      <div className="px-5 mt-6 space-y-5 animate-fade-up">
        {/* Motivational */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-warm mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground italic">"{quote}"</p>
              {stats.totalHours > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Você já transformou vidas com <span className="font-semibold text-primary">{stats.totalHours}h</span> de solidariedade.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Trilha de Desenvolvimento */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-warm" />
            <h2 className="text-base font-semibold font-heading text-foreground">Trilha de Desenvolvimento</h2>
          </div>

          {(() => {
            const levels = [
              {
                name: "Nível 1",
                criteria: ["20 horas anuais", "Participação em 3 workshops", "3 meses de engajamento"],
              },
              {
                name: "Nível 2",
                criteria: ["40 horas anuais", "Participação em 4 workshops", "4 meses de engajamento"],
              },
            ];
            return (
              <div className="space-y-4">
                {levels.map((lvl, i) => (
                  <div key={lvl.name} className="rounded-xl border border-border/60 p-4 bg-background/40">
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
            );
          })()}
        </div>

        {/* CTA */}
        <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/register-action")}>
          Registrar Nova Ação
        </Button>

        {/* Recent */}
        <div>
          <h2 className="text-lg font-semibold font-heading text-foreground mb-3">Atividades recentes</h2>
          {recent.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Comece registrando sua primeira ação voluntária!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((action) => (
                <div key={action.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{action.action_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{action.location}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-primary">{action.donated_hours}h</p>
                    <p className="text-xs text-muted-foreground">{new Date(action.action_date).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
