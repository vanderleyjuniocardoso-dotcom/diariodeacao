import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import GglIntro from "@/components/GglIntro";
import { MapPin, Building2, Phone, Users, Construction, Heart } from "lucide-react";

interface Group {
  id: string;
  unit_name: string;
  cities: string[];
  unit_actions: string[];
}
interface Member {
  id: string;
  name: string;
  phone: string | null;
}

const Ggl = () => {
  const { profile } = useAuth() as any;
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const gid = profile?.ggl_id;
      if (!gid) {
        setGroup(null);
        setMembers([]);
        setLoading(false);
        return;
      }
      const [{ data: g }, { data: ms }] = await Promise.all([
        supabase.from("ggl_groups").select("id, unit_name, cities, unit_actions").eq("id", gid).maybeSingle(),
        supabase.from("ggl_members").select("id, name, phone").eq("ggl_id", gid).order("name"),
      ]);
      setGroup(g as Group | null);
      setMembers((ms as Member[]) ?? []);
      setLoading(false);
    })();
  }, [profile?.ggl_id]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {showIntro && (
        <GglIntro
          avatarUrl={profile?.avatar_url}
          fullName={profile?.full_name}
          onDone={() => setShowIntro(false)}
        />
      )}
      <div className="gradient-hero px-5 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary-foreground" />
          <h1 className="text-xl font-bold font-heading text-primary-foreground">Seu GGL</h1>
        </div>
        <p className="text-primary-foreground/80 text-sm mt-1">
          Grupo de Gestão Local — conheça quem cuida da sua região.
        </p>
      </div>

      <div className="px-5 -mt-2 mt-5 space-y-4 animate-fade-up">
        <div className="glass-card rounded-2xl p-4 flex items-start gap-3 border-l-4 border-primary/60">
          <Construction className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Em construção: em breve seu GGL será identificado automaticamente pela planilha de voluntários.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
        ) : !group ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Ainda não há um GGL vinculado ao seu perfil. Entre em contato com a administração.
            </p>
          </div>
        ) : (
          <>
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Unidade</h2>
              </div>
              <p className="text-base font-medium text-foreground">{group.unit_name}</p>

              {group.cities.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-4 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Cidades atendidas</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.cities.map((c) => (
                      <span key={c} className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1 font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Integrantes</h2>
              </div>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum integrante cadastrado.</p>
              ) : (
                <ul className="space-y-3">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{m.name}</p>
                        {m.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {m.phone}
                          </p>
                        )}
                      </div>
                      {m.phone && (
                        <a
                          href={`tel:${m.phone.replace(/\D/g, "")}`}
                          className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition"
                        >
                          Ligar
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Ggl;
