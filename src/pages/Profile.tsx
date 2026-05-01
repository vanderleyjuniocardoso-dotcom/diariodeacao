import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Clock, Heart, LogOut, Award, Star, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Badge {
  label: string;
  icon: typeof Star;
  threshold: number;
  type?: "hours";
}

const badges: Badge[] = [
  { label: "Primeira Ação", icon: Star, threshold: 1 },
  { label: "10 Ações", icon: Award, threshold: 10 },
  { label: "50 Horas", icon: Clock, threshold: 50, type: "hours" },
  { label: "100 Horas", icon: Heart, threshold: 100, type: "hours" },
];

const Profile = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalHours: 0, totalActions: 0 });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("volunteer_actions").select("donated_hours");
      if (data) {
        setStats({
          totalHours: data.reduce((s, a) => s + Number(a.donated_hours), 0),
          totalActions: data.length,
        });
      }
    };
    load();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const earnedBadges = badges.filter((b) =>
    b.type === "hours" ? stats.totalHours >= b.threshold : stats.totalActions >= b.threshold
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-hero px-5 pt-12 pb-10 rounded-b-3xl text-center">
        <div className="w-20 h-20 rounded-full bg-primary-foreground/20 border-2 border-primary-foreground/40 flex items-center justify-center mx-auto mb-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <UserIcon className="h-8 w-8 text-primary-foreground" />
          )}
        </div>
        <h1 className="text-xl font-bold font-heading text-primary-foreground">{profile?.full_name || "Voluntário"}</h1>
        <p className="text-sm text-primary-foreground/70">{profile?.email}</p>
        {profile?.unit && <p className="text-xs text-primary-foreground/50 mt-1">{profile.unit}</p>}
      </div>

      <div className="px-5 -mt-5 space-y-5 animate-fade-up">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Clock} label="Horas doadas" value={stats.totalHours} />
          <StatCard icon={Heart} label="Ações realizadas" value={stats.totalActions} />
        </div>

        {/* Badges */}
        <div>
          <h2 className="text-lg font-semibold font-heading text-foreground mb-3">Conquistas</h2>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => {
              const earned = earnedBadges.includes(badge);
              return (
                <div
                  key={badge.label}
                  className={`glass-card rounded-xl p-3 flex items-center gap-2 transition-opacity ${!earned ? "opacity-40" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${earned ? "bg-warm/10" : "bg-muted"}`}>
                    <badge.icon className={`h-5 w-5 ${earned ? "text-warm" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Button variant="outline" size="lg" className="w-full text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sair da conta
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
