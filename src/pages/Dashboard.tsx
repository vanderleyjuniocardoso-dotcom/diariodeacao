import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import StatCard from "@/components/StatCard";
import { Clock, Heart, MapPin, Sparkles, Shield, Trophy, Circle, Camera, LogOut, Loader2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  category?: string | null;
}

const Dashboard = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalHours: 0, totalActions: 0, workshops: 0, engagementMonths: 0 });
  const [recent, setRecent] = useState<ActionRow[]>([]);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
      if (dbErr) throw dbErr;
      await refreshProfile();
      toast.success("Foto atualizada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("volunteer_actions")
        .select("id, action_name, action_date, location, donated_hours, category")
        .eq("user_id", user.id)
        .order("action_date", { ascending: false });

      if (data) {
        setRecent(data.slice(0, 5));
        const totalHours = data.reduce((sum, a) => sum + Number(a.donated_hours), 0);
        const workshops = data.filter((a) => (a.category || "").toLowerCase().includes("workshop mensal")).length;
        const months = new Set(data.map((a) => (a.action_date || "").slice(0, 7)).filter(Boolean));
        setStats({
          totalHours,
          totalActions: data.length,
          workshops,
          engagementMonths: months.size,
        });
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
          <div className="flex items-center gap-3">
            <label className="relative cursor-pointer group">
              <div className="w-14 h-14 rounded-full bg-primary-foreground/20 border-2 border-primary-foreground/50 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary-foreground flex items-center justify-center shadow">
                {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <Camera className="h-3 w-3 text-primary" />}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
            <div>
              <p className="text-primary-foreground/80 text-sm">Olá,</p>
              <h1 className="text-xl font-bold font-heading text-primary-foreground">{firstName} 👋</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              variant="outline"
              size="icon"
              className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={handleLogout}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Big level badge */}
        <div className="mb-4 rounded-2xl bg-primary-foreground text-primary px-4 py-3 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            {profile?.volunteer_level === 2 ? 2 : 1}
          </div>
          <div className="flex-1">
            <p className="text-base font-bold font-heading">Nível {profile?.volunteer_level === 2 ? 2 : 1}</p>
          </div>
          <Trophy className="h-6 w-6" />
        </div>
      </div>

      <div className="px-5 -mt-2 space-y-5 animate-fade-up">
        {/* Stats + Performance */}
        <div className="glass-card rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Clock} label="Horas doadas" value={stats.totalHours} />
            <StatCard icon={Heart} label="Ações realizadas" value={stats.totalActions} />
          </div>

          {/* Performance bar - based on user's assigned level */}
          {(() => {
            const level = profile?.volunteer_level === 2 ? 2 : 1;
            const goalHours = level === 2 ? 40 : 20;
            const goalWorkshops = level === 2 ? 4 : 3;
            const goalMonths = level === 2 ? 4 : 3;
            const pHours = Math.min(stats.totalHours / goalHours, 1);
            const pWork = Math.min(stats.workshops / goalWorkshops, 1);
            const pMonths = Math.min(stats.engagementMonths / goalMonths, 1);
            const progress = Math.round(((pHours + pWork + pMonths) / 3) * 100);
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Seu desempenho — Nível {level}</p>
                  <p className="text-sm font-bold text-primary">{progress}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <Heart className="h-5 w-5 text-primary fill-primary flex-shrink-0" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>{stats.totalHours}h / {goalHours}h</span>
                  <span>{stats.workshops}/{goalWorkshops} workshops</span>
                  <span>{stats.engagementMonths}/{goalMonths} meses</span>
                </div>
              </div>
            );
          })()}
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
                criteria: ["20 horas anuais", "3 workshops", "3 meses de engajamento"],
              },
              {
                name: "Nível 2",
                criteria: ["40 horas anuais", "4 workshops", "4 meses de engajamento"],
              },
            ];
            return (
              <div className="grid grid-cols-2 gap-3">
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
